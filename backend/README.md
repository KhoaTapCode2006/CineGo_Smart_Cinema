# CineGo Smart Cinema Backend

FastAPI-based backend for CineGo Smart Cinema. This service manages authentication, movie catalog, seat availability, real-time seat holds, bookings, ticket issuance, payments, and administrative operations for a cinema booking platform.

## Overview

The backend is built with:

- FastAPI for the REST API layer
- SQLAlchemy 2.0 for ORM and database access
- PostgreSQL as the primary database
- JWT-based authentication with server-side revocable sessions
- Password hashing with Argon2 via `pwdlib`
- Real-time seat hold expiry and seat status updates
- Role-based access for customers, staff, and admins

The application is configured with a global API prefix:

- `/api/v1`

The service exposes health endpoints and uses environment-based configuration with `.env`.

## Project structure

```text
backend/
├── app/
│   ├── __init__.py
│   ├── config.py
│   ├── create_admin.py
│   ├── db.py
│   ├── dependencies.py
│   ├── main.py
│   ├── models.py
│   ├── tmdb_import.py
│   ├── routers/
│   │   ├── admin.py
│   │   ├── auth.py
│   │   ├── catalog.py
│   │   ├── orders.py
│   │   ├── seats.py
│   │   ├── tickets.py
│   │   └── __init__.py
│   ├── schemas.py
│   └── security.py
├── db/
│   ├── migrations/
│   │   └── 001_tmdb_movie_cast.sql
│   └── schema.sql
├── tests/
│   ├── test_api.py
│   └── test_tmdb_import.py
├── .env.example
├── README.md
├── requirements.txt
├── requirements-dev.txt
└── .env
```

## Main domain model

The database contains the following key entities:

- `users` — customer, staff, and admin accounts
- `auth_sessions` — active JWT session records
- `movies` — movie metadata and status, with an optional TMDB ID
- `casts` and `movie_cast` — normalized TMDB cast profiles and per-movie character credits
- `cinemas` and `halls` — theater infrastructure
- `seats` — per-seat pricing and availability metadata
- `showtimes` — screening schedules
- `food_items` — concession items
- `vouchers` — discount rules
- `orders` — booking requests and totals
- `seat_holds` — temporary seat reservations with expiry
- `payments` — payment records with idempotency keys
- `tickets` — issued tickets and check-in state
- `password_reset_tokens` — password recovery workflow

The schema enforces constraints for seat conflict detection, order totals, user roles, and payment statuses.

## Features

### Authentication and user management

The auth API supports:

- user registration
- login with account lockout after repeated failed attempts
- logout by revoking the current session
- current-user profile retrieval
- profile updates, including password change
- web socket ticket generation for real-time client access
- password reset requests and confirmation

Authentication uses bearer JWT tokens with session validation through dependency injection.

### Catalog and booking flow

The catalog API provides:

- movie listing with search, filter, and pagination
- movie details
- cinema list
- showtime listing with capacity, sold seats, and held seats
- seat map for a showtime
- food item listing

### Seat holds and real-time availability

Seat locking is handled by `seat_holds`:

- a seat can be temporarily held for a configured TTL (default 5 minutes)
- expired holds are swept by a background task
- ordering and release logic prevents double booking
- seat updates can be pushed to connected clients through a socket manager

This supports booking flows where users choose seats before final payment.

### Orders, payments, and tickets

The order flow includes:

- create order from selected seats and optional food items
- voucher validation and discount calculation
- payment processing through a payment endpoint
- automatic ticket generation for confirmed orders
- order retrieval and cancellation for valid states
- ticket lookup and staff check-in

Order and ticket states are constrained by the schema and API logic, including pending, confirmed, expired, and cancelled states.

### Admin capabilities

The admin router supports management of:

- movies
- cinemas
- halls and seat layouts
- showtimes
- food items
- vouchers
- users
- dashboard statistics

The showtime creation logic is designed to reject overlapping hall schedules.

## Environment configuration

Create a `.env` file in the `backend/` directory by copying `.env.example`.

Example configuration:

```env
APP_NAME=CineGo API
ENVIRONMENT=development
API_V1_PREFIX=/api/v1
DATABASE_URL=postgresql://user:password@host:5432/cinego
JWT_SECRET=replace-with-at-least-32-random-bytes
JWT_ISSUER=cinego-api
JWT_ACCESS_TOKEN_MINUTES=30
QR_SIGNING_SECRET=replace-with-a-different-32-byte-random-secret
SEAT_HOLD_MINUTES=5
MAX_SEATS_PER_ORDER=8
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
SMTP_HOST=
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=
FRONTEND_RESET_URL=
```

Important notes:

- `DATABASE_URL` must point to a PostgreSQL database
- `JWT_SECRET` and `QR_SIGNING_SECRET` must be different values
- CORS origins must be configured for local frontend development
- Production mode enforces stricter security settings

## Database setup

This project expects PostgreSQL with the schema in `backend/db/schema.sql`.

Typical steps:

```bash
cd backend
createdb cinego
psql -d cinego -f db/schema.sql
```

If you are using Supabase or a managed PostgreSQL instance, load the schema into that database instead.

For an existing database, apply the additive TMDB schema migration:

```bash
psql -d cinego -f db/migrations/001_tmdb_movie_cast.sql
```

The original `movies.casts` text field is retained for existing API clients. The importer keeps it populated with the first ten cast names, while all available credited cast members and their character/order details are stored in `casts` and `movie_cast`.

## Importing movies from TMDB

Create a TMDB API Read Access Token and set it as `TMDB_API_READ_ACCESS_TOKEN` in `backend/.env`. The token is sent as a bearer token in the Authorization header and is never placed in the request URL.

Run the importer from the `backend` directory:

```bash
python -m app.tmdb_import --pages 1 --language en-US --region US
```

Each discover page has up to 20 results. The importer fetches movie details (runtime, genre, certification, and trailer) and the dedicated movie credits endpoint (cast and director). It stores the first TMDB genre in the single-valued `movies.genre` column, uses the movie's original language code, and sets new records to `coming_soon`; re-imports update provider metadata without overwriting an admin-managed status. Results without a positive runtime are reported and skipped because `movies.duration_minutes` is required.

`--pages` defaults to 1 and accepts values from 1 to 500. `--region` defaults to `US` and controls both TMDB's regional release filtering and certification lookup; pass `--region ""` to disable regional filtering. Imports are repeatable: movies and cast members are matched by their TMDB IDs.

The importer retries temporary connection failures up to five times with exponential backoff. If all attempts fail with a connection reset during TLS setup, the connection is being closed before TMDB returns an HTTP response; check that the machine can reach `api.themoviedb.org` over HTTPS and that any firewall, proxy, VPN, or TLS-inspection software allows the connection. A persistent reset cannot be resolved by retrying alone.

## Installation

From the `backend` directory:

```bash
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

For local development with extra test tooling:

```bash
pip install -r requirements-dev.txt
```

## Running the backend

Start the FastAPI application with Uvicorn:

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The app will be available at:

- API: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health/live`

## API overview

The API is organized by module under the `/api/v1` prefix.

### Auth

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`
- `PATCH /api/v1/auth/me`
- `POST /api/v1/auth/socket-ticket`
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/confirm`

### Catalog

- `GET /api/v1/movies`
- `GET /api/v1/movies/{movie_id}`
- `GET /api/v1/cinemas`
- `GET /api/v1/showtimes`
- `GET /api/v1/showtimes/{showtime_id}/seats`
- `GET /api/v1/food`

### Seats and holds

- `POST /api/v1/showtimes/{showtime_id}/seat-holds`
- `DELETE /api/v1/seat-holds/{hold_id}`
- `POST /api/v1/showtimes/{showtime_id}/smart-seat`

### Orders and payments

- `POST /api/v1/orders`
- `GET /api/v1/orders`
- `GET /api/v1/orders/{order_id}`
- `DELETE /api/v1/orders/{order_id}`
- `POST /api/v1/orders/{order_id}/payments`

### Tickets and staff check-in

- `GET /api/v1/tickets`
- `GET /api/v1/tickets/{ticket_code}`
- `POST /api/v1/staff/check-in`

### Admin

- `POST /api/v1/movies`
- `DELETE /api/v1/movies/{movie_id}`
- `POST /api/v1/cinemas`
- `POST /api/v1/halls`
- `PUT /api/v1/halls/{hall_id}/seats`
- `POST /api/v1/showtimes`
- `POST /api/v1/food`
- `POST /api/v1/vouchers`
- `GET /api/v1/users`
- `GET /api/v1/orders`
- `GET /api/v1/dashboard`

## Health and diagnostics

The app exposes:

- `GET /health/live` — lightweight liveness check
- `GET /health/ready` — verifies the database is reachable

## Security and operational notes

- JWT tokens are signed and validated server-side
- sessions can be revoked and are checked by dependency guards
- seat holds expire automatically in a background loop
- expired holds can update related orders to `expired`
- API responses include strict security headers
- admin and customer routes are separated through permission-aware dependencies
- production environment restricts open CORS and disables public docs

## Dữ liệu demo (Demo Seeding)

Backend cung cấp script `app.seed_demo` giúp khởi tạo toàn bộ dữ liệu mẫu phục vụ phát triển, thử nghiệm luồng đặt vé và kiểm thử frontend.

### Hướng dẫn chạy

Từ thư mục `backend`:

```bash
# Khởi tạo dữ liệu demo (tự động bỏ qua các bản ghi đã tồn tại)
python -m app.seed_demo

# Xóa sạch dữ liệu demo cũ và tạo lại từ đầu
python -m app.seed_demo --reset
```

> **Lưu ý quan trọng**:
> - Script có tính **idempotent**: chạy nhiều lần không tạo trùng lặp dữ liệu.
> - Tham số `--reset` chỉ xóa an toàn dữ liệu demo được tạo bởi script (theo thứ tự khóa ngoại an toàn); **tuyệt đối không xóa hay thay đổi trạng thái của bảng phim (`movies`)**.
> - Script sử dụng các phim có sẵn trạng thái `now_showing` trong database để tạo lịch chiếu.
> - Toàn bộ quá trình chạy trong 1 transaction an toàn; nếu có lỗi sẽ tự động rollback.

### Dữ liệu được khởi tạo

1. **Tài khoản người dùng** (Mật khẩu chung: `Password123`):
   | Email | Vai trò | Họ tên | Ghi chú |
   |---|---|---|---|
   | `admin@cinego.vn` | `admin` | CineGo Administrator | Quản trị hệ thống |
   | `staff@cinego.vn` | `staff` | CineGo Staff | Nhân viên soát vé / check-in |
   | `customer1@cinego.vn` | `customer` | Nguyễn Văn An | Khách hàng demo |
   | `customer2@cinego.vn` | `customer` | Trần Thị Bình | Khách hàng demo |
   | `customer3@cinego.vn` | `customer` | Lê Hoàng Nam | Đã có sẵn 1 đơn đặt vé & vé QR |

2. **Rạp & Phòng chiếu**:
   - `[DEMO] CineGo Landmark 81` (Hall 1, Hall 2)
   - `[DEMO] CineGo Thủ Đức` (Hall 1, Hall 2)
   - Mỗi phòng 6 hàng x 10 cột (55 ghế): Hàng A–C Standard (ghế A1 là Accessible), Hàng D–E VIP (+20.000đ), Hàng F gồm 5 ghế đôi Couple (+40.000đ).

3. **Suất chiếu (Showtimes)**:
   - Trong 7 ngày tới (tính từ ngày mai theo giờ `Asia/Ho_Chi_Minh`), mỗi phòng 4 suất chiếu/ngày: `10:00`, `13:30`, `17:00`, `20:30`.
   - Giá vé cơ bản: `75.000đ` (suất trước 17:00) và `95.000đ` (suất từ 17:00).
   - Xoay vòng phim từ danh sách `now_showing`; thời lượng kết thúc `end_at = start_at + duration_minutes + 15 phút`.

4. **Bắp nước & Combo (FoodItems, tồn kho 500)**:
   - Bắp: Bắp rang bơ M (45k), Bắp rang bơ L (55k), Bắp phô mai L (65k)
   - Nước: Coca-Cola L (35k), Pepsi L (35k), Nước suối (20k)
   - Combo: Combo 1 bắp + 1 nước (89k), Combo 1 bắp + 2 nước (109k)

5. **Mã giảm giá (Vouchers)**:
   | Mã Code | Loại | Giá trị | Điều kiện áp dụng | Mục đích test |
   |---|---|---|---|---|
   | `CINEGO10` | percent | 10% | Tối đa 50.000đ | Voucher % hợp lệ |
   | `GIAM20K` | fixed | 20.000đ | Đơn hàng từ 150.000đ | Voucher số tiền cố định |
   | `HETHAN` | percent | 15% | Đã hết hạn (ngày hôm qua) | Test voucher quá hạn (lỗi 422) |
   | `HETLUOT` | fixed | 10.000đ | Lượt dùng giới hạn = 0 | Test voucher hết lượt (lỗi 422) |

6. **Đơn hàng mẫu & Vé QR có sẵn**:
   - Tạo sẵn 1 đơn hàng trạng thái `paid` cho `customer3@cinego.vn` ở suất chiếu ngày mai tại `[DEMO] CineGo Landmark 81 - Hall 1`.
   - Đặt 2 ghế VIP (D5, D6) với 2 mã vé (`TK...`) kèm token QR hợp lệ (ký bằng `sign_ticket`).
   - Có thể kiểm tra ngay trên trang "Vé của tôi" hoặc test cổng soát vé `POST /api/v1/staff/check-in`.

## Testing

The repository includes a small API test suite under `backend/tests`.

Run tests with:

```bash
cd backend
pytest
```

## Notes for frontend integration

This backend is designed to support a frontend that performs:

- authentication and session management
- movie and showtime browsing
- seat selection with temporary locks
- checkout and payment simulation
- order history and ticket retrieval
- staff check-in at the cinema gate

For real production deployment, frontend domain, database, secret management, and SMTP settings should be configured securely in the environment.
