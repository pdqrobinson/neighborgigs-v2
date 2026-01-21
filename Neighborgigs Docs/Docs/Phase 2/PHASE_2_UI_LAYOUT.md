# Phase 2 — Complete UI Layout & Page Architecture

**Last Updated:** 2026-01-21  
**Status:** Phase 2 Design Complete

---

## Overview

This document maps **all Phase 2 pages, features, and UI flows** based on the Phase 2 specification documents. It provides the complete frontend architecture needed to implement Phase 2.

---

## Phase 2 Page Index

### 1. Authentication & Session
| Page | Route | Purpose |
|------|-------|---------|
| **Login** | `/login` | Select identity (preview mode only) |
| **Clear Session** | `/logout` | Reset preview session |

### 2. Core Navigation
| Page | Route | Purpose |
|------|-------|---------|
| **Home** | `/home` or `/` | User home with task tabs |
| **User Profile** | `/profile` | View/edit profile (limited) |
| **Account Settings** | `/settings` | Settings sections |

### 3. Discovery & Creation
| Page | Route | Purpose |
|------|-------|---------|
| **Broadcasts Feed** | `/broadcasts` | View available tasks |
| **Broadcast Details** | `/broadcasts/:id` | View task details, respond |
| **Create Broadcast** | `/broadcasts/new` | Create a new task request |

### 4. Gigs Management
| Page | Route | Purpose |
|------|-------|---------|
| **Gigs Screen** | `/gigs` | View all your gigs (helper + requester) |
| **Gig Details** | `/gigs/:id` | View specific gig details |

### 5. Task Management (Helper)
| Page | Route | Purpose |
|------|-------|---------|
| **Available Tasks** | `/tasks/available` | Browse tasks (same as broadcasts) |
| **In Progress** | `/tasks/in-progress` | Your active gigs |
| **Completed** | `/tasks/completed` | Your past gigs |
| **Training** | `/tasks/training` | Learning tasks |

### 6. Requester Management
| Page | Route | Purpose |
|------|-------|---------|
| **My Requests** | `/requests` | Your posted tasks |
| **Request Responses** | `/requests/:id/responses` | Review helper responses |
| **Request Details** | `/requests/:id` | View your posted task |

### 7. Messaging
| Page | Route | Purpose |
|------|-------|---------|
| **Messages** | `/messages` | View all message threads (Phase 2: limited) |
| **Thread** | `/messages/:thread_id` | Specific conversation |

---

## Page-by-Page UI Architecture

### 1. Login Page (`/login`)

**Purpose:** Select identity for preview mode (Phase 2)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  Preview Mode Login                │
│  ──────────────────────────────────│
│                                     │
│  [ 👤 Sarah Parker ]                │
│  Requester • Posts broadcasts       │
│                                     │
│  [ 👤 Mike Rodriguez ]              │
│  Helper • Responds to tasks         │
│                                     │
│  ──────────────────────────────────│
│  Advanced                           │
│  [ Clear Session ]                  │
│                                     │
│  ⚠️  Preview mode - no real auth    │
└─────────────────────────────────────┘
```

**Features:**
- User cards with avatar, name, role
- One-click selection
- Clear session option
- Preview banner always visible

**UX Rules:**
- Auto-redirect if session exists
- No confirmation modal
- Instant switch

---

### 2. Home Screen (`/home`)

**Purpose:** Task status tabs + User context

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  Logged in as: Sarah (Requester)    │
│  ──────────────────────────────────│
│  [Available] [In Progress] [Completed] [Training] │
│                                     │
│  ──────────────────────────────────│
│  Tab Content Area                   │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Empty State or Task List    │  │
│  └──────────────────────────────┘  │
│                                     │
│  [Create Broadcast] Floating Button │
└─────────────────────────────────────┘
```

**Tab Definitions:**

#### 2.1 Available Tab
- Displays **broadcasts** (tasks posted by others)
- Card format: Title, location, offer, requester info
- CTA: "I can help" (opens task detail)
- Empty state: "No broadcasts near you. Create one!"

#### 2.2 In Progress Tab
- Displays **gigs with task_status = accepted/in_progress**
- For requester: shows accepted helpers
- For helper: shows your active gigs
- CTA: "Message" or "View Details"
- Empty state: "No active gigs yet."

#### 2.3 Completed Tab
- Displays **gigs with task_status = completed**
- Card format: Past gigs with completion date
- Read-only view
- Empty state: "No completed gigs yet."

#### 2.4 Training Tab
- **Phase 2 feature:** Learning tasks
- Cards: Sample walkthrough tasks
- Fully interactive but simulated
- CTA: "Start Training"
- Purpose: Build confidence, explain flows

**Analytics Trackers:**
- Tab switches
- Time per tab
- Empty state views
- CTA clicks per tab

---

### 3. Broadcasts Feed (`/broadcasts`)

**Purpose:** Discover available tasks

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  ──────────────────────────────────│
│  Search / Filter Bar                │
│  ┌──────────────────────────────┐  │
│  │  🛒 Pickup at Target         │  │
│  │  $15 • 2.3mi • Today 4-6pm   │  │
│  │  [ I can help ]              │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  📦 Drop-off to UPS          │  │
│  │  $8 • 1.2mi • Today 2-4pm    │  │
│  │  [ I can help ]              │  │
│  └──────────────────────────────┘  │
│                                     │
│  [ + Create Broadcast ]             │
└─────────────────────────────────────┘
```

**Features:**
- Filter by: Task type, distance, date, offer
- Sort by: Newest, nearest, highest offer
- Geographic map integration (from Maps.md)
- Preview-only indicators

**Card Details:**
- Task type icon (5 types from `task_types.md`)
- Title/description
- Offer amount (prominent)
- Location (distance from user)
- Time window
- Requester avatar (if helper view)
- "I can help" CTA

**Phase 2 Safety:**
- "I can help" creates preview task_request
- Shows "Preview Mode - No real commitment" toast
- Logs [preview] event

---

### 4. Broadcast Details (`/broadcasts/:id`)

**Purpose:** Decision space for task engagement

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  ← Back to Feed                     │
│  ──────────────────────────────────│
│  🛒 Pickup at Target               │
│  $15 offered • Today 4-6pm         │
│  ──────────────────────────────────│
│  Details:                          │
│  • Item: Paper towels              │
│  • Store: Target (123 Main St)     │
│  • Notes: Grab from aisle 7        │
│                                     │
│  Requester: Sarah Parker           │
│  ──────────────────────────────────│
│  Actions (Context-Aware):          │
│                                     │
│  [ I can help ]                    │
│  [ Message ]                       │
│                                     │
│  ──────────────────────────────────│
│  Preview Notice                    │
│  • In preview mode, no real commit │
│  • Your response won't be sent     │
└─────────────────────────────────────┘
```

**Context-Aware Actions (Helper vs Requester):**

#### Helper View:
- Primary: "I can help" → Creates response
- Secondary: "Message" → Opens thread
- Shows: "You're viewing as Helper" badge

#### Requester View:
- Shows: "Your broadcast" badge
- Response list (if any)
- Each response: Helper name, time, "Accept" button
- Opens: Response detail panel

**Key UX:**
- No negotiation UI
- No price editing
- No task mutation here
- Clear preview indicators

**Analytics:**
- Views per broadcast
- "I can help" clicks (blocked in preview)
- Time on page
- Response rate

---

### 5. Create Broadcast (`/broadcasts/new`)

**Purpose:** Create a new task request (draft mode)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  Create New Task                    │
│  ──────────────────────────────────│
│                                     │
│  Task Type: [dropdown]              │
│  ┌──────────────────────────────┐  │
│  │  🛒 Pickup                   │  │
│  │  📦 Drop-off                 │  │
│  │  🚗 Route / Travel           │  │
│  │  🤝 Help / Assistance        │  │
│  │  ✍️ Other                    │  │
│  └──────────────────────────────┘  │
│                                     │
│  Title: [text input]                │
│  Description: [textarea]            │
│                                     │
│  Offer: $[number]                   │
│                                     │
│  Location: [map search/pick]        │
│  ┌──────────────────────────────┐  │
│  │  [ Map Preview ]             │  │
│  └──────────────────────────────┘  │
│                                     │
│  Time Window:                       │
│  From: [datetime picker]            │
│  To:   [datetime picker]            │
│                                     │
│  ──────────────────────────────────│
│  [ Save as Draft ] [ Preview Submit ] │
│                                     │
│  ⚠️  No real task will be created   │
└─────────────────────────────────────┘
```

**Phase 2 Features:**
- Draft creation (status = 'draft')
- Dry-run submit (logs only)
- Blocked final actions with explanation
- Auto-save drafts

**Validation:**
- Required fields: type, title, offer, location, time
- Offer amount validation (min/max)
- Time window validation

**UX Guardrails:**
- Clear "Preview Mode" banner
- Form saves as draft on exit
- "Submit" shows blocked modal
- No real API calls to create live task

**Analytics:**
- Draft saves
- Blocked submit attempts
- Form abandonment points
- Time to complete

---

### 6. Gigs Screen (`/gigs`)

**Purpose:** View all your gigs (helper + requester combined)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  My Gigs                            │
│  ──────────────────────────────────│
│  [Active] [Pending] [Past] [Expired]│
│                                     │
│  ──────────────────────────────────│
│  Gig Cards:                         │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🛒 Target Run               │  │
│  │  $15 • Active                │  │
│  │  You (Helper)                │  │
│  │  Started: Today 4:00pm       │  │
│  │  [ View Details ]            │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  📦 UPS Drop-off             │  │
│  │  $8 • Pending                │  │
│  │  From Sarah                  │  │
│  │  Posted: Today 2:30pm        │  │
│  │  [ View Responses ]          │  │
│  └──────────────────────────────┘  │
│                                     │
│  ──────────────────────────────────│
│  Filter by Role: [All] [Helper] [Requester] │
└─────────────────────────────────────┘
```

**Query Examples (from `gigs_view`):**

**Helper View:**
```sql
WHERE helper_id = :current_user
  AND task_status IN ('accepted', 'in_progress')
```

**Requester View:**
```sql
WHERE requester_id = :current_user
  AND task_id IS NOT NULL
```

**Pending (Requester only):**
```sql
WHERE requester_id = :current_user
  AND task_id IS NULL
  AND request_status = 'active'
```

**Card Fields:**
- Task type icon
- Title (from `task_requests`)
- Offer amount
- Status badge (active/pending/completed/expired/cancelled)
- Role tag (Helper/Requester)
- Date (started/completed/posted)
- CTA: View Details

**Empty States:**
- No active: "No active gigs. Browse broadcasts to get started."
- No pending: "No pending requests. Create a new task."
- No past: "No completed gigs yet."

---

### 7. Gig Details (`/gigs/:id`)

**Purpose:** Single gig view with full context

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  ← Back to Gigs                     │
│  ──────────────────────────────────│
│  🛒 Target Run                      │
│  $15 • Active                       │
│                                     │
│  Details:                           │
│  • Item: Paper towels               │
│  • Store: Target                    │
│  • Time: Today 4-6pm                │
│                                     │
│  ──────────────────────────────────│
│  Participants:                      │
│  Requester: Sarah Parker            │
│  Helper: Mike Rodriguez             │
│                                     │
│  ──────────────────────────────────│
│  Status Timeline:                   │
│  [● Requested] → [● Accepted] → [○ In Progress] │
│                                     │
│  Actions:                           │
│  [ Message Sarah ]                  │
│  [ View Task Steps ]                │
│                                     │
│  ──────────────────────────────────│
│  Gigs View (gigs_view) Data:       │
│  request_id, task_id, status, dates│
└─────────────────────────────────────┘
```

**Data from `gigs_view`:**
- Combined request + task data
- Requester/helper roles
- Offer amount
- Statuses (request_status + task_status)
- Timestamps

**Analytics:**
- Gig detail views
- Message clicks
- Timeline interactions
- Time spent

---

### 8. Messaging (`/messages` & `/messages/:thread_id`)

**Purpose:** Scoped user-to-user messaging (task context)

**List Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  Messages                           │
│  ──────────────────────────────────│
│  ┌──────────────────────────────┐  │
│  │  Sarah Parker                │  │
│  │  "Can you grab paper towels?"│  │
│  │  2:34pm                      │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Mike Rodriguez              │  │
│  │  "Sure, on my way"           │  │
│  │  2:36pm                      │  │
│  └──────────────────────────────┘  │
│                                     │
│  Note: Messages are task-scoped     │
└─────────────────────────────────────┘
```

**Thread Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  ← Back to Messages                 │
│  ──────────────────────────────────│
│  Conversation with: Sarah Parker    │
│  Context: Target Run ($15)          │
│                                     │
│  ──────────────────────────────────│
│  Chat History:                      │
│                                     │
│  Sarah (2:34pm):                    │
│  "Can you grab paper towels?"       │
│                                     │
│  You (2:36pm):                      │
│  "Sure, on my way"                  │
│                                     │
│  ──────────────────────────────────│
│  [ Type message... ] [ Send ]       │
│                                     │
│  Guardrails:                        │
│  • No attachments (Phase 2)         │
│  • Task-scoped only                 │
│  • No negotiation UI                │
└─────────────────────────────────────┘
```

**Phase 2 Features:**
- Messages scoped to `broadcast` or `task_request`
- No global inbox
- No attachments
- Simple text only
- Read-only after completion

**Database:**
- `conversations` table (context_type, context_id)
- `messages` table (conversation_id, sender_id, body)

**Analytics:**
- Message threads opened
- Messages sent (preview logged)
- Time between responses
- Message length distribution

---

### 9. Account Settings (`/settings`)

**Purpose:** Explore settings (all blocked in preview)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  Account Settings                   │
│  ──────────────────────────────────│
│                                     │
│  📋 Personal Information            │
│  • View-only fields: Name, email    │
│  • Editable: Display name, avatar   │
│  • [ Edit Profile ] (partial)       │
│                                     │
│  🔒 Password                        │
│  • [ Change Password ]              │
│  ⚠️  Blocked in preview             │
│                                     │
│  📄 Licenses                        │
│  • View requirements                │
│  • [ Upload Sample ]                │
│                                     │
│  🏦 Bank Account                    │
│  • View status (masked)             │
│  • [ Add Bank ] (blocked)           │
│  ⚠️  No real payouts in preview     │
│                                     │
│  🛡️  Help & Support                 │
│  • Browse help articles             │
│  • [ Send Feedback ]                │
│  • [ Contact Support ]              │
│                                     │
│  📄 Legal                           │
│  • [ View Terms of Use ]            │
│  • [ View Participation Agreement ] │
│  (View-only)                        │
└─────────────────────────────────────┘
```

**Sections (from `Account_settings.md`):**

1. **Personal Information**
   - View: Name, email, phone
   - Edit: Display name, avatar (non-auth fields)
   - Blocked: Email/phone changes, identity docs

2. **Background Check**
   - View: Status, expiration
   - View: Sample redacted report
   - Blocked: Initiate new check

3. **Password**
   - View: Password rules
   - Blocked: Actual change
   - Shows: "Disabled in preview" message

4. **Licenses**
   - View: Requirements
   - Upload: Sample images (non-final)
   - Blocked: Verification, approval

5. **Bank Account**
   - View: Masked status
   - Blocked: Add/edit bank details
   - Shows: "No real funds move in preview"

6. **Help**
   - Browse articles (fully enabled)
   - Track: Which articles used

7. **Support Chat**
   - Open chat (tagged [preview])
   - Routed to test inbox

8. **Send Feedback**
   - Fully enabled
   - Captures: Page, action, intent

9. **Legal**
   - View-only: Terms, Participation Agreement
   - Blocked: Acceptance flows

**Analytics:**
- Section visits
- Blocked action attempts
- Feedback submissions
- Time per section

---

### 10. Requester Dashboard (`/requests`)

**Purpose:** Manage your posted tasks (requester view)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  My Requests                        │
│  ──────────────────────────────────│
│  [Open] [Accepted] [Completed]      │
│                                     │
│  ──────────────────────────────────│
│  Request Cards:                     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🛒 Target Run               │  │
│  │  $15 • Open                  │  │
│  │  0 responses                 │  │
│  │  Posted: Today 2:00pm        │  │
│  │  [ View ] [ Edit Draft ]     │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  📦 UPS Drop-off             │  │
│  │  $8 • 3 responses            │  │
│  │  [ View Responses ]          │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Filter:**
- Open (no task_id, status = active)
- Accepted (task_id exists, status accepted/in_progress)
- Completed (task_status = completed)

**Analytics:**
- Request creation (draft/fake-submit)
- Response rates
- Time to acceptance

---

### 11. Request Responses (`/requests/:id/responses`)

**Purpose:** Review helper responses (requester only)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  ← Back to My Requests              │
│  ──────────────────────────────────│
│  Target Run - Responses             │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Mike Rodriguez              │  │
│  │  "I can help!"               │  │
│  │  2:36pm                      │  │
│  │  [ View Details ] [ Accept ] │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  Sarah Parker                │  │
│  │  "I'm heading there soon"    │  │
│  │  2:40pm                      │  │
│  │  [ View Details ] [ Accept ] │  │
│  └──────────────────────────────┘  │
│                                     │
│  Note: All responses stay pending    │
│  in Phase 2 (no auto-decline)        │
└─────────────────────────────────────┘
```

**Response Detail Panel (modal/side drawer):**
- Helper profile summary
- Message history (if any)
- Accept button (logs only in preview)
- "Accepted!" success modal (simulated)

**Phase 2 Rules:**
- No auto-decline of other responses
- Backend tags [preview]
- UI simulates acceptance
- No real task creation

**Analytics:**
- Responses viewed
- Accept button clicks (blocked)
- Time to accept decision

---

### 12. Training Tasks (`/tasks/training`)

**Purpose:** Educational walkthroughs (Phase 2 only)

**Layout:**
```markdown
┌─────────────────────────────────────┐
│  [Preview Mode]                     │
│  Training Tasks                     │
│  ──────────────────────────────────│
│  Learn the system safely            │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🎓 Welcome to NeighborGigs  │  │
│  │  Complete these sample tasks │  │
│  │  [ Start Training ]          │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  🛒 Sample Pickup Task       │  │
│  │  Practice creating a request │  │
│  │  [ Start ]                   │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  📦 Sample Drop-off Task     │  │
│  │  Practice responding         │  │
│  │  [ Start ]                   │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Training Tasks Include:**
1. **Onboarding Walkthrough**
   - Step-by-step guide
   - Tooltips on each screen
   - Interactive prompts

2. **Sample Pickup**
   - Pre-filled form
   - Simulated submit
   - Success feedback

3. **Sample Drop-off**
   - Practice responding
   - Simulated message
   - Accept flow

4. **Messaging Practice**
   - Sample conversation
   - No real recipient

**UX Features:**
- Progress tracker
- Skip option
- "Never show again" toggle
- Completion badges

**Analytics:**
- Training completion rate
- Drop-off points
- Time per task
- Confusion signals

---

## Cross-Page Navigation Flow

```mermaid
graph TD
    A[Login /login] --> B[Home /home]
    B --> C[Tab: Available /tasks/available]
    B --> D[Tab: In Progress /tasks/in-progress]
    B --> E[Tab: Completed /tasks/completed]
    B --> F[Tab: Training /tasks/training]
    
    C --> G[Broadcasts Feed /broadcasts]
    G --> H[Broadcast Details /broadcasts/:id]
    H --> I[Create Response (Preview)]
    H --> J[Message Thread /messages/:thread_id]
    
    G --> K[Create Broadcast /broadcasts/new]
    K --> L[Draft Saved]
    
    D --> M[Gigs Screen /gigs]
    E --> M
    M --> N[Gig Details /gigs/:id]
    N --> J
    
    K --> P[Requester Dashboard /requests]
    P --> Q[Request Responses /requests/:id/responses]
    Q --> R[Accept Response (Preview)]
    
    S[Account Settings /settings] --> T[Personal Info]
    S --> U[Password]
    S --> V[Licenses]
    S --> W[Bank Account]
    S --> X[Help & Support]
    S --> Y[Legal]
    
    Z[User Profile /profile] --> BB[Edit Profile (Partial)]
    
    %% Preview Flow
    I --> CC[Preview Mode Notice]
    R --> CC
    K --> CC
    
    CC --> DD[Event Logging [preview]]
    CC --> EE[Analytics Tracking]
```

---

## Global UI Elements

### Preview Mode Banner
```html
<div class="preview-banner">
  ⚠️ Preview Mode - No real actions will occur
  [ Dismiss ]
</div>
```
- Always visible in Phase 2
- Can be dismissed temporarily
- Reappears on blocked actions

### Active User Badge
```html
<div class="user-badge">
  👤 Sarah Parker (Requester)
  [ Switch ]
</div>
```
- Shows in header
- "Switch" goes to `/login`
- Visible on all pages

### Blocked Action Modal
```html
<div class="blocked-modal">
  <h3>Preview Mode</h3>
  <p>This action is disabled in preview mode.</p>
  <p>You can explore the flow, but no real changes will be made.</p>
  <button>Got it</button>
  <button>Give Feedback</button>
</div>
```
- Triggered on blocked actions
- Always includes feedback option
- Logs [blocked_action] event

---

## Phase 2 Analytics Implementation

### Events to Track

#### User Actions
- `page_view` - Track all page visits
- `tab_switch` - Home screen tabs
- `click` - All CTA clicks (blocked or not)
- `form_submit` - Draft saves, dry-run submits
- `blocked_action` - Any blocked button click
- `modal_open` - Details, responses, etc.
- `message_sent` - Preview logged
- `feedback_submitted` - User feedback

#### Engagement Metrics
- `time_on_page` - Seconds per page
- `time_in_flow` - Start to exit per task
- `abandon_point` - Where users leave incomplete
- `confusion_signal` - Frequent blocked clicks

#### Success Indicators
- `draft_created` - Task/request drafts
- `dry_run_complete` - Mock completions
- `training_complete` - Training tasks finished
- `exploration_depth` - Pages visited per session

### Data Collection Method

**Client-Side (Preview Mode Only):**
```javascript
// Log all events to console + localStorage
const logEvent = (name, data) => {
  const event = {
    timestamp: Date.now(),
    event: name,
    user_id: currentUser.id,
    preview: true,
    ...data
  };
  console.log('[PREVIEW]', event);
  // Send to analytics endpoint (if configured)
};
```

**Backend Handling:**
- Accept events from preview sessions
- Tag with `[preview]` prefix
- Store in `preview_events` table
- No production analytics impact

---

## UI/UX Design Principles (Phase 2)

### 1. Clear Preview State
- Every screen shows preview indicator
- Blocked actions explain *why*
- Success messages include "(simulated)"

### 2. Intent Over Execution
- Focus on *what users want to do*
- Measure blocked action attempts
- Track confusion signals

### 3. Safety First
- No real payments/commitments
- No irreversible actions
- No real data creation

### 4. Educational
- Training tasks available
- Clear empty states
- Helpful error messages

### 5. Analytical
- Track everything (preview only)
- No guessing about user intent
- Data-driven Phase 3 planning

---

## Implementation Priority

### Tier 1: Core (Phase 2 Must-Haves)
1. ✅ Login page (identity selection)
2. ✅ Home screen with 4 tabs
3. ✅ Broadcasts feed (Available tasks)
4. ✅ Broadcast details
5. ✅ Create broadcast (draft)
6. ✅ Gigs screen
7. ✅ Blocked action modals

### Tier 2: Interaction (Phase 2 Should-Haves)
8. ✅ Message threads (scoped)
9. ✅ Request responses (requester view)
10. ✅ Account settings (view-only)
11. ✅ Training tasks (basic)
12. ✅ Preview banner

### Tier 3: Polish (Phase 2 Nice-to-Haves)
13. ✅ Filter/sort on feeds
14. ✅ Geographic map integration
15. ✅ Advanced empty states
16. ✅ User profile (partial edit)
17. ✅ Analytics dashboard (internal)

---

## File Structure Recommendation

```
web/src/
├── pages/
│   ├── Login/                    # /login
│   ├── Home/                     # /home (4 tabs)
│   ├── Broadcasts/               # /broadcasts
│   │   ├── Feed.tsx
│   │   ├── Details.tsx
│   │   └── Create.tsx
│   ├── Gigs/                     # /gigs
│   │   ├── List.tsx
│   │   └── Details.tsx
│   ├── Tasks/                    # /tasks
│   │   ├── Available.tsx
│   │   ├── InProgress.tsx
│   │   ├── Completed.tsx
│   │   └── Training.tsx
│   ├── Messages/                 # /messages
│   │   ├── List.tsx
│   │   └── Thread.tsx
│   ├── Requests/                 # /requests (requester)
│   │   ├── List.tsx
│   │   └── Responses.tsx
│   ├── Settings/                 # /settings
│   │   ├── Personal.tsx
│   │   ├── Password.tsx
│   │   ├── Licenses.tsx
│   │   ├── Bank.tsx
│   │   ├── Help.tsx
│   │   └── Legal.tsx
│   └── Profile/                  # /profile
│       └── Edit.tsx
├── components/
│   ├── PreviewBanner.tsx         # Global preview indicator
│   ├── BlockedModal.tsx          # Blocked action explanation
│   ├── UserBadge.tsx             # Active user display
│   ├── GigCard.tsx               # Reusable gig card
│   ├── BroadcastCard.tsx         # Reusable broadcast card
│   └── StatusBadge.tsx           # Status indicators
└── hooks/
    └── useAnalytics.ts           # Preview event logging
```

---

## Summary

This document defines **all Phase 2 pages, features, and UI flows** based on the specification documents. Each page has:

- **Clear purpose** and user goal
- **Phase 2 behavior** (preview-safe)
- **UI layout** and key elements
- **Analytics** to track
- **UX rules** and guardrails

**Total Pages:** 12+ routes  
**Core Features:** 5 task tabs, 3 user roles, 2 messaging scopes  
**Safety:** 100% preview mode, zero real consequences

**Next Steps:**
1. Implement Tier 1 pages
2. Set up preview analytics
3. Create reusable components
4. Test multi-user flows
5. Gather Phase 2 insights
6. Plan Phase 3 unlock order based on data
