import os
import tempfile
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

database_path = Path(tempfile.gettempdir()) / f"cinego-test-{uuid.uuid4().hex}.db"
os.environ["DATABASE_URL"] = f"sqlite:///{database_path.as_posix()}"
os.environ["JWT_SECRET"] = "test-jwt-secret-at-least-32-characters"
os.environ["QR_SIGNING_SECRET"] = "test-qr-signing-secret-at-least-32"
os.environ["ENVIRONMENT"] = "test"
os.environ["CORS_ORIGINS"] = "http://localhost:3000"

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import DateTime, event
from sqlalchemy.exc import SQLAlchemyError

from app.config import Settings
from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import Cinema, FoodItem, Hall, Movie, Order, OrderItem, Payment, Seat, SeatHold, Showtime, Ticket, User
from app.schemas import OrderItemOut, RegisterRequest
from app.security import hash_password, sign_ticket, verify_password, verify_ticket_token


@event.listens_for(Base, "load", propagate=True)
def _sqlite_datetime_timezone_utc(target, context):
    for col in target.__table__.columns:
        if isinstance(col.type, DateTime) and getattr(target, col.name, None) is not None:
            val = getattr(target, col.name)
            if isinstance(val, datetime) and val.tzinfo is None:
                setattr(target, col.name, val.replace(tzinfo=timezone.utc))


@pytest.fixture(scope="module", autouse=True)
def create_test_schema():
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)
    engine.dispose()
    try:
        database_path.unlink()
    except FileNotFoundError:
        pass


def test_liveness_and_readiness() -> None:
    with TestClient(app) as client:
        assert client.get("/health/live").json() == {"status": "alive"}
        assert client.get("/health/ready").json() == {"status": "ready"}


def test_settings_env_file_is_resolved_from_backend_directory() -> None:
    env_file = Path(Settings.model_config["env_file"])
    assert env_file == Path(__file__).resolve().parents[1] / ".env"


def test_readiness_returns_503_when_database_is_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingSession:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def execute(self, *_args, **_kwargs):
            raise SQLAlchemyError("database unavailable")

    monkeypatch.setattr("app.main.SessionLocal", lambda: FailingSession())
    with TestClient(app) as client:
        response = client.get("/health/ready")
    assert response.status_code == 503
    assert response.json()["status"] == "unavailable"


def test_admin_endpoint_requires_authentication() -> None:
    with TestClient(app) as client:
        response = client.get("/api/v1/admin/dashboard")
    assert response.status_code == 401


def test_customer_registration_login_and_logout() -> None:
    with TestClient(app) as client:
        registered = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Test Customer",
                "email": "customer@example.com",
                "phone": "+84123456789",
                "password": "StrongPassword123",
                "password_confirmation": "StrongPassword123",
            },
        )
        assert registered.status_code == 201
        assert "password_hash" not in registered.json()

        login = client.post(
            "/api/v1/auth/login",
            json={"email": "CUSTOMER@example.com", "password": "StrongPassword123"},
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        assert client.get("/api/v1/auth/me", headers=headers).json()["role"] == "customer"
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 403
        assert client.post("/api/v1/auth/logout", headers=headers).status_code == 204
        assert client.get("/api/v1/auth/me", headers=headers).status_code == 401


def test_admin_access_is_role_gated() -> None:
    with engine.begin() as connection:
        connection.execute(
            User.__table__.insert().values(
                full_name="Test Admin",
                email="admin@example.com",
                password_hash=hash_password("AdminPassword123"),
                role="admin",
                status="active",
            )
        )
    with TestClient(app) as client:
        login = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "AdminPassword123"},
        )
        assert login.status_code == 200
        headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
        assert client.get("/api/v1/admin/users", headers=headers).status_code == 200
        dashboard = client.get("/api/v1/admin/dashboard", headers=headers)
        assert dashboard.status_code == 200
        assert dashboard.json()["paid_orders"] == 0


def test_registration_requires_matching_strong_password() -> None:
    try:
        RegisterRequest(
            full_name="CineGo User",
            email="user@example.com",
            password="Password123",
            password_confirmation="Different123",
        )
    except ValidationError:
        return
    raise AssertionError("mismatched passwords must fail validation")


def test_passwords_are_hashed_and_qr_tokens_are_signed() -> None:
    password = "correct-horse-battery-staple"
    encoded = hash_password(password)
    assert encoded != password
    assert verify_password(password, encoded)
    assert not verify_password("incorrect-password", encoded)

    ticket_id = uuid.uuid4()
    token = sign_ticket(ticket_id)
    assert verify_ticket_token(token) == ticket_id
    assert verify_ticket_token(token[:-1] + ("0" if token[-1] != "0" else "1")) is None


def test_production_configuration_rejects_wildcard_cors() -> None:
    with pytest.raises(ValidationError):
        Settings(
            _env_file=None,
            environment="production",
            database_url="postgresql+psycopg://user:pass@localhost/db",
            jwt_secret="test-jwt-secret-at-least-32-characters",
            qr_signing_secret="test-qr-signing-secret-at-least-32",
            cors_origins=["*"],
        )


def test_order_item_out_from_orm_attributes() -> None:
    item_id = uuid.uuid4()
    ref_id = uuid.uuid4()
    order_id = uuid.uuid4()
    orm_item = OrderItem(
        id=item_id,
        order_id=order_id,
        item_type="food",
        ref_id=ref_id,
        quantity=3,
        unit_price=Decimal("45000"),
        amount=Decimal("135000"),
    )
    validated = OrderItemOut.model_validate(orm_item)
    assert validated.id == item_id
    assert validated.item_type == "food"
    assert validated.ref_id == ref_id
    assert validated.quantity == 3
    assert validated.unit_price == Decimal("45000")
    assert validated.amount == Decimal("135000")


def test_create_order_with_food_items_and_get_orders() -> None:
    customer_email = f"order-food-{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123"
    with TestClient(app) as client:
        register_res = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Food Customer",
                "email": customer_email,
                "phone": "+84987654321",
                "password": password,
                "password_confirmation": password,
            },
        )
        assert register_res.status_code == 201
        customer_id = uuid.UUID(register_res.json()["id"])

        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": customer_email, "password": password},
        )
        assert login_res.status_code == 200
        auth_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        now = datetime.now(timezone.utc)
        with SessionLocal() as db:
            movie = Movie(
                title=f"Movie {uuid.uuid4().hex[:6]}",
                duration_minutes=120,
                status="now_showing",
            )
            cinema = Cinema(name=f"Cinema {uuid.uuid4().hex[:6]}", address="123 Cinema Way", status="active")
            db.add_all([movie, cinema])
            db.flush()

            hall = Hall(
                cinema_id=cinema.id,
                name="Hall A",
                hall_type="standard",
                rows_count=5,
                columns_count=5,
                status="active",
            )
            db.add(hall)
            db.flush()

            seat = Seat(
                hall_id=hall.id,
                row_label="B",
                seat_number=3,
                seat_type="standard",
                price_modifier=Decimal("0"),
                status="active",
            )
            food1 = FoodItem(
                name="Bắp rang bơ phô mai",
                category="Bắp",
                price=Decimal("65000"),
                stock=50,
                status="active",
            )
            food2 = FoodItem(
                name="Coca-Cola L",
                category="Nước",
                price=Decimal("35000"),
                stock=50,
                status="active",
            )
            db.add_all([seat, food1, food2])
            db.flush()

            showtime = Showtime(
                movie_id=movie.id,
                hall_id=hall.id,
                start_at=now + timedelta(days=1),
                end_at=now + timedelta(days=1, hours=2),
                base_price=Decimal("80000"),
                status="scheduled",
            )
            db.add(showtime)
            db.flush()

            hold = SeatHold(
                showtime_id=showtime.id,
                seat_id=seat.id,
                user_id=customer_id,
                expires_at=now + timedelta(minutes=10),
            )
            db.add(hold)
            db.commit()

            showtime_id = str(showtime.id)
            seat_id = str(seat.id)
            food1_id = str(food1.id)
            food2_id = str(food2.id)

        # POST /orders with food_items -> 201 Created and items contains the food items
        order_payload = {
            "showtime_id": showtime_id,
            "seat_ids": [seat_id],
            "food_items": [
                {"food_item_id": food1_id, "quantity": 2},
                {"food_item_id": food2_id, "quantity": 1},
            ],
        }
        create_res = client.post("/api/v1/orders", json=order_payload, headers=auth_headers)
        assert create_res.status_code == 201, create_res.text
        order_data = create_res.json()

        assert order_data["showtime_id"] == showtime_id
        assert order_data["seat_ids"] == [seat_id]
        assert len(order_data["items"]) == 2

        items_by_ref = {item["ref_id"]: item for item in order_data["items"]}
        assert food1_id in items_by_ref
        assert items_by_ref[food1_id]["item_type"] == "food"
        assert items_by_ref[food1_id]["quantity"] == 2
        assert Decimal(str(items_by_ref[food1_id]["unit_price"])) == Decimal("65000")
        assert Decimal(str(items_by_ref[food1_id]["amount"])) == Decimal("130000")

        assert food2_id in items_by_ref
        assert items_by_ref[food2_id]["item_type"] == "food"
        assert items_by_ref[food2_id]["quantity"] == 1
        assert Decimal(str(items_by_ref[food2_id]["unit_price"])) == Decimal("35000")
        assert Decimal(str(items_by_ref[food2_id]["amount"])) == Decimal("35000")

        # Subtotal & Total = 80000 (seat) + 130000 (food1) + 35000 (food2) = 245000
        assert Decimal(str(order_data["subtotal"])) == Decimal("245000")
        assert Decimal(str(order_data["total"])) == Decimal("245000")

        # GET /orders -> 200 OK and items contains the food items
        list_res = client.get("/api/v1/orders", headers=auth_headers)
        assert list_res.status_code == 200
        orders_list = list_res.json()
        assert len(orders_list) >= 1
        matched_order = next((o for o in orders_list if o["id"] == order_data["id"]), None)
        assert matched_order is not None
        assert len(matched_order["items"]) == 2
        list_items_by_ref = {item["ref_id"]: item for item in matched_order["items"]}
        assert food1_id in list_items_by_ref
        assert list_items_by_ref[food1_id]["quantity"] == 2
        assert food2_id in list_items_by_ref
        assert list_items_by_ref[food2_id]["quantity"] == 1


def test_tickets_endpoints_include_poster_url() -> None:
    customer_email = f"ticket-poster-{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPassword123"
    with TestClient(app) as client:
        register_res = client.post(
            "/api/v1/auth/register",
            json={
                "full_name": "Poster Customer",
                "email": customer_email,
                "phone": "+84911223344",
                "password": password,
                "password_confirmation": password,
            },
        )
        assert register_res.status_code == 201
        customer_id = uuid.UUID(register_res.json()["id"])

        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": customer_email, "password": password},
        )
        assert login_res.status_code == 200
        auth_headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

        now = datetime.now(timezone.utc)
        sample_poster = "https://image.tmdb.org/t/p/w500/sample-poster.jpg"
        with SessionLocal() as db:
            movie = Movie(
                title=f"Movie With Poster {uuid.uuid4().hex[:6]}",
                duration_minutes=120,
                status="now_showing",
                poster_url=sample_poster,
            )
            cinema = Cinema(name=f"Cinema {uuid.uuid4().hex[:6]}", address="456 Movie Blvd", status="active")
            db.add_all([movie, cinema])
            db.flush()

            hall = Hall(
                cinema_id=cinema.id,
                name="Hall 1",
                hall_type="standard",
                rows_count=5,
                columns_count=5,
                status="active",
            )
            db.add(hall)
            db.flush()

            seat = Seat(
                hall_id=hall.id,
                row_label="C",
                seat_number=7,
                seat_type="standard",
                price_modifier=Decimal("0"),
                status="sold",
            )
            db.add(seat)
            db.flush()

            showtime = Showtime(
                movie_id=movie.id,
                hall_id=hall.id,
                start_at=now + timedelta(days=2),
                end_at=now + timedelta(days=2, hours=2),
                base_price=Decimal("90000"),
                status="scheduled",
            )
            db.add(showtime)
            db.flush()

            order = Order(
                order_code=f"ORD-{uuid.uuid4().hex[:8].upper()}",
                user_id=customer_id,
                showtime_id=showtime.id,
                subtotal=Decimal("90000"),
                discount=Decimal("0"),
                total=Decimal("90000"),
                payment_status="paid",
                order_status="confirmed",
            )
            db.add(order)
            db.flush()

            ticket = Ticket(
                ticket_code=f"TK-{uuid.uuid4().hex[:8].upper()}",
                order_id=order.id,
                showtime_id=showtime.id,
                seat_id=seat.id,
                status="issued",
            )
            db.add(ticket)
            db.commit()

            ticket_code = ticket.ticket_code

        # Test list endpoint: GET /api/v1/tickets
        list_res = client.get("/api/v1/tickets", headers=auth_headers)
        assert list_res.status_code == 200
        tickets_data = list_res.json()
        assert len(tickets_data) == 1
        assert "poster_url" in tickets_data[0]
        assert tickets_data[0]["poster_url"] == sample_poster
        assert tickets_data[0]["ticket_code"] == ticket_code

        # Test detail endpoint: GET /api/v1/tickets/{ticket_code}
        detail_res = client.get(f"/api/v1/tickets/{ticket_code}", headers=auth_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert "poster_url" in detail_data
        assert detail_data["poster_url"] == sample_poster
        assert detail_data["ticket_code"] == ticket_code


