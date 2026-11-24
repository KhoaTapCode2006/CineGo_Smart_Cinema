from decimal import Decimal
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Cinema, FoodItem, Hall, Movie, Order, Payment, Seat, Showtime, Ticket, User, Voucher
from app.security import verify_password, verify_ticket_token
from app.seed_demo import DEMO_ACCOUNTS, DEMO_PASSWORD, seed_demo


def test_seed_demo_idempotency_and_reset() -> None:
    # 1. Setup in-memory SQLite database
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        # Pre-seed sample movies (as expected in real environment)
        movie1 = Movie(
            title="Lật Mặt 7: Một Điều Ước",
            duration_minutes=138,
            status="now_showing",
            language="Tiếng Việt",
        )
        movie2 = Movie(
            title="Dune: Part Two",
            duration_minutes=166,
            status="now_showing",
            language="Tiếng Anh",
        )
        movie_coming_soon = Movie(
            title="Deadpool & Wolverine",
            duration_minutes=128,
            status="coming_soon",
            language="Tiếng Anh",
        )
        db.add_all([movie1, movie2, movie_coming_soon])
        db.commit()

        # ----------------------------------------------------------------------
        # Test First Run: Everything is created
        # ----------------------------------------------------------------------
        stats1 = seed_demo(db, reset=False)
        db.commit()

        assert stats1["users_created"] == 5
        assert stats1["users_skipped"] == 0
        assert stats1["cinemas_created"] == 2
        assert stats1["cinemas_skipped"] == 0
        assert stats1["halls_created"] == 4
        assert stats1["halls_skipped"] == 0
        assert stats1["seats_created"] == 220  # 4 halls * 55 seats
        assert stats1["seats_skipped"] == 0
        assert stats1["showtimes_created"] == 112  # 4 halls * 7 days * 4 slots
        assert stats1["showtimes_skipped"] == 0
        assert stats1["food_items_created"] == 8
        assert stats1["food_items_skipped"] == 0
        assert stats1["vouchers_created"] == 4
        assert stats1["vouchers_skipped"] == 0
        assert stats1["orders_created"] == 1
        assert stats1["orders_skipped"] == 0
        assert stats1["tickets_created"] == 2
        assert stats1["tickets_skipped"] == 0
        assert stats1["payments_created"] == 1
        assert stats1["payments_skipped"] == 0

        # Verify password verification works for all accounts
        for acc in DEMO_ACCOUNTS:
            user = db.scalar(select(User).where(User.email == acc["email"]))
            assert user is not None
            assert user.role == acc["role"]
            assert verify_password(DEMO_PASSWORD, user.password_hash)

        # Verify vouchers
        vouchers = {v.code: v for v in db.scalars(select(Voucher)).all()}
        assert "CINEGO10" in vouchers and vouchers["CINEGO10"].value == Decimal("10")
        assert "GIAM20K" in vouchers and vouchers["GIAM20K"].min_order == Decimal("150000")
        assert "HETHAN" in vouchers and vouchers["HETHAN"].ends_at is not None
        assert "HETLUOT" in vouchers and vouchers["HETLUOT"].usage_limit == 0

        # Verify pre-seeded order & tickets for customer3
        customer3 = db.scalar(select(User).where(User.email == "customer3@cinego.vn"))
        assert customer3 is not None
        order = db.scalar(select(Order).where(Order.user_id == customer3.id))
        assert order is not None
        assert order.payment_status == "paid"
        assert order.order_status == "confirmed"

        payment = db.scalar(select(Payment).where(Payment.order_id == order.id))
        assert payment is not None
        assert payment.status == "succeeded"

        tickets = db.scalars(select(Ticket).where(Ticket.order_id == order.id)).all()
        assert len(tickets) == 2
        for t in tickets:
            assert t.status == "issued"
            assert t.ticket_code.startswith("TK")
            # Verify QR signing and verifying works
            qr_tokens = stats1["demo_order_details"]["qr_tokens"]
            verified_ids = [verify_ticket_token(tok) for tok in qr_tokens]
            assert t.id in verified_ids

        # ----------------------------------------------------------------------
        # Test Second Run: Idempotency (0 created, all skipped)
        # ----------------------------------------------------------------------
        stats2 = seed_demo(db, reset=False)
        db.commit()

        assert stats2["users_created"] == 0
        assert stats2["users_skipped"] == 5
        assert stats2["cinemas_created"] == 0
        assert stats2["cinemas_skipped"] == 2
        assert stats2["halls_created"] == 0
        assert stats2["halls_skipped"] == 4
        assert stats2["seats_created"] == 0
        assert stats2["seats_skipped"] == 220
        assert stats2["showtimes_created"] == 0
        assert stats2["showtimes_skipped"] == 112
        assert stats2["food_items_created"] == 0
        assert stats2["food_items_skipped"] == 8
        assert stats2["vouchers_created"] == 0
        assert stats2["vouchers_skipped"] == 4
        assert stats2["orders_created"] == 0
        assert stats2["orders_skipped"] == 1
        assert stats2["tickets_created"] == 0
        assert stats2["tickets_skipped"] == 2
        assert stats2["payments_created"] == 0
        assert stats2["payments_skipped"] == 1

        # Check total counts in DB have not doubled
        assert len(db.scalars(select(User)).all()) == 5
        assert len(db.scalars(select(Cinema)).all()) == 2
        assert len(db.scalars(select(Hall)).all()) == 4
        assert len(db.scalars(select(Seat)).all()) == 220
        assert len(db.scalars(select(Showtime)).all()) == 112
        assert len(db.scalars(select(FoodItem)).all()) == 8
        assert len(db.scalars(select(Voucher)).all()) == 4
        assert len(db.scalars(select(Order)).all()) == 1
        assert len(db.scalars(select(Ticket)).all()) == 2
        assert len(db.scalars(select(Payment)).all()) == 1

        # ----------------------------------------------------------------------
        # Test Reset: Demo data safely cleaned up and recreated
        # ----------------------------------------------------------------------
        stats3 = seed_demo(db, reset=True)
        db.commit()

        assert stats3["reset"] is True
        assert stats3["reset_stats"]["deleted_users"] == 5
        assert stats3["reset_stats"]["deleted_cinemas"] == 2
        assert stats3["reset_stats"]["deleted_halls"] == 4
        assert stats3["reset_stats"]["deleted_seats"] == 220
        assert stats3["reset_stats"]["deleted_showtimes"] == 112
        assert stats3["reset_stats"]["deleted_food_items"] == 8
        assert stats3["reset_stats"]["deleted_vouchers"] == 4
        assert stats3["reset_stats"]["deleted_orders"] == 1

        # Re-created correctly
        assert stats3["users_created"] == 5
        assert stats3["cinemas_created"] == 2
        assert stats3["halls_created"] == 4
        assert stats3["seats_created"] == 220
        assert stats3["showtimes_created"] == 112
        assert stats3["food_items_created"] == 8
        assert stats3["vouchers_created"] == 4
        assert stats3["orders_created"] == 1
        assert stats3["tickets_created"] == 2
        assert stats3["payments_created"] == 1

        # CRITICAL: Verify movies table was NEVER touched or deleted
        all_movies = db.scalars(select(Movie)).all()
        assert len(all_movies) == 3
        now_showing = [m for m in all_movies if m.status == "now_showing"]
        coming_soon = [m for m in all_movies if m.status == "coming_soon"]
        assert len(now_showing) == 2
        assert len(coming_soon) == 1
