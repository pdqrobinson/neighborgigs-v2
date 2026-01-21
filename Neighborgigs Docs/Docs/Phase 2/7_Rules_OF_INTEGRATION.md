---
**Cross-Reference: ** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview.
---
# The 7 Rules of a Rock-Solid Integration (NeighborGigs Edition)

If you do **all seven**, this system becomes boring (in the best way).

---

## 1️⃣ ONE write path per concept (non-negotiable)

This is the root fix.

### The rule

> **Routes never write to tables. Ever.**

| Concept | Allowed writer |
| --- | --- |
| Broadcast creation | `create_broadcast_with_idempotency` (RPC) |
| Respond to broadcast | `respond_to_broadcast` (RPC) |
| Accept / decline | RPC only |
| Wallet debit | `request_withdrawal` (RPC) |
| Completion payout | `complete_task` (RPC) |

### Enforce it

- Delete *all* `db.from(...).insert()` from routes

- Routes:

  - validate input

  - call **one** RPC

  - return result

If a dev accidentally writes directly later → DB should stop them (see rule 7).

---

## 2️⃣ Database invariants &gt; application logic

You already started this. Finish it.

These are **seatbelts**, not “nice to haves”:

```markdown
-- One task per broadcast
create unique index one_task_per_broadcast
on task_requests(broadcast_id)
where broadcast_id is not null;

-- One active task per helper
create unique index one_active_task_per_helper
on task_requests(helper_id)
where status in ('accepted','in_progress');

-- One payout per task
create unique index one_offer_payout_per_task
on ledger_entries(task_request_id)
where type = 'offer_payout';
```

### Why this matters

Even if:

- two phones tap at the same time

- retries happen

- frontend bugs exist

👉 **The DB refuses bad states.**

That’s “rock solid”.

---

## 3️⃣ Idempotency belongs ONLY at the RPC boundary

You fixed the biggest mistake already (UUID header 👏).

### Final rule

- **Never** use Supabase `Idempotency-Key` header

- Always pass `idempotency_key` in **request body**

- RPCs accept `text`, not `uuid`

### Canonical patterns

```markdown
broadcast:create:{userId}:{hash}
broadcast:respond:{broadcastId}:{helperId}
task:complete:{taskId}:{requesterId}
wallet:withdraw:{userId}:{amount}:{day}
```

### RPC flow (always the same)

1. Check idempotency table

2. If exists → return stored response

3. Else → perform action

4. Store response

5. Return

If every RPC follows this pattern → retries become harmless.

---

## 4️⃣ Deterministic keys generated **frontend-side**

This is subtle but critical.

### Why frontend?

- Button double-tap

- Slow mobile network

- App resume

- Browser retry

If the frontend generates the same key → **zero duplicates**.

### Lock this in

- Create helper:

```markdown
function makeBroadcastKey({ userId, message, offer, expires, lat, lng }) {
  return `broadcast:create:${userId}:${hash(...)}`;
}
```

- No `crypto.randomUUID()` for idempotent actions

- Random UUIDs ONLY for non-critical analytics / logs

---

## 5️⃣ Transactions inside RPCs (not routes)

Every RPC that:

- moves money

- creates a task

- changes ownership

**Must be atomic**.

### Pattern

```markdown
begin
  -- validate
  -- check idempotency
  -- insert task
  -- insert ledger entry
  -- update wallet
exception
  when unique_violation then
    -- return conflict
end;
```

Routes **must never** try to “undo” things.

---

## 6️⃣ One source of truth per concept

You had pain here — let’s freeze it.

| Concept | Source of truth |
| --- | --- |
| Money | `ledger_entries` |
| Balance | Derived from ledger |
| Task state | `task_requests.status` |
| Broadcast intent | `broadcast_requests` |
| Expiry | DB timestamps, not JS timers |

If something disagrees:\
👉 **Ledger wins**\
👉 **DB wins**

Never frontend math.

---

## 7️⃣ Add a DB tripwire (optional but powerful)

This is how senior systems stay clean.

### Example: forbid direct inserts

```markdown
create or replace function forbid_direct_task_insert()
returns trigger as $$
begin
  raise exception 'Direct insert forbidden. Use RPC.';
end;
$$ language plpgsql;

create trigger no_direct_task_insert
before insert on task_requests
for each row execute function forbid_direct_task_insert();
```

Now:

- You physically *cannot* break architecture later

- Future you will thank present you

---

# 🧪 How you KNOW it’s stable

Run these tests once:

### 1. Spam test

- Click “Post Broadcast” 5 times fast

- Result: **1 broadcast**

### 2. Network retry

- Kill request mid-flight

- Retry same payload

- Result: **same broadcast ID**

### 3. Race test

- Two helpers respond simultaneously

- Result: **one task created**

### 4. Money test

- Retry completion endpoint

- Result: **one payout**

If all pass → system is production-grade.