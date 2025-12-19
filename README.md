# Budget Manager — Project Specification (Monolithic)

A complete personal finance planning + management web application for **Bangladesh users**, built as a **monolithic Next.js app** (App Router) with **TypeScript**, **Tailwind CSS**, and **Turso (libSQL/SQLite)**.

## Production checklist

1. Export `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `AUTH_SECRET`, and `NEXT_PUBLIC_APP_URL` (or use `.env.local`) before any commands.
2. **Wipe old data:** `npm run db:clean` clears the connected Turso DB; run with `TURSO_DATABASE_URL= TURSO_AUTH_TOKEN=` to clean the local `.data/local.db`.
3. Apply schema: `npm run db:migrate`.
4. (Optional) Seed lookup data: `npm run db:seed`.
5. Build for deploy: `npm run build`; start with `npm run start`.

## 1) Goals

### Primary Goals

* Enable users to **log daily income & expenses** quickly.
* Provide **tracking** (daily/weekly/monthly) with charts and summaries.
* Provide **bank + investment management** (manual, no integrations).
* Provide **savings goals + loan tracking**.
* Provide **compound interest** + **FIRE calculator**.
* Provide a **modern analytics dashboard**.
* Secure **login system** with per-user data isolation.
* Fully **responsive** UI for desktop dashboard + mobile view.

### Non-Goals

* No bank APIs, SMS, email notifications, or third-party financial integrations.
* No multi-language support (English only).
* No shared accounts or multi-user collaboration per account.

---

## 2) Tech Stack

* **Frontend + Backend:** Next.js (App Router), React, TypeScript
* **Styling:** Tailwind CSS
* **Database:** Turso (libSQL / SQLite)
* **Auth:** Session-based auth (recommended: Lucia / NextAuth credentials / custom)
* **Charts:** Recharts (recommended) or Chart.js
* **Forms/Validation:** React Hook Form + Zod (recommended)

---

## 3) Architecture Overview

### Monolithic

Single repo, single Next.js application contains:

* UI pages (routes)
* API endpoints (`app/api/*`)
* Database access layer (`src/server/db/*`)
* Business logic/services (`src/server/services/*`)
* Shared types and schemas (`src/shared/*`)

### Key Principles

* **Strict per-user isolation**: every query filtered by `userId`.
* **Server-first** where possible (data fetching on server components).
* **Type-safe boundaries**: Zod schemas for API inputs, shared TS types.
* **Auditability**: track changes in transactions (optional, recommended).

---

## 4) Core Modules & Feature Details

## 4.1 Authentication

### Features

* Register: email + password
* Login/Logout
* Password reset (optional but recommended)
* Session management via secure cookies
* Route protection middleware for authenticated areas

### Acceptance Criteria

* User cannot access any private pages without login.
* User cannot query other users’ data (API must enforce).
* Password stored hashed (bcrypt/argon2).

---

## 4.2 Expenses (Income & Expense)

### Data

* Date, type (INCOME/EXPENSE), amount, category, optional account/investment link, description, tags (optional)

### UX Requirements

* “Add Transaction” must be **< 15 seconds** on mobile.
* Default date is “today”
* Category selector with search
* Quick amount input (numeric keyboard on mobile)
* Transaction list with filters:

  * Date range
  * Type
  * Category
  * Account
  * Search (description)

### Tracking Views

* Daily view: grouped by day
* Weekly view: grouped by week (Mon–Sun or Sun–Sat; choose one and standardize)
* Monthly view: calendar-like summary + list

### Acceptance Criteria

* Creating/editing/deleting transaction updates analytics immediately.
* Amount validation: positive numbers; type defines direction.
* Currency display: `BDT` with `৳` formatting.

---

## 4.3 Bank Accounts

### Features

* Create bank accounts (name, type, opening balance, current balance)
* Optional linking of transactions to accounts
* Account details view with transaction list filtered to that account
* Manual balance adjustments (optional but recommended)

### Acceptance Criteria

* Account balances can be derived either:

  * stored current balance + adjustment entries, OR
  * computed from opening balance + linked transactions
* Pick one approach and keep consistent across product.

**Recommended approach:** store `openingBalance` and compute current balance from transactions (less chance of mismatch) + allow “Adjustment” transactions for reconciliation.

---

## 4.4 Investments

### Features

* Investment items (name, type, current value, notes)
* Investment value history updates (manual)
* Investment dashboard summary and performance chart (based on history)

### Acceptance Criteria

* User can update value; history is stored and shown over time.

---

## 4.5 Savings Goals

### Features

* Create goal: title, target amount, target date (optional)
* Add contributions (manual) OR link to specific “Savings” category transactions
* Progress: amount saved, % complete, projected completion (optional)

### Acceptance Criteria

* Goal progress visible on dashboard and goals page.
* Completed goals are archived.

---

## 4.6 Loan Tracking

### Features

* Create loans: lender name, principal, interest rate, start date, term (optional)
* Record payments: date, amount
* Outstanding balance tracking
* Payoff progress bar and summary

### Acceptance Criteria

* Payments reduce balance.
* Interest calculation: **Version 1**: optional/simple (document clearly)

  * Option A: user manually updates interest via adjustment
  * Option B: app calculates monthly simple interest
* Choose one and document in UI.

---

## 4.7 Compound Interest Calculator

### Inputs

* Principal
* Monthly contribution
* Annual interest rate
* Compounding frequency (monthly recommended)
* Duration (years/months)

### Outputs

* Future value
* Total contributions
* Total interest earned
* Growth chart + year-by-year table

### Acceptance Criteria

* Results match verified formula test cases.

---

## 4.8 FIRE Calculator

### Inputs

* Current age (optional)
* Current net worth (prefilled from app)
* Monthly contribution
* Expected annual return
* Annual expense (or monthly expense * 12)
* Withdrawal rate (default 4%)
* Inflation (optional)

### Outputs

* FIRE number (expense / withdrawal rate)
* Years to FIRE + estimated year/age
* Projection chart

### Acceptance Criteria

* Calculator can run entirely client-side
* Clear disclaimer: “This is estimation, not financial advice.”

---

## 4.9 Analytics Dashboard

### Must-have Charts

* Income vs Expense (monthly bars for last 6–12 months)
* Expense breakdown by category (donut)
* Net worth trend (line)
* Savings goal progress (cards/progress bars)
* Top categories and top merchants/notes (optional)

### KPIs

* This month: total income, total expense, savings (income - expense)
* Average daily spending (last 30 days)
* Largest expense transaction (current month)

### Acceptance Criteria

* Dashboard loads fast (<2s typical on good network).
* Mobile: charts stack and remain readable.

---

## 5) Information Architecture & Routes

### Public

* `/` Landing (optional)
* `/auth/login`
* `/auth/register`
* `/auth/forgot-password` (optional)

### Protected App

* `/app` Dashboard
* `/app/expenses`
* `/app/expenses/new`
* `/app/accounts`
* `/app/accounts/[id]`
* `/app/investments`
* `/app/investments/[id]`
* `/app/goals`
* `/app/goals/[id]`
* `/app/loans`
* `/app/loans/[id]`
* `/app/tools/compound-interest`
* `/app/tools/fire`
* `/app/settings` (profile, data export, theme, etc.)

---

## 6) API Specification

> All endpoints are **authenticated**, return JSON, and are scoped by `userId`.

### Expenses

* `GET /api/expenses?from=YYYY-MM-DD&to=YYYY-MM-DD&type=&categoryId=&accountId=&q=`
* `POST /api/expenses`
* `PATCH /api/expenses/:id`
* `DELETE /api/expenses/:id`

**POST body**

```json
{
  "date": "2025-12-17",
  "type": "EXPENSE",
  "amount": 1200,
  "categoryId": "cat_food",
  "accountId": "acc_1",
  "note": "Lunch"
}
```

### Accounts

* `GET /api/accounts`
* `POST /api/accounts`
* `PATCH /api/accounts/:id`
* `DELETE /api/accounts/:id`

### Investments

* `GET /api/investments`
* `POST /api/investments`
* `PATCH /api/investments/:id`
* `POST /api/investments/:id/value` (creates history entry)

### Goals

* `GET /api/goals`
* `POST /api/goals`
* `POST /api/goals/:id/contributions`
* `PATCH /api/goals/:id`
* `DELETE /api/goals/:id`

### Loans

* `GET /api/loans`
* `POST /api/loans`
* `POST /api/loans/:id/payments`
* `PATCH /api/loans/:id`
* `DELETE /api/loans/:id`

### Analytics

* `GET /api/analytics/summary?period=this_month|last_month|ytd|custom&from=&to=`
* `GET /api/analytics/trends?range=12m`
* `GET /api/analytics/categories?from=&to=`

---

## 7) Database Schema

### Entities (high level)

* `users`
* `categories`
* `accounts`
* `transactions`
* `investments`
* `investment_values`
* `goals`
* `goal_contributions`
* `loans`
* `loan_payments`

### Notes

* All user data tables include `user_id`.
* Use `TEXT` UUIDs for IDs (stable across SQLite).
* Store money as **integer minor units** (recommended): e.g., store amount in paisa as `amount_paisa` to avoid floating issues.

---

## 8) UI/UX Guidelines

### Design System

* Clean layout, 8px spacing system
* Light mode first
* Typography: simple (Inter or system)
* Consistent input sizes & button hierarchy

### Components

* App Shell: topbar + responsive sidebar (desktop), drawer/bottom nav (mobile)
* Reusable:

  * `Card`, `StatCard`, `DataTable`, `ChartCard`
  * `DateRangePicker`, `CategorySelect`, `AmountInput`
  * `ConfirmDialog`, `Toast`, `EmptyState`

### UX Rules

* Every list has an empty state + “Add” CTA.
* Every destructive action requires confirmation.
* Loading states: skeletons
* Errors: clear message + retry

---

## 9) Security Requirements

* Password hashing
* Secure session cookies (HttpOnly, SameSite)
* CSRF protection if needed (depending auth strategy)
* Input validation on server using Zod
* Rate limit login endpoints (basic)

---

## 10) Performance Requirements

* Dashboard: optimized queries (pre-aggregations in SQL)
* Use indexes on `(user_id, date)` in `transactions`
* Paginate transaction list
* Avoid heavy client rendering for large lists (virtualization optional)

---

## 11) Deployment

* Next.js app deployed on Vercel (recommended)
* Turso production DB with credentials as env vars
* Separate staging environment (optional but recommended)

---

# File Structure

> Proposed structure for **Next.js App Router** monolith.

```txt
budget-manager/
├─ README.md
├─ package.json
├─ tsconfig.json
├─ next.config.js
├─ tailwind.config.ts
├─ postcss.config.js
├─ .env.example
├─ .gitignore
│
├─ src/
│  ├─ app/
│  │  ├─ (public)/
│  │  │  ├─ page.tsx                    # Landing (optional)
│  │  │  └─ auth/
│  │  │     ├─ login/page.tsx
│  │  │     ├─ register/page.tsx
│  │  │     └─ forgot-password/page.tsx # optional
│  │  │
│  │  ├─ (protected)/
│  │  │  ├─ layout.tsx                  # App shell (sidebar/topbar)
│  │  │  ├─ app/page.tsx                # Dashboard
│  │  │  ├─ app/expenses/page.tsx
│  │  │  ├─ app/expenses/new/page.tsx
│  │  │  ├─ app/accounts/page.tsx
│  │  │  ├─ app/accounts/[id]/page.tsx
│  │  │  ├─ app/investments/page.tsx
│  │  │  ├─ app/investments/[id]/page.tsx
│  │  │  ├─ app/goals/page.tsx
│  │  │  ├─ app/goals/[id]/page.tsx
│  │  │  ├─ app/loans/page.tsx
│  │  │  ├─ app/loans/[id]/page.tsx
│  │  │  ├─ app/tools/compound-interest/page.tsx
│  │  │  ├─ app/tools/fire/page.tsx
│  │  │  └─ app/settings/page.tsx
│  │  │
│  │  ├─ api/
│  │  │  ├─ auth/
│  │  │  │  ├─ login/route.ts
│  │  │  │  ├─ register/route.ts
│  │  │  │  └─ logout/route.ts
│  │  │  ├─ expenses/route.ts
│  │  │  ├─ expenses/[id]/route.ts
│  │  │  ├─ accounts/route.ts
│  │  │  ├─ accounts/[id]/route.ts
│  │  │  ├─ investments/route.ts
│  │  │  ├─ investments/[id]/route.ts
│  │  │  ├─ investments/[id]/value/route.ts
│  │  │  ├─ goals/route.ts
│  │  │  ├─ goals/[id]/route.ts
│  │  │  ├─ goals/[id]/contributions/route.ts
│  │  │  ├─ loans/route.ts
│  │  │  ├─ loans/[id]/route.ts
│  │  │  ├─ loans/[id]/payments/route.ts
│  │  │  └─ analytics/
│  │  │     ├─ summary/route.ts
│  │  │     ├─ trends/route.ts
│  │  │     └─ categories/route.ts
│  │  │
│  │  ├─ layout.tsx                      # Root layout
│  │  ├─ globals.css
│  │  └─ middleware.ts                   # Auth guard (if used in app router)
│  │
│  ├─ components/
│  │  ├─ ui/                             # Generic UI components
│  │  │  ├─ button.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ modal.tsx
│  │  │  ├─ card.tsx
│  │  │  └─ ...
│  │  ├─ layout/
│  │  │  ├─ AppShell.tsx
│  │  │  ├─ Sidebar.tsx
│  │  │  ├─ Topbar.tsx
│  │  │  └─ MobileNav.tsx
│  │  ├─ charts/
│  │  │  ├─ IncomeExpenseBar.tsx
│  │  │  ├─ CategoryDonut.tsx
│  │  │  └─ NetWorthLine.tsx
│  │  └─ forms/
│  │     ├─ TransactionForm.tsx
│  │     ├─ AccountForm.tsx
│  │     ├─ GoalForm.tsx
│  │     └─ LoanForm.tsx
│  │
│  ├─ server/
│  │  ├─ db/
│  │  │  ├─ client.ts                    # Turso client
│  │  │  ├─ schema.sql                   # base schema (or migrations)
│  │  │  ├─ migrations/
│  │  │  │  ├─ 0001_init.sql
│  │  │  │  └─ ...
│  │  │  └─ repositories/
│  │  │     ├─ expenses.repo.ts
│  │  │     ├─ accounts.repo.ts
│  │  │     ├─ investments.repo.ts
│  │  │     ├─ goals.repo.ts
│  │  │     ├─ loans.repo.ts
│  │  │     └─ analytics.repo.ts
│  │  ├─ services/
│  │  │  ├─ auth.service.ts
│  │  │  ├─ analytics.service.ts
│  │  │  ├─ calculators/
│  │  │  │  ├─ compound.ts
│  │  │  │  └─ fire.ts
│  │  │  └─ money.ts                     # formatting + minor units helpers
│  │  └─ auth/
│  │     ├─ session.ts                   # cookie/session helpers
│  │     └─ guards.ts                    # requireUser()
│  │
│  ├─ shared/
│  │  ├─ types/
│  │  │  ├─ models.ts
│  │  │  └─ api.ts
│  │  ├─ validators/
│  │  │  ├─ transaction.schema.ts
│  │  │  ├─ account.schema.ts
│  │  │  ├─ goal.schema.ts
│  │  │  └─ loan.schema.ts
│  │  └─ constants/
│  │     ├─ categories.ts
│  │     └─ ui.ts
│  │
│  ├─ lib/
│  │  ├─ date.ts                         # week/month helpers
│  │  ├─ format.ts                       # currency/date formatting
│  │  └─ fetcher.ts                      # API fetch helper (SWR/ReactQuery)
│  │
│  └─ styles/
│     └─ theme.ts
│
└─ scripts/
   ├─ migrate.ts                         # run SQL migrations
   └─ seed.ts                            # seed categories, demo user (optional)
```

---

# Environment Variables

Create `.env.local` from `.env.example`.

**`.env.example`**

```bash
# Turso
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=

# Cron (optional)
CRON_SECRET=

# Auth
AUTH_SECRET= # random string
APP_URL=http://localhost:3000
```

---

# Development Setup

## Install

```bash
pnpm install
```

## Run dev

```bash
pnpm dev
```

---

# Contributing

## Workflow

1. Create a feature branch from `main`.
2. Keep PRs focused; split UI vs API changes when it helps review.
3. Update docs when adding env vars, scripts, or routes.
4. Before pushing:

```bash
pnpm lint
pnpm typecheck
pnpm db:migrate
```

## Local development

* Use `pnpm` for scripts to keep lockfile behavior consistent.
* Keep secrets in `.env.local` and do not commit them.
* Prefer feature flags or small increments over large refactors.

## Code standards

* Keep server logic in `src/server/*`; keep UI in `src/app/*`.
* Use parameterized SQL and scope all queries by `user_id`.
* Store timestamps as ISO UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
* Add indexes when new filters or sorts are introduced.

## Database changes

* Add a numbered migration in `src/server/db/migrations` (next sequence).
* Update `src/server/db/schema.sql` to match the latest schema snapshot.
* Keep all queries scoped by `user_id` for data isolation.

## API conventions

* Return `401` on unauthenticated access; validate all inputs.
* Prefer `NextResponse.json` with a clear `{ ok: boolean }` shape.
* Sanitize user input with shared helpers in `src/shared/security/*`.

## Data retention

* New users get `data_expires_at` set to 4 days in the future.
* Keep `CRON_SECRET` configured and schedule `/api/cron/purge-expired-users`.

## Pull request checklist

* Describe the change and risk/impact in the PR.
* Include migration notes (if any).
* Add screenshots for UI changes.

---

# Database & Migrations (Turso)

## Local strategy

* Use Turso dev database for dev (recommended)
* Store SQL migrations under `src/server/db/migrations`

## Run migrations

```bash
pnpm db:migrate
```

---

# Scripts (package.json)

Recommended scripts:

* `dev` – start Next.js dev server
* `build` – build production
* `start` – run production build
* `lint` – lint
* `typecheck` – tsc typecheck
* `db:migrate` – apply migrations to Turso
* `db:seed` – seed categories
* `db:clean` – wipe all data (preserve schema)
* `db:purge-expired-users` – delete users past `data_expires_at`

---

# Acceptance Checklist

## Must Pass

* ✅ Login/register works
* ✅ All CRUD endpoints validate inputs + enforce userId scoping
* ✅ Dashboard analytics correct for selected period
* ✅ Mobile UX: add transaction is smooth
* ✅ Transactions filter + pagination works
* ✅ Calculators return correct values for test cases
* ✅ No third-party integrations present
