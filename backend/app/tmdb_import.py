import argparse
import json
import logging
import math
import re
import sys
import time
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from sqlalchemy import delete, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import CastMember, Movie, MovieCast

TMDB_API_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"
MAX_DISCOVER_PAGES = 500
MAX_REQUEST_ATTEMPTS = 5
logger = logging.getLogger("app.tmdb_import")


class TMDBProviderError(RuntimeError):
    pass


class TMDBDataError(ValueError):
    pass


class TMDBSource(Protocol):
    def discover_movies(
        self,
        page: int,
        language: str,
        region: str | None,
        sort_by: str,
    ) -> tuple[list[dict[str, Any]], int]: ...

    def movie_details(self, movie_id: int, language: str) -> dict[str, Any]: ...

    def movie_credits(self, movie_id: int, language: str) -> dict[str, Any]: ...


@dataclass(frozen=True)
class CastRecord:
    tmdb_id: int
    name: str
    original_name: str | None
    known_for_department: str | None
    gender: int | None
    profile_path: str | None
    popularity: float | None
    character: str | None
    cast_order: int
    credit_id: str | None


@dataclass(frozen=True)
class MovieRecord:
    tmdb_id: int
    title: str
    description: str | None
    director: str | None
    genre: str | None
    duration_minutes: int
    language: str | None
    age_rating: str | None
    trailer_url: str | None
    poster_url: str | None
    cast: tuple[CastRecord, ...]


@dataclass
class ImportSummary:
    created: int = 0
    updated: int = 0
    skipped: int = 0


class TMDBClient:
    def __init__(self, read_access_token: str, timeout: float = 20.0) -> None:
        token = read_access_token.strip()
        if not token:
            raise ValueError("TMDB read access token must not be empty")
        self._token = token
        self._timeout = timeout

    def _get(self, path: str, params: Mapping[str, str]) -> dict[str, Any]:
        query = urlencode(params)
        url = f"{TMDB_API_BASE_URL}{path}?{query}" if query else f"{TMDB_API_BASE_URL}{path}"
        request = Request(
            url,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self._token}",
            },
        )
        for attempt in range(MAX_REQUEST_ATTEMPTS):
            try:
                with urlopen(request, timeout=self._timeout) as response:
                    body = response.read()
                break
            except HTTPError as error:
                response_text = error.read().decode("utf-8", errors="replace")[:500]
                if error.code == 429 or error.code >= 500:
                    if attempt < MAX_REQUEST_ATTEMPTS - 1:
                        retry_after = error.headers.get("Retry-After") if error.headers else None
                        time.sleep(self._retry_delay(retry_after, attempt))
                        continue
                raise TMDBProviderError(
                    f"TMDB returned HTTP {error.code} for {path}: {response_text}"
                ) from None
            except (TimeoutError, URLError, OSError) as error:
                if attempt < MAX_REQUEST_ATTEMPTS - 1:
                    delay = self._retry_delay(None, attempt)
                    logger.warning(
                        "TMDB request to %s failed on attempt %s/%s; retrying in %.1f seconds: %s",
                        path,
                        attempt + 1,
                        MAX_REQUEST_ATTEMPTS,
                        delay,
                        error,
                    )
                    time.sleep(delay)
                    continue
                raise TMDBProviderError(
                    f"TMDB request failed for {path} after {MAX_REQUEST_ATTEMPTS} attempts: {error}"
                ) from error
        else:
            raise TMDBProviderError(
                f"TMDB request failed for {path} after {MAX_REQUEST_ATTEMPTS} attempts"
            )

        try:
            payload = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise TMDBProviderError(f"TMDB returned invalid JSON for {path}") from error
        if not isinstance(payload, dict):
            raise TMDBProviderError(f"TMDB returned a non-object response for {path}")
        if payload.get("success") is False:
            message = payload.get("status_message", "unspecified provider error")
            raise TMDBProviderError(f"TMDB rejected {path}: {message}")
        return payload

    @staticmethod
    def _retry_delay(retry_after: str | None, attempt: int) -> float:
        if retry_after is not None:
            try:
                return min(max(float(retry_after), 0.1), 30.0)
            except ValueError:
                pass
        return min(0.5 * (2**attempt), 8.0)

    def discover_movies(
        self,
        page: int,
        language: str,
        region: str | None,
        sort_by: str,
    ) -> tuple[list[dict[str, Any]], int]:
        params = {
            "page": str(page),
            "language": language,
            "include_adult": "false",
            "sort_by": sort_by,
        }
        if region:
            params["region"] = region
        payload = self._get("/discover/movie", params)
        results = payload.get("results")
        total_pages = payload.get("total_pages")
        response_page = payload.get("page")
        if (
            not isinstance(results, list)
            or type(total_pages) is not int
            or total_pages < 0
            or type(response_page) is not int
            or response_page != page
        ):
            raise TMDBProviderError("TMDB discover response has an invalid page/results shape")
        movies: list[dict[str, Any]] = []
        for index, result in enumerate(results):
            if not isinstance(result, dict):
                raise TMDBProviderError(f"TMDB discover result {index} is not an object")
            if type(result.get("id")) is not int or result["id"] <= 0:
                raise TMDBProviderError(f"TMDB discover result {index} has an invalid movie id")
            movies.append(result)
        return movies, max(total_pages, 0)

    def movie_details(self, movie_id: int, language: str) -> dict[str, Any]:
        return self._get(
            f"/movie/{movie_id}",
            {"language": language, "append_to_response": "release_dates,videos"},
        )

    def movie_credits(self, movie_id: int, language: str) -> dict[str, Any]:
        return self._get(f"/movie/{movie_id}/credits", {"language": language})


def _text(
    payload: Mapping[str, Any],
    key: str,
    *,
    max_length: int | None = None,
) -> str | None:
    value = payload.get(key)
    if value is None or value == "":
        return None
    if not isinstance(value, str):
        raise TMDBDataError(f"TMDB field {key!r} is not a string")
    value = value.strip()
    if not value:
        return None
    if max_length is not None and len(value) > max_length:
        raise TMDBDataError(f"TMDB field {key!r} exceeds the {max_length}-character database limit")
    return value


def _optional_int(payload: Mapping[str, Any], key: str) -> int | None:
    value = payload.get(key)
    if value is None:
        return None
    if type(value) is not int:
        raise TMDBDataError(f"TMDB field {key!r} is not an integer")
    return value


def _optional_popularity(payload: Mapping[str, Any]) -> float | None:
    value = payload.get("popularity")
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise TMDBDataError("TMDB cast popularity is not numeric")
    popularity = float(value)
    if not math.isfinite(popularity):
        raise TMDBDataError("TMDB cast popularity is not finite")
    return popularity


def _get_age_rating(details: Mapping[str, Any], region: str | None) -> str | None:
    if region is None:
        return None
    release_dates = details.get("release_dates", {})
    if not isinstance(release_dates, dict):
        raise TMDBDataError("TMDB release_dates is not an object")
    results = release_dates.get("results", [])
    if not isinstance(results, list):
        raise TMDBDataError("TMDB release_dates.results is not a list")
    region_data = next(
        (item for item in results if isinstance(item, dict) and item.get("iso_3166_1") == region),
        None,
    )
    if region_data is None:
        return None
    dates = region_data.get("release_dates")
    if not isinstance(dates, list):
        raise TMDBDataError(f"TMDB release dates for {region} are not a list")
    candidates: list[tuple[int, str]] = []
    for release in dates:
        if not isinstance(release, dict):
            raise TMDBDataError("TMDB release date entry is not an object")
        certification = _text(release, "certification", max_length=20)
        if certification:
            release_type = release.get("type")
            priority = 0 if release_type == 3 else 1
            candidates.append((priority, certification))
    return min(candidates, key=lambda candidate: candidate[0])[1] if candidates else None


def _get_trailer_url(details: Mapping[str, Any]) -> str | None:
    videos = details.get("videos", {})
    if not isinstance(videos, dict):
        raise TMDBDataError("TMDB videos is not an object")
    results = videos.get("results", [])
    if not isinstance(results, list):
        raise TMDBDataError("TMDB videos.results is not a list")
    trailers: list[dict[str, Any]] = []
    for video in results:
        if not isinstance(video, dict):
            raise TMDBDataError("TMDB video result is not an object")
        if video.get("site") == "YouTube" and video.get("type") == "Trailer":
            trailers.append(video)
    if not trailers:
        return None
    video = next((item for item in trailers if item.get("official") is True), trailers[0])
    key = _text(video, "key", max_length=128)
    return f"https://www.youtube.com/watch?v={key}" if key else None


def build_movie_record(
    discovered: Mapping[str, Any],
    details: Mapping[str, Any],
    credits: Mapping[str, Any],
    region: str | None,
) -> MovieRecord:
    tmdb_id = discovered.get("id")
    if (
        type(tmdb_id) is not int
        or tmdb_id <= 0
        or type(details.get("id")) is not int
        or details.get("id") != tmdb_id
        or type(credits.get("id")) is not int
        or credits.get("id") != tmdb_id
    ):
        raise TMDBDataError("TMDB movie id is invalid or does not match the discovered movie")

    title = _text(details, "title", max_length=240)
    runtime = details.get("runtime")
    if title is None:
        raise TMDBDataError("TMDB movie title is missing")
    if type(runtime) is not int or runtime <= 0:
        raise TMDBDataError("TMDB movie runtime is missing or not positive")

    genres = details.get("genres", [])
    if not isinstance(genres, list):
        raise TMDBDataError("TMDB movie genres is not a list")
    genre = None
    if genres:
        if not isinstance(genres[0], dict):
            raise TMDBDataError("TMDB movie genre entry is not an object")
        genre = _text(genres[0], "name", max_length=120)

    crew = credits.get("crew")
    cast = credits.get("cast")
    if not isinstance(crew, list) or not isinstance(cast, list):
        raise TMDBDataError("TMDB movie credits must contain cast and crew lists")
    directors: list[str] = []
    for member in crew:
        if not isinstance(member, dict):
            raise TMDBDataError("TMDB crew entry is not an object")
        if member.get("job") == "Director":
            name = _text(member, "name")
            if name and name not in directors:
                directors.append(name)
    director = ", ".join(directors) or None
    if director is not None and len(director) > 160:
        raise TMDBDataError("TMDB director names exceed the 160-character database limit")

    cast_members: list[CastRecord] = []
    seen_cast_ids: set[int] = set()
    for index, member in enumerate(cast):
        if not isinstance(member, dict):
            raise TMDBDataError(f"TMDB cast entry {index} is not an object")
        cast_id = member.get("id")
        name = _text(member, "name", max_length=200)
        if type(cast_id) is not int or cast_id <= 0 or name is None:
            raise TMDBDataError(f"TMDB cast entry {index} has an invalid id or name")
        if cast_id in seen_cast_ids:
            continue
        seen_cast_ids.add(cast_id)
        order_value = member.get("order", index)
        if type(order_value) is not int or order_value < 0:
            raise TMDBDataError(f"TMDB cast entry {index} has an invalid order")
        profile_path = _text(member, "profile_path", max_length=2048)
        if profile_path and not profile_path.startswith("/"):
            raise TMDBDataError(f"TMDB cast entry {index} has an invalid profile path")
        cast_members.append(
            CastRecord(
                tmdb_id=cast_id,
                name=name,
                original_name=_text(member, "original_name", max_length=200),
                known_for_department=_text(member, "known_for_department", max_length=80),
                gender=_optional_int(member, "gender"),
                profile_path=profile_path,
                popularity=_optional_popularity(member),
                character=_text(member, "character"),
                cast_order=order_value,
                credit_id=_text(member, "credit_id", max_length=64),
            )
        )

    language = _text(details, "original_language", max_length=80)
    poster_path = _text(details, "poster_path", max_length=2048)
    poster_url = f"{TMDB_IMAGE_BASE_URL}{poster_path}" if poster_path else None
    if poster_path and not poster_path.startswith("/"):
        raise TMDBDataError("TMDB poster path is invalid")

    return MovieRecord(
        tmdb_id=tmdb_id,
        title=title,
        description=_text(details, "overview"),
        director=director,
        genre=genre,
        duration_minutes=runtime,
        language=language,
        age_rating=_get_age_rating(details, region),
        trailer_url=_get_trailer_url(details),
        poster_url=poster_url,
        cast=tuple(cast_members),
    )


def store_movie(db: Session, record: MovieRecord) -> bool:
    movie = db.scalar(select(Movie).where(Movie.tmdb_id == record.tmdb_id))
    created = movie is None
    if movie is None:
        movie = Movie(tmdb_id=record.tmdb_id, status="coming_soon")
        db.add(movie)

    movie.title = record.title
    movie.description = record.description
    movie.director = record.director
    movie.genre = record.genre
    movie.duration_minutes = record.duration_minutes
    movie.language = record.language
    movie.age_rating = record.age_rating
    movie.trailer_url = record.trailer_url
    movie.poster_url = record.poster_url
    movie.casts = ", ".join(member.name for member in record.cast[:10]) or None
    db.flush()

    cast_ids = [member.tmdb_id for member in record.cast]
    existing_cast = (
        {
            member.tmdb_id: member
            for member in db.scalars(select(CastMember).where(CastMember.tmdb_id.in_(cast_ids))).all()
        }
        if cast_ids
        else {}
    )
    links: list[tuple[CastRecord, CastMember]] = []
    for cast_record in record.cast:
        member = existing_cast.get(cast_record.tmdb_id)
        if member is None:
            member = CastMember(
                tmdb_id=cast_record.tmdb_id,
                name=cast_record.name,
                original_name=cast_record.original_name,
                known_for_department=cast_record.known_for_department,
                gender=cast_record.gender,
                profile_path=cast_record.profile_path,
                popularity=cast_record.popularity,
            )
            db.add(member)
        else:
            member.name = cast_record.name
            member.original_name = cast_record.original_name
            member.known_for_department = cast_record.known_for_department
            member.gender = cast_record.gender
            member.profile_path = cast_record.profile_path
            member.popularity = cast_record.popularity
        links.append((cast_record, member))

    db.flush()
    db.execute(delete(MovieCast).where(MovieCast.movie_id == movie.id))
    db.add_all(
        [
            MovieCast(
                movie_id=movie.id,
                cast_id=member.id,
                character=cast_record.character,
                cast_order=cast_record.cast_order,
                credit_id=cast_record.credit_id,
            )
            for cast_record, member in links
        ]
    )
    return created


def crawl_and_import(
    session_factory: Callable[[], Session],
    client: TMDBSource,
    *,
    pages: int,
    language: str,
    region: str | None,
    sort_by: str,
) -> ImportSummary:
    if not 1 <= pages <= MAX_DISCOVER_PAGES:
        raise ValueError(f"pages must be between 1 and {MAX_DISCOVER_PAGES}")
    summary = ImportSummary()
    for page in range(1, pages + 1):
        discovered_movies, total_pages = client.discover_movies(page, language, region, sort_by)
        if page > total_pages:
            break
        for discovered in discovered_movies:
            movie_id = discovered["id"]
            try:
                details = client.movie_details(movie_id, language)
                credits = client.movie_credits(movie_id, language)
                record = build_movie_record(discovered, details, credits, region)
            except TMDBDataError as error:
                logger.warning("Skipping TMDB movie %s: %s", movie_id, error)
                summary.skipped += 1
                continue
            with session_factory() as db:
                with db.begin():
                    created = store_movie(db, record)
            if created:
                summary.created += 1
            else:
                summary.updated += 1
        logger.info("Finished TMDB discover page %s of %s", page, min(total_pages, pages))
    return summary


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import TMDB discover movies and their cast into the CineGo database."
    )
    parser.add_argument("--pages", type=int, default=1, help="number of discover pages to import (1-500)")
    parser.add_argument("--language", default="en-US", help="TMDB response language (default: en-US)")
    parser.add_argument(
        "--region",
        default="US",
        help="TMDB release region and age-rating source; use an empty string to disable (default: US)",
    )
    parser.add_argument("--sort-by", default="popularity.desc", help="TMDB discover sort order")
    args = parser.parse_args()
    if not 1 <= args.pages <= MAX_DISCOVER_PAGES:
        parser.error(f"--pages must be between 1 and {MAX_DISCOVER_PAGES}")
    if args.region and not re.fullmatch(r"[A-Za-z]{2}", args.region):
        parser.error("--region must be a two-letter ISO 3166-1 country code")
    args.region = args.region.upper() or None
    return args


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    args = _parse_args()
    settings = get_settings()
    token = settings.tmdb_api_read_access_token
    if token is None or not token.strip():
        logger.error("TMDB_API_READ_ACCESS_TOKEN is not configured")
        return 2
    client = TMDBClient(token)
    try:
        summary = crawl_and_import(
            SessionLocal,
            client,
            pages=args.pages,
            language=args.language,
            region=args.region,
            sort_by=args.sort_by,
        )
    except (TMDBProviderError, SQLAlchemyError, ValueError):
        logger.exception("TMDB movie import failed")
        return 1
    logger.info(
        "TMDB import complete: %s created, %s updated, %s skipped",
        summary.created,
        summary.updated,
        summary.skipped,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
