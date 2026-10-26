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
│   └── schema.sql
├── tests/
│   └── test_api.py
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
- `movies` — movie metadata and status
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
