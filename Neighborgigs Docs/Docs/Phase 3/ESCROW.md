## Escrowed Broadcast Payments (Core Flow)

Every broadcast **must include a price**.

When a user creates a broadcasted request, they attach a fixed amount that represents what they’re willing to pay for completion of the task.

### Funding the Request

- The amount is **deducted from the requester’s in-app balance** at the time the broadcast is submitted

- That amount is immediately placed into **escrow**

- If the user doesn’t have sufficient balance, they must **top up before posting**

👉 No balance, no broadcast. Simple.

### Escrow State

- Funds remain locked in escrow while the task is active

- The helper can see the payout amount **before accepting**

- The requester cannot edit or withdraw the funds once a helper has accepted (prevents shenanigans)

### Task Completion & Release

- The helper marks the task as **complete**

- The requester verifies completion (or it auto-verifies after a timeout)

- Once verified:

  - Escrow is released

  - Funds are **transferred to the helper’s balance**

  - Platform fee (if any) is deducted at this moment

### Failure / Dispute Handling

- If the task is cancelled before completion → escrow returns to the requester

- If disputed → funds remain frozen until resolution

- If requester ghosts → auto-release after X hours

---

## Why this is the correct model (no sugarcoating)

- ✅ Prevents fake or low-effort broadcasts

- ✅ Helpers trust the payout is real

- ✅ You avoid Venmo-style “bro I’ll pay you after” nonsense

- ✅ Scales cleanly into disputes, ratings, and automation later

This is **TaskRabbit / Uber / DoorDash-level payment discipline**, not Craigslist chaos.