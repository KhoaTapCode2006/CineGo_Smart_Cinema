# CineGo Smart Cinema Final Test Report

On 2026-11-23, 15 functional test cases ran against the CineGo backend at commit `b52d8a6a728aa1f5797ea967549da75746fc0948` on `main`. **14 passed, 1 failed, and 0 were blocked.** The failure was reproduced on a separate run. The suite does not meet the acceptance criterion that all 15 cases pass.

| Use case | Executed | Pass | Fail | Blocked |
|---|---:|---:|---:|---:|
| UC1 Customer login | 5 | 5 | 0 | 0 |
| UC2 Seat hold | 5 | 5 | 0 | 0 |
| UC3 Simulated payment | 5 | 4 | 1 | 0 |
| **Total** | **15** | **14** | **1** | **0** |

[Test plan](test-plan.md) · [Test case procedures and expected results](functional-test-cases.md) · [Executable suite](../../backend/tests/functional_use_cases.py)

## Test environment

| Component | Verified configuration |
|---|---|
| Host | Windows 11 x64, build 26300, Asia/Saigon (UTC+07:00) |
| Runtime | Python 3.14.4, FastAPI 0.136.1, Starlette 1.0.0 |
| Test client and runner | Starlette ASGI `TestClient` with HTTPX 0.28.1, pytest 8.4.2, AnyIO 4.16.0 |
| Persistence | PostgreSQL 17.12 on local loopback, SQLAlchemy 2.0.49, psycopg 3.3.9. Each case ran against a fresh schema built from `backend/db/schema.sql`. |
| Application mode | `ENVIRONMENT=test`, API prefix `/api/v1`, five-minute hold duration, simulated card payments, synthetic customer accounts, and a future screening. Liveness and database readiness were checked for each case. |
| Scope | In-process REST API integration. The React UI, deployed Supabase environment, WebSocket notifications, background expiry job, and QR scanning at the gate were outside the run. |

The expiry cases set a real hold's stored deadline into the past and checked the next API request. The conflict case checked a competing request against an active hold. Database concurrency under simultaneous requests was outside scope.

A preliminary SQLite compatibility run reached a timezone comparison error during hold creation. SQLite is outside the supported database configuration for these flows, so all reported case results come from PostgreSQL. The tested Starlette version also emitted an AnyIO deprecation warning, which did not affect the functional outcomes.

## Local frontend and backend recheck

On 2026-11-23, the frontend at `http://localhost:3000` and the backend at `http://localhost:8000` both responded. The backend returned `200` from `/health/live` and `/health/ready`, and the catalog and showtime responses allowed requests from the frontend origin.

In Edge, the catalog showed 20 upcoming films and the Animals detail page loaded. The page displayed **No showtimes yet**, matching the `200` response with an empty showtime list. The running catalog contained zero films marked Now Showing. These read-only checks supplement the 15 API cases. Rerunning the full suite on the isolated PostgreSQL database again produced 14 passes and the PAY-03 failure documented below.

## Case results

| ID | Result | Actual observation |
|---|---|---|
| LGN-01 | Pass | Login and profile lookup returned `200`. The bearer token identified the correct customer. |
| LGN-02 | Pass | Incorrect password returned `401` with `Invalid email or password`. |
| LGN-03 | Pass | Unregistered email returned `401` with the same generic response. |
| LGN-04 | Pass | Malformed email returned `422` with an error on `email`. |
| LGN-05 | Pass | Empty password returned `422` with an error on `password`. |
| HLD-01 | Pass | `201` returned one hold with a five-minute deadline. A1 was `held` and A2 was `available`. |
| HLD-02 | Pass | `201` returned two distinct holds. Both requested seats were `held`. |
| HLD-03 | Pass | Customer B's overlapping request returned `409`. A1 stayed `held` and A2 stayed `available`. |
| HLD-04 | Pass | Release returned `204`. A1 became `available`, and Customer B's request returned `201` with a new hold. |
| HLD-05 | Pass | An expired hold made A1 `available`. Customer B then received `201` for a new hold. |
| PAY-01 | Pass | Payment returned `200` with `succeeded` for VND 80,000. The order was `paid` and `confirmed`, one ticket and matching QR were available, and A1 was `sold`. |
| PAY-02 | Pass | Simulated failure returned `200` with `failed` and no tickets. The order remained `pending_payment`, and A1 stayed `held`. |
| PAY-03 | **Fail** | A new payment key successfully retried the payment and issued one ticket. Replaying the failed key returned `failed` with the newly issued ticket code. See CG-PAY-01. |
| PAY-04 | Pass | Repeating a successful payment returned the same payment ID, ticket code, and QR payload. The ticket list contained exactly one ticket. |
| PAY-05 | Pass | Payment after hold expiry returned `409`. The order was still unpaid, no ticket was issued, and A1 was `available`. |

## CG-PAY-01 Failed payment replay includes a ticket from a later successful attempt

| Field | Value |
|---|---|
| Severity | Medium |
| Status | Open, reproduced on PostgreSQL 17.12 in the full suite and in isolation |
| Affected case and endpoint | PAY-03, `POST /api/v1/orders/{order_id}/payments` |
| Expected | Reusing the original idempotency key returns the original failed attempt with the same payment ID and empty `ticket_codes` and `qr_tokens`. |
| Actual | The replay returns HTTP `200`, the original payment ID, and `status=failed`, with a populated `ticket_codes` list and an empty `qr_tokens` list. The ticket code belongs to the later successful attempt. |
| Impact | A client refreshing an earlier failed payment sees inconsistent payment and ticket data. In the observed scenario the successful retry confirmed the order and produced one valid ticket. |

To reproduce, log in as Customer A, hold one seat, and create a pending order. Post a simulated failure with key `functional-payment-001`. While the hold is active, post a successful payment for the same order with key `functional-payment-002`. Repeat the original failed request with key `functional-payment-001` and compare the two responses for that key.

The isolated rerun recorded the following differing field. Both responses had the same payment ID, failed status, and empty `qr_tokens`.

```diff
- "ticket_codes": []
+ "ticket_codes": ["TKC2507E88E98A05B8"]
```

The API contract says that replaying a key returns the original attempt. The response builder queries tickets by order for every payment status, which accounts for the ticket codes appearing on the failed attempt after the later payment succeeds. [Payment replay contract](../API.md#mock-payment-and-tickets) · [Response implementation](../../backend/app/routers/orders.py#L216)

With the PostgreSQL environment configured as described in the [test cases](functional-test-cases.md#run-the-automated-suite), reproduce the defect from `backend/`:

```powershell
python -m pytest -vv --tb=short tests/functional_use_cases.py::test_pay_03_retry_then_replay_failed_attempt
```
