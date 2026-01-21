## Broadcast → Task Details View

### Purpose

Defines the UI and behavior when a user clicks a broadcast.\
This view is the **decision space** where users understand the task and choose their next action.

A broadcast click does **not** open a feed expansion — it opens a **task context**.

---

## Mental Model

> Clicking a broadcast = entering a temporary negotiation space

The UI must support:

- Understanding

- Evaluation

- Action

---

## View Structure

### 1. Header (Always Visible)

- Task title

- Status badge: `Open`, `Awaiting response`, `Accepted`

- Time window

- **Offer amount (prominent)**

```markdown
Need one item from Target
Today · 4–6pm
$15 offered
```

---

### 2. Task Details Section

Displayed content:

- Full task description

- Pickup location (store / address)

- Notes or constraints

- Requester identity (name, avatar)

Grouped visually as:

- What they need

- Where it happens

- When it happens

---

### 3. Context-Aware Actions

Actions vary by user role.

#### If user is a potential helper:

- **Primary:** “I can help”

- **Secondary:** “Message”

#### If user is the requester:

- Responses list

- Each response opens a responder detail panel

- Accept button per responder

---

## Design Constraints

- No negotiation UI

- No price editing

- No task mutation here

- No global navigation shift

This view exists to **move the task forward**, not to browse.