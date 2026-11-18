# Functional Test Results (TC01–TC10)

Executed against live Express + SQLite backend (`http://localhost:3000/api/tests/run-suite`) using seeded Section B records (`B01`–`B06`, Academic Year `2026-2027`, Semester `1`).

| Test ID | Input / Action | Expected Result | Actual Result | Pass/Fail | Evidence Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TC01 | `POST /api/submissions/sub-b01-2026-1/evaluate` (GWA `2.00`, `18` units, exact deadline `2026-11-06 17:00+08:00`) | Compliant at exact GWA and deadline boundaries | HTTP `200`; `compliance_status = Compliant` | PASS | Record `B01` · `PROG-EXC` |
| TC02 | `POST /api/submissions/sub-b02-2026-1/evaluate` (GWA `2.01` vs `2.00` max) | `With Deficiency` citing GWA threshold exceeded | HTTP `200`; `With Deficiency` — GWA `2.01` exceeds Excellence Scholar maximum permitted GWA of `2.00` | PASS | Record `B02` · GWA upper boundary |
| TC03 | `POST /api/submissions/sub-b03-2026-1/evaluate` (Access Scholar, `1` dropped subject) | `Compliant` because Access Scholar permits `1` dropped subject | HTTP `200`; `compliance_status = Compliant` | PASS | Record `B03` · `PROG-ACC` (`allowed_dropped=1`) |
| TC04 | `POST /api/submissions/sub-b04-2026-1/evaluate` (`14` units, `1` INC) | `With Deficiency` identifying both insufficient units and incomplete grade | HTTP `200`; `With Deficiency` — Enrolled units (`14`) below `15`; Incomplete count (`1`) exceeds `0` | PASS | Record `B04` · Multi-rule check |
| TC05 | `POST /api/submissions/sub-b05-2026-1/evaluate` (`1` failed, `17:01+08:00`) | `With Deficiency` identifying failing subject and late submission | HTTP `200`; `With Deficiency` — Failed count (`1`) exceeds `0`; Late submission (`1 minute` after deadline) | PASS | Record `B05` · `Asia/Manila` deadline |
| TC06 | Attempt `evaluate` and `Approved` decision on `Pending Verification` record `B06` | Both blocked until verified and evaluated | Eval: HTTP `400`; Approval: HTTP `400` | PASS | Record `B06` · Verification gate |
| TC07 | Submit duplicate AY `2026-2027` Sem `1`, GWA `0.50`, and `failed_count = -1` as `B01` | Duplicate rejected (`409`); invalid GWA and negative count rejected (`400`) | Dup: HTTP `409`; GWA `0.50`: HTTP `400`; Neg: HTTP `400` | PASS | `UNIQUE(scholar_code, academic_year, semester)` |
| TC08 | Scholar `B01` requests `GET /sub-b02-2026-1` and `POST /sub-b06-2026-1/verify` | Backend denies both requests with HTTP `403 Forbidden` | Read `B02`: HTTP `403`; Verify `B06`: HTTP `403` | PASS | Server-side `requireStaff` & ownership check |
| TC09 | Staff returns `B06`; `B06` resubmits signed ref; re-fetch submission & audit trail | Returns to `Pending Verification` with preserved audit history | Return `200`; Resubmit `200`; Status `Pending Verification`; `3` audit entries | PASS | SQLite WAL + `audit_logs` |
| TC10 | Staff approves `B01`, attempts approving deficient `B02`, holds `B02`; Scholar attempts decision | `B01` Approved (`200`); Deficient `B02` Approve blocked (`400`); `B02` Held (`200`); Scholar blocked (`403`) | `B01=Approved (200)`; `B02 Approve=400`; `B02=Held (200)`; `Scholar=403` | PASS | Renewal authority & compliance gate |
