# Phase 3 — Extra Food & Household Items (Priced Offers)

## Phase Goal

Enable **offer-led sharing** of:

- surplus home-prepared food

- spare household items

with **optional pricing**, while preserving:

- pickup-only behavior

- helper control

- low platform liability

- non-professional intent

---

## 1. Supported Task Types

### TaskType Enum

```markdown
enum TaskType {
  EXTRA_FOOD = 'extra_food',
  HOUSEHOLD_ITEM = 'household_item'
}
```

---

## 2. Pricing Model (Critical Guardrails)

Pricing is **optional**, **helper-defined**, and **fixed**.

### Global Pricing Rules

- Price is set by the offer creator

- No bidding, no negotiation UI

- No per-unit pricing logic

- No dynamic pricing

- Tips are optional and separate (if enabled)

| Rule | Extra Food | Household Items |
| --- | --- | --- |
| Optional price | ✅ | ✅ |
| Free allowed | ✅ | ✅ |
| Fixed amount | ✅ | ✅ |
| Negotiation | ❌ | ❌ |
| Delivery fees | ❌ | ❌ |
| Platform-set pricing | ❌ | ❌ |

> Pricing represents **cost-sharing or appreciation**, not professional sale of goods.

---

## 3. Task Creation Flows

### 3.1 Extra Food Tasks

**Who creates:** User offering food\
**Intent:** Share surplus prepared food, optionally recovering cost

#### Required Fields

```markdown
{
  task_type: 'extra_food',
  title: string,                    // "Extra chicken curry"
  quantity: string,                 // "2 plates"
  pickup_window_start: datetime,
  pickup_window_end: datetime,
  allergens: string[],
  location_lat: number,
  location_lng: number
}
```

#### Optional Fields

```markdown
{
  price_usd?: number,               // fixed, optional
  notes?: string,
  photo_url?: string
}
```

#### Enforcement Rules

- pickup_window_end must be same calendar day

- price is per offer, not per plate

- no customization or substitutions

- no recurring or scheduled offers

- no menus or cooking-on-demand

---

### 3.2 Household Item Tasks

**Who creates:** User offering item\
**Intent:** Give, lend, or sell spare household items

#### Required Fields

```markdown
{
  task_type: 'household_item',
  item_name: string,                // "Folding chair"
  condition: 'new' | 'good' | 'used',
  availability_window_start: datetime,
  availability_window_end: datetime,
  mode: 'give' | 'lend' | 'sell',
  location_lat: number,
  location_lng: number
}
```

#### Optional Fields

```markdown
{
  price_usd?: number,                // required if mode === 'sell'
  notes?: string,
  photo_url?: string,
  return_by?: datetime               // required if mode === 'lend'
}
```

#### Enforcement Rules

- pickup only

- price required when mode = sell

- no shipping, delivery, or deposits

- no recurring sales listings

---

## 4. Task State Machine

No structural changes.

```markdown
OPEN → CLAIMED → COMPLETED
         ↘ EXPIRED
```

### State Notes

- Claim locks price and terms

- Price cannot be edited after claim

- Expired tasks are non-recoverable

---

## 5. Claim & Payment Flow

1. Neighbor views offer

2. Price displayed clearly (or “Free”)

3. User taps **Claim**

4. Task moves to `CLAIMED`

5. Chat opens for pickup coordination

6. Payment handled:

   - upfront (recommended)

   - or at completion (configurable)

7. Task marked `COMPLETED`

---

## 6. Visibility & Feed Behavior

- Radius-limited to neighborhood

- Extra Food prioritized due to time sensitivity

- Household Items decay more slowly

- Priced and free offers shown together (clearly labeled)

---

## 7. Trust & Safety Notes

- Food is offered “as-is”

- Platform does not verify food safety or item condition

- Users may report misleading listings

- Repeated commercial behavior is flagged

---

## 8. Explicit Non-Goals (Phase 3)

This phase **does not** include:

- cooking-to-order

- menus or catalogs

- delivery logistics

- refunds or disputes over taste/quality

- bulk or recurring sellers

- professional storefronts

---

## 9. Abuse Prevention (Soft Controls)

- Limits on concurrent food offers

- Velocity checks on priced listings

- Manual review triggers for repeated sellers

- Copy warnings against “made-to-order” language

---

### Why this still works

You’ve allowed **money** without turning this into:

- DoorDash

- Etsy

- Facebook Marketplace spam

- a regulated food business

The system stays **neighbor-first**, not **seller-first**.