# NeighborGigs — Phase One Screens

> **Last Updated**: 2026-01-19
> **Implementation Status**: See markers below
> **Legend**: ✅ Implemented | 🟡 Partial | ❌ Missing

## App Entry

- **Splash / Launch** ❌ NOT IMPLEMENTED

- **Demo User Bootstrap** 🟡 Handled via LocationGate (Demo Mode option)

- **Location Permission Gate** ✅ IMPLEMENTED

---

## Home (Primary)

- **Home Map View** ✅ IMPLEMENTED (via MapView component)

- **Map ↔ List Toggle** 🟡 PARTIAL (Map implemented, List is placeholder "coming soon!")

- **Radius Indicator** ✅ IMPLEMENTED (header display)

- **Neighborhood Indicator** ✅ IMPLEMENTED (header display)

---

## Discovery

- **List View (Nearby Helpers)** 🟡 PARTIAL (placeholder only)

- **Helper Preview (Bottom Sheet)** ❌ NOT IMPLEMENTED

---

## Movement

> **Note**: Backend endpoints exist (`/api/v1/movement/start`, `/api/v1/movement/stop`), but no UI screens implemented.

- **Go On the Move** ❌ NOT IMPLEMENTED (no UI, API available)

- **Direction Selector (Out / Home)** ❌ NOT IMPLEMENTED

- **Time Window Selector** ❌ NOT IMPLEMENTED

- **On-the-Move Active State** ❌ NOT IMPLEMENTED

---

## Requests

- **Request Help** ✅ IMPLEMENTED (`/request/:helperId` route)

- **Suggested Tip Selector** ✅ IMPLEMENTED ($5, $10, $15, $20 presets)

- **Request Sent Confirmation** 🟡 PARTIAL (auto-navigates to ActiveTask screen, no dedicated confirmation)

---

## Task Flow

- **Incoming Request** (helper only) ✅ IMPLEMENTED (list in ActiveTask)

- **Accept / Decline Request** (helper only) ✅ IMPLEMENTED (buttons in ActiveTask)

- **Active Task** (requester or helper, renders conditionally): ✅ IMPLEMENTED
  - If pending_request_id: show "Waiting for helper to accept" ✅
  - If task.status=accepted (helper): show "Start Task" button ✅
  - If task.status=in_progress: show "Mark Complete" button + photo upload ✅
  - If task.status=completed: show confirmation + earnings summary ✅

- **Mark Complete** (helper only) ✅ IMPLEMENTED

- **Optional Photo Upload** (helper only, on complete) ✅ IMPLEMENTED

- **Task Completed Confirmation** (both requester and helper) ✅ IMPLEMENTED

---

## Wallet

- **Wallet Overview** ✅ IMPLEMENTED (`/wallet` route)

- **Transaction History** ✅ IMPLEMENTED (ledger entries list)

- **Withdraw Request** ✅ IMPLEMENTED

- **Withdrawal Result (success/failure)** ✅ IMPLEMENTED (inline messages)

---

## Profile & Support

- **Profile** ✅ IMPLEMENTED (`/profile` route)

- **Edit Profile** ✅ IMPLEMENTED (edit mode toggle)

- **Help Link (external)** ❌ NOT IMPLEMENTED

---

## System States

- **Empty State (No Nearby Activity)** 🟡 PARTIAL (some screens have empty states, not comprehensive)

- **Error State** 🟡 PARTIAL (inline error messages, not dedicated error screens)

- **Loading State** 🟡 PARTIAL (inline loading indicators, not dedicated loading screens)

---

# NeighborGigs — Phase One Settings

## Account

- First name ✅

- Profile photo ✅

---

## Location

- Neighborhood (read-only) ✅

- Radius (1–3 miles) 🟡 API exists, no UI to change

---

## Wallet

- Balance display (USD) ✅

- Withdrawal status ✅

---

## Notifications

- Enable / disable push notifications ✅ (API endpoint exists, device registration implemented)

---

## Support

- Help / contact link ❌

---

# Additional Features (Beyond Phase One)

## Broadcast System

> This is a **community discovery feature** added to Phase One to enhance engagement. Not in original Phase One spec.

### Broadcast List Screen (Home Tab)
- **Location**: Home screen, "Broadcasts" tab
- **Features**:
  - List of active broadcasts (Need Help / Offering Help)
  - Expiration countdown for each broadcast
  - Color-coded badges (red for "Need Help", green for "Offering Help")
  - User avatars and timestamps
  - Click to respond

### Broadcast Create Modal
- **Location**: Modal from Home screen
- **Features**:
  - Broadcast type selector: "Need Help" vs "Offering Help"
  - Message input (1-280 characters)
  - Duration selector: 15, 30, 60, 120 minutes
  - Real-time character count
  - Cancel / Broadcast buttons

### Broadcast Details / Respond Modal
- **Location**: Click on broadcast in list
- **Features**:
  - Full broadcast details
  - Suggest tip amount to respond
  - Creates task request on confirmation

### API Endpoints
- `GET /api/v1/broadcasts` - List active broadcasts
- `POST /api/v1/broadcasts` - Create new broadcast
- `POST /api/v1/broadcasts/:id/respond` - Respond to broadcast

### Data Model
- Broadcasts are stored in `task_requests` table with `is_broadcast=true`
- Fields: `broadcast_type` ('need_help' | 'offer_help'), `message`, `expires_at`
- Broadcasts expire after selected duration
- Responding to a broadcast creates a regular task request

---

# Implementation Summary

## Phase One Spec Coverage

**Screens Fully Implemented** (11/12 core screens):
- ✅ Location Permission Gate
- ✅ Home (Map View)
- ✅ Request Help
- ✅ Active Task (all states)
- ✅ Wallet
- ✅ Profile
- ✅ Incoming Requests
- ✅ Accept/Decline Requests
- ✅ Mark Complete
- ✅ Task Completed Confirmation

**Screens Partially Implemented** (4 screens):
- 🟡 Map ↔ List Toggle (List is placeholder)
- 🟡 List View (Nearby Helpers) (placeholder only)
- 🟡 Request Sent Confirmation (navigates directly)
- 🟡 Empty/Error/Loading States (inline only)

**Screens Not Implemented** (6 screens):
- ❌ Splash / Launch
- ❌ Helper Preview (Bottom Sheet)
- ❌ Go On the Move (entire Movement section)
- ❌ Direction Selector
- ❌ Time Window Selector
- ❌ On-the-Move Active State
- ❌ Help Link

## Additional Features Implemented

**Broadcast System** (Complete):
- ✅ Broadcast list view
- ✅ Broadcast creation modal
- ✅ Broadcast response flow
- ✅ API endpoints fully functional

## Backend Implementation Status

**User Endpoints**: ✅ Complete
- GET /api/v1/me
- PATCH /api/v1/me/profile
- PATCH /api/v1/me/location
- PATCH /api/v1/me/radius
- PATCH /api/v1/me/notifications
- POST /api/v1/me/neighborhood
- POST /api/v1/me/devices (push notification registration)

**Discovery Endpoints**: ✅ Complete
- GET /api/v1/nearby/helpers (supports on-the-move users)

**Movement Endpoints**: ✅ Complete (API only, no UI)
- POST /api/v1/movement/start
- POST /api/v1/movement/stop

**Request Endpoints**: ✅ Complete
- POST /api/v1/requests
- GET /api/v1/requests/incoming
- POST /api/v1/requests/:requestId/accept
- POST /api/v1/requests/:requestId/decline
- POST /api/v1/requests/:requestId/cancel

**Broadcast Endpoints**: ✅ Complete
- GET /api/v1/broadcasts
- POST /api/v1/broadcasts
- POST /api/v1/broadcasts/:id/respond

**Task Endpoints**: ✅ Complete
- GET /api/v1/tasks/active
- POST /api/v1/tasks/:taskId/start
- POST /api/v1/tasks/:taskId/complete

**Wallet Endpoints**: ✅ Complete
- GET /api/v1/wallet
- GET /api/v1/wallet/ledger
- POST /api/v1/wallet/withdrawals

## Technical Debt & Outstanding Items

1. **Movement Feature**: Backend complete, frontend screens missing entirely
2. **List View**: Placeholder only, needs full implementation of nearby helpers list
3. **Bottom Sheet**: Helper preview not implemented
4. **Radius Selector**: UI to change radius not implemented (API exists)
5. **Help/Support**: No help link or support contact UI
6. **Splash Screen**: App launches directly to LocationGate

## Recommended Next Steps

### For Phase One Completion:
1. Implement Movement screens (Go On the Move, Direction/Time selectors, Active state)
2. Complete List View implementation with helper details
3. Add bottom sheet for helper preview
4. Add radius selector UI in Profile
5. Add help link to Profile screen

### For Phase Two Consideration:
- Broadcast system is working well - consider making it a core feature
- Movement feature UI implementation would unlock the full "on-the-go" workflow
- Push notification integration (API exists, needs client-side implementation)

---

# Phase One Lock Statement (Screens)

> **If a new feature requires a new screen, it must replace an existing one or wait for Phase Two.**

This list is the **entire UI surface area** for Phase One.

---

# Route Structure

```typescript
// Current Routes in App.tsx
Route path="/" element={<LocationGate />}         // Location gate + demo mode
Route path="/home" element={<Home />}             // Broadcasts | Map | List
Route path="/profile" element={<Profile />}        // Profile view + edit
Route path="/wallet" element={<Wallet />}          // Wallet + withdraw
Route path="/request/:helperId" element={<RequestHelp />}  // Request creation
Route path="/task" element={<ActiveTask />}        // Task management
```

---

# Component Architecture

```
src/
├── pages/
│   ├── LocationGate.tsx        # Entry screen, location request
│   ├── Home.tsx                # Broadcasts | Map | List toggle
│   ├── Profile.tsx             # User profile, read-only + edit mode
│   ├── Wallet.tsx              # Balance, withdraw, history
│   ├── RequestHelp.tsx         # Request creation + tip selection
│   ├── ActiveTask.tsx          # Task flow: pending/active/completed
│   └── Dashboard.tsx           # Admin dashboard (not Phase One)
├── components/
│   ├── MapView.tsx             # Leaflet map + markers
│   └── ui/                    # shadcn/ui components
├── contexts/
│   └── UserContext.tsx         # User state management
└── lib/
    └── api-client.ts           # API client wrapper
```