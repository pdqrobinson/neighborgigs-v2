# NeighborGigs — Geospatial Implementation (Phase One)

## Purpose

This document defines how **hyperlocal discovery** works in Phase One.\
It establishes a single, authoritative approach to distance calculation, neighborhood containment, and visibility rules.

Any implementation that deviates from this document is invalid.

---

## Core Principles

1. All geospatial rules are enforced **server-side**

2. Neighborhood containment is absolute and evaluated first

3. Radius filtering is strict and capped

4. Map and list views are powered by the **same query**

5. Only users actively “on the move” are discoverable

6. The client never filters or overrides visibility

---

## Distance Calculation Strategy

Phase One uses **PostgreSQL earthdistance** for all distance calculations.

This approach is chosen because:

- Only point-to-point distance is required

- No polygons, routes, or spatial joins are needed

- It is simpler and cheaper than PostGIS

- It performs well at neighborhood scale

Earthdistance provides spherical distance between latitude/longitude pairs and is sufficient for radius-based discovery.

---

## Coordinate Storage

Each user stores their most recent location as:

- last_lat

- last_lng

These values represent the user’s **current position**, not a route or destination.

Location updates occur via a lightweight API heartbeat and overwrite previous values. No location history is stored in Phase One.

---

## Neighborhood Containment (Primary Gate)

Neighborhood containment is the **first and non-negotiable filter**.

A user may only see helpers whose neighborhood_id exactly matches their own neighborhood_id.

Distance calculations are **never performed across neighborhoods**.

If neighborhood_id does not match:

- The helper is invisible

- No distance math is executed

- No fallback or override exists

This rule guarantees trust and prevents accidental cross-area discovery.

---

## Radius Enforcement (Secondary Gate)

After neighborhood containment passes, radius filtering is applied.

The effective radius is:

- The current user’s selected radius (1–3 miles)

- Converted internally to meters

Helpers outside this radius are excluded entirely.

Radius enforcement is handled exclusively on the server.\
The client does not hide, adjust, or re-rank results.

---

## Movement-Based Visibility

Only users who are actively “on the move” are eligible to appear as helpers.

A helper is visible only when:

- on_the_move is true

- move_expires_at is in the future

- last_lat and last_lng are present

If any of these conditions fail, the helper is invisible.

Movement expiry is authoritative. Expired movement removes visibility immediately.

---

## Discovery Query Ownership

There is exactly **one discovery query** in Phase One.

This query is used by:
- map view
- list view

There are no alternative queries, secondary feeds, or client-side variations.

This guarantees map/list parity and prevents inconsistent UI states.

The discovery query includes an explicit ORDER BY clause; ordering is deterministic.

---

## Sorting Rules

Visible helpers are sorted by:

1. Distance ascending (closest first)

2. Movement expiration ascending (soonest expiring first)

No other ranking signals exist.

There is:

- no relevance scoring

- no weighting

- no prioritization by earnings or activity

---

## Performance Expectations

Phase One assumes:

- Small neighborhoods

- Dozens (not thousands) of active helpers

- Short-lived visibility windows

Indexes on user location are required to keep discovery performant.

If performance issues arise, the solution is indexing or query tuning — not relaxing geo rules.

---

## Client Responsibilities

The client:

- Provides its current latitude and longitude

- Renders what the API returns

- Does not filter results

- Does not expand search

- Does not guess visibility

The client must treat API results as authoritative.

---

## Invalid Behaviors (Explicitly Forbidden)

The following are not allowed in Phase One:

- Client-side distance filtering

- Client-side neighborhood filtering

- “Search this area” buttons

- Expanding radius automatically

- Showing helpers outside the neighborhood

- Showing inactive or expired helpers

- Inferring availability from recent activity

---

## Failure Scenarios

If location data is missing or invalid:

- Discovery returns an empty result set

- No fallback logic is applied

If the neighborhood is not set:

- Discovery is blocked

- User must be assigned a neighborhood first

Empty results are valid and expected.

---

## Final Lock Statement

Hyperlocal discovery is deterministic, server-enforced, and explicit.

If a helper is visible:

- They are nearby

- They are in the same neighborhood

- They are actively on the move

- Their visibility is time-bound

No exceptions.