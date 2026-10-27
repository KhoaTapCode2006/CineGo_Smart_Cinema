from collections.abc import Mapping
from io import BytesIO
from typing import Any
from urllib.error import HTTPError, URLError

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.db import Base
from app.models import CastMember, Movie, MovieCast
from app.tmdb_import import (
    TMDBClient,
    TMDBDataError,
    TMDBProviderError,
    build_movie_record,
    crawl_and_import,
)


def _discovered() -> dict[str, Any]:
    return {"id": 42, "title": "CineGo Test"}


def _details() -> dict[str, Any]:
    return {
        "id": 42,
        "title": "CineGo Test",
        "overview": "A test story.",
        "runtime": 123,
        "genres": [{"id": 28, "name": "Action"}],
        "original_language": "en",
        "poster_path": "/poster.jpg",
        "release_dates": {
            "results": [
                {
                    "iso_3166_1": "US",
                    "release_dates": [{"certification": "PG-13", "type": 3}],
                }
            ]
        },
        "videos": {
            "results": [
                {
                    "site": "YouTube",
                    "type": "Trailer",
                    "official": True,
                    "key": "video-key",
                }
            ]
        },
    }


def _credits() -> dict[str, Any]:
    return {
        "id": 42,
        "crew": [{"job": "Director", "name": "A. Director"}],
        "cast": [
            {
                "id": 7,
                "name": "An Actor",
                "original_name": "An Actor",
                "known_for_department": "Acting",
                "gender": 2,
                "profile_path": "/actor.jpg",
                "popularity": 3.25,
                "character": "The Lead",
                "order": 0,
                "credit_id": "credit-7",
            }
        ],
    }


def test_movie_record_maps_details_and_credits_to_database_fields() -> None:
    record = build_movie_record(_discovered(), _details(), _credits(), "US")

    assert record.tmdb_id == 42
    assert record.duration_minutes == 123
    assert record.genre == "Action"
    assert record.language == "en"
    assert record.director == "A. Director"
    assert record.age_rating == "PG-13"
    assert record.trailer_url == "https://www.youtube.com/watch?v=video-key"
    assert record.poster_url == "https://image.tmdb.org/t/p/w500/poster.jpg"
    assert record.cast[0].name == "An Actor"
    assert record.cast[0].character == "The Lead"


def test_movie_record_rejects_missing_required_runtime() -> None:
    details = _details()
    details["runtime"] = None

    with pytest.raises(TMDBDataError, match="runtime"):
        build_movie_record(_discovered(), details, _credits(), "US")


def test_discover_response_shape_is_checked(monkeypatch: pytest.MonkeyPatch) -> None:
    client = TMDBClient("test-token")
    monkeypatch.setattr(
        client,
        "_get",
        lambda _path, _params: {"page": 1, "total_pages": 1, "results": [None]},
    )

    with pytest.raises(TMDBProviderError, match="not an object"):
        client.discover_movies(1, "en-US", "US", "popularity.desc")


def test_movie_credit_request_uses_the_dedicated_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[tuple[str, Mapping[str, str]]] = []

    def fake_get(path: str, params: Mapping[str, str]) -> dict[str, Any]:
        calls.append((path, params))
        return {"id": 42, "cast": [], "crew": []}

    client = TMDBClient("test-token")
    monkeypatch.setattr(client, "_get", fake_get)

    assert client.movie_credits(42, "vi-VN") == {"id": 42, "cast": [], "crew": []}
    assert calls == [("/movie/42/credits", {"language": "vi-VN"})]


def test_provider_request_uses_bearer_header_and_parses_json(monkeypatch: pytest.MonkeyPatch) -> None:
    seen: dict[str, Any] = {}

    class FakeResponse:
        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *_args: Any) -> None:
            return None

        def read(self) -> bytes:
            return b'{"page": 2}'

    def fake_urlopen(request: Any, timeout: float) -> FakeResponse:
        seen["url"] = request.full_url
        seen["authorization"] = request.get_header("Authorization")
        seen["timeout"] = timeout
        return FakeResponse()

    monkeypatch.setattr("app.tmdb_import.urlopen", fake_urlopen)
    payload = TMDBClient("test-token")._get("/discover/movie", {"page": "2"})

    assert payload == {"page": 2}
    assert seen["url"] == "https://api.themoviedb.org/3/discover/movie?page=2"
    assert "test-token" not in seen["url"]
    assert seen["authorization"] == "Bearer test-token"


def test_provider_request_retries_transient_connection_resets(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    attempts = 0
    delays: list[float] = []

    class FakeResponse:
        def __enter__(self) -> "FakeResponse":
            return self

        def __exit__(self, *_args: Any) -> None:
            return None

        def read(self) -> bytes:
            return b'{"page": 1}'

    def fake_urlopen(_request: Any, timeout: float) -> FakeResponse:
        nonlocal attempts
        assert timeout == 20.0
        attempts += 1
        if attempts <= 4:
            raise URLError(ConnectionResetError("connection reset"))
        return FakeResponse()

    monkeypatch.setattr("app.tmdb_import.urlopen", fake_urlopen)
    monkeypatch.setattr("app.tmdb_import.time.sleep", delays.append)

    payload = TMDBClient("test-token")._get("/discover/movie", {"page": "1"})

    assert payload == {"page": 1}
    assert attempts == 5
    assert delays == [0.5, 1.0, 2.0, 4.0]


def test_provider_http_errors_are_reported(monkeypatch: pytest.MonkeyPatch) -> None:
    def fake_urlopen(request: Any, timeout: float) -> None:
        del timeout
        raise HTTPError(request.full_url, 401, "Unauthorized", {}, BytesIO(b"invalid token"))

    monkeypatch.setattr("app.tmdb_import.urlopen", fake_urlopen)
    with pytest.raises(TMDBProviderError, match="HTTP 401"):
        TMDBClient("test-token")._get("/discover/movie", {"page": "1"})


def test_import_persists_cast_and_is_idempotent() -> None:
    engine = create_engine("sqlite://")
    Base.metadata.create_all(
        engine,
        tables=[Movie.__table__, CastMember.__table__, MovieCast.__table__],
    )
    session_factory = sessionmaker(bind=engine, expire_on_commit=False)

    class FakeClient:
        def discover_movies(
            self, _page: int, _language: str, _region: str | None, _sort_by: str
        ) -> tuple[list[dict[str, Any]], int]:
            return [_discovered()], 1

        def movie_details(self, _movie_id: int, _language: str) -> dict[str, Any]:
            return _details()

        def movie_credits(self, _movie_id: int, _language: str) -> dict[str, Any]:
            return _credits()

    try:
        first = crawl_and_import(
            session_factory,
            FakeClient(),
            pages=1,
            language="en-US",
            region="US",
            sort_by="popularity.desc",
        )
        second = crawl_and_import(
            session_factory,
            FakeClient(),
            pages=1,
            language="en-US",
            region="US",
            sort_by="popularity.desc",
        )
        assert (first.created, first.updated, second.created, second.updated) == (1, 0, 0, 1)

        with session_factory() as db:
            movie = db.scalar(select(Movie).where(Movie.tmdb_id == 42))
            assert movie is not None
            assert movie.casts == "An Actor"
            assert movie.status == "coming_soon"
            assert db.scalar(select(func.count()).select_from(CastMember)) == 1
            assert db.scalar(select(func.count()).select_from(MovieCast)) == 1
    finally:
        engine.dispose()
