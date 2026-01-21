# Phase 2 — Pages To Create

**Your Question:** "What other pages do we need to create on the app according to phase two?"

**Answer:** You need to create **84 total pages/components**. Here's the complete breakdown:

---

## 📋 Summary by Category

### 1. Core Flow Pages (12 pages)
These are the main navigation pages every user will visit.

| Page | Route | Purpose |
|------|-------|---------|
| Login | `/login` | Select identity (preview only) |
| Home | `/home` | Task tabs + user context |
| Broadcasts Feed | `/broadcasts` | Discover available tasks |
| Broadcast Details | `/broadcasts/:id` | View task details, respond |
| Create Broadcast | `/broadcasts/new` | Draft task creation |
| Gigs Screen | `/gigs` | All your gigs (helper + requester) |
| Gig Details | `/gigs/:id` | Single gig view |
| Available Tasks | `/tasks/available` | Browse tasks (same as broadcasts) |
| In Progress | `/tasks/in-progress` | Active gigs |
| Completed | `/tasks/completed` | Past gigs |
| Training | `/tasks/training` | Educational tasks |
| Messages | `/messages` | Message threads |

---

### 2. Additional Pages (35+ pages)
These are specific flow pages and secondary screens.

| Page | Route | Purpose |
|------|-------|---------|
| **Draft & Forms** |
| Create Broadcast Draft | `/broadcasts/new/draft` | Full form with auto-save |
| Edit Draft Modal | Component | Edit existing drafts |
| Upload License Preview | `/settings/licenses/upload` | License upload (preview) |
| Bank Account Form | `/settings/bank` | View-only bank info |
| **Responses** |
| Response List | `/requests/:id/responses` | List all responses |
| Response Detail Panel | `/requests/:id/responses/:id` | View single response |
| Accept Modal | Component | "Accept" blocked action |
| **Training** |
| Training Landing | `/tasks/training` | List training tasks |
| Guided Walkthrough | Component overlay | Step-by-step tutorial |
| Training Complete | `/tasks/training/complete` | Celebration page |
| **Feedback & Support** |
| Inline Feedback | Component | Quick rating after blocks |
| Feedback Form | `/feedback` | Detailed feedback |
| Support Chat | `/support/chat` | Preview-only chat |
| Help Center | `/help` | FAQ & articles |
| **Legal** |
| Terms of Use | `/settings/terms` | Read-only terms |
| Participation Agreement | `/settings/agreement` | Read-only agreement |
| **Analytics (Admin)** |
| Preview Dashboard | `/analytics/preview` | Real-time events |
| Session Replay | `/analytics/sessions/:id` | Replay sessions |
| Event Export | `/analytics/export` | Export to CSV/JSON |
| **Geographic** |
| Map View | `/map` or `/broadcasts/map` | Map with pins |
| Location Picker | Component | Pick address/location |
| **Notifications** |
| Notification Settings | `/settings/notifications` | UI-only toggles |
| In-App Notifications | Component | Toasts/badges (simulated) |
| **Wallet & Payments** |
| Wallet Overview | `/wallet` | Stub balances (Phase 1) |
| Withdrawal Info | `/wallet/withdraw` | Payout explanation |
| Offer/Tip Display | Component | Gig details payment info |
| **User Management** |
| User Switching Modal | Component | Switch identity |
| Session Timeout | `/session/expired` | Session expired |
| Clear Session Confirmation | Component | Confirm clear session |
| **Error & Edge Cases** |
| 404 Not Found | `*` | Catch-all error page |
| Network Error | Component | Connection lost |
| Data Load Error | Component | Failed to load data |
| **Success & Celebration** |
| Draft Saved Toast | Component | Quick success feedback |
| Welcome to Phase 2 | `/welcome` | First-time user intro |
| Achievement Unlocked | Component | Training completion |
| **Settings & Preferences** |
| Display Name Editor | `/settings/personal/display-name` | Edit name |
| Avatar Upload | `/settings/personal/avatar` | Upload avatar |
| Notification Prefs | `/settings/preferences/notifications` | UI-only toggles |
| Theme / Appearance | `/settings/preferences/theme` | Light/dark mode |
| Profile Edit | `/profile` | Combined settings |
| **Discovery** |
| Browse History | `/history` | Recently viewed |
| Saved Filters | `/broadcasts/filters/saved` | Saved filter sets |
| Empty States (7 variants) | Various | Context-specific empties |
| Quick Actions | Component | Floating action buttons |

---

### 3. Modals & Dialogs (15+ components)
These are overlays that appear on top of pages.

| Component | Trigger | Purpose |
|-----------|---------|---------|
| Preview Block Modal | Any blocked action | Explain why blocked |
| Success Simulation Modal | "Success" in preview | Show what would happen |
| Blocked Action Toast | Quick feedback | Dismissible notice |
| Accept Helper Modal | Click accept | Blocked with explanation |
| Edit Draft Modal | Click edit | Edit existing drafts |
| Clear Session Modal | Click clear session | Confirm clearing |
| Feedback Modal | After blocks | Quick rating |
| Location Picker Modal | Select location | Pick address |
| Map Filter Modal | Filter map | Set radius/filters |
| User Switcher Modal | Switch identity | Select user |
| Draft Discard Modal | Click discard | Confirm discard |
| Upload Preview Modal | Select file | Preview before upload |
| Blocked Submit Modal | Submit blocked | Show blocked message |
| Blocked Save Modal | Save blocked | Show blocked message |
| Blocked Delete Modal | Delete blocked | Show blocked message |

---

### 4. Components (15 reusable pieces)
Build these once, use everywhere.

| Component | Used For |
|-----------|----------|
| Preview Banner | Every page (yellow/orange) |
| User Badge | Header (shows current user) |
| BlockedModal | All blocked actions |
| SuccessModal | All simulated successes |
| Toast | Quick notifications |
| EmptyState | No data scenarios |
| StatusBadge | Status indicators (8 types) |
| BroadcastCard | Broadcasts feed |
| GigCard | Gigs screen |
| ResponseCard | Response lists |
| MessageThreadCard | Message list |
| Navigation (Mobile) | Hamburger menu |
| Navigation (Desktop) | Side menu |
| Bottom Tab Bar | Mobile tabs |
| Breadcrumb | Path navigation |

---

### 5. Empty States (7 variants)
Context-specific empty states.

| Context | Message |
|---------|---------|
| No broadcasts available | "No tasks near you. Create one!" |
| No gigs (helper) | "You haven't completed any tasks yet." |
| No gigs (requester) | "You haven't posted any tasks yet." |
| No message threads | "No message threads yet." |
| No responses | "No responses yet." |
| Training complete | "You've learned the basics!" |
| No bank account | "No bank account linked (preview mode)" |

---

## 🎨 Design System Components (30+)

### Input Components (7)
- Text input
- Textarea
- Number input (USD)
- Date/time picker
- File upload
- Dropdown (task types)
- Toggle switch

### Display Components (5)
- Card (multiple types)
- List
- Badge/Tag
- Avatar
- Icon

### Navigation Components (4)
- Tabs
- Sidebar
- Header
- Bottom bar

### Modal Components (4)
- Confirmation modal
- Info modal
- Input modal
- Bottom sheet

### Feedback Components (5)
- Toast
- Banner (info/warning/error)
- Tooltip
- Progress indicator
- Skeleton loader

### Data Display Components (5)
- Table
- Grid
- Calendar (optional)
- Map (optional)
- Timeline (for gig status)

---

## 📊 Total Page Count

| Category | Count |
|----------|-------|
| Core Flow Pages | 12 |
| Additional Pages | 35 |
| Modals/Dialogs | 15 |
| Reusable Components | 15 |
| Empty States | 7 variants |
| **TOTAL** | **84** |

---

## 🚀 Implementation Priority

### Week 1: Foundation (MVP)
1. Login page
2. Home with 4 tabs
3. Broadcasts feed
4. Broadcast details
5. Preview banner (global)
6. Blocked modal (global)
7. Empty states (basic)

### Week 2: Core Flows
8. Create broadcast (draft)
9. Gigs screen
10. Gig details
11. Response list
12. Response detail panel
13. Training landing

### Week 3: Communication
14. Message threads
15. Message thread
16. Support chat
17. Feedback form
18. Help center

### Week 4: Settings & Polish
19. Settings pages (view-only)
20. Profile (partial edit)
21. Training tasks (guided)
22. Map view
23. Analytics dashboard (admin)

### Week 5-6: Extra & Polish
24. Legal pages
25. Export tools
26. Session replay
27. Achievements
28. Advanced empty states
29. Design system components
30. Testing & optimization

---

## 🔒 Critical Safety Rules

### Must Have (Non-Negotiable)
1. **Preview banner** on every page
2. **Blocked actions** explain why
3. **No real API mutations** in preview
4. **No data persistence** (beyond drafts in localStorage)
5. **No notifications** sent
6. **No emails** triggered
7. **No wallet changes** (beyond Phase 1 stubs)
8. **No real payments** (blocked in UI)

### Must Not Have
1. Production API endpoints for mutations
2. Email/SMS integration
3. Real notification systems
4. Payment processing
5. Background job triggers
6. Webhook calls
7. Legal acceptance flows
8. Verification/ID checks

---

## 📈 Analytics to Track

### Essential Events
1. `page_view` - All page visits
2. `click_blocked` - Blocked action attempts
3. `time_on_page` - Duration per page
4. `flow_start` - Flow initiated
5. `flow_complete` - Flow completed (simulated)
6. `feedback_submitted` - User feedback
7. `training_complete` - Training finished

### Dashboard Metrics
- Blocked action rate (< 10% target)
- Training completion rate (> 80% target)
- Exploration depth (> 5 pages/session)
- Confusion signals (< 5% target)
- Feedback volume (> 100 entries)

---

## 🎨 UI/UX Design Principles

### 1. Always Show Preview State
- Yellow/orange banner on every page
- Clear labeling: "(Preview)" or "(Simulated)"
- No hiding the preview indicator

### 2. Explain Before Blocking
- Block actions with modal, not silently
- Explain *why* it's blocked
- Explain what would happen in production

### 3. Embrace Empty States
- Show context-aware empty states
- Include preview context
- Offer actionable next steps

### 4. Simulate Success Clearly
- Show "Success!" (Preview)
- Explain simulation
- Offer next steps

### 5. Make Drafts Persistent
- Auto-save every 30s
- Show "Draft saved" toast
- Load drafts on return
- Allow draft discard

---

## 🎯 Success Criteria (Phase 2)

### User Behavior
- ✅ Users understand they're in preview mode
- ✅ Blocked actions are clear, not confusing
- ✅ Users complete training tasks
- ✅ Feedback volume is high (learning opportunity!)
- ✅ Time on page: 3-5 minutes average
- ✅ Exploration depth: > 5 pages/session
- ✅ No one thinks data was lost
- ✅ Confusion signals: < 5% of sessions

### Product Metrics
- ✅ Draft creation: > 60% of users
- ✅ Draft completion: > 40% of drafts
- ✅ Training adoption: > 30% of users
- ✅ Feedback entries: > 100 (qualitative insights)

### Technical Metrics
- ✅ Page load time: < 2 seconds
- ✅ Modal load time: < 500ms
- ✅ Error rate: < 1%
- ✅ Session duration: 3-5 minutes average

---

## 📚 Reference Documents

### Primary Specs
- `PHASE_2_UI_LAYOUT.md` - Detailed page architecture
- `ADDITIONAL_PAGES_CHECKLIST.md` - Complete component list
- `PAGE_INDEX_SUMMARY.md` - Quick reference table
- `QUICK_START_PAGES.md` - Start here guide

### Feature Specs
- `Task_status.md` - Task tab behavior (Available, In Progress, Completed, Training)
- `offer_tip_model.md` - Offer & tip pages (Payment details)
- `account_settings.md` - Settings page requirements
- `broadcast_response_flow.md` - Response & acceptance flows
- `user_messenging.md` - Messaging page requirements
- `task_types.md` - 5 task types for forms
- `Multi_user_login.md` - Login & session details

### Technical Docs
- `ERD_phase2.md` - Database schema & `gigs_view`
- `Phase_two_features.md` - Feature set overview
- `Phase_2_scope.md` - What's in/out of Phase 2
- `STARTUP_VALIDATION.md` - Setup requirements

---

## 🎯 Quick Start Guide

### Day 1-2: Setup
1. Clone/setup project
2. Create route structure
3. Add preview banner to all pages
4. Create BlockedModal component
5. Create EmptyState component

### Day 3-7: Core Pages
6. Build Login page
7. Build Home with 4 tabs
8. Build Broadcasts feed
9. Build Broadcast details
10. Build Create Broadcast (draft)

### Week 2: Core Flows
11. Build Gigs screen (use `gigs_view`)
12. Build Gig details
13. Build Response flows
14. Build Training landing
15. Add analytics tracking

### Week 3: Communication
16. Build Messages (threads + thread)
17. Build Feedback form
18. Build Support chat
19. Build Help center
20. Test all blocked actions

### Week 4: Polish
21. Build Settings pages
22. Build Profile editor
23. Build Map view (if needed)
24. Build Analytics dashboard (admin)
25. Test responsive layouts

### Week 5-6: Extras
26. Build Legal pages
27. Build Export tools
28. Build Session replay (if enabled)
29. Build Achievements
30. Final testing & optimization

---

## 🚨 Critical Gotchas

### 1. User Switching
**Issue:** Switching users should clear preview state  
**Solution:** Clear localStorage on user switch  
**Why:** Fresh data for new identity

### 2. Draft Persistence
**Issue:** Drafts must not write to server  
**Solution:** Save to localStorage only  
**Why:** Preview mode doesn't touch production DB

### 3. Blocked Actions
**Issue:** Silent failures confuse users  
**Solution:** Always show BlockedModal with explanation  
**Why:** Clear expectations = better learning

### 4. Success Messages
**Issue:** Users might think action succeeded for real  
**Solution:** Always add "(Preview)" or "(Simulated)"  
**Why:** Prevent confusion about actual state

### 5. Empty States
**Issue:** Users might think something is broken  
**Solution:** Include "In production..." language  
**Why:** Explain preview context clearly

### 6. Navigation
**Issue:** Losing context when switching pages  
**Solution:** Preserve tab state, scroll position  
**Why:** Better UX, less frustration

### 7. Mobile vs Desktop
**Issue:** Different layouts needed  
**Solution:** Test on both, use responsive design  
**Why:** 60%+ users will be mobile

### 8. Analytics
**Issue:** Forgetting to track events  
**Solution:** Add tracking to every action  
**Why:** Phase 2 is about learning, not executing

---

## 📱 Responsive Design Checklist

### Mobile (< 768px)
- [ ] Bottom tab navigation
- [ ] Hamburger menu
- [ ] Full-screen modals
- [ ] Touch-friendly buttons (min 44px)
- [ ] No sidebars
- [ ] Single column layout

### Tablet (768px - 1024px)
- [ ] Side navigation (optional)
- [ ] 2-column grid
- [ ] Bottom sheets for modals
- [ ] Larger tap targets

### Desktop (> 1024px)
- [ ] Side navigation
- [ ] 3-column grid
- [ ] Right-side modals
- [ ] Header with search
- [ ] Mouse-friendly interactions

---

## 🎨 Design Tokens

### Colors
- **Preview Mode:** Yellow `#FFB74D`, Orange `#F57C00`
- **Active:** Green `#4CAF50`
- **Pending:** Yellow `#FFC107`
- **Completed:** Blue `#2196F3`
- **Expired:** Gray `#9E9E9E`
- **Cancelled:** Red `#F44336`
- **Draft:** Purple `#9C27B0`
- **Training:** Teal `#009688`

### Typography
- **H1 (Page Title):** 24px, 700
- **H2 (Section):** 20px, 600
- **H3 (Subsection):** 18px, 600
- **Body:** 16px, 400
- **Small:** 14px, 400
- **Caption:** 12px, 400

### Spacing
- **Mobile:** 16px padding
- **Tablet:** 24px padding
- **Desktop:** 32px padding
- **Card gaps:** 12px

---

## 🎯 Bottom Line

**You need to create 84 pages/components for Phase 2:**

- **12 Core Pages** (main navigation)
- **35 Additional Pages** (specific flows)
- **15 Modals/Dialogs** (overlays)
- **15 Reusable Components**
- **7 Empty State Variants**

**Implementation time:** 4-6 weeks with 2-3 developers

**Critical rule:** Every page must show preview state, every blocked action must explain why, and no real data is ever written to production.

**Start with:** Login, Home (4 tabs), Broadcasts Feed, Broadcast Details, Create Broadcast (draft), Preview Banner, Blocked Modal.

---

**Document Status:** Complete  
**Total Pages:** 84  
**Ready for:** Development  
**Last Updated:** 2026-01-21
