# Phase 2 — Quick Start Page Reference

**TL;DR:** All pages you need to build for Phase 2.

---

## 🎯 Core Pages (Start Here)

### 1. Login Page (`/login`)
**What:** Select user identity (preview mode only)  
**Features:**
- User cards with name, role, avatar
- "Clear session" button
- Preview mode banner

### 2. Home Screen (`/home`)
**What:** Task management with 4 tabs  
**Tabs:**
- **Available** - Tasks you can start
- **In Progress** - Active gigs
- **Completed** - Past gigs
- **Training** - Educational tasks

### 3. Broadcasts Feed (`/broadcasts`)
**What:** Browse available tasks  
**Features:**
- Filter by type, distance, date
- Sort by offer, distance, recency
- Cards show: title, location, offer, requester
- "Create Broadcast" button
- Empty state: "No tasks near you"

### 4. Broadcast Details (`/broadcasts/:id`)
**What:** Decision space for engagement  
**Features:**
- Task details: title, description, location
- Offer amount (prominent)
- Requester info
- "I can help" button (simulates response)
- "Message" button (opens chat)
- Blocked actions show modal with explanation

### 5. Create Broadcast (`/broadcasts/new`)
**What:** Draft task creation  
**Features:**
- Full form: title, description, type, offer, location, date
- Draft auto-save (every 30s)
- "Draft saved" toast
- Preview only (no real submission)
- Form persists in browser storage

### 6. Gigs Screen (`/gigs`)
**What:** All your gigs (helper + requester)  
**Features:**
- Filter tabs: Active, Pending, Past, Expired
- Uses `gigs_view` SQL query
- Cards show: title, offer, status, dates
- Context-aware (shows helper vs requester view)
- Empty states for each context

### 7. Gigs Details (`/gigs/:id`)
**What:** Single gig view  
**Features:**
- Combined request + task data
- Status timeline
- Actions (blocked based on state)
- Message thread

### 8. Message Threads (`/messages`)
**What:** List of conversations  
**Features:**
- Task-scoped only
- Each thread shows: last message, timestamp, task context
- No global inbox
- Empty state: "No message threads"

### 9. Message Thread (`/messages/:thread_id`)
**What:** Conversation view  
**Features:**
- Message history
- Task context at top
- Text input + send button
- No attachments, no reactions
- Read-only after completion

### 10. Settings (`/settings`)
**What:** View (mostly) settings  
**Sections:**
- Personal Information
- Password (blocked)
- Licenses (upload preview)
- Bank Account (view-only)
- Help & Support
- Legal (read-only)

### 11. Profile (`/profile`)
**What:** View & partial edit profile  
**Features:**
- Display name (editable - blocked)
- Avatar (editable - blocked)
- Role
- "Preview mode" note

### 12. Training (`/tasks/training`)
**What:** Educational walkthroughs  
**Features:**
- Sample tasks
- Guided walkthroughs
- Complete tracking
- "Try the real thing" CTA

---

## 🎨 Common Components (Build Once, Use Everywhere)

### Preview Banner
**Where:** Every page  
**Copy:** "Preview Mode"  
**Style:** Yellow/Orange banner  
**Rule:** Never hidden in Phase 2

### Blocked Action Modal
**Trigger:** Any blocked button click  
**Content:**
```
🔒 Action Not Available
────────────────────────
This is disabled in preview mode.
In production, this would: [explain]
[Keep Exploring] [Feedback]
```

### Success Simulation Modal
**Trigger:** "Success" in preview  
**Content:**
```
✅ Success! (Preview)
────────────────────────
Your task would be posted.
In preview mode, this is simulated.
[View] [Create Another]
```

### Empty State Component
**Reusable pattern:**
```
[Icon]
[Title]
[Description explaining preview]
[Action Button]
[Secondary text]
```

### Status Badge
**Variants:**
- Active (green)
- Pending (yellow)
- Completed (blue)
- Expired (gray)
- Cancelled (red)
- Draft (purple)
- Training (teal)

---

## 📋 Page-Specific Details

### Task Types (5 options)
Pick one when creating broadcast:
1. 🛒 **Pickup** - Grocery runs, store pickups
2. 📦 **Drop-off** - Returns, deliveries
3. 🚗 **Route** - Travel help
4. 🤝 **Help** - Assistance, small tasks
5. ✍️ **Other** - Everything else

### Offer & Tip Display
**Offer:** Always shown (read-only)  
**Tip:** Optional, shown on completion (simulated)

### User Roles
- **Requester** - Posts tasks, reviews responses
- **Helper** - Responds to tasks, completes gigs

---

## 🔒 Safety Rules (Must Follow)

### ✅ Allowed in Phase 2
- View all data
- Create drafts
- Simulate submits
- Block actions with explanation
- Show preview mode everywhere
- Log all events (preview)

### 🚫 NOT Allowed in Phase 2
- Real API mutations
- Payment processing
- Wallet changes (beyond stubs)
- Email notifications
- SMS notifications
- Background jobs
- Webhooks
- Legal acceptance
- Verification flows

---

## 📊 Analytics Events (Must Track)

### Page Events
- `page_view` - User visits any page
- `tab_switch` - Home tab changed

### Action Events
- `click_blocked` - User clicks blocked action
- `click_success` - User triggers success (simulated)
- `draft_save` - Draft created/saved
- `draft_discard` - Draft deleted
- `response_created` - Helper responds (simulated)
- `accept_clicked` - Requester clicks accept (blocked)

### Time Events
- `time_on_page` - Seconds on page
- `flow_start` - Started a flow (e.g., create broadcast)
- `flow_complete` - Flow completed (simulated)
- `flow_abandon` - Flow abandoned

### Feedback Events
- `feedback_submitted` - Feedback form submitted
- `confusion_signal` - 3+ blocked clicks in session
- `training_complete` - Training task finished

---

## 🎯 Implementation Order

### Week 1: Core Setup
1. Login page
2. Home with 4 tabs
3. Broadcasts feed
4. Preview banner component
5. Blocked modal component

### Week 2: Core Flows
6. Broadcast details
7. Create broadcast (draft)
8. Empty states for all pages
9. Gigs screen
10. Gig details

### Week 3: Messaging & Settings
11. Message threads
12. Message thread
13. Settings pages (view-only)
14. Profile (partial edit)
15. Feedback form

### Week 4: Training & Polish
16. Training tasks
17. Guided walkthroughs
18. Help center
19. Map view
20. Analytics dashboard (admin)

### Week 5-6: Extra & Polish
21. Support chat
22. Export tools
23. Session replay (if enabled)
24. Achievements
25. Legal pages

---

## 🚨 Critical Gotchas

### 1. User Switching
**Rule:** Switching users clears preview state  
**Why:** Fresh data for new identity  
**Implementation:** Clear localStorage on switch

### 2. Draft Persistence
**Rule:** Save to localStorage, not server  
**Why:** Preview mode doesn't write to DB  
**Implementation:** Auto-save + manual save

### 3. Blocked Actions
**Rule:** Always show modal, never silent fail  
**Why:** Clear expectations = better learning  
**Implementation:** Wrapper around every blocked button

### 4. Success Messages
**Rule:** Always add "(Preview)" or "(Simulated)"  
**Why:** Prevent confusion about actual state  
**Implementation:** Add badge next to success text

### 5. Empty States
**Rule:** Must explain preview context  
**Why:** Users might think something is broken  
**Implementation:** Include "In production..." language

---

## 🎨 Design Guidelines

### Colors
- **Preview:** Yellow/Orange (#FFB74D, #F57C00)
- **Active:** Green (#4CAF50)
- **Pending:** Yellow (#FFC107)
- **Completed:** Blue (#2196F3)
- **Expired:** Gray (#9E9E9E)
- **Cancelled:** Red (#F44336)

### Spacing
- **Mobile:** 16px padding
- **Tablet:** 24px padding
- **Desktop:** 32px padding
- **Card gaps:** 12px

### Typography
- **Headings:** Bold, 20-24px
- **Body:** Regular, 16px
- **Small:** 14px
- **Captions:** 12px

---

## 📱 Mobile vs Desktop

### Mobile (< 768px)
- Bottom tab navigation
- Hamburger menu
- Full-screen modals
- Touch-friendly buttons (min 44px)
- No sidebars

### Desktop (> 1024px)
- Side navigation
- Right-side modals
- Header with search
- More screen real estate

---

## ✅ Success Criteria

### Phase 2 is successful if:
1. Users understand they're in preview mode
2. Blocked actions are clear, not confusing
3. Users complete training tasks
4. Feedback volume is high (learning!)
5. Time on page is 3-5 minutes
6. Exploration depth > 5 pages/session
7. No one thinks data was lost
8. Confusion signals < 5% of sessions

---

## 📚 Related Documents

For details, see:
- `PHASE_2_UI_LAYOUT.md` - Detailed architecture
- `ADDITIONAL_PAGES_CHECKLIST.md` - Complete component list
- `PAGE_INDEX_SUMMARY.md` - Quick reference table
- `Task_status.md` - Task tab behavior
- `offer_tip_model.md` - Payment page details
- `account_settings.md` - Settings page specifics
- `broadcast_response_flow.md` - Response/acceptance flows
- `user_messenging.md` - Messaging requirements
- `Multi_user_login.md` - Login/session details

---

## 🎯 Quick Commands

### Common Development Tasks

**Add new page:**
1. Create route in router
2. Create page component
3. Add preview banner
4. Add analytics tracking
5. Test mobile + desktop

**Add blocked action:**
1. Create button wrapper component
2. Add onClick handler
3. Show BlockedModal
4. Log `click_blocked` event
5. Show feedback option

**Add empty state:**
1. Check if data exists
2. If empty, show EmptyState component
3. Include preview context
4. Add actionable button
5. Track view event

**Create draft:**
1. Save to localStorage
2. Show "Draft saved" toast
3. Auto-save on changes
4. Load on page return
5. Track `draft_save` event

---

**Last Updated:** 2026-01-21  
**Total Pages:** 84 (12 core + 72 additional)  
**Implementation Time:** 4-6 weeks  
**Status:** ✅ Ready for development
