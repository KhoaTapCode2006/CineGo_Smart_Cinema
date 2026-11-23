# CineGo Smart Cinema Functional Test Plan

| Field | Value |
|---|---|
| Baseline | `main` at `b52d8a6a728aa1f5797ea967549da75746fc0948` |
| Planned execution date | 2026-11-23, Asia/Saigon (UTC+07:00) |
| Test level | Functional integration through the FastAPI REST interface |
| Requirements | [CineGo API contract](../API.md), [database model](../DATABASE.md), and FastAPI request/response schemas |
| Companion documents | [Functional test cases](functional-test-cases.md) and [final test report](final-test-report.md) |

## Objectives and scope

Verify that a valid customer can authenticate, temporarily reserve seats, and complete a simulated payment. Check how the API responds to invalid inputs, reservation conflicts, expiry, payment failures, and repeated payment requests. Use HTTP status, response data, and follow-up reads as evidence of customer-visible state.

| Use case | Requirements covered | Case IDs | Priority |
|---|---|---|---|
| UC1 Customer login | Issue a usable bearer token for valid credentials. Reject invalid credentials and malformed input. | LGN-01 to LGN-05 | High |
| UC2 Seat hold | Hold one or several available seats. Prevent overlapping holds across customers. Make released and expired seats available again. | HLD-01 to HLD-05 | High |
| UC3 Simulated payment | Confirm a paid order and issue its QR tickets. Preserve recoverability after a failed payment. Prevent duplicate payment or ticket issuance on retry. Reject payment after expiry. | PAY-01 to PAY-05 | High |

The suite contains exactly three use cases and 15 cases. Customer registration, catalog setup, order creation, seat-map reads, and ticket reads serve as setup or verification within these cases. Browser interactions, WebSocket delivery, the background expiry job, QR gate check-in, real payment services, performance, and load testing are outside the scope.

## Test approach and environment

- Run the production FastAPI route handlers with the ASGI test client, SQLAlchemy, and a disposable local PostgreSQL database. Apply `backend/db/schema.sql` in a fresh schema for each case.
- Use synthetic customers, a scheduled future screening, and two adjacent standard seats priced at VND 80,000 each. For successful payment, procure a one-seat unpaid order from the seat-hold and order endpoints. Each case uses a fresh database or fresh records so one test outcome cannot change another.
- Observe expiry by creating a real hold, advancing its stored expiry into the past in the test database, and making the next API request. Check the configured five-minute duration separately. Run the expiry cases in test mode to isolate request-time behavior from the background job.
- For seat contention, submit one overlapping request from a second customer after the first hold is active. Verify that the second customer's request does not claim even the otherwise available seat included in it. This scenario checks the conflict and atomicity observable through the API. A simultaneous PostgreSQL lock race is outside scope.
- Compare repeated payment responses using the same idempotency key. Inspect both payment identity and the ticket list. Include a replay of an earlier failed attempt after a successful retry to verify that each key still identifies its original attempt.

## Execution and defect management

1. Record the baseline commit, OS, Python, FastAPI, SQLAlchemy, client, and database versions. Verify API liveness, database readiness, and fixture creation before accepting test results. Hold and payment cases are blocked if PostgreSQL is unavailable.
2. Execute LGN-01 through LGN-05, HLD-01 through HLD-05, and PAY-01 through PAY-05. Record each status, the actual HTTP response or relevant fields, and any resulting order, seat, or ticket state.
3. Mark a case **Pass** when all expected results are met, **Fail** when an assertion on product behavior differs, or **Blocked** when an unavailable prerequisite prevents a valid comparison. Diagnose test setup errors and correct the fixture before counting the run. Repeat unexpected results in isolation and link each confirmed discrepancy to a defect ID.
4. Record the severity and impact of each defect, its reproduction steps, expected and actual results, environment, and supporting observations. Use **High** for a blocked booking flow, duplicate purchase, or inconsistent sale. Use **Medium** for a contract or state discrepancy with a functioning core flow. Use **Low** for minor behavior with limited impact.
5. Compile the case totals, environment, defects, and limitations in the final report. Test execution is complete when all 15 cases have recorded outcomes and any failures are traceable. The tested scope meets its acceptance criteria when all 15 pass and no High defect remains open.

## Risks and controls

| Risk | Control |
|---|---|
| Database access or configuration blocks the run | Use a local disposable PostgreSQL database and verify readiness before executing the suite. Record environment issues separately from product defects. |
| Shared data makes results order-dependent | Seed each case independently and discard its isolated data after the run. |
| Hold expiry introduces timing flakiness | Verify the five-minute deadline and use a controlled past expiry for boundary scenarios. |
| Retried payments appear successful while duplicating records | Compare payment IDs and check the final ticket count and order state. |
