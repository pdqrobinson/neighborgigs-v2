# NeighborGigs - Phase One

NeighborGigs is a **hyperlocal, broadcast-based task app** that lets neighbors help each other with immediate, nearby errands.

## Project Notes

NeighborGigs Phase One delivers a fully functional core loop:

**Broadcast → respond → accept → complete → earn**

### Core Principles

- **Intent-first broadcasts**: Users broadcast specific needs ("Need someone with a truck") or offers ("Heading to grocery store in 15 mins")
- **Hyperlocal containment**: Users only see activity within their assigned neighborhood and selected radius (1-3 miles)
- **Map as source of truth**: The map defines what exists; list/grid views mirror the same data
- **Explicit state only**: No inferred or implicit state; all transitions are intentional and recorded
- **One active task per helper**: A helper may have at most one active task at a time
- **Tasks are immediate and short-lived**: Tasks are created with assumption of near-term execution
- **Empty states are honest**: No fake pins or synthetic activity
- **Ledger-first money model**: All value changes are recorded in a ledger before any funds move
- **Custodial wallet (USD only)**: Users do not manage keys; transfers are controlled and reversible
- **Wallet balance is derived exclusively from completed ledger transactions; no balance value is ever authoritative on its own.**

### Canonical Wallet Model

The wallet is **not** a number — it's the sum of transactions. Balance is derived, never authoritative.

#### wallet_transactions Table (Ledger)

Every movement of money is one row in the `wallet_transactions` table:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | User who owns this transaction |
| wallet_id | uuid | Reference to wallet (for cascade delete) |
| amount_usd | numeric | Positive or negative amount |
| type | enum | `credit` (money in), `debit` (money out), `hold` (reserved), `release` (release from hold) |
| status | enum | `pending`, `completed`, `failed` |
| source | text | Origin of transaction (`task`, `withdrawal`, `demo_seed`, etc.) |
| reference_id | uuid (nullable) | Related entity (task_id, withdrawal_id, etc.) |
| created_at | timestamp | When transaction was recorded |

#### Balance Definitions

**Ledger Balance (Authoritative)**: "How much money does this user have, period?"

```sql
sum(amount_usd) where status = 'completed'
```

**Available Balance**: "How much can they spend or withdraw right now?"

```
ledger_balance - active_holds
```

Where `active_holds` = `sum(amount_usd)` where `type = 'hold'` and `status = 'pending'`.

#### Key Rules

1. Never display a stored balance column. The UI calls `get_wallet()` or `get_available_balance_cents()` which derive from the ledger.
2. Demo seeds must insert transactions with `status = 'completed'` to be visible.
3. Task completions create `status = 'completed'` credit transactions immediately.
4. Withdrawals create `status = 'completed'` debit transactions immediately.

## Architecture

### Tech Stack

- **Runtime**: Bun (JavaScript runtime)
- **Backend**: Hono (lightweight web framework)
- **Frontend**: React 19 + Vite
- **Styling**: Tailwind CSS 4
- **Routing**: React Router v7
- **Database**: Supabase Postgres with earthdistance extension for geospatial queries

### Project Structure

```
.
├── server.ts                 # Main Hono server + Vite middleware
├── zosite.json              # Zo deployment config
├── package.json             # Dependencies and scripts
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── db/                     # Database migrations and seed data
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_rpc_functions.sql
│   │   └── 003_wallet_canonical_model.sql
│   ├── seed_demo_data.sql
│   └── seed_demo_canonical.sql
├── src/
│   ├── main.tsx           # React entry point
│   ├── App.tsx            # Router setup
│   ├── styles.css         # Global styles
│   ├── lib/
│   │   └── api-client.ts  # API client for frontend
│   ├── contexts/
│   │   └── UserContext.tsx # User state management
│   ├── backend/
│   │   ├── db.ts         # Supabase client
│   │   └── routes.ts     # API endpoints
│   └── pages/
│       ├── LocationGate.tsx   # Location permission gate
│       ├── Home.tsx          # Map/list view + movement controls
│       ├── RequestHelp.tsx   # Send request to helper
│       ├── ActiveTask.tsx     # Active task management
│       ├── Wallet.tsx          # Wallet and ledger view
│       └── Profile.tsx        # User profile
└── public/                   # Static assets
```

## Database Schema

Phase One uses exactly eight tables:

1. **neighborhoods**: Defines hard boundary for visibility
2. **users**: All people in system (demo or real)
3. **user_devices**: Push notification tokens for users
4. **wallets**: One wallet per user (balances are derived from wallet_transactions)
5. **wallet_transactions**: Every money movement with type and status (the authoritative ledger)
6. **tasks**: Agreed work after request acceptance
7. **task_requests**: Proposals from requester to helper
8. **withdrawal_requests**: Idempotent withdrawal tracking

### Wallet-Related RPC Functions

- `get_ledger_balance_cents(user_id)` - Sum of completed transactions (authoritative)
- `get_available_balance_cents(user_id)` - Ledger balance minus held funds
- `get_held_balance_cents(user_id)` - Currently held/reserved funds
- `get_wallet(user_id)` - Wallet with all derived balances
- `get_wallet_transactions(user_id, limit)` - Transaction history

## API Endpoints

Base URL: `/api/v1`

Authentication: `X-User-Id` header (demo mode uses fixed UUID)

### User Endpoints
- `GET /me` - Get current user
- `PATCH /me/profile` - Update first name and photo
- `PATCH /me/location` - Update location (heartbeat)
- `PATCH /me/radius` - Update radius (1-3 miles)
- `POST /me/neighborhood` - Assign neighborhood based on location
- `POST /me/devices` - Register push notification device

### Discovery Endpoints
- `GET /nearby/helpers?lat=&lng=` - Get visible on-the-move users

### Movement Endpoints
- `POST /movement/start` - Start being visible
- `POST /movement/stop` - Stop visibility early

### Request Endpoints
- `POST /requests` - Create task request
- `GET /requests/incoming?status=` - List incoming requests (helper)
- `POST /requests/:requestId/accept` - Accept request (creates task)
- `POST /requests/:requestId/decline` - Decline request
- `POST /requests/:requestId/cancel` - Cancel own sent request

### Broadcast Endpoints
- `GET /broadcasts` - List active broadcasts in neighborhood
- `POST /broadcasts` - Create a new broadcast (need_help or offer_help)
- `POST /broadcasts/:id/respond` - Respond to a broadcast

### Task Endpoints
- `GET /tasks/active` - Get active task for current user
- `POST /tasks/:taskId/start` - Start task (accepted → in_progress)
- `POST /tasks/:taskId/complete` - Complete task (credits wallet)

### Wallet Endpoints
- `GET /wallet` - Get wallet
- `GET /wallet/ledger?limit=` - Get transaction history
- `POST /wallet/withdrawals` - Request withdrawal

## Phase One Screens

### App Entry
- **Location Permission Gate**: Requires location to proceed

### Home (Primary)
- **Home Map/List View**: Toggle between map and list
- **Radius Indicator**: Current selected radius
- **Neighborhood Indicator**: Current assigned neighborhood

### Discovery
- **List View**: Shows nearby on-the-move helpers

### Movement
- **Go On The Move**: Select direction (out/home) and time window (30-120 min)
- **On-The-Move Active State**: Shows countdown until visibility expires

### Requests
- **Request Help**: Send message and suggested tip to a helper

### Task Flow
- **Active Task**: Shows pending/accepted/in_progress/completed states
  - Pending request: "Waiting for helper to accept" with countdown
  - Accepted: "Start Task" button (helper only)
  - In progress: "Mark Complete" + photo upload (helper only)
  - Completed: Confirmation + earnings summary

### Wallet
- **Wallet Overview**: Available and pending balance
- **Transaction History**: Ledger entries list
- **Withdraw Request**: Synchronous withdrawal from available balance

### Profile
- **Profile**: View and edit first name, profile photo
- **Settings**: Neighborhood (read-only), radius, notifications toggle

## Setup Instructions

1. **Set up Supabase**:
   - Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to environment variables in `zosite.json`

2. **Run database migrations**:
   ```bash
   # Apply schema in order
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/migrations/001_initial_schema.sql
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/migrations/002_rpc_functions.sql
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/migrations/003_wallet_canonical_model.sql
   ```

3. **Seed demo data** (optional for development):
   ```bash
   # Use canonical seed data with completed transactions
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/seed_demo_canonical.sql
   ```

4. **Run development**:
   ```bash
   # Server is auto-managed by Zo
   # Just make changes and they hot-reload
   ```

## Demo Users

Phase One uses fixed UUIDs for demo users:

- `00000000-0000-0000-0000-000000000001` - Demo Requester (Alex)
- `00000000-0000-0000-0000-000000000002` - Demo Helper A (Jamie)
- `00000000-0000-0000-0000-000000000003` - Demo Helper B (Taylor)
- `00000000-0000-0000-0000-000000000004` - Demo Helper C (Jordan - idle)

All users are in `demo_neighborhood` (Downtown Demo).

## Git Workflow

- Single repository with `dev` → `main` flow
- All work happens in `dev`
- No direct production edits
- Schema changes committed as SQL files
- Commit message format: `<scope>: <description>`

## Scope Rules (Phase One)

- Only screens defined in Phase One documentation
- No new tables
- No future-proofing
- No "easy to add later" logic
- Reliability over cleverness

## Phase Roadmap & Implementation Status

**Last Updated: 2026-01-19**

---

## Phase 1 Goal

Show the product publicly without breaking anything.

Not scale. Not polish. Not real-time magic.

---

## Phase 1: Public Preview (Current)

### ✅ Completed Features (6/7)

- **Database Migrations** - All schema, RPC functions, and demo data applied successfully
- **Map View** - Interactive Leaflet map showing nearby helpers with pins and user radius circle
- **Radius Validation** - Distance check in request creation ensures helper is within user's radius
- **Movement Duration Selection** - Modal for selecting 30/60/90/120 minute availability windows
- **Helper Name Display** - RequestHelp page fetches and shows actual helper name
- **Router Navigation** - Fixed navigation to use useNavigate instead of window.history.back()

### ⏳ Phase 1 Remaining (3 items - Do Before Public)

**1. Notifications Toggle (Backend Flag)**
- Store `notifications_enabled` flag
- Default to `false` in preview mode
- Required for preview safety - lets you disable noisy systems later

**2. Type Consolidation**
- Remove duplicate type definitions across `db.ts` and `api-client.ts`
- Reduces bugs and prevents silent mismatches
- Makes Phase 2 easier

**3. Service Role Key Security (Non-Negotiable)**
- Move from hardcoded values to `zosite.json` env vars
- Hardcoded secrets + public preview = security risk
- Zo dashboard env vars for production

### 🔒 Read-Only UI + Preview Guards

- Show the product without allowing irreversible actions
- Block payments, final submits, state transitions
- Clear "Preview Mode" indicators

---

## Phase 2: Controlled Interaction

**Goal:** Users navigate and understand flows while preventing irreversible changes.

**When:** After Phase 1 is stable and publicly viewable.

### Phase 2 Backlog

**Photo Uploads**
- Replace URL inputs with Supabase Storage file uploads
- Profile photo upload, task proof photo upload
- Draft-state uploads (non-final)

**Push Notifications**
- Firebase/OneSignal integration for real-time alerts
- Tests urgency, copy, and opt-in behavior
- New incoming request notifications for helpers
- Request status updates for requesters

**Realtime Updates**
- Supabase Realtime or polling for live data
- Active task status updates
- New helpers appearing/disappearing on map
- Answers: "Does this feel alive?" and "Do users expect instant updates?"

**Controlled Interactions**
- Draft-state flows
- Dry-run submit (validates but doesn't commit)
- Blocked final actions with clear explanations
- Preview-only event logging

**Account Settings (Preview-Safe)**
- View-first, limited edit for non-critical fields
- Blocked: email, password, bank details, legal acceptance
- Allowed: display name, preferences, help/support

---

## Phase 3+: Operational Mode

**Goal:** Full execution mode with production infrastructure.

### Phase 3+ Items

**Background Jobs**
- Cron/scheduled tasks for expiration
- Expire movement (set `on_the_move` to false when `move_expires_at` passes)
- Expire requests (set status to expired after 15 minutes)

*Rationale:* These mutate state without direct user intent. Hard to reason about in preview. Dangerous with shared DB.

If needed before Phase 3:
- Simulate expirations on read
- Use computed state instead of mutations

---

## Summary Table

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Notifications Toggle | ✅ Do Now | | |
| Type Consolidation | ✅ Do Now | | |
| Service Role Key Security | ✅ Do Now | | |
| Read-Only UI + Preview Guards | ✅ Do Now | | |
| Photo Uploads | | ✅ Later | |
| Push Notifications | | ✅ Later | |
| Realtime Updates | | ✅ Later | |
| Controlled Interactions | | ✅ Later | |
| Draft-State Flows | | ✅ Later | |
| Account Settings (Preview-Safe) | | ✅ Later | |
| Background Jobs | | | ✅ Operational Mode |