# Part I: Systems Analysis & Design Report (Section B)

## A1. Investigation and Planning

### Problem Statement
The Scholarship Office currently manages **Excellence Scholar** and **Access Scholar** grants across disconnected spreadsheets, email attachments, and paper grade records. This fragmented process causes duplicate semester entries, unverified grade evaluations, missed deadlines, and inconsistent renewal outcomes, while scholars lack reliable visibility into submission receipt, verification, and correction status.

### Problem, Cause, and Effect
| ID | Problem | Root Cause | Effect |
| :--- | :--- | :--- | :--- |
| P01 | Duplicate semester entries | Spreadsheets lack unique `(scholar, AY, semester)` constraints | Conflicting GWA values delay renewal decisions |
| P02 | Unverified grades evaluated | No gate separating email attachments from formula sheets | Risk of approving renewals on unverified claims |
| P03 | Inconsistent policy enforcement | Thresholds are copied manually instead of read from persisted policies | Access vs. Excellence rules (e.g., dropped count) misapplied |
| P04 | No scholar status visibility | Scholars lack self-service tracking of verification/returns | Repeated inquiries and missed correction deadlines |

### Scope and Exclusions
- **In Scope:** Role-based login (`Scholar`, `Scholarship Staff`), scholar registration & policy assignment, semester academic submission (`AY`, `Semester`, `GWA`, `Units`, `Failed`, `INC`, `Dropped`, `evidence_ref`), verification/return/resubmission workflow, persisted policy evaluation (`Asia/Manila` deadline), controlled renewal decisions (`Approved`/`Held`), cohort dashboard/search/filtering, and immutable audit trail.
- **Exclusions:** Altering official Registrar grades, payment disbursement, live Registrar API integration, SMS gateway, ML scoring, and full appeal workflows.

### Development Tasks & Risks
1. Schema, unique constraints, seed records (`B01`–`B06`), and backend/RLS role access enforcement.
2. Scholar registration, policy assignment, and validated semester grade submission.
3. Verification/return/resubmission workflow and dynamic policy compliance evaluation.
4. Dashboard KPIs, search/filtering, audit history, and `TC01`–`TC10` functional testing.
- **Risk 1 (Client-only RBAC bypass):** Mitigated by server-side `requireAuth`/`requireStaff` middleware and Supabase RLS policies.
- **Risk 2 (Timezone boundary drift):** Mitigated by evaluating deadlines in explicit `Asia/Manila` (`+08:00`) timestamps.

---

## A2. Stakeholders and Elicitation

| Stakeholder | System Actor? | Role & Interest |
| :--- | :--- | :--- |
| Scholar | Yes (Primary) | Submits semester summaries, checks status, corrects returned evidence |
| Scholarship Staff | Yes (Primary) | Registers scholars, verifies evidence, evaluates compliance, decides renewal |
| University Registrar | No (External) | Authoritative source of official grades; issues grade-document references |
| Finance / Committee | No (Downstream) | Consumes final renewal roster without altering academic records |

### Elicitation Questions
1. Which specific Registrar document reference attributes are required for Staff to mark evidence Verified versus Returned?
2. How should submissions arriving at the exact deadline minute in Asia/Manila time be classified compared to submissions one minute after?
3. Should a `With Deficiency` compliance flag automatically revoke a student's scholarship award or require explicit Staff review?
4. What submission and audit fields must be strictly isolated per scholar versus visible to all Scholarship Staff?
5. When a returned submission is corrected and resubmitted, how must prior return reasons and timestamps be preserved?
6. Which semester summary counts and filters do Staff prioritize when clearing pending verifications?

---

## A3. Requirements and Business Rules

### Functional Requirements (`FR01`–`FR10`)
- **FR01:** Authenticate users and enforce backend role isolation (`Scholar` reads only own records; `Staff` manages all).
- **FR02:** Allow Staff to register scholars and assign one of the two persisted policy records (`Excellence Scholar`, `Access Scholar`).
- **FR03:** Allow Scholars to submit AY, semester, GWA (`1.00`–`5.00`), nonnegative integer units/counts, and grade-document reference with timestamp.
- **FR04:** Reject duplicate `(scholar_code, academic_year, semester)` submissions with HTTP `409`.
- **FR05:** Allow Staff to mark evidence `Verified` or `Returned` with a mandatory reason.
- **FR06:** Allow Scholars to correct and resubmit `Returned` submissions, resetting status to `Pending Verification`.
- **FR07:** Block compliance evaluation and renewal approval until `verification_status` equals `Verified`.
- **FR08:** Evaluate verified submissions against thresholds read dynamically from `scholarship_programs` and record itemized deficiency reasons.
- **FR09:** Allow Staff to record `Approved` or `Held` renewal decisions; block `Approved` unless `Compliant`.
- **FR10:** Display semester KPIs, search/filtering, and immutable actor-timestamped audit logs.

### Non-Functional Requirements (`NFR01`–`NFR04`)
- **NFR01:** 100% of unauthorized cross-scholar reads or staff mutations denied server-side (`403`/`401`); no secrets in source/screenshots.
- **NFR02:** All records persist across page refreshes and server restarts via SQLite WAL / PostgreSQL.
- **NFR03:** Dashboard and evaluation operations complete within `< 300ms` for cohort datasets.
- **NFR04:** All verification, evaluation, resubmission, and decision changes log actor, role, state transition, and timestamp.

### Business Rules (`BR01`–`BR06`)
- **BR01:** Grading scale `1.00` (best) to `5.00` (failing), `3.00` passing; valid GWA `1.00–5.00` inclusive; units/counts integers `>= 0`.
- **BR02:** Unique `(scholar_code, academic_year, semester)` per submission.
- **BR03:** Missing or unverified/returned evidence blocks compliance evaluation and renewal approval.
- **BR04:** Policy thresholds are read from persisted `scholarship_programs` records (never duplicated in code).
- **BR05:** Deadlines use `Asia/Manila` (`2026-11-06 17:00 +08:00`); exact deadline is on time; after is late.
- **BR06:** Submission status, compliance status, renewal decision, and award status are independent; `With Deficiency` does not auto-disqualify.

---

## A4–A6 Summary
See the interactive **Analysis (Part I)** tab in the application for the rendered **UML Use Case Diagram** (2 actors, 8 use cases, 2 `<<include>>`, 1 `<<extend>>`), detailed **Submit Grades** and **Evaluate Compliance** use case specifications, **Entity Relationship Diagram (ERD)**, and **Traceability Matrix** (`FR01`, `FR03`, `FR05`, `FR08`).
