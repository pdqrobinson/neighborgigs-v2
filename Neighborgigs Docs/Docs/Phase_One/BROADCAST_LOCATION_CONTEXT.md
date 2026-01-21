# 📡 Broadcast Location Context (Design & Data Flow)

## Overview

Broadcasts support **location context** to describe *where the broadcast is relevant*, not a full route or journey.

This enables:

- Accurate map pin placement

- Meaningful distance sorting

- Clear intent for helpers (“I’m here now” vs “I’m heading there”)

Location context is **optional**, lightweight, and forward-compatible with future geocoding and map enhancements.

---

## Location Context Types

Broadcasts support **four** location contexts:

| Context | Meaning |
| --- | --- |
| `here_now` | User is currently at the location |
| `heading_to` | User is going to a place |
| `coming_from` | User is leaving a place |
| `place_specific` | Broadcast is about a specific location |

Default: `here_now`

---

## UI Flow (Create Broadcast Modal)

The broadcast creation flow is intentionally linear:

```markdown
Type → Message → Location → Duration → Broadcast
```

### Location UI Behavior

- User selects **one** location context

- If context ≠ `here_now`, the UI reveals:

  - `place_name` (required UX, optional DB)

  - `place_address` (optional)

- Location fields reset on:

  - Cancel

  - Successful broadcast creation

---

## Frontend State (Home.tsx)

The broadcast modal manages the following location state:

```markdown
locationContext: 'here_now' | 'heading_to' | 'coming_from' | 'place_specific'
placeName: string
placeAddress: string
```

Defaults:

```markdown
locationContext = 'here_now'
placeName = ''
placeAddress = ''
```

---

## Data Sent on Broadcast Creation

When creating a broadcast, the frontend sends:

```markdown
{
  location_context: locationContext,
  place_name: placeName || null,
  place_address: placeAddress || null
}
```

Notes:

- `place_name` and `place_address` are nullable

- `here_now` typically sends both as `null`

- No geocoding occurs at this stage

---

## Loading Broadcasts (Distance-Aware)

When loading broadcasts:

- User latitude / longitude is passed to the backend

- Distance is calculated **server-side**

- Location context determines:

  - Map pin meaning

  - Tooltip / label wording

  - Sorting relevance

This avoids client-side math and ensures consistent results.

---

## Map Rendering Semantics

Broadcast map pins represent the **meaningful location**, not the user’s entire route.

Examples:

- `here_now` → user’s current location

- `heading_to` → destination


- `coming_from` → origin

- `place_specific` → explicit place

This keeps the map uncluttered and semantically correct.

---

## Design Principles (Why This Exists)

- **Intent &gt; precision**\
  Users care more about *what the location means* than exact coordinates.

- **Minimal friction**\
  No forced address entry unless it adds value.

- **Future-proof**\
  Schema supports:

  - Autocomplete

  - Geocoding

  - Route previews

  - Radius filtering