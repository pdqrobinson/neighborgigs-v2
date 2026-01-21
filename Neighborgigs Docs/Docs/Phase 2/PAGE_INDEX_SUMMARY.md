# Phase 2 — Complete Page Index

**Quick Reference:** All pages, components, and modals for Phase 2 implementation.

---

## 📋 Core Flow Pages (12)

| # | Page Name | Route | Purpose | Status |
|---|-----------|-------|---------|--------|
| 1 | Login | `/login` | Select identity (preview) | ✅ |
| 2 | Home | `/home` | Task tabs + User context | ✅ |
| 3 | Broadcasts Feed | `/broadcasts` | Discover tasks | ✅ |
| 4 | Broadcast Details | `/broadcasts/:id` | Task decision space | ✅ |
| 5 | Create Broadcast | `/broadcasts/new` | Draft task creation | ✅ |
| 6 | Gigs Screen | `/gigs` | All gigs (helper + requester) | ✅ |
| 7 | Gig Details | `/gigs/:id` | Single gig view | ✅ |
| 8 | Available Tasks | `/tasks/available` | Browse tasks | ✅ |
| 9 | In Progress | `/tasks/in-progress` | Active gigs | ✅ |
| 10 | Completed | `/tasks/completed` | Past gigs | ✅ |
| 11 | Training | `/tasks/training` | Educational tasks | ✅ |
| 12 | Messages | `/messages` | Message threads | ✅ |

---

## 🔧 Additional Pages & Components (45+)

### Blocked Action Modals (3)

| # | Component | Trigger | Purpose |
|---|-----------|---------|---------|
| 1 | Preview Block Modal | Any blocked action | Explain why action is blocked |
| 2 | Success Simulation Modal | "Success" in preview | Show what would happen |
| 3 | Blocked Action Toast | Quick feedback | Dismissible notice |

### Draft & Form Pages (4)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 4 | Create Broadcast Draft | `/broadcasts/new/draft` | Full form with auto-save |
| 5 | Edit Draft Modal | Component | Edit existing drafts |
| 6 | Upload Document Preview | `/settings/licenses/upload` | License upload (preview) |
| 7 | Bank Account Form | `/settings/bank` | View-only bank info |

### Response & Acceptance (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 8 | Response List | `/requests/:id/responses` | List all responses |
| 9 | Response Detail Panel | `/requests/:id/responses/:id` | View single response |
| 10 | Accept Modal | Component | "Accept" blocked action |

### Training & Education (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 11 | Training Landing | `/tasks/training` | List training tasks |
| 12 | Guided Walkthrough | Component overlay | Step-by-step tutorial |
| 13 | Training Complete | `/tasks/training/complete` | Celebration page |

### Feedback & Support (4)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 14 | Inline Feedback | Component | Quick rating after blocks |
| 15 | Feedback Form | `/feedback` | Detailed feedback submission |
| 16 | Support Chat | `/support/chat` | Preview-only chat |
| 17 | Help Center | `/help` | FAQ & articles |

### Legal Pages (2)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 18 | Terms of Use | `/settings/terms` | Read-only terms |
| 19 | Participation Agreement | `/settings/agreement` | Read-only agreement |

### Analytics (Admin) (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 20 | Preview Dashboard | `/analytics/preview` | Real-time event stream |
| 21 | Session Replay | `/analytics/sessions/:id` | Replay user sessions |
| 22 | Event Export | `/analytics/export` | Export to CSV/JSON |

### Geographic (2)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 23 | Map View | `/map` or `/broadcasts/map` | Map with pins |
| 24 | Location Picker | Component | Pick address/location |

### Notifications (2)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 25 | Notification Settings | `/settings/notifications` | UI-only toggles |
| 26 | In-App Notifications | Component | Toasts/badges (simulated) |

### Wallet & Payments (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 27 | Wallet Overview | `/wallet` | Stub balances |
| 28 | Withdrawal Info | `/wallet/withdraw` | Payout explanation |
| 29 | Offer/Tip Display | Component | Gig details payment info |

### User Management (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 30 | User Switching Modal | Component | Switch identity |
| 31 | Session Timeout | `/session/expired` | Session expired |
| 32 | Clear Session Confirmation | Component | Confirm clear session |

### Error & Edge Cases (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 33 | 404 Not Found | `*` | Catch-all error page |
| 34 | Network Error | Component | Connection lost |
| 35 | Data Load Error | Component | Failed to load data |

### Success & Celebration (3)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 36 | Draft Saved Toast | Component | Quick success feedback |
| 37 | Welcome to Phase 2 | `/welcome` | First-time user intro |
| 38 | Achievement Unlocked | Component | Training completion |

### Settings & Preferences (5)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 39 | Display Name Editor | `/settings/personal/display-name` | Edit name |
| 40 | Avatar Upload | `/settings/personal/avatar` | Upload avatar |
| 41 | Notification Prefs | `/settings/preferences/notifications` | UI-only toggles |
| 42 | Theme / Appearance | `/settings/preferences/theme` | Light/dark mode |
| 43 | Profile Edit | `/profile` | Combined settings |

### Discovery & Exploration (4)

| # | Page | Route | Purpose |
|---|------|-------|---------|
| 44 | Browse History | `/history` | Recently viewed |
| 45 | Saved Filters | `/broadcasts/filters/saved` | Saved filter sets |
| 46 | Empty States (7 variants) | Various contexts | Context-specific empties |
| 47 | Quick Actions | Component | Floating action buttons |

### Layout & Navigation (5)

| # | Component | Purpose |
|---|-----------|---------|
| 48 | Mobile Navigation | Hamburger menu |
| 49 | Desktop Header | Logo, search, user badge |
| 50 | Bottom Tab Bar | Mobile tab navigation |
| 51 | Breadcrumb | Path navigation |
| 52 | Filter & Sort Bar | Filtering UI |

---

## 🎨 Design System Components (15)

### Input Components (7)
| Component | Used In |
|-----------|---------|
| Text Input | Forms, search, filters |
| Textarea | Broadcast creation, feedback |
| Number Input | Offer amount, custom tip |
| Date/Time Picker | Task scheduling |
| File Upload | Licenses, avatars |
| Dropdown | Task types, filters |
| Toggle Switch | Settings, preferences |

### Display Components (5)
| Component | Used In |
|-----------|---------|
| Card | Broadcasts, gigs, responses |
| List | Messages, threads |
| Badge/Tag | Status indicators |
| Avatar | User profiles |
| Icon | Navigation, actions |

### Modal Components (3)
| Component | Used In |
|-----------|---------|
| Confirmation Modal | Blocked actions |
| Info Modal | Success simulation |
| Bottom Sheet | Mobile dialogs |

---

## 📊 Total Count Summary

| Category | Count | Notes |
|----------|-------|-------|
| **Core Flow Pages** | 12 | Main navigation |
| **Secondary Pages** | 35 | Specific flows |
| **Modals/Dialogs** | 15 | Overlays |
| **Components** | 15 | Reusable UI |
| **Empty States** | 7 variants | Context-dependent |
| **TOTAL UNIQUE PAGES** | **84** | Combined total |

---

## 🚀 Implementation Priority

### Phase 2 MVP (Weeks 1-2)
1. ✅ Login page
2. ✅ Home with 4 tabs
3. ✅ Broadcasts feed
4. ✅ Broadcast details
5. ✅ Create broadcast (draft)
6. ✅ Preview modal
7. ✅ Blocked action modals
8. ✅ Empty states (basic)

### Phase 2 Enhanced (Weeks 3-4)
9. ✅ Gigs screen
10. ✅ Messages
11. ✅ Training tasks
12. ✅ Feedback forms
13. ✅ Settings (view-only)
14. ✅ Help center
15. ✅ Map view

### Phase 2 Polish (Weeks 5-6)
16. ✅ Analytics dashboard (admin)
17. ✅ Session replay
18. ✅ Achievements
19. ✅ Advanced empty states
20. ✅ Legal pages
21. ✅ Export tools
22. ✅ Support chat

---

## 🎯 Key UX Patterns

### 1. Preview Indicator (Global)
- **Location:** Top banner or header badge
- **Copy:** "Preview Mode"
- **Color:** Yellow/Orange
- **Rule:** Visible on ALL pages

### 2. Blocked Action Flow
1. User clicks blocked button
2. Modal appears with explanation
3. Log event to analytics
4. Offer feedback option
5. User continues exploring

### 3. Success Simulation
1. User performs "success" action
2. Show "Success!" (simulated)
3. Explain what would happen
4. Offer next steps
5. Log event

### 4. Empty State Strategy
- **Context-aware** (what would be here?)
- **Actionable** (suggest next step)
- **Educational** (explain preview mode)
- **Emotional** (friendly tone)

### 5. Draft Persistence
- Auto-save every 30s
- Save on blur/change
- Show "Draft saved" toast
- Load on page return
- "Clear drafts" option

---

## 🔐 Safety Rules (All Pages)

### Must Include
1. **Preview badge** on every page
2. **Blocked actions** explained clearly
3. **No real API calls** for mutations
4. **No data persistence** beyond drafts
5. **No notifications** sent
6. **No emails** triggered
7. **No wallet changes** (beyond Phase 1 stubs)
8. **No real payments** (blocked in UI)

### Must Exclude
1. Production API endpoints for mutations
2. Email/SMS integration
3. Real notification systems
4. Payment processing
5. Background job triggers
6. Webhook calls
7. External service calls (real)
8. Legal acceptance flows

---

## 📈 Analytics to Track

### Page-Level
- `page_view` - All page visits
- `tab_switch` - Home tab changes
- `filter_apply` - Filter usage
- `search_query` - Search terms

### Interaction-Level
- `click_blocked` - Blocked action attempts
- `click_success` - Simulated successes
- `time_on_page` - Duration per page
- `flow_start` - Flow initiated
- `flow_complete` - Flow completed (simulated)
- `flow_abandon` - Flow abandoned

### Feedback-Level
- `feedback_submitted` - Form submissions
- `blocked_feedback` - Feedback after block
- `confusion_signal` - Multiple blocked clicks
- `support_request` - Support chat opens

### Training-Level
- `training_start` - Training task started
- `training_step` - Step completed
- `training_complete` - Training finished
- `training_skip` - Training skipped

---

## 🎨 Design Tokens

### Colors (Preview Mode)
- **Primary Preview:** Yellow `#FFB74D`
- **Secondary Preview:** Orange `#F57C00`
- **Text on Preview:** Black `#000000`
- **Background on Preview:** Light Yellow `#FFF8E1`

### Status Colors
- **Active:** Green `#4CAF50`
- **Pending:** Yellow `#FFC107`
- **Completed:** Blue `#2196F3`
- **Expired:** Gray `#9E9E9E`
- **Cancelled:** Red `#F44336`
- **Draft:** Purple `#9C27B0`
- **Training:** Teal `#009688`

### Typography Scale
- **H1 (Page Title):** 24px, 700
- **H2 (Section):** 20px, 600
- **H3 (Subsection):** 18px, 600
- **Body:** 16px, 400
- **Small:** 14px, 400
- **Caption:** 12px, 400

---

## 📱 Responsive Breakpoints

### Mobile (< 768px)
- Bottom tab navigation
- Hamburger menu
- Full-screen modals
- Single column layout
- Touch-friendly buttons (min 44px)

### Tablet (768px - 1024px)
- Side navigation (optional)
- 2-column grid
- Bottom sheets for modals
- Hybrid layout

### Desktop (> 1024px)
- Side navigation
- 3-column grid
- Right-side modals
- Header with search

---

## 🎯 Success Metrics (Phase 2)

### User Behavior
- **Exploration depth:** > 5 pages per session
- **Training completion:** > 80% start to finish
- **Blocked action rate:** < 10% of clicks
- **Confusion signals:** < 5% of sessions

### Product Metrics
- **Draft creation rate:** > 60% of users
- **Draft completion rate:** > 40% of drafts
- **Training adoption:** > 30% of users
- **Feedback volume:** 100+ entries (qualitative)

### Technical Metrics
- **Page load time:** < 2s
- **Modal load time:** < 500ms
- **Error rate:** < 1%
- **Session duration:** 3-5 minutes average

---

## 🚧 Implementation Checklist

### Page Setup
- [ ] Create route structure
- [ ] Add preview banner to all pages
- [ ] Add user badge to header
- [ ] Set up navigation (mobile + desktop)
- [ ] Configure empty states

### Component Setup
- [ ] Create BlockedModal component
- [ ] Create SuccessModal component
- [ ] Create Toast notification
- [ ] Create EmptyState component
- [ ] Create Card components (broadcast, gig, response)

### Data & State
- [ ] Set up localStorage for drafts
- [ ] Set up localStorage for session
- [ ] Set up event logging
- [ ] Set up analytics tracking
- [ ] Set up user switching

### Testing
- [ ] Test all blocked actions
- [ ] Test all empty states
- [ ] Test user switching
- [ ] Test draft persistence
- [ ] Test responsive layouts

### Analytics
- [ ] Set up event logging
- [ ] Configure analytics dashboard (admin)
- [ ] Set up session replay (if enabled)
- [ ] Create export functionality

---

## 📚 Related Documents

- `PHASE_2_UI_LAYOUT.md` - Detailed page architecture
- `ADDITIONAL_PAGES_CHECKLIST.md` - Comprehensive component list
- `Task_status.md` - Task tab behavior
- `offer_tip_model.md` - Payment page requirements
- `account_settings.md` - Settings page details
- `broadcast_response_flow.md` - Response/acceptance flows
- `user_messenging.md` - Messaging page requirements

---

**Document Status:** Complete  
**Page Count:** 84 total (12 core + 72 additional)  
**Implementation Time:** 4-6 weeks (2-3 developers)  
**Last Updated:** 2026-01-21
