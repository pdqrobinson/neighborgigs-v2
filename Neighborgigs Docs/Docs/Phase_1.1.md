# 🟡 CAN SHIP WITH DOCUMENTATION (Fix in Phase 1.1)

These are **behavioral clarifications**, not blockers.

## 2. Movement Expiration During Active Tasks

You don’t need new logic — just an invariant:

> Movement affects **discovery only**, never active tasks.

Rules to document:

- User may have `on_the_move = true` while `task.status = in_progress`

- Movement expiration:

  - removes user from discovery

  - does **not** affect task visibility or validity

This is fine as-is once stated clearly.

---

## 8. Device Token Cleanup

This is a **maintenance concern**, not a correctness issue.

Phase 1 rule:

- Allow multiple tokens

- On push failure → mark token inactive or update `last_seen_at`

- Periodic cleanup job (later)

Do **not** restrict to one device per platform in Phase 1 — that causes more UX pain than it solves.

---

## 12. Default Neighborhood Edge Case

Document one of these (pick ONE):

- App cannot proceed without neighborhood (force location)

- OR: seed a `default` neighborhood in every env

Cheapest:

> Every environment must have at least one neighborhood. If location fails, assign the first.

---

## 13. Failed Notification Recovery

Correct stance already chosen:

- Notifications are best-effort

Just **document frontend recovery**:

- App open → refresh `/me/tasks`, `/me/requests`, `/me/wallet`

- UI state is API-driven, not notification-driven

No backend changes required.

---

## 14. Discovery Query at Scale

This is **Phase 2 optimization**.

For Phase 1, add:

```markdown
create index users_discovery_filter_idx
on users(neighborhood_id, on_the_move, move_expires_at);
```

That’s enough to ship safely.