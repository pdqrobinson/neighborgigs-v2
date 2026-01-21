# Phase 2 — Additional Pages Checklist

**Last Updated:** 2026-01-21  
**Status:** ✅ Complete

---

## Overview

This document lists **all additional pages** needed for Phase 2, beyond the main flow pages. These are modals, panels, dialogs, and secondary screens that support the core Phase 2 experience.

---

## 📋 Complete Page List (Phase 2)

### Core Flow Pages (Already Documented)
See `PHASE_2_UI_LAYOUT.md` for:
- Login
- Home (4 tabs)
- Broadcasts
- Broadcast Details
- Create Broadcast
- Gigs Screen
- Gigs Details
- Task tabs (Available, In Progress, Completed, Training)
- Messages
- Settings
- Profile

### Additional Pages & Components

## 1. Blocked Action Modals

### 1.1 Preview Block Modal
**Route:** Component, not a route  
**Trigger:** Any blocked action  
**Features:**
- Clear explanation of why action is blocked
- "This is preview mode" messaging
- Optional "What will happen in real mode" preview
- Feedback link: "Was this confusing?"

**Content:**
```markdown
┌─────────────────────────────────────────┐
│  🔒 Action Not Available                │
│  ────────────────────────────────────── │
│                                         │
│  This action is disabled in preview     │
│  mode. You can explore the full flow,   │
│  but no real changes will occur.        │
│                                         │
│  In production, this would:             │
│  • Send a real payment                  │
│  • Create a permanent record            │
│  • Send notifications                   │
│                                         │
│  [Keep Exploring] [Feedback]            │
└─────────────────────────────────────────┘
```

**Used by:**
- Submit broadcast (blocked)
- Confirm task completion (blocked)
- Add bank account (blocked)
- Save password (blocked)
- Send real message (blocked in some contexts)

---

### 1.2 Success Simulation Modal
**Trigger:** "Success" actions in preview mode  
**Features:**
- Shows what *would* happen
- Simulated success message
- Prevents confusion about actual state

**Content:**
```markdown
┌─────────────────────────────────────────┐
│  ✅ Success! (Preview)                  │
│  ────────────────────────────────────── │
│                                         │
│  Your task would be posted successfully │
│  In preview mode, this is simulated.    │
│                                         │
│  What happens in production:            │
│  • Broadcast appears to neighbors       │
│  • Notifications sent                   │
│  • Task added to queue                  │
│                                         │
│  [View as Requester] [Create Another]  │
└─────────────────────────────────────────┘
```

**Used by:**
- Draft save
- Preview submit
- Profile edit
- Settings change

---

## 2. Draft & Form Pages

### 2.1 Create Broadcast Draft
**Route:** `/broadcasts/new/draft`  
**Features:**
- Full form: title, description, type, offer, location, date
- Draft save (not submit)
- Auto-save every 30 seconds
- "Draft saved" indicator
- Load draft if exists

**Form Fields:**
- Task Type (5 options from `task_types.md`)
- Title
- Description
- Offer Amount (USD, whole dollars only)
- Pickup Location (address or store)
- Preferred Date/Time
- Notes/Constraints

**Safety:**
- Never hits production API
- Saves to `drafts` table with `is_preview = true`
- Clear "Preview Mode" banner

---

### 2.2 Edit Draft Modal
**Route:** Component (inline or modal)  
**Trigger:** Edit existing draft  
**Features:**
- Load existing draft data
- Save changes to draft
- Discard changes option
- Version history (optional)

**Used when:**
- Clicking "Edit" on a pending request
- Resume draft from home screen

---

### 2.3 Upload Document Preview
**Route:** `/settings/licenses/upload`  
**Features:**
- File picker
- Preview image
- Validation preview (fake)
- "Submission blocked" modal

**Files Supported:**
- License images (JPG, PNG)
- Documents (PDF, PNG)

**Safety:**
- No actual upload to production
- Files stored in browser or temporary location
- Clear preview indicator

---

### 2.4 Bank Account Form (View-Only)
**Route:** `/settings/bank`  
**Features:**
- Show masked account (****1234)
- View bank details (read-only)
- "Add bank account" button (blocked)
- Explanation of payout flow

**Blocked Actions:**
- Add new account
- Edit existing
- Verification

---

## 3. Response & Acceptance Pages

### 3.1 Response Detail Panel
**Route:** `/requests/:id/responses/:response_id`  
**Features:**
- Helper profile summary
- Response time
- Message history with helper
- "Accept" button (blocked in Phase 2)
- "Message" button

**Layout:**
```markdown
┌─────────────────────────────────────────┐
│  Mike Rodriguez                         │
│  Responded 2 hours ago                  │
│  ────────────────────────────────────── │
│                                         │
│  Mike's Message:                        │
│  "I can help with this in the afternoon"│
│                                         │
│  ────────────────────────────────────── │
│  [Message Mike] [Accept (Blocked)]      │
└─────────────────────────────────────────┘
```

**Blocked Modal Content:**
"Accepting helpers is blocked in preview mode. This simulates the acceptance flow."

---

### 3.2 Response List Page
**Route:** `/requests/:id/responses`  
**Features:**
- List of all responses
- Each with status badge
- Filter by status (sent, accepted, pending)
- Empty state: "No responses yet"

**Status Indicators:**
- **Sent** (pending)
- **Accepted** (if you accepted - simulated)
- **Declined** (not in Phase 2)

---

## 4. Training & Education Pages

### 4.1 Training Tasks Landing
**Route:** `/tasks/training`  
**Features:**
- List of educational tasks
- Each task teaches one concept
- Clear "This is a demo" indicator
- Completion tracking

**Training Task Examples:**
1. **"Create Your First Broadcast"** - Guided walkthrough
2. **"Find a Task to Help With"** - Explore discovery
3. **"Practice Messaging"** - Send a test message
4. **"See Your Gigs"** - View completed example

---

### 4.2 Guided Walkthrough (Multi-step)
**Route:** Component overlay  
**Features:**
- Step-by-step guidance
- Highlighted UI elements
- "Next" / "Skip" buttons
- Progress indicator

**Used in training tasks to:**
- Show where things are
- Explain what each section does
- Build confidence

---

### 4.3 Tutorial Complete
**Route:** `/tasks/training/complete`  
**Features:**
- Celebration UI
- What user learned
- Next steps suggestion
- "Try the real thing" CTA

---

## 5. Feedback & Support Pages

### 5.1 Inline Feedback Prompt
**Component:** Appears after blocked actions  
**Features:**
- "Was this confusing?" (1-5 stars)
- Optional comment
- Quick submit
- Dismissible

**Trigger:**
- After 2+ blocked clicks in a row
- On flow exit
- On error

---

### 5.2 Feedback Submission Form
**Route:** `/feedback`  
**Features:**
- Subject (dropdown)
- Description (textarea)
- Context auto-captured (page, action, user role)
- Optional screenshot
- Submit (logged, not sent)

**Subjects:**
- Confusing UI
- Missing feature
- Bug report (preview)
- General suggestion

---

### 5.3 Support Chat (Preview-Only)
**Route:** `/support/chat`  
**Features:**
- Simple chat interface
- Message history
- Pre-defined categories
- "This is a preview support channel"

**Backend:**
- Messages tagged `[preview]`
- Routed to internal test inbox
- No production escalation

---

### 5.4 Help Center
**Route:** `/help`  
**Features:**
- FAQ list
- Search
- Articles by category
- "How it works" guides

**Article Categories:**
- Getting Started
- Creating Tasks
- Finding Tasks
- Messaging
- Tips & Etiquette
- Preview Mode Info

---

### 5.5 Legal Pages (View-Only)

**Route:** `/settings/terms`  
**Purpose:** View Terms of Use
**Features:**
- Read-only text
- No acceptance flow
- Plain language summary
- "Last updated" date

**Route:** `/settings/agreement`  
**Purpose:** View Participation Agreement
**Features:**
- Read-only text
- Explains obligations
- No signature
- Clear this is informational

---

## 6. Data & Analytics Pages (Admin/Internal)

### 6.1 Preview Analytics Dashboard
**Route:** `/analytics/preview` (Internal only)  
**Features:**
- Real-time event stream
- Metrics dashboard
- User journey visualizations
- Block action heatmap

**Metrics Displayed:**
- Page views
- Blocked action counts
- Time on page
- Flow completion rates
- Feedback volume

**Visualizations:**
- Funnel charts
- Heat maps
- Trend lines
- Session replays (if enabled)

---

### 6.2 Session Replay Viewer
**Route:** `/analytics/sessions/:session_id`  
**Features:**
- Replay user session
- Timeline scrubber
- Event markers (clicks, navigation, blocks)
- Session metadata

**Privacy Note:**
- Only preview sessions
- No real user data
- Clear labeling

---

### 6.3 Event Export
**Route:** `/analytics/export`  
**Features:**
- Filter events by date range
- Export to CSV/JSON
- Download link
- "Preview only" disclaimer

---

## 7. Geographic & Location Pages

### 7.1 Map View
**Route:** `/map` or `/broadcasts/map`  
**Features:**
- Map with broadcast pins
- Filter by radius
- Click pin to see details
- "Show list" toggle

**Pins:**
- Color by task type
- Size by offer amount
- Cluster at zoom out

**Safety:**
- Mock location data available
- "Use my location" (preview)
- No real GPS (Phase 2)

---

### 7.2 Location Picker
**Component:** Modal or page  
**Features:**
- Search address
- Pick from map
- Use current location (simulated)
- Save as favorite (preview)

**Used in:**
- Broadcast creation
- Profile address
- Task pickup location

---

## 8. Notification & Alert Pages

### 8.1 Notification Settings
**Route:** `/settings/notifications`  
**Features:**
- Toggle switches (UI only)
- Email, SMS, push (simulated)
- Categories selection
- "This affects UI only" disclaimer

**Settings:**
- New responses
- Message alerts
- Task accepted
- Tips received
- General updates

**Safety:**
- No real emails sent
- No real notifications
- Mock preview only

---

### 8.2 In-App Notifications (Preview)
**Component:** Toast or badge  
**Features:**
- Simulated notifications
- Preview banner style
- "What would happen" info
- Dismissible

**Examples:**
- "You received a response (simulated)"
- "Task accepted (preview mode)"

---

## 9. Wallet & Payment Pages (View-Only)

### 9.1 Wallet Overview
**Route:** `/wallet`  
**Features:**
- Stub balances (Phase 1)
- No real money
- Ledger view (read-only)
- "Payout info" section

**UI Elements:**
- Available balance (simulated)
- Pending balance (simulated)
- Recent transactions (mock)
- "Add bank account" (blocked)
- "Withdraw" (blocked)

**Blocked Actions:**
- Add bank
- Transfer funds
- Request payout

---

### 9.2 Withdrawal Info
**Route:** `/wallet/withdraw`  
**Features:**
- Explanation of payout process
- "How it works" flow
- Bank account requirements
- Timeline explanation
- "Withdraw" button (blocked)

**Content:**
- "In production, withdrawals happen..."
- "No holds in Phase 2"
- "Funds move immediately on completion"

---

### 9.3 Offer & Tip Display
**Route:** Component in gig details  
**Features:**
- Show offer amount
- Show tip (if any)
- Tip selector (simulated)
- "Add tip" (blocked in Phase 2)

**Used in:**
- Gig details (when completed)
- Requester completion view

**Note:** Tip feature is for Phase 2.5 or 3, depending on scope.

---

## 10. User Management Pages

### 10.1 User Switching Modal
**Route:** Component in header  
**Features:**
- Show current user
- Switch user button
- Clear session button
- Preview mode indicator

**Triggers:**
- Click user badge
- "Switch account" in settings
- Auto-redirect if needed

---

### 10.2 Session Timeout
**Route:** `/session/expired`  
**Features:**
- "Session expired" message
- "You were in preview mode"
- "Re-login to continue"
- Return to login button

---

### 10.3 Clear Session Confirmation
**Route:** Component modal  
**Features:**
- "Clear all preview data?"
- Explain what will be cleared
- "Cancel" / "Clear" buttons
- Confirmation required

**Clears:**
- Drafts
- Session data
- Local state
- Preview events (maybe)

---

## 11. Error & Edge Case Pages

### 11.1 Page Not Found (404)
**Route:** `*` catch-all  
**Features:**
- Friendly 404 message
- "This page doesn't exist"
- Return to home button
- Preview indicator preserved

---

### 11.2 Network Error
**Route:** Component overlay  
**Features:**
- "Connection lost"
- "You're in preview mode"
- Retry button
- Stay on current page

---

### 11.3 Data Load Error
**Route:** Component  
**Features:**
- "Could not load data"
- "Preview data unavailable"
- Retry button
- Show cached version if available

---

## 12. Success & Celebration Pages

### 12.1 Draft Saved Success
**Route:** Component toast  
**Features:**
- "Draft saved!"
- Undo option (undo last save)
- View drafts button
- Auto-dismiss after 3s

---

### 12.2 Welcome to Phase 2
**Route:** `/welcome` (first time only)  
**Features:**
- Welcome message
- "What is preview mode?"
- Quick tour link
- "Start exploring" button

**Shows on:**
- First login after Phase 2 setup
- Can be dismissed

---

### 12.3 Achievement Unlocked
**Route:** Component overlay  
**Features:**
- "First broadcast created!" (simulated)
- "First message sent!" (simulated)
- Progress indicator
- Share (simulated)

**Used in training tasks**

---

## 13. Settings & Preferences Pages

### 13.1 Display Name Editor
**Route:** `/settings/personal/display-name`  
**Features:**
- Edit display name
- Live preview
- Save (blocked with explanation)
- Character limit display

**Blocked Modal:**
"Profile updates are blocked in preview mode."

---

### 13.2 Avatar Upload
**Route:** `/settings/personal/avatar`  
**Features:**
- File picker
- Preview avatar
- Crop/resize UI (simulated)
- Save (blocked)

---

### 13.3 Notification Preferences (UI Only)
**Route:** `/settings/preferences/notifications`  
**Features:**
- Toggle switches
- Categories
- "This only affects UI" badge
- Save button (no-op)

---

### 13.4 Theme / Appearance
**Route:** `/settings/preferences/theme`  
**Features:**
- Light/dark mode
- High contrast options
- Preview changes instantly
- Save (persist to local only)

**Storage:**
- localStorage
- Not synced to server
- Preview only

---

## 14. Exploration & Discovery Pages

### 14.1 Browse History
**Route:** `/history`  
**Features:**
- Recently viewed broadcasts
- Recently clicked tasks
- Clear history button
- "This is local data only"

---

### 14.2 Saved Filters
**Route:** `/broadcasts/filters/saved`  
**Features:**
- View saved filter sets
- Apply filters
- Delete filters
- "Saved locally, not synced"

---

### 14.3 Empty States (All Variants)

**14.3.1 No Broadcasts Available**
```
┌─────────────────────────────────────────┐
│  🏠 No Tasks Near You                   │
│                                         │
│  There are no open broadcasts in your    │
│  neighborhood right now.                │
│                                         │
│  In preview mode, you can:               │
│  • Create a broadcast to see how it works│
│  • Use the Training tab to learn        │
│  • Explore other features               │
│                                         │
│  [Create a Broadcast] [Visit Training]  │
└─────────────────────────────────────────┘
```

**14.3.2 No Gigs (Helper)**
```
┌─────────────────────────────────────────┐
│  👷 No Gigs Yet                         │
│                                         │
│  You haven't completed any tasks yet.   │
│                                         │
│  In production, your completed gigs     │
│  will appear here.                      │
│                                         │
│  [Explore Available Tasks]              │
└─────────────────────────────────────────┘
```

**14.3.3 No Gigs (Requester)**
```
┌─────────────────────────────────────────┐
│  📝 No Requests Posted                 │
│                                         │
│  You haven't posted any tasks yet.     │
│                                         │
│  In preview mode, you can create and    │
│  edit broadcasts without posting them. │
│                                         │
│  [Create a Broadcast]                   │
└─────────────────────────────────────────┘
```

**14.3.4 No Messages**
```
┌─────────────────────────────────────────┐
│  💬 No Message Threads                  │
│                                         │
│  Message threads appear when you       │
│  interact with tasks or broadcasts.     │
│                                         │
│  [Find a Task to Help With]             │
└─────────────────────────────────────────┘
```

**14.3.5 No Responses (Requester)**
```
┌─────────────────────────────────────────┐
│  📬 No Responses Yet                    │
│                                         │
│  Your broadcast is live! Once helpers   │
│  respond, they'll appear here.          │
│                                         │
│  [View Broadcast]                       │
└─────────────────────────────────────────┘
```

**14.3.6 Training Complete**
```
┌─────────────────────────────────────────┐
│  🎉 Training Complete!                  │
│                                         │
│  You've learned the basics!             │
│                                         │
│  Ready to try the real thing?          │
│  Switch to Available or In Progress     │
│  to explore more.                       │
│                                         │
│  [Explore Available Tasks]              │
└─────────────────────────────────────────┘
```

**14.3.7 Settings: No Bank Account**
```
┌─────────────────────────────────────────┐
│  💳 No Bank Account Linked              │
│                                         │
│  In production, your bank account is    │
│  where you'll receive payments.         │
│                                         │
│  Preview mode doesn't require this,    │
│  but you can learn how it works here.   │
│                                         │
│  [View Setup Process] [Learn More]     │
└─────────────────────────────────────────┘
```

---

## 15. Layout & Navigation Components

### 15.1 Navigation Sidebar (Mobile)
**Features:**
- Hamburger menu
- Preview badge
- User switcher
- Links to all sections
- Settings icon

### 15.2 Navigation Header (Desktop)
**Features:**
- Logo
- Search bar
- User badge
- Preview indicator
- Bell icon (simulated)

### 15.3 Bottom Tab Bar (Mobile)
**Features:**
- Home
- Broadcasts
- Gigs
- Messages
- Profile

### 15.4 Breadcrumb Navigation
**Features:**
- Current path
- Click to navigate back
- "Preview Mode" indicator
- Context labels

### 15.5 Filter & Sort Bar
**Features:**
- Filter dropdowns
- Sort options
- "Clear filters"
- Result count
- Apply/Cancel buttons

---

## 16. Component-Specific Pages

### 16.1 Status Badge System
**Not a page, but used everywhere:**
- **Active** (green)
- **Pending** (yellow)
- **Completed** (blue)
- **Expired** (gray)
- **Cancelled** (red)
- **Draft** (purple)
- **Training** (teal)

### 16.2 Empty State Component
**Reusable across all pages:**
- Icon
- Title
- Description
- Action button(s)
- Secondary text

### 16.3 Preview Banner Component
**Global component:**
- Always visible in Phase 2
- "Preview Mode" label
- Maybe info icon
- Sticky or fixed position

### 16.4 Blocked CTA Component
**Button wrapper:**
- Looks like normal button
- Click triggers modal
- Disabled state with tooltip
- Consistent styling

---

## 📊 Page Count Summary

### By Type
| Type | Count | Notes |
|------|-------|-------|
| **Main Flow Pages** | 12 | Already in PHASE_2_UI_LAYOUT.md |
| **Modals/Dialogs** | 15 | Overlays, not full pages |
| **Secondary Pages** | 18 | Full pages for specific flows |
| **Empty States** | 7 | Variants per context |
| **Components** | 5 | Reusable UI elements |
| **Total Unique Pages** | 57 | Combined total |

### By Priority

**Tier 1 (Critical for Phase 2)**
- Blocked action modal (1)
- Success simulation modal (2)
- Create broadcast draft (3)
- Response detail panel (4)
- Training tasks (5)
- Empty states (6)

**Tier 2 (Important)**
- Feedback form (7)
- Support chat (8)
- Help center (9)
- Map view (10)
- Location picker (11)
- Wallet overview (12)
- User switcher (13)

**Tier 3 (Polish)**
- Analytics dashboard (14)
- Session replay (15)
- Achievement celebrations (16)
- Legal pages (17)
- Export tools (18)

---

## 🎨 Design System Components Needed

### Input Components
- Text input
- Textarea
- Number input (USD)
- Date/time picker
- File upload
- Dropdown (task types)
- Toggle switch
- Range slider (optional)

### Display Components
- Card (broadcast, gig, response)
- List
- Grid
- Table
- Badge/Tag
- Icon
- Avatar

### Navigation Components
- Tabs
- Sidebar
- Header
- Bottom bar
- Breadcrumb
- Back button

### Modal Components
- Confirmation modal
- Input modal
- Info modal
- Full-screen modal
- Bottom sheet (mobile)

### Feedback Components
- Toast notification
- Banner (info, warning, error)
- Tooltip
- Progress indicator
- Skeleton loader

---

## 📝 Implementation Notes

### Consistency Rules
1. **All blocked actions** must trigger a modal with explanation
2. **All "success" actions** in preview must show simulation
3. **All pages** must show preview indicator
4. **All empty states** must explain preview context
5. **All forms** must have draft/auto-save capability

### Navigation Patterns
- **Back navigation** preserves state
- **Tab switching** preserves scroll position
- **User switch** clears preview state
- **Page refresh** should reload from browser storage when possible

### State Management
- Drafts: localStorage or browser DB
- Session: localStorage (never send to server)
- Events: localStorage (batch send for analytics)
- Preferences: localStorage (no sync)

### Error Handling
- Network errors: Show "Preview mode continues" message
- Data errors: Show cached version if available
- Permission errors: Show "Preview mode only" explanation

---

## 🎯 Success Metrics

### Track These in Phase 2
- **Modal views** (blocked, success, info)
- **Empty state clicks**
- **Time spent on secondary pages**
- **Feedback submissions**
- **Support tickets about preview mode**
- **Training completion rate**

### Phase 2 Exit Criteria
- < 5% of users hit blocked actions repeatedly
- > 80% of training users complete at least 1 training task
- < 10% confusion signals (feedback)
- > 50% exploration depth (visit 5+ pages per session)

---

## 📚 Related Documents

- `PHASE_2_UI_LAYOUT.md` - Main flow pages
- `Task_status.md` - Task tab definitions
- `offer_tip_model.md` - Payment pages (limited)
- `account_settings.md` - Settings pages
- `broadcast_response_flow.md` - Response pages
- `user_messenging.md` - Messaging pages
- `task_types.md` - Form field definitions
- `Multi_user_login.md` - Session management

---

**Document Status:** Complete  
**Last Review:** 2026-01-21  
**Next Review:** Phase 3 planning
