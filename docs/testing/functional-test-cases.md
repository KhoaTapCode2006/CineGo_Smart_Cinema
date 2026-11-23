# CineGo Smart Cinema Functional Test Cases

The paths below are relative to `/api/v1`. Use JSON requests and send the selected customer's bearer token with authenticated requests. Each case starts with isolated test data. See the [test plan](test-plan.md) and [API contract](../API.md).

## Test data and procedures

| Reference | Data or procedure |
|---|---|
| Customer A | Active account `customer-a@example.com`, password `FunctionalTest123!`, role `customer`. |
| Customer B | Active account `customer-b@example.com`, same synthetic password, separate bearer session. |
| Screening S | Scheduled for a future time in the test cinema. Standard seats A1 and A2 start `available`. Each seat costs VND 80,000. |
| Hold placement | POST `/showtimes/{S}/seat-holds` with the selected seat IDs. Retain the returned hold IDs. Seat state is visible through GET `/showtimes/{S}/seats`. |
| Unpaid order O | As Customer A, hold A1 and POST `/orders` with S and A1. Save the order ID. Expect `201`, `payment_status=pending`, and `order_status=pending_payment`. |
| Payment | POST `/orders/{O}/payments` with `payment_method=mock_card`, a test `idempotency_key` (K1 or K2), and the requested `simulated_result`. Inspect the order through GET `/orders/{O}` and the customer's tickets through GET `/tickets`. |
| Controlled expiry | Set the selected hold's `expires_at` to the past in the isolated database. In a manual run, wait until the returned `expires_at` has passed. |

## UC1 Customer login

| ID | Preconditions | Test steps | Expected result |
|---|---|---|---|
| LGN-01 | Customer A exists. | POST `/auth/login` with A's email and valid password. Use the returned bearer token with GET `/auth/me`. | Login returns `200`, an access token with `token_type=bearer` and a positive lifetime. Profile returns `200` and identifies Customer A with role `customer`. |
| LGN-02 | Customer A exists and is unlocked. | POST `/auth/login` with A's email and `WrongPassword123!`. | `401` with `Invalid email or password`. No access token is returned. |
| LGN-03 | `missing@example.com` is unregistered. | POST `/auth/login` with this address and a syntactically valid password. | `401` with the same generic error as LGN-02. No access token is returned. |
| LGN-04 | Login API ready. | POST `/auth/login` with `invalid-email` and a nonempty password. | `422` with a validation error on `email`. |
| LGN-05 | Customer A exists. | POST `/auth/login` with A's email and an empty string for `password`. | `422` with a validation error on `password`. |

## UC2 Seat hold

| ID | Preconditions | Test steps | Expected result |
|---|---|---|---|
| HLD-01 | Customer A is authenticated. Screening S has available A1 and A2. | Hold A1. Read the deadline and retrieve S's seat map. | `201` with one hold ID and A1. The deadline is approximately five minutes after the request. A1 is `held` and A2 is `available`. |
| HLD-02 | Customer A is authenticated. A1 and A2 are available. | Hold A1 and A2 in one request. Retrieve the seat map. | `201` with two distinct hold IDs and both requested seat IDs. Both seats are `held`. |
| HLD-03 | Customers A and B are authenticated. A holds A1. A2 is available. | B attempts to hold A1 and A2 in one request. Retrieve the seat map. | `409`. A1 remains `held` and A2 remains `available`, so B's conflicting request has no partial effect. |
| HLD-04 | A has an active hold on A1. B is authenticated. | A sends DELETE `/seat-holds/{hold_id}`. Read the seat map. B requests A1. | DELETE returns `204`. A1 becomes `available`. B's reservation returns `201` for A1 with a new hold ID. |
| HLD-05 | A has an active hold on A1. B is authenticated. | Pass the expiry deadline. Read the seat map. B requests A1. | A1 becomes `available`. B's reservation returns `201` with a new hold ID, and A1 returns to `held`. |

## UC3 Simulated payment

| ID | Preconditions | Test steps | Expected result |
|---|---|---|---|
| PAY-01 | A owns unpaid order O with an active hold on A1. | Pay with K1 and `succeeded`. Read O, A's tickets, and the seat map. | `200` with `succeeded`, VND 80,000, one ticket code and one QR payload. O is `paid` and `confirmed`. The same ticket and QR appear in the ticket list, and A1 is `sold`. |
| PAY-02 | A owns unpaid order O with an active hold on A1. | Pay with K1 and `failed`. Read O, A's tickets, and the seat map. | `200` with `failed` and empty ticket and QR lists. O is `failed` and `pending_payment`. No ticket is issued, and A1 remains `held`. |
| PAY-03 | A owns unpaid order O with an active hold on A1. | Simulate failure with K1. Retry with K2 and `succeeded`. Read O and A's tickets. Replay the original failed request with K1. | The retry succeeds with a different payment ID, the order is paid, and one ticket is issued. Replaying K1 returns `200` with the original failed attempt and empty ticket and QR lists. |
| PAY-04 | A owns unpaid order O with an active hold on A1. | Pay with K1 and `succeeded`, then repeat the identical request. Read A's tickets. | Both requests return `200` and the same payment ID, ticket code and QR payload. Exactly one ticket exists. |
| PAY-05 | A owns unpaid order O with A1 originally held. | Pass the hold deadline. Attempt payment with K1 and `succeeded`. Read O, A's tickets and the seat map. | `409`. O does not become paid, no ticket is issued, and A1 is `available`. |

## Run the automated suite

Start a local PostgreSQL instance and create a disposable database named `cinego_functional_test`. Set `CINEGO_FUNCTIONAL_DB_URL` to a `postgresql+psycopg` URL for this database. The suite creates and removes a fresh schema per case. The test role needs permission to create schemas and install the `pgcrypto` and `btree_gist` extensions.

From `backend/`, install the dependencies and run the suite explicitly:

```powershell
python -m pip install -r requirements-dev.txt httpx
python -m pytest -vv --tb=short tests/functional_use_cases.py
```

Results for the baseline run are in the [final test report](final-test-report.md).
