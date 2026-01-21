## Scoped User-to-User Messaging

### Purpose

Enables limited, contextual communication **only** to support a task or broadcast.

Messaging is **not** a social feature.

---

## Core Principle

> Messaging exists to support a task — not to replace decisions.

---

## Scope Rules

Messaging threads are scoped to:

- A broadcast (pre-accept)

- A task request (post-accept)

No global inbox in Phase 2.

---

## Conversation Model

```markdown
conversation {
  id
  context_type: 'broadcast' | 'task_request'
  context_id
  participant_ids
  created_at
}

message {
  id
  conversation_id
  sender_id
  body
  created_at
}
```

---

## Messaging UX

### Entry Points

- “Message” button in Task Details

- Response detail view (requester side)

### Display

- Inline panel or side drawer

- Task details remain visible

- Message history above input

---

## Behavior Rules

- Messaging allowed before acceptance

- Messaging persists after acceptance

- Disabled when task is closed

- Read-only after completion

---

## Guardrails

- No attachments (Phase 2)

- No reactions

- No typing indicators

- No negotiation UI

- Light rate limiting

---

## Phase Placement

| Feature | Phase |
| --- | --- |
| Scoped messaging | Phase 2 |
| Global inbox | Phase 3+ |
| Notifications | Phase 3 |
| Media / files | Phase 4 |

---

## Summary

Messaging is:

- Contextual

- Minimal

- Task-driven

- Non-social

This keeps complexity low and trust high.