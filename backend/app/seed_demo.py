import argparse
import secrets
import sys
import uuid
from datetime import datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models import (
    AuthSession,
    Cinema,
    FoodItem,
    Hall,
    Movie,
    Order,
    OrderItem,
    PasswordResetToken,
    Payment,
    Seat,
    SeatHold,
    Showtime,
    Ticket,
    User,
    Voucher,
    WebSocketTicket,
)
from app.security import hash_password, sign_ticket

DEMO_PASSWORD = "Password123"

DEMO_ACCOUNTS = [
    {
        "full_name": "CineGo Administrator",
        "email": "admin@cinego.vn",
        "role": "admin",
        "phone": "0901000001",
    },
    {
        "full_name": "CineGo Staff",
        "email": "staff@cinego.vn",
        "role": "staff",
        "phone": "0901000002",
    },
    {
        "full_name": "Nguyễn Văn An",
        "email": "customer1@cinego.vn",
        "role": "customer",
        "phone": "0901000003",
    },
    {
        "full_name": "Trần Thị Bình",
        "email": "customer2@cinego.vn",
        "role": "customer",
        "phone": "0901000004",
    },
    {
        "full_name": "Lê Hoàng Nam",
        "email": "customer3@cinego.vn",
        "role": "customer",
        "phone": "0901000005",
    },
]

DEMO_CINEMAS = [
    {
        "name": "[DEMO] CineGo Landmark 81",
        "address": "Tầng B1, Vincom Center Landmark 81, 720A Điện Biên Phủ, P. 22, Q. Bình Thạnh, TP. Hồ Chí Minh",
        "halls": ["Hall 1", "Hall 2"],
    },
    {
        "name": "[DEMO] CineGo Thủ Đức",
        "address": "216 Võ Văn Ngân, P. Bình Thọ, TP. Thủ Đức, TP. Hồ Chí Minh",
        "halls": ["Hall 1", "Hall 2"],
    },
]

DEMO_FOOD_ITEMS = [
    {"name": "Bắp rang bơ M", "category": "Bắp", "price": Decimal("45000"), "stock": 500},
    {"name": "Bắp rang bơ L", "category": "Bắp", "price": Decimal("55000"), "stock": 500},
    {"name": "Bắp phô mai L", "category": "Bắp", "price": Decimal("65000"), "stock": 500},
    {"name": "Coca-Cola L", "category": "Nước", "price": Decimal("35000"), "stock": 500},
    {"name": "Pepsi L", "category": "Nước", "price": Decimal("35000"), "stock": 500},
    {"name": "Nước suối", "category": "Nước", "price": Decimal("20000"), "stock": 500},
    {"name": "Combo 1 bắp + 1 nước", "category": "Combo", "price": Decimal("89000"), "stock": 500},
    {"name": "Combo 1 bắp + 2 nước", "category": "Combo", "price": Decimal("109000"), "stock": 500},
]

SLOT_TIMES = [
    time(10, 0),
    time(13, 30),
    time(17, 0),
    time(20, 30),
]


def get_demo_vouchers(now_utc: datetime) -> list[dict[str, Any]]:
    return [
        {
            "code": "CINEGO10",
            "voucher_type": "percent",
            "value": Decimal("10"),
            "min_order": Decimal("0"),
            "max_discount": Decimal("50000"),
            "starts_at": None,
            "ends_at": None,
            "usage_limit": None,
            "usage_count": 0,
            "status": "active",
            "description": "Giảm 10%, tối đa 50k",
        },
        {
            "code": "GIAM20K",
            "voucher_type": "fixed",
            "value": Decimal("20000"),
            "min_order": Decimal("150000"),
            "max_discount": Decimal("0"),
            "starts_at": None,
            "ends_at": None,
            "usage_limit": None,
            "usage_count": 0,
            "status": "active",
            "description": "Giảm 20k cho đơn từ 150k",
        },
        {
            "code": "HETHAN",
            "voucher_type": "percent",
            "value": Decimal("15"),
            "min_order": Decimal("0"),
            "max_discount": Decimal("0"),
            "starts_at": now_utc - timedelta(days=30),
            "ends_at": now_utc - timedelta(days=1),
            "usage_limit": None,
            "usage_count": 0,
            "status": "active",
            "description": "Hết hạn hôm qua (test voucher hết hạn)",
        },
        {
            "code": "HETLUOT",
            "voucher_type": "fixed",
            "value": Decimal("10000"),
            "min_order": Decimal("0"),
            "max_discount": Decimal("0"),
            "starts_at": None,
            "ends_at": None,
            "usage_limit": 0,
            "usage_count": 0,
            "status": "active",
            "description": "Lượt dùng = 0 (test voucher hết lượt)",
        },
    ]


def reset_demo_data(db: Session) -> dict[str, int]:
    """
    Safely delete demo data in correct foreign-key order.
    NEVER deletes or modifies any movies in the movies table.
    """
    demo_emails = [a["email"] for a in DEMO_ACCOUNTS]
    demo_cinemas = [c["name"] for c in DEMO_CINEMAS]
    demo_voucher_codes = ["CINEGO10", "GIAM20K", "HETHAN", "HETLUOT"]
    demo_food_names = [f["name"] for f in DEMO_FOOD_ITEMS]

    demo_user_ids = db.scalars(select(User.id).where(User.email.in_(demo_emails))).all()
    demo_cinema_ids = db.scalars(
        select(Cinema.id).where(
            or_(Cinema.name.in_(demo_cinemas), Cinema.name.like("[DEMO]%"))
        )
    ).all()

    demo_hall_ids = (
        db.scalars(select(Hall.id).where(Hall.cinema_id.in_(demo_cinema_ids))).all()
        if demo_cinema_ids
        else []
    )

    demo_seat_ids = (
        db.scalars(select(Seat.id).where(Seat.hall_id.in_(demo_hall_ids))).all()
        if demo_hall_ids
        else []
    )

    demo_showtime_ids = (
        db.scalars(select(Showtime.id).where(Showtime.hall_id.in_(demo_hall_ids))).all()
        if demo_hall_ids
        else []
    )

    demo_voucher_ids = db.scalars(
        select(Voucher.id).where(Voucher.code.in_(demo_voucher_codes))
    ).all()

    demo_food_ids = db.scalars(
        select(FoodItem.id).where(FoodItem.name.in_(demo_food_names))
    ).all()

    order_clauses = []
    if demo_user_ids:
        order_clauses.append(Order.user_id.in_(demo_user_ids))
    if demo_showtime_ids:
        order_clauses.append(Order.showtime_id.in_(demo_showtime_ids))
    if demo_voucher_ids:
        order_clauses.append(Order.voucher_id.in_(demo_voucher_ids))

    demo_order_ids = (
        db.scalars(select(Order.id).where(or_(*order_clauses))).all()
        if order_clauses
        else []
    )

    # 1. Payments
    if demo_order_ids:
        db.execute(delete(Payment).where(Payment.order_id.in_(demo_order_ids)))

    # 2. Tickets
    ticket_clauses = []
    if demo_order_ids:
        ticket_clauses.append(Ticket.order_id.in_(demo_order_ids))
    if demo_showtime_ids:
        ticket_clauses.append(Ticket.showtime_id.in_(demo_showtime_ids))
    if demo_seat_ids:
        ticket_clauses.append(Ticket.seat_id.in_(demo_seat_ids))
    if ticket_clauses:
        db.execute(delete(Ticket).where(or_(*ticket_clauses)))

    # 3. OrderItems
    order_item_clauses = []
    if demo_order_ids:
        order_item_clauses.append(OrderItem.order_id.in_(demo_order_ids))
    if demo_food_ids:
        order_item_clauses.append(OrderItem.ref_id.in_(demo_food_ids))
    if order_item_clauses:
        db.execute(delete(OrderItem).where(or_(*order_item_clauses)))

    # 4. SeatHolds
    hold_clauses = []
    if demo_order_ids:
        hold_clauses.append(SeatHold.order_id.in_(demo_order_ids))
    if demo_showtime_ids:
        hold_clauses.append(SeatHold.showtime_id.in_(demo_showtime_ids))
    if demo_seat_ids:
        hold_clauses.append(SeatHold.seat_id.in_(demo_seat_ids))
    if demo_user_ids:
        hold_clauses.append(SeatHold.user_id.in_(demo_user_ids))
    if hold_clauses:
        db.execute(delete(SeatHold).where(or_(*hold_clauses)))

    # 5. Orders
    if demo_order_ids:
        db.execute(delete(Order).where(Order.id.in_(demo_order_ids)))

    # 6. Showtimes
    if demo_showtime_ids:
        db.execute(delete(Showtime).where(Showtime.id.in_(demo_showtime_ids)))

    # 7. Seats
    if demo_seat_ids:
        db.execute(delete(Seat).where(Seat.id.in_(demo_seat_ids)))

    # 8. Halls
    if demo_hall_ids:
        db.execute(delete(Hall).where(Hall.id.in_(demo_hall_ids)))

    # 9. Cinemas
    if demo_cinema_ids:
        db.execute(delete(Cinema).where(Cinema.id.in_(demo_cinema_ids)))

    # 10. Vouchers
    if demo_voucher_ids:
        db.execute(delete(Voucher).where(Voucher.id.in_(demo_voucher_ids)))

    # 11. FoodItems
    if demo_food_ids:
        db.execute(delete(FoodItem).where(FoodItem.id.in_(demo_food_ids)))

    # 12. User auth tokens & Users
    if demo_user_ids:
        db.execute(delete(AuthSession).where(AuthSession.user_id.in_(demo_user_ids)))
        db.execute(delete(WebSocketTicket).where(WebSocketTicket.user_id.in_(demo_user_ids)))
        db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id.in_(demo_user_ids)))
        db.execute(delete(User).where(User.id.in_(demo_user_ids)))

    db.flush()

    return {
        "deleted_orders": len(demo_order_ids),
        "deleted_showtimes": len(demo_showtime_ids),
        "deleted_seats": len(demo_seat_ids),
        "deleted_halls": len(demo_hall_ids),
        "deleted_cinemas": len(demo_cinema_ids),
        "deleted_vouchers": len(demo_voucher_ids),
        "deleted_food_items": len(demo_food_ids),
        "deleted_users": len(demo_user_ids),
    }


def seed_demo(db: Session, reset: bool = False) -> dict[str, Any]:
    """
    Idempotent demo seeder.
    """
    now_utc = datetime.now(timezone.utc)
    vn_tz = ZoneInfo("Asia/Ho_Chi_Minh")
    now_vn = datetime.now(vn_tz)
    tomorrow_vn = (now_vn + timedelta(days=1)).date()

    stats: dict[str, Any] = {
        "reset": reset,
        "users_created": 0,
        "users_skipped": 0,
        "cinemas_created": 0,
        "cinemas_skipped": 0,
        "halls_created": 0,
        "halls_skipped": 0,
        "seats_created": 0,
        "seats_skipped": 0,
        "showtimes_created": 0,
        "showtimes_skipped": 0,
        "food_items_created": 0,
        "food_items_skipped": 0,
        "vouchers_created": 0,
        "vouchers_skipped": 0,
        "orders_created": 0,
        "orders_skipped": 0,
        "tickets_created": 0,
        "tickets_skipped": 0,
        "payments_created": 0,
        "payments_skipped": 0,
        "demo_order_details": None,
    }

    if reset:
        reset_stats = reset_demo_data(db)
        stats["reset_stats"] = reset_stats

    # 1. Accounts
    for account in DEMO_ACCOUNTS:
        existing_user = db.scalar(select(User).where(User.email == account["email"]))
        if existing_user is None:
            user = User(
                full_name=account["full_name"],
                email=account["email"],
                phone=account["phone"],
                password_hash=hash_password(DEMO_PASSWORD),
                role=account["role"],
                status="active",
            )
            db.add(user)
            stats["users_created"] += 1
        else:
            stats["users_skipped"] += 1
    db.flush()

    # 2. Cinemas, Halls, Seats
    for c_data in DEMO_CINEMAS:
        cinema = db.scalar(select(Cinema).where(Cinema.name == c_data["name"]))
        if cinema is None:
            cinema = Cinema(
                name=c_data["name"],
                address=c_data["address"],
                status="active",
            )
            db.add(cinema)
            db.flush()
            stats["cinemas_created"] += 1
        else:
            stats["cinemas_skipped"] += 1

        for hall_name in c_data["halls"]:
            hall = db.scalar(
                select(Hall).where(Hall.cinema_id == cinema.id, Hall.name == hall_name)
            )
            if hall is None:
                hall = Hall(
                    cinema_id=cinema.id,
                    name=hall_name,
                    hall_type="2D Standard",
                    rows_count=6,
                    columns_count=10,
                    status="active",
                )
                db.add(hall)
                db.flush()
                stats["halls_created"] += 1
            else:
                stats["halls_skipped"] += 1

            existing_seats = {
                (s.row_label, s.seat_number): s
                for s in db.scalars(select(Seat).where(Seat.hall_id == hall.id)).all()
            }

            seats_to_add: list[Seat] = []
            # Row A: A1 accessible, A2-A10 standard
            # Rows B-C: standard (modifier 0)
            # Rows D-E: vip (modifier 20000)
            # Row F: couple (5 seats, modifier 40000)
            for row in ["A", "B", "C", "D", "E", "F"]:
                if row in ["A", "B", "C"]:
                    for col in range(1, 11):
                        if (row, col) in existing_seats:
                            stats["seats_skipped"] += 1
                            continue
                        seat_type = "accessible" if row == "A" and col == 1 else "standard"
                        seats_to_add.append(
                            Seat(
                                hall_id=hall.id,
                                row_label=row,
                                seat_number=col,
                                seat_type=seat_type,
                                price_modifier=Decimal("0"),
                                status="active",
                            )
                        )
                        stats["seats_created"] += 1
                elif row in ["D", "E"]:
                    for col in range(1, 11):
                        if (row, col) in existing_seats:
                            stats["seats_skipped"] += 1
                            continue
                        seats_to_add.append(
                            Seat(
                                hall_id=hall.id,
                                row_label=row,
                                seat_number=col,
                                seat_type="vip",
                                price_modifier=Decimal("20000"),
                                status="active",
                            )
                        )
                        stats["seats_created"] += 1
                elif row == "F":
                    for col in range(1, 6):
                        if (row, col) in existing_seats:
                            stats["seats_skipped"] += 1
                            continue
                        seats_to_add.append(
                            Seat(
                                hall_id=hall.id,
                                row_label=row,
                                seat_number=col,
                                seat_type="couple",
                                price_modifier=Decimal("40000"),
                                status="active",
                            )
                        )
                        stats["seats_created"] += 1

            if seats_to_add:
                db.add_all(seats_to_add)
                db.flush()

    # 3. Showtimes
    now_showing_movies = db.scalars(
        select(Movie).where(Movie.status == "now_showing").order_by(Movie.title)
    ).all()

    if not now_showing_movies:
        raise RuntimeError(
            "Không tìm thấy phim nào có status='now_showing' trong database. "
            "Vui lòng đảm bảo đã có phim đang chiếu trước khi chạy seed_demo."
        )

    demo_cinema_ids = db.scalars(
        select(Cinema.id).where(Cinema.name.in_([c["name"] for c in DEMO_CINEMAS]))
    ).all()
    all_demo_halls = db.scalars(
        select(Hall).where(Hall.cinema_id.in_(demo_cinema_ids)).order_by(Hall.name)
    ).all()

    movie_count = len(now_showing_movies)

    for hall_idx, hall in enumerate(all_demo_halls):
        for day_offset in range(7):
            show_date = tomorrow_vn + timedelta(days=day_offset)
            for slot_idx, slot_time in enumerate(SLOT_TIMES):
                dt_vn = datetime.combine(show_date, slot_time, tzinfo=vn_tz)
                start_at_utc = dt_vn.astimezone(timezone.utc)

                existing_st = db.scalar(
                    select(Showtime).where(
                        Showtime.hall_id == hall.id,
                        Showtime.start_at == start_at_utc,
                    )
                )
                if existing_st is not None:
                    stats["showtimes_skipped"] += 1
                    continue

                movie_idx = (hall_idx + day_offset * len(SLOT_TIMES) + slot_idx) % movie_count
                movie = now_showing_movies[movie_idx]

                # Ensure end_at <= start_at + duration + 15 and does not overlap next slot
                effective_duration = min(movie.duration_minutes, 195)
                end_at_utc = start_at_utc + timedelta(minutes=effective_duration + 15)

                base_price = Decimal("75000") if slot_time.hour < 17 else Decimal("95000")

                showtime = Showtime(
                    movie_id=movie.id,
                    hall_id=hall.id,
                    start_at=start_at_utc,
                    end_at=end_at_utc,
                    base_price=base_price,
                    language=movie.language or "Tiếng Việt",
                    status="scheduled",
                )
                db.add(showtime)
                stats["showtimes_created"] += 1

    db.flush()

    # 4. Food Items
    for item in DEMO_FOOD_ITEMS:
        existing_food = db.scalar(select(FoodItem).where(FoodItem.name == item["name"]))
        if existing_food is None:
            food = FoodItem(
                name=item["name"],
                category=item["category"],
                price=item["price"],
                stock=item["stock"],
                status="active",
            )
            db.add(food)
            stats["food_items_created"] += 1
        else:
            stats["food_items_skipped"] += 1
    db.flush()

    # 5. Vouchers
    for v_data in get_demo_vouchers(now_utc):
        existing_voucher = db.scalar(select(Voucher).where(Voucher.code == v_data["code"]))
        if existing_voucher is None:
            voucher = Voucher(
                code=v_data["code"],
                voucher_type=v_data["voucher_type"],
                value=v_data["value"],
                min_order=v_data["min_order"],
                max_discount=v_data["max_discount"],
                starts_at=v_data["starts_at"],
                ends_at=v_data["ends_at"],
                usage_limit=v_data["usage_limit"],
                usage_count=v_data["usage_count"],
                status=v_data["status"],
            )
            db.add(voucher)
            stats["vouchers_created"] += 1
        else:
            stats["vouchers_skipped"] += 1
    db.flush()

    # 6. Pre-seeded paid order for customer3@cinego.vn
    customer3 = db.scalar(select(User).where(User.email == "customer3@cinego.vn"))
    if customer3 is None:
        raise RuntimeError("Tài khoản customer3@cinego.vn không tồn tại.")

    landmark_hall_1 = db.scalar(
        select(Hall)
        .join(Cinema, Hall.cinema_id == Cinema.id)
        .where(Cinema.name == "[DEMO] CineGo Landmark 81", Hall.name == "Hall 1")
    )

    if landmark_hall_1:
        target_showtime = db.scalar(
            select(Showtime)
            .where(Showtime.hall_id == landmark_hall_1.id)
            .order_by(Showtime.start_at.asc())
        )

        if target_showtime:
            existing_order = db.scalar(
                select(Order).where(
                    Order.user_id == customer3.id,
                    Order.showtime_id == target_showtime.id,
                    Order.payment_status == "paid",
                )
            )

            if existing_order is not None:
                stats["orders_skipped"] += 1
                stats["tickets_skipped"] += 2
                stats["payments_skipped"] += 1
                tickets = db.scalars(
                    select(Ticket).where(Ticket.order_id == existing_order.id)
                ).all()
                movie = db.get(Movie, target_showtime.movie_id)
                stats["demo_order_details"] = {
                    "order_code": existing_order.order_code,
                    "movie_title": movie.title if movie else "Unknown",
                    "cinema": "[DEMO] CineGo Landmark 81",
                    "hall": "Hall 1",
                    "seats": "D5, D6 (VIP)",
                    "tickets": [t.ticket_code for t in tickets],
                    "qr_tokens": [sign_ticket(t.id) for t in tickets],
                }
            else:
                seat_d5 = db.scalar(
                    select(Seat).where(
                        Seat.hall_id == landmark_hall_1.id,
                        Seat.row_label == "D",
                        Seat.seat_number == 5,
                    )
                )
                seat_d6 = db.scalar(
                    select(Seat).where(
                        Seat.hall_id == landmark_hall_1.id,
                        Seat.row_label == "D",
                        Seat.seat_number == 6,
                    )
                )

                if seat_d5 and seat_d6:
                    seat1_price = target_showtime.base_price + seat_d5.price_modifier
                    seat2_price = target_showtime.base_price + seat_d6.price_modifier
                    subtotal = seat1_price + seat2_price

                    order = Order(
                        order_code=f"CG{secrets.token_hex(8).upper()}",
                        user_id=customer3.id,
                        showtime_id=target_showtime.id,
                        voucher_id=None,
                        subtotal=subtotal,
                        discount=Decimal("0"),
                        total=subtotal,
                        payment_status="paid",
                        order_status="confirmed",
                        created_at=now_utc,
                    )
                    db.add(order)
                    db.flush()

                    hold1 = SeatHold(
                        showtime_id=target_showtime.id,
                        seat_id=seat_d5.id,
                        user_id=customer3.id,
                        order_id=order.id,
                        expires_at=now_utc + timedelta(minutes=15),
                        released_at=now_utc,
                    )
                    hold2 = SeatHold(
                        showtime_id=target_showtime.id,
                        seat_id=seat_d6.id,
                        user_id=customer3.id,
                        order_id=order.id,
                        expires_at=now_utc + timedelta(minutes=15),
                        released_at=now_utc,
                    )
                    db.add_all([hold1, hold2])

                    payment = Payment(
                        order_id=order.id,
                        idempotency_key=f"demo-pay-{order.id.hex}",
                        amount=order.total,
                        payment_method="mock_card",
                        status="succeeded",
                        created_at=now_utc,
                    )
                    db.add(payment)

                    ticket1 = Ticket(
                        order_id=order.id,
                        showtime_id=target_showtime.id,
                        seat_id=seat_d5.id,
                        ticket_code=f"TK{secrets.token_hex(8).upper()}",
                        status="issued",
                        created_at=now_utc,
                    )
                    ticket2 = Ticket(
                        order_id=order.id,
                        showtime_id=target_showtime.id,
                        seat_id=seat_d6.id,
                        ticket_code=f"TK{secrets.token_hex(8).upper()}",
                        status="issued",
                        created_at=now_utc,
                    )
                    db.add_all([ticket1, ticket2])
                    db.flush()

                    stats["orders_created"] += 1
                    stats["tickets_created"] += 2
                    stats["payments_created"] += 1

                    movie = db.get(Movie, target_showtime.movie_id)
                    stats["demo_order_details"] = {
                        "order_code": order.order_code,
                        "movie_title": movie.title if movie else "Unknown",
                        "cinema": "[DEMO] CineGo Landmark 81",
                        "hall": "Hall 1",
                        "seats": "D5, D6 (VIP)",
                        "tickets": [ticket1.ticket_code, ticket2.ticket_code],
                        "qr_tokens": [sign_ticket(ticket1.id), sign_ticket(ticket2.id)],
                    }

    return stats


def print_report(stats: dict[str, Any]) -> None:
    sep = "=" * 80
    sub_sep = "-" * 80
    print("\n" + sep)
    print("                     CINEGO DEMO DATA SEED REPORT")
    print(sep)
    mode = "RESET & SEED" if stats.get("reset") else "SEED (Idempotent)"
    print(f"Chế độ thực thi: {mode}")

    if stats.get("reset") and "reset_stats" in stats:
        rs = stats["reset_stats"]
        print("\nDữ liệu demo cũ đã được dọn sạch:")
        print(
            f"  - Đơn hàng: {rs['deleted_orders']} | Suất chiếu: {rs['deleted_showtimes']} | Ghế: {rs['deleted_seats']}"
        )
        print(
            f"  - Phòng chiếu: {rs['deleted_halls']} | Rạp: {rs['deleted_cinemas']} | Bắp nước: {rs['deleted_food_items']}"
        )
        print(f"  - Voucher: {rs['deleted_vouchers']} | Tài khoản demo: {rs['deleted_users']}")

    print("\nBẢNG TỔNG KẾT DỮ LIỆU:")
    print(sub_sep)
    print(f"{'Loại thực thể':<24} | {'Tạo mới':<12} | {'Bỏ qua':<12}")
    print(sub_sep)
    entities = [
        ("Tài khoản (Users)", stats["users_created"], stats["users_skipped"]),
        ("Rạp chiếu (Cinemas)", stats["cinemas_created"], stats["cinemas_skipped"]),
        ("Phòng chiếu (Halls)", stats["halls_created"], stats["halls_skipped"]),
        ("Ghế (Seats)", stats["seats_created"], stats["seats_skipped"]),
        ("Suất chiếu (Showtimes)", stats["showtimes_created"], stats["showtimes_skipped"]),
        ("Bắp nước (FoodItems)", stats["food_items_created"], stats["food_items_skipped"]),
        ("Voucher giảm giá", stats["vouchers_created"], stats["vouchers_skipped"]),
        ("Đơn hàng demo (Orders)", stats["orders_created"], stats["orders_skipped"]),
        ("Vé demo (Tickets)", stats["tickets_created"], stats["tickets_skipped"]),
        ("Giao dịch thanh toán", stats["payments_created"], stats["payments_skipped"]),
    ]
    for name, created, skipped in entities:
        print(f"{name:<24} | {created:<12} | {skipped:<12}")
    print(sub_sep)

    print("\nDANH SÁCH TÀI KHOẢN DEMO (Mật khẩu chung: Password123):")
    print(sub_sep)
    print(f"{'Email':<26} | {'Vai trò':<10} | {'Họ tên':<24} | {'Điện thoại'}")
    print(sub_sep)
    for acc in DEMO_ACCOUNTS:
        print(f"{acc['email']:<26} | {acc['role']:<10} | {acc['full_name']:<24} | {acc['phone']}")
    print(sub_sep)

    print("\nDANH SÁCH VOUCHER DEMO:")
    print(sub_sep)
    print(f"{'Mã Code':<10} | {'Loại':<8} | {'Giá trị':<10} | {'Đơn tối thiểu':<14} | {'Mô tả'}")
    print(sub_sep)
    print(f"{'CINEGO10':<10} | {'percent':<8} | {'10%':<10} | {'0đ':<14} | Giảm 10%, tối đa 50k")
    print(f"{'GIAM20K':<10} | {'fixed':<8} | {'20,000đ':<10} | {'150,000đ':<14} | Giảm 20k đơn từ 150k")
    print(f"{'HETHAN':<10} | {'percent':<8} | {'15%':<10} | {'0đ':<14} | Hết hạn hôm qua (test hết hạn)")
    print(f"{'HETLUOT':<10} | {'fixed':<8} | {'10,000đ':<10} | {'0đ':<14} | Lượt dùng = 0 (test hết lượt)")
    print(sub_sep)

    details = stats.get("demo_order_details")
    if details:
        print("\nĐƠN HÀNG DEMO ĐÃ THANH TOÁN (cho customer3@cinego.vn):")
        print(sub_sep)
        print(f"Mã đơn hàng : {details['order_code']}")
        print(f"Phim        : {details.get('movie_title', 'N/A')}")
        print(f"Rạp & Phòng : {details['cinema']} - {details['hall']}")
        print(f"Ghế đặt     : {details['seats']}")
        print(f"Mã vé       : {', '.join(details['tickets'])}")
        if "qr_tokens" in details and details["qr_tokens"]:
            print("QR Tokens   :")
            for idx, token in enumerate(details["qr_tokens"], start=1):
                print(f"  - Vé {idx} ({details['tickets'][idx-1]}): {token}")
        print(sub_sep)

    print(sep + "\n")


def run_seed(reset: bool = False) -> None:
    with SessionLocal() as db:
        try:
            stats = seed_demo(db, reset=reset)
            db.commit()
            print_report(stats)
        except Exception as exc:
            db.rollback()
            print(
                f"\n[LỖI] Quá trình seed demo thất bại và transaction đã rollback: {exc}",
                file=sys.stderr,
            )
            raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed CineGo demo data into database")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Xóa đúng dữ liệu demo do script tạo trước khi tạo mới",
    )
    args = parser.parse_args()
    run_seed(reset=args.reset)


if __name__ == "__main__":
    main()
