# AcadGrant — Student Scholarship Monitoring & Academic Compliance System

**SAD Laboratory Examination — Section B**

## Overview

AcadGrant is a browser-based Student Scholarship Monitoring and Academic Compliance System supporting **Scholar** and **Scholarship Staff** roles. Scholars submit semester academic summaries and supporting grade-document references; Staff verify evidence, evaluate compliance dynamically against persisted **Excellence Scholar** and **Access Scholar** policy records, record itemized deficiency reasons, and issue controlled renewal decisions without altering official Registrar grades or releasing payments.

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide Icons
- **Backend / Persistence:** Node.js (`v22+`), Express, built-in `node:sqlite` (`WAL` mode) with HMAC-signed `HttpOnly` session cookies and server-side RBAC enforcement
- **Supabase Integration:** `@supabase/supabase-js` client plus PostgreSQL DDL, RLS policies, and triggers in `supabase/migrations/001_scholarship_schema.sql` and `supabase/seed.sql`

## Environment Variables

Configure `.env` (see `.env.example`; never commit secrets or service-role keys):

- `VITE_SUPABASE_URL` — Public Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Public Supabase publishable/anon key (safe for client use; never use service-role keys in source code)
- `SESSION_SECRET` — Server-side secret for signing `HttpOnly` session cookies

## Local Setup & Run Steps

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your public Supabase URL and publishable key if using Supabase.
3. Start the full-stack development server (Express API + Vite middleware on port 3000):
   ```bash
   npm run dev
   ```
   Or build and run production mode:
   ```bash
   npm run build
   npm run start
   ```
4. Open `http://localhost:3000`.

## Supabase Schema & RLS Setup (Optional Remote Sync)

If connecting to a fresh Supabase project:
1. Open the Supabase SQL Editor.
2. Execute `supabase/migrations/001_scholarship_schema.sql` to create tables, uniqueness constraints, verification/compliance gate triggers, and Row-Level Security policies.
3. Execute `supabase/seed.sql` to populate `Excellence Scholar` and `Access Scholar` policies and synthetic records `B01`–`B06`.
*(Note: When remote tables are not yet applied in Supabase, the application automatically runs full persistence and backend RBAC enforcement via the local Express + SQLite backend.)*

## Synthetic Test Accounts

No plaintext passwords are stored in source code or screenshots. Use the **Synthetic Test Accounts** selector on the sign-in screen (which authenticates via `POST /api/auth/synthetic-login` with signed `HttpOnly` cookies) or register a new test account:

- **Scholarship Staff:** `STAFF-01` — Elena Santos (`staff@acadgrant.edu`)
- **Scholars (Seeded B01–B06):** `B01` through `B06` (`b01@acadgrant.edu` – `b06@acadgrant.edu`)

## Running Mandatory Functional Tests (TC01–TC10)

1. Sign in as **Scholarship Staff** (`STAFF-01`).
2. Open **Tests (TC01–TC10)** in the sidebar.
3. Click **Run Live Verification Suite** to execute live HTTP requests testing `TC01` through `TC10` against the running backend and inspect expected vs. actual results.
4. Click **Probe Backend Access Control** while signed in as a **Scholar** (e.g. `B01`) to verify HTTP `403 Forbidden` responses on cross-scholar reads and staff verification endpoints.

## Known Scope Notes / Defects

- Official Registrar grade feeds and scholarship payment disbursements are out of scope; grade-document references are stored as strings and manually verified by Staff.
- Policy exception workflows and automated SMS/email alerts are excluded per examination scope.
