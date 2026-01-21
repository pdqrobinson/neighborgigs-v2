# Phase 2: Monitoring & Analytics

**Context:** Phase 2 is fundamentally an information-gathering exercise that begins after Phase 1 is stable and publicly viewable.**Cross-Reference:** See `Phase_2_INDEX.md` for complete Phase 2 documentation overview. See `2_1_technical_implementation.md` for implementation details.

---
 Phase 1 establishes read-only preview guards, notifications toggle, type consolidation, and service role key security.

Phase 2 is fundamentally an information-gathering exercise. This document defines what to measure, how to collect it, and how to use it to inform Phase 3 decisions.

---

## 1. Key Metrics Framework

### Metric Categories

| Category | Goal | Questions Answered |
|----------|------|---------------------|
| **Flow Completion** | Can users finish flows? | Where do they drop off? |
| **User Intent** | What do users want to do? | Which actions are most desired? |
| **UX Clarity** | Is the UI understandable? | Where is there confusion? |
| **Technical Health** | Is the preview stable? | Are errors occurring? |

---

## 2. Flow Completion Metrics

### Flow Start & End Events

```typescript
// Track flow lifecycle
interface FlowMetrics {
  flowName: string;
  sessionId: string;
  userId: string;
  
  // Timing
  startedAt: Date;
  endedAt?: Date;
  durationMs?: number;
  
  // Status
  status: 'started' | 'completed' | 'abandoned' | 'blocked';
  
  // Steps
  stepsCompleted: number;
  totalSteps: number;
  
  // Context
  entryPoint?: string;
  exitPoint?: string;
}
```

### Metrics to Track

| Metric | How to Measure | Target / Insight |
|--------|---------------|------------------|
| **Flow Start Rate** | Count `[flow_start]` events | Interest level |
| **Flow Completion Rate** | `[flow_end]` / `[flow_start]` | Usability |
| **Average Flow Duration** | Avg `duration_ms` per flow | Complexity |
| **Abandonment Rate** | `[flow_abandon]` / `[flow_start]` | Problem areas |
| **Step Drop-off** | Drop-off rate at each step | Specific friction points |

### Query Examples

```sql
-- Flow completion rate by flow name
SELECT 
  flow_name,
  COUNT(*) FILTER (WHERE event_name = '[flow_start]') as starts,
  COUNT(*) FILTER (WHERE event_name = '[flow_end]') as completes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE event_name = '[flow_end]') 
    / NULLIF(COUNT(*) FILTER (WHERE event_name = '[flow_start]'), 0),
    2
  ) as completion_rate_pct
FROM preview_events
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND flow_name IS NOT NULL
GROUP BY flow_name
ORDER BY completion_rate_pct DESC;

-- Average flow duration (exclude outliers > 3 std dev)
WITH flow_stats AS (
  SELECT 
    flow_name,
    duration_ms,
    AVG(duration_ms) OVER (PARTITION BY flow_name) as avg_duration,
    STDDEV(duration_ms) OVER (PARTITION BY flow_name) as std_duration
  FROM preview_events
  WHERE event_name = '[flow_end]'
    AND duration_ms IS NOT NULL
)
SELECT 
  flow_name,
  ROUND(AVG(duration_ms) / 1000, 1) as avg_duration_seconds,
  COUNT(*) as sample_size
FROM flow_stats
WHERE duration_ms <= avg_duration + 3 * std_duration
GROUP BY flow_name
ORDER BY avg_duration_seconds DESC;

-- Step abandonment by flow step
SELECT 
  flow_name,
  exit_point as step,
  COUNT(*) as abandons,
  ROUND(
    100.0 * COUNT(*) 
    / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY flow_name), 0),
    2
  ) as abandonment_rate_pct
FROM preview_events
WHERE event_name = '[flow_abandon]'
  AND exit_point IS NOT NULL
GROUP BY flow_name, exit_point
ORDER BY flow_name, abandonment_rate_pct DESC;
```

---

## 3. Blocked Actions Metrics

### Track What Users Want But Can't Do

```typescript
interface BlockedActionEvent {
  action: string;
  count: number;
  uniqueUsers: number;
  avgTimeInSession: number; // How long before hitting block
  context: {
    flow?: string;
    page?: string;
    component?: string;
  };
}
```

### Query Examples

```sql
-- Most commonly blocked actions
SELECT 
  blocked_action,
  COUNT(*) as block_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 60),
    1
  ) as avg_minutes_ago
FROM preview_events
WHERE blocked_action IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY blocked_action
ORDER BY block_count DESC;

-- Blocked actions by flow context
SELECT 
  flow_name,
  blocked_action,
  COUNT(*) as block_count,
  ROUND(
    100.0 * COUNT(*) 
    / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY flow_name), 0),
    2
  ) as pct_of_flow_blocks
FROM preview_events
WHERE blocked_action IS NOT NULL
  AND flow_name IS NOT NULL
GROUP BY flow_name, blocked_action
ORDER BY flow_name, block_count DESC;

-- Time to first blocked action (how long users get before hitting limits)
WITH first_block AS (
  SELECT 
    session_id,
    MIN(created_at) as first_blocked_at,
    MIN(created_at) OVER (PARTITION BY session_id) as session_start
  FROM preview_events
  WHERE blocked_action IS NOT NULL
)
SELECT 
  ROUND(AVG(EXTRACT(EPOCH FROM (first_blocked_at - session_start)) / 60), 1) as avg_minutes_to_first_block,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_blocked_at - session_start)) / 60), 1) as median_minutes_to_first_block,
  ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (first_blocked_at - session_start)) / 60), 1) as p95_minutes_to_first_block
FROM first_block;
```

---

## 4. Draft & Edit Behavior Metrics

### Understanding User Intent

| Metric | Question Answered |
|--------|-------------------|
| Drafts per user | How engaged are users? |
| Draft edits per draft | How iterative is the process? |
| Time between edits | How much thinking happens? |
| Draft abandonment | Are users giving up? |

### Query Examples

```sql
-- Draft engagement by user
WITH user_drafts AS (
  SELECT 
    user_id,
    COUNT(*) as total_drafts,
    COUNT(DISTINCT entity_type) as unique_entity_types
  FROM draft_history
  WHERE is_preview = true
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY user_id
)
SELECT 
  ROUND(AVG(total_drafts), 1) as avg_drafts_per_user,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_drafts), 1) as median_drafts_per_user,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_drafts), 1) as p90_drafts_per_user,
  ROUND(AVG(unique_entity_types), 1) as avg_entity_types_per_user
FROM user_drafts;

-- Draft lifecycle: created vs. updated vs. deleted
SELECT 
  entity_type,
  SUM(CASE WHEN action = 'create' THEN 1 ELSE 0 END) as created,
  SUM(CASE WHEN action = 'update' THEN 1 ELSE 0 END) as updated,
  SUM(CASE WHEN action = 'delete' THEN 1 ELSE 0 END) as deleted,
  ROUND(
    100.0 * SUM(CASE WHEN action = 'delete' THEN 1 ELSE 0 END)
    / NULLIF(SUM(CASE WHEN action = 'create' THEN 1 ELSE 0 END), 0),
    2
  ) as deletion_rate_pct
FROM draft_history
WHERE is_preview = true
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY entity_type
ORDER BY entity_type;

-- Time between edits (thinking time)
WITH edit_gaps AS (
  SELECT 
    entity_id,
    user_id,
    created_at - LAG(created_at) OVER (PARTITION BY entity_id, user_id ORDER BY created_at) as edit_gap
  FROM draft_history
  WHERE action = 'update'
    AND is_preview = true
    AND created_at >= NOW() - INTERVAL '7 days'
)
SELECT 
  ROUND(AVG(EXTRACT(EPOCH FROM edit_gap) / 60), 1) as avg_minutes_between_edits,
  ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM edit_gap) / 60), 1) as median_minutes_between_edits,
  ROUND(PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM edit_gap) / 60), 1) as p90_minutes_between_edits
FROM edit_gaps
WHERE edit_gap IS NOT NULL;
```

---

## 5. Feedback & Confusion Metrics

### Qualitative Data at Scale

| Source | Type | Value |
|--------|------|-------|
| Inline prompts | Contextual confusion | Immediate friction points |
| Feedback panel | Structured feedback | Prioritized issues |
| Abandonment | Implicit feedback | Unspoken problems |

### Query Examples

```sql
-- Feedback by category
SELECT 
  category,
  severity,
  COUNT(*) as count,
  AVG(rating) as avg_rating,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE was_confusing = true) as confusing_count
FROM preview_feedback
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY category, severity
ORDER BY category, severity;

-- Confusion points by component
SELECT 
  component_name,
  action_attempted,
  COUNT(*) as confusion_reports,
  COUNT(*) FILTER (WHERE was_confusing = true) as confirmed_confusion,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE was_confusing = true)
    / NULLIF(COUNT(*), 0),
    2
  ) as confusion_rate_pct
FROM preview_feedback
WHERE component_name IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY component_name, action_attempted
ORDER BY confusion_rate_pct DESC;

-- Feedback by page path (UX hotspots)
SELECT 
  page_path,
  COUNT(*) as feedback_count,
  AVG(rating) as avg_rating,
  COUNT(DISTINCT user_id) as unique_reporters,
  STRING_AGG(DISTINCT category, ', ') as categories_reported
FROM preview_feedback
WHERE page_path IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY page_path
ORDER BY feedback_count DESC;
```

---

## 6. Technical Health Metrics

### Preview Mode Stability

| Metric | Threshold | Alert Condition |
|--------|-----------|-----------------|
| Error rate | < 1% | > 2% for 5 minutes |
| Blocked action rate | N/A | Sudden spike |
| Draft save failures | < 0.1% | > 1% for 5 minutes |
| Session duration | N/A | > 95th percentile drop |

### Query Examples

```sql
-- Error rate by event type
SELECT 
  event_name,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL) as error_events,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL)
    / NULLIF(COUNT(*), 0),
    2
  ) as error_rate_pct
FROM preview_events
WHERE created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_name
HAVING error_rate_pct > 1
ORDER BY error_rate_pct DESC;

-- Draft operation success rate
SELECT 
  event_name,
  COUNT(*) as attempts,
  COUNT(*) FILTER (WHERE metadata->>'success' = 'true') as successes,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE metadata->>'success' = 'true')
    / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM preview_events
WHERE event_name LIKE '[draft_%'
  AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY event_name
ORDER BY success_rate_pct ASC;

-- Preview session duration distribution
SELECT 
  COUNT(*) as sessions,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (session_end - session_start)) / 60),
    1
  ) as avg_minutes,
  ROUND(
    PERCENTILE_CONT(0.5) WITHIN GROUP (
      ORDER BY EXTRACT(EPOCH FROM (session_end - session_start)) / 60
    ),
    1
  ) as median_minutes
FROM (
  SELECT 
    session_id,
    MIN(created_at) as session_start,
    MAX(created_at) as session_end
  FROM preview_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY session_id
) sessions;
```

---

## 7. Daily Monitoring Dashboard

### Dashboard Sections

#### Section 1: Overview
- Preview sessions today
- Active preview users
- Total drafts created
- Total blocked actions

#### Section 2: Flow Health
- Completion rate by flow (sparkline)
- Average flow duration (trend)
- Top abandonment points

#### Section 3: User Intent
- Most clicked blocked actions
- Draft creation rate
- Feedback volume by category

#### Section 4: Technical Health
- Error rate gauge
- API latency p95
- Draft save success rate

### Sample Dashboard Query

```sql
-- Single-query dashboard summary (last 24 hours)
WITH metrics AS (
  -- Sessions
  SELECT 
    COUNT(DISTINCT session_id) as sessions,
    COUNT(DISTINCT user_id) as unique_users
  FROM preview_events
  WHERE created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Drafts
  SELECT 
    NULL::bigint,
    COUNT(*)
  FROM draft_history
  WHERE action = 'create'
    AND is_preview = true
    AND created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Blocked actions
  SELECT 
    NULL::bigint,
    COUNT(*)
  FROM preview_events
  WHERE blocked_action IS NOT NULL
    AND created_at >= NOW() - INTERVAL '24 hours'
  
  UNION ALL
  
  -- Flow completions
  SELECT 
    COUNT(DISTINCT session_id),
    NULL::bigint
  FROM preview_events
  WHERE event_name = '[flow_end]'
    AND created_at >= NOW() - INTERVAL '24 hours'
)
SELECT 
  SUM(sessions) as sessions,
  SUM(unique_users) as unique_users,
  SUM(CASE WHEN sessions IS NULL THEN unique_users END) as drafts_created,
  SUM(CASE WHEN unique_users IS NULL AND sessions IS NULL THEN unique_users END) as blocked_actions,
  SUM(CASE WHEN unique_users IS NULL THEN sessions END) as flows_completed
FROM metrics;
```

---

## 8. Automated Alerts

### Alert Definitions

```typescript
// monitoring/alerts.ts
export const PREVIEW_ALERTS = [
  {
    name: 'High Error Rate',
    condition: async (db: Database) => {
      const result = await db.query(`
        SELECT 
          100.0 * COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL)
          / NULLIF(COUNT(*), 0) as error_rate
        FROM preview_events
        WHERE created_at >= NOW() - INTERVAL '5 minutes'
      `);
      return result[0].error_rate > 2;
    },
    message: 'Preview mode error rate exceeded 2% in last 5 minutes',
    severity: 'warning'
  },
  
  {
    name: 'Draft Save Failures',
    condition: async (db: Database) => {
      const result = await db.query(`
        SELECT 
          100.0 * COUNT(*) FILTER (WHERE metadata->>'success' != 'true')
          / NULLIF(COUNT(*), 0) as failure_rate
        FROM preview_events
        WHERE event_name LIKE '[draft_%'
          AND created_at >= NOW() - INTERVAL '5 minutes'
      `);
      return result[0].failure_rate > 1;
    },
    message: 'Draft save failure rate exceeded 1% in last 5 minutes',
    severity: 'critical'
  },
  
  {
    name: 'Spike in Blocked Actions',
    condition: async (db: Database) => {
      const current = await db.query(`
        SELECT COUNT(*) as count
        FROM preview_events
        WHERE blocked_action IS NOT NULL
          AND created_at >= NOW() - INTERVAL '5 minutes'
      `);
      const baseline = await db.query(`
        SELECT 
          AVG(count_per_5m) as baseline
        FROM (
          SELECT COUNT(*) as count_per_5m
          FROM preview_events
          WHERE blocked_action IS NOT NULL
            AND created_at >= NOW() - INTERVAL '1 hour'
          GROUP BY FLOOR(EXTRACT(EPOCH FROM created_at) / 300)
        ) baseline
      `);
      return current[0].count > baseline[0].baseline * 3;
    },
    message: 'Blocked action rate spiked 3x above baseline',
    severity: 'warning'
  }
];
```

---

## 9. Using Metrics for Phase 3 Decisions

### Decision Framework

| Metric | What It Tells You | Phase 3 Action |
|--------|-------------------|----------------|
| High completion rate | Flow works | Keep as-is |
| Low completion rate | Flow is broken | Fix before Phase 3 |
| High abandonment at step X | Step X is confusing | Redesign step X |
| Many clicks on blocked action | High demand for feature | Prioritize feature |
| Low feedback volume | Users disengaged | Improve feedback prompts |
| High confusion rate | Copy or UI unclear | Improve messaging |

### Phase 3 Readiness Checklist

Use metrics to verify readiness:

- [ ] All core flows have > 80% completion rate
- [ ] No abandonment point exceeds 30% drop-off
- [ ] Blocked action click rate < 5% of total actions
- [ ] Draft save success rate > 99%
- [ ] Feedback volume > 10 per active user per week
- [ ] Confusion rate < 10% of feedback submissions
- [ ] Error rate < 1%

### Phase 3 Prioritization Example

```sql
-- Rank features by demand (blocked action clicks)
SELECT 
  blocked_action,
  COUNT(*) as demand_count,
  COUNT(DISTINCT user_id) as unique_demanders,
  ROUND(
    100.0 * COUNT(*) 
    / NULLIF(SUM(COUNT(*)) OVER (), 0),
    2
  ) as demand_share_pct
FROM preview_events
WHERE blocked_action IS NOT NULL
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY blocked_action
ORDER BY demand_count DESC;

-- Rank flows by pain (completion rate inverse)
WITH flow_stats AS (
  SELECT 
    flow_name,
    COUNT(*) FILTER (WHERE event_name = '[flow_start]') as starts,
    COUNT(*) FILTER (WHERE event_name = '[flow_end]') as completes,
    COUNT(*) FILTER (WHERE event_name = '[flow_abandon]') as abandons
  FROM preview_events
  WHERE created_at >= NOW() - INTERVAL '7 days'
    AND flow_name IS NOT NULL
  GROUP BY flow_name
)
SELECT 
  flow_name,
  starts,
  completes,
  abandons,
  ROUND(
    100.0 * completes 
    / NULLIF(starts, 0),
    2
  ) as completion_rate_pct,
  ROUND(
    100.0 * abandons 
    / NULLIF(starts, 0),
    2
  ) as abandonment_rate_pct,
  (starts - completes) as users_who_didnt_finish
FROM flow_stats
WHERE starts > 10 -- minimum sample size
ORDER BY (starts - completes) DESC;
```
