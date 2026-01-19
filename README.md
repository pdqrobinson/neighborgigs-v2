# NeighborGigs - Phase One

NeighborGigs is a **hyperlocal, movement-based task app** that lets neighbors help each other with immediate, nearby errands.

## Project Notes

NeighborGigs Phase One delivers a fully functional core loop:

**On the move → request → accept → complete → earn**

### Core Principles

- **Hyperlocal containment**: Users only see activity within their assigned neighborhood and selected radius (1-3 miles)
- **Map as source of truth**: The map defines what exists; list/grid views mirror the same data
- **Movement-based availability**: Only users actively "on the move" are visible as helpers
- **Explicit state only**: No inferred or implicit state; all transitions are intentional and recorded
- **One active task per helper**: A helper may have at most one active task at a time
- **Tasks are immediate and short-lived**: Tasks are created with assumption of near-term execution
- **Empty states are honest**: No fake pins or synthetic activity
- **Ledger-first money model**: All value changes are recorded in a ledger before any funds move
- **Custodial wallet (USD only)**: Users do not manage keys; transfers are controlled and reversible

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
│   │   └── 002_rpc_functions.sql
│   └── seed_demo_data.sql
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
2. **users**: All people in the system (demo or real)
3. **user_devices**: Push notification tokens for users
4. **wallets**: One wallet per user with derived balances
5. **ledger_entries**: Every money movement (append-only)
6. **tasks**: Agreed work after request acceptance
7. **task_requests**: Proposals from requester to helper

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
   # Apply schema
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/migrations/001_initial_schema.sql
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/migrations/002_rpc_functions.sql
   ```

3. **Seed demo data** (optional for development):
   ```bash
   psql -h <SUPABASE_HOST> -U <SUPABASE_USER> -f db/seed_demo_data.sql
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
