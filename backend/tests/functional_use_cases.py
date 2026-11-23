"""Run explicitly with pytest to verify the three documented use cases."""

import os
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.schema import CreateSchema, DropSchema

API = "/api/v1"
CUSTOMER_A = "customer-a@example.com"
CUSTOMER_B = "customer-b@example.com"
PASSWORD = "FunctionalTest123!"
PAYMENT_KEY_1 = "functional-payment-001"
PAYMENT_KEY_2 = "functional-payment-002"
SEAT_PRICE = Decimal("80000.00")
SCHEMA_PATH = Path(__file__).resolve().parents[1] / "db" / "schema.sql"


@pytest.fixture(scope="session")
def postgres_url():
    configured_url = os.getenv("CINEGO_FUNCTIONAL_DB_URL")
    if not configured_url:
        pytest.fail("Set CINEGO_FUNCTIONAL_DB_URL to the local PostgreSQL test database URL.")
    url = make_url(configured_url)
    if (url.drivername != "postgresql+psycopg" or url.host not in {"127.0.0.1", "localhost"}
            or url.database != "cinego_functional_test"):
        pytest.fail("Use a local postgresql+psycopg URL for the cinego_functional_test database.")
    return url


@pytest.fixture
def database(postgres_url, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", postgres_url.render_as_string(hide_password=False))
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("JWT_SECRET", "functional-jwt-secret-for-local-tests")
    monkeypatch.setenv("QR_SIGNING_SECRET", "functional-qr-secret-for-local-tests")

    schema = f"functional_{uuid.uuid4().hex}"
    engine = create_engine(postgres_url, connect_args={"options": f"-c search_path={schema},public"})
    try:
        with engine.begin() as connection:
            connection.execute(CreateSchema(schema))
            connection.exec_driver_sql(SCHEMA_PATH.read_text(encoding="utf-8"))
        try:
            yield engine
        finally:
            with engine.begin() as connection:
                connection.execute(DropSchema(schema, cascade=True))
    finally:
        engine.dispose()


@pytest.fixture
def api(database: Engine, monkeypatch):
    from app import main
    from app.db import get_db
    from app.models import User
    from app.security import hash_password

    sessions = sessionmaker(bind=database)
    with sessions() as session:
        password_hash = hash_password(PASSWORD)
        session.add_all([
            User(full_name="Customer A", email=CUSTOMER_A, password_hash=password_hash),
            User(full_name="Customer B", email=CUSTOMER_B, password_hash=password_hash),
        ])
        session.commit()

    def test_session():
        with sessions() as session:
            yield session

    monkeypatch.setattr(main.settings, "environment", "test")
    monkeypatch.setattr(main.settings, "seat_hold_minutes", 5)
    monkeypatch.setattr(main, "SessionLocal", sessions)
    monkeypatch.setitem(main.app.dependency_overrides, get_db, test_session)
    with TestClient(main.app) as client:
        assert client.get("/health/live").json() == {"status": "alive"}
        assert client.get("/health/ready").json() == {"status": "ready"}
        yield client


@dataclass
class Booking:
    client: TestClient
    database: Engine
    showtime_id: str
    a1: str
    a2: str
    customer_a: dict[str, str]
    customer_b: dict[str, str]

    @property
    def seat_map_path(self) -> str:
        return f"{API}/showtimes/{self.showtime_id}/seats"

    def hold(self, seats, headers, status=201):
        return response_json(self.client.post(
            f"{API}/showtimes/{self.showtime_id}/seat-holds",
            json={"seat_ids": seats}, headers=headers,
        ), status)

    def seat_states(self):
        seat_map = response_json(self.client.get(self.seat_map_path), 200)
        return {seat["id"]: seat["status"] for seat in seat_map["seats"]}

    def expire(self, hold_id):
        from app.models import SeatHold

        with Session(self.database) as session:
            hold = session.get(SeatHold, uuid.UUID(hold_id))
            assert hold is not None
            hold.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
            session.commit()

    def pay(self, order_id, key, outcome, status=200):
        return response_json(self.client.post(
            f"{API}/orders/{order_id}/payments",
            json={"idempotency_key": key, "payment_method": "mock_card", "simulated_result": outcome},
            headers=self.customer_a,
        ), status)

    def order_state(self, order_id):
        order = response_json(self.client.get(f"{API}/orders/{order_id}", headers=self.customer_a), 200)
        return order["payment_status"], order["order_status"]

    def tickets(self):
        return response_json(self.client.get(f"{API}/tickets", headers=self.customer_a), 200)


@pytest.fixture
def booking(api, database):
    from app.models import Cinema, Hall, Movie, Seat, Showtime

    with Session(database) as session:
        movie = Movie(title="CineGo Test Screening", duration_minutes=100, status="now_showing")
        cinema = Cinema(name="CineGo Test Cinema", address="Test address")
        session.add_all([movie, cinema])
        session.flush()
        hall = Hall(cinema_id=cinema.id, name="Screen 1", hall_type="standard", rows_count=1, columns_count=2)
        session.add(hall)
        session.flush()
        a1 = Seat(hall_id=hall.id, row_label="A", seat_number=1)
        a2 = Seat(hall_id=hall.id, row_label="A", seat_number=2)
        start = datetime.now(timezone.utc) + timedelta(days=1)
        showtime = Showtime(
            movie_id=movie.id, hall_id=hall.id, start_at=start,
            end_at=start + timedelta(minutes=100), base_price=SEAT_PRICE,
        )
        session.add_all([a1, a2, showtime])
        session.flush()
        showtime_id, a1_id, a2_id = str(showtime.id), str(a1.id), str(a2.id)
        session.commit()

    customer_a = bearer(response_json(login(api, CUSTOMER_A, PASSWORD), 200))
    customer_b = bearer(response_json(login(api, CUSTOMER_B, PASSWORD), 200))
    return Booking(api, database, showtime_id, a1_id, a2_id, customer_a, customer_b)


@pytest.fixture
def pending_order(booking):
    held = booking.hold([booking.a1], booking.customer_a)
    order = response_json(booking.client.post(
        f"{API}/orders", json={"showtime_id": booking.showtime_id, "seat_ids": [booking.a1]},
        headers=booking.customer_a,
    ), 201)
    assert (order["payment_status"], order["order_status"]) == ("pending", "pending_payment")
    return order["id"], held["hold_ids"][0]


def response_json(response, status):
    assert response.status_code == status, response.text
    return response.json()


def login(client, email, password):
    return client.post(f"{API}/auth/login", json={"email": email, "password": password})


def bearer(login_body):
    return {"Authorization": f"Bearer {login_body['access_token']}"}


def test_lgn_01_valid_credentials(api):
    body = response_json(login(api, CUSTOMER_A, PASSWORD), 200)
    assert body["access_token"] and body["token_type"] == "bearer" and body["expires_in"] > 0
    me = response_json(api.get(f"{API}/auth/me", headers=bearer(body)), 200)
    assert (me["email"], me["role"]) == (CUSTOMER_A, "customer")
    assert me["id"] == body["user"]["id"]


@pytest.mark.parametrize(("email", "password"), [
    pytest.param(CUSTOMER_A, "WrongPassword123!", id="LGN-02-wrong-password"),
    pytest.param("missing@example.com", PASSWORD, id="LGN-03-unknown-email"),
])
def test_invalid_credentials(api, email, password):
    assert response_json(login(api, email, password), 401) == {"detail": "Invalid email or password"}


@pytest.mark.parametrize(("email", "password", "field"), [
    pytest.param("invalid-email", PASSWORD, "email", id="LGN-04-invalid-email"),
    pytest.param(CUSTOMER_A, "", "password", id="LGN-05-empty-password"),
])
def test_malformed_login(api, email, password, field):
    body = response_json(login(api, email, password), 422)
    assert any(error["loc"] == ["body", field] for error in body["detail"])


def test_hld_01_hold_one_seat(booking):
    before = datetime.now(timezone.utc)
    body = booking.hold([booking.a1], booking.customer_a)
    after = datetime.now(timezone.utc)
    assert body["seat_ids"] == [booking.a1] and len(body["hold_ids"]) == 1
    expiry = datetime.fromisoformat(body["expires_at"])
    assert before + timedelta(minutes=5) <= expiry <= after + timedelta(minutes=5)
    assert booking.seat_states() == {booking.a1: "held", booking.a2: "available"}


def test_hld_02_hold_two_seats(booking):
    body = booking.hold([booking.a1, booking.a2], booking.customer_a)
    assert set(body["seat_ids"]) == {booking.a1, booking.a2}
    assert len(set(body["hold_ids"])) == 2
    assert booking.seat_states() == {booking.a1: "held", booking.a2: "held"}


def test_hld_03_conflicting_request_is_atomic(booking):
    booking.hold([booking.a1], booking.customer_a)
    booking.hold([booking.a1, booking.a2], booking.customer_b, status=409)
    assert booking.seat_states() == {booking.a1: "held", booking.a2: "available"}


def test_hld_04_release_and_rehold(booking):
    original = booking.hold([booking.a1], booking.customer_a)
    hold_id = original["hold_ids"][0]
    released = booking.client.delete(f"{API}/seat-holds/{hold_id}", headers=booking.customer_a)
    assert released.status_code == 204, released.text
    assert booking.seat_states()[booking.a1] == "available"
    next_hold = booking.hold([booking.a1], booking.customer_b)
    assert next_hold["seat_ids"] == [booking.a1] and hold_id not in next_hold["hold_ids"]


def test_hld_05_expired_seat_can_be_reheld(booking):
    original = booking.hold([booking.a1], booking.customer_a)
    hold_id = original["hold_ids"][0]
    booking.expire(hold_id)
    assert booking.seat_states()[booking.a1] == "available"
    next_hold = booking.hold([booking.a1], booking.customer_b)
    assert next_hold["seat_ids"] == [booking.a1] and hold_id not in next_hold["hold_ids"]
    assert booking.seat_states()[booking.a1] == "held"


def test_pay_01_success_confirms_order_and_issues_qr(booking, pending_order):
    order_id, _ = pending_order
    paid = booking.pay(order_id, PAYMENT_KEY_1, "succeeded")
    assert paid["status"] == "succeeded" and Decimal(paid["amount"]) == SEAT_PRICE
    assert len(paid["ticket_codes"]) == len(paid["qr_tokens"]) == 1
    assert booking.order_state(order_id) == ("paid", "confirmed")
    tickets = booking.tickets()
    assert len(tickets) == 1
    assert tickets[0]["ticket_code"] == paid["ticket_codes"][0]
    assert tickets[0]["qr_token"] == paid["qr_tokens"][0] and tickets[0]["qr_token"]
    assert (tickets[0]["status"], tickets[0]["seat_label"]) == ("issued", "A1")
    assert booking.seat_states()[booking.a1] == "sold"


def test_pay_02_failed_payment_keeps_seat_held(booking, pending_order):
    order_id, _ = pending_order
    failed = booking.pay(order_id, PAYMENT_KEY_1, "failed")
    assert failed["status"] == "failed"
    assert failed["ticket_codes"] == failed["qr_tokens"] == []
    assert booking.order_state(order_id) == ("failed", "pending_payment")
    assert booking.tickets() == []
    assert booking.seat_states()[booking.a1] == "held"


def test_pay_03_retry_then_replay_failed_attempt(booking, pending_order):
    order_id, _ = pending_order
    failed = booking.pay(order_id, PAYMENT_KEY_1, "failed")
    assert failed["status"] == "failed" and failed["ticket_codes"] == failed["qr_tokens"] == []
    paid = booking.pay(order_id, PAYMENT_KEY_2, "succeeded")
    assert paid["status"] == "succeeded" and paid["payment_id"] != failed["payment_id"]
    assert booking.order_state(order_id) == ("paid", "confirmed")
    assert len(booking.tickets()) == 1
    replay = booking.pay(order_id, PAYMENT_KEY_1, "failed")
    assert replay == failed


def test_pay_04_replayed_success_does_not_duplicate_ticket(booking, pending_order):
    order_id, _ = pending_order
    paid = booking.pay(order_id, PAYMENT_KEY_1, "succeeded")
    replay = booking.pay(order_id, PAYMENT_KEY_1, "succeeded")
    assert replay == paid and paid["status"] == "succeeded"
    assert [ticket["ticket_code"] for ticket in booking.tickets()] == paid["ticket_codes"]
    assert len(paid["ticket_codes"]) == len(paid["qr_tokens"]) == 1


def test_pay_05_expired_hold_blocks_payment(booking, pending_order):
    order_id, hold_id = pending_order
    booking.expire(hold_id)
    booking.pay(order_id, PAYMENT_KEY_1, "succeeded", status=409)
    assert booking.order_state(order_id)[0] != "paid"
    assert booking.tickets() == []
    assert booking.seat_states()[booking.a1] == "available"
