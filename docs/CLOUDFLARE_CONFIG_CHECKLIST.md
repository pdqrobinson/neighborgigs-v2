# ☁️ Cloudflare Configuration Checklist

## Environment Comparison

| Setting | DEV (zosite) | PROD (public) | Notes |
|---------|-------------|---------------|--------|
| **SSL Mode** | Full / Full (Strict) | Full (Strict) | Never use Flexible |
| **Origin Cert** | Self-signed / Dev cert | Valid CA cert | Must match SSL mode |
| **Proxy Status** | Gray or Orange | Orange | Gray for bypass tests |
| **Page Rules** | Minimal | Conservative | Avoid 520 triggers |
| **Firewall** | Log only | Block rules | Test in DEV first |

---

## SSL/TLS Settings

### DEV (zosite.neighborgigs.dev)
```yaml
SSL/TLS mode: Full
Origin Certificate: Self-signed
Edge Certificates: Auto
Always Use HTTPS: ❌ No (can use HTTP for testing)
Minimum TLS Version: 1.2
```

### PROD (neighborgigs.dev)
```yaml
SSL/TLS mode: Full (Strict)
Origin Certificate: CA-signed (Cloudflare or Let's Encrypt)
Edge Certificates: Auto
Always Use HTTPS: ✅ Yes
Minimum TLS Version: 1.2
Origin Cert Validation: ✅ Yes
```

---

## Critical 520 Prevention Settings

### 1. SSL Mode (Most Common 520 Cause)
❌ **Flexible** → causes 520 when origin has real cert
- Cloudflare connects HTTP to origin
- Origin sends HTTPS response
- Cloudflare rejects mismatch

✅ **Full** → Cloudflare connects HTTPS, ignores cert
- Cloudflare connects HTTPS to origin
- Origin sends HTTPS response
- Works even with self-signed cert

✅ **Full (Strict)** → Cloudflare validates cert
- Cloudflare connects HTTPS to origin
- Validates origin cert
- Most secure option

### 2. Timeout Configuration
**Cloudflare Timeout:** ~100 seconds (hard limit)
**Origin Timeout:** Should be < 90 seconds

**Check your origin:**
```javascript
// Bun/Node
server.timeout = 30000; // 30s recommended

// Nginx
proxy_read_timeout 60s;

// PHP
max_execution_time = 30
```

### 3. Header Limits
**Cloudflare accepts:**
- Headers: ~8KB total
- Header lines: ~1KB each
- Status line: ~1KB

**Common issues:**
- Empty `Content-Length`
- Duplicate headers
- Invalid characters
- Binary data before headers

### 4. Body Size Limits
**Cloudflare limits:**
- Free: 100MB
- Pro: 500MB
- Business: 1GB

**Origin limits should match or be smaller:**
```nginx
client_max_body_size 100M;
```

---

## Health Check Endpoint Configuration

### Required Endpoint: `/health`
```typescript
// Add to server.ts
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    service: "neighborgigs",
  });
});
```

### Health Check Response
**Must return:**
- HTTP 200 status
- Valid JSON
- Content-Type: application/json
- Reasonable size (< 1KB)

**Never:**
- Redirect to /login
- Return HTML
- Take > 5 seconds
- Crash the app

---

## Cloudflare Page Rules (Critical)

### Rule 1: Always Online (Production)
**If:** `*neighborgigs.dev/*`
**Then:** Always Online (ON)
**Priority:** 1

### Rule 2: Cache Everything (Production)
**If:** `*neighborgigs.dev/assets/*`
**Then:** Cache Level: Cache Everything
**Priority:** 2

### Rule 3: Bypass Cache for API (Both)
**If:** `*neighborgigs.dev/api/*`
**Then:** Cache Level: Bypass
**Priority:** 3

### Rule 4: SSL Strict (Production)
**If:** `*neighborgigs.dev/*`
**Then:** SSL: Full (Strict)
**Priority:** 10

---

## Firewall Rules (Production Only)

### Rule 1: Block Known Bots
**Action:** Block
**Criteria:** `(cf.client.bot) AND (ip.src ne 0.0.0.0)`

### Rule 2: Challenge Suspicious
**Action:** JS Challenge
**Criteria:** `(ip.geoip.country eq "CN") OR (ip.geoip.country eq "RU")`

### Rule 3: Log All (DEV)
**Action:** Log
**Criteria:** `*`
**Purpose:** Debug 520s in DEV

---

## DNS Configuration

### DEV (zosite.neighborgigs.dev)
```yaml
Type: A
Name: zosite
Content: [Zo server IP]
Proxy status: Gray (for direct testing)
TTL: Auto
```

### PROD (neighborgigs.dev)
```yaml
Type: A
Name: @
Content: [Cloudflare proxy IP]
Proxy status: Orange
TTL: Auto

Type: A
Name: test
Content: [Cloudflare proxy IP]
Proxy status: Gray (for bypass testing)
TTL: Auto
```

---

## Monitoring & Alerts

### Cloudflare Dashboard Metrics
**Watch for:**
- 520 error rate spikes
- Origin connection errors
- SSL handshake failures
- Timeout errors

### Log Alerts
**Set up alerts for:**
- 520 errors > 10/min
- Origin response time > 5s
- SSL errors
- Connection resets

---

## Testing Checklist

### Pre-Deployment (DEV)
- [ ] /health endpoint responds with 200
- [ ] No errors in logs
- [ ] SSL mode is correct for environment
- [ ] Origin responds without Cloudflare
- [ ] Headers are valid (curl -v)
- [ ] Health check JSON is valid

### Post-Deployment (PROD)
- [ ] /health returns 200 via Cloudflare
- [ ] No 520 errors for 5 minutes
- [ ] Response time < 5 seconds
- [ ] SSL certificate valid
- [ ] Cloudflare cache working
- [ ] Page loads correctly

### 520 Recovery (When 520 occurs)
1. **Immediate:** Check /health endpoint
2. **If down:** Rollback deployment
3. **If up:** Check logs for crashes
4. **Test bypass:** Use gray cloud subdomain
5. **Fix in dev:** Reproduce issue locally
6. **Promote:** Deploy fix to prod

---

## Common 520 Scenarios & Fixes

### Scenario 1: App crashes after accepting connection
**Symptoms:** 520 on all requests, no logs
**Cause:** Worker exits immediately
**Fix:** Add error handling, check env vars

### Scenario 2: Empty response with headers
**Symptoms:** 520, curl shows headers but no body
**Cause:** App returns Response() with empty body
**Fix:** Ensure body is present, check Content-Length

### Scenario 3: Invalid HTTP response
**Symptoms:** 520, logs show "invalid response"
**Cause:** Binary data before headers
**Fix:** Check for console.log output, fix response format

### Scenario 4: Flexible SSL mismatch
**Symptoms:** 520 only via Cloudflare, works on origin
**Cause:** SSL mode is Flexible
**Fix:** Change to Full or Full (Strict)

### Scenario 5: Timeout
**Symptoms:** 520 on slow requests
**Cause:** Request > 100s or origin timeout < Cloudflare
**Fix:** Increase origin timeout, add timeouts in code

### Scenario 6: Malformed headers
**Symptoms:** 520, logs show "header too large"
**Cause:** Headers > 8KB or invalid characters
**Fix:** Clean up headers, remove debug info

---

## Prevention Pattern

### Before Every Deployment (DEV)
```bash
# 1. Build
bun run build

# 2. Start
bun run prod

# 3. Check health
curl http://localhost:50430/health

# 4. Validate headers
curl -v http://localhost:50430/health

# 5. Check logs
tail -f /dev/shm/zosite.log
```

### After Deployment (PROD)
```bash
# 1. Check via Cloudflare
curl https://neighborgigs.dev/health

# 2. Check via gray cloud
curl https://test-neighborgigs.dev/health

# 3. Monitor logs
tail -f /dev/shm/prod.log

# 4. Watch error rates
# Cloudflare dashboard → Analytics
```

---

## Emergency Response

### 520 Detected in Production
1. **Immediate rollback** (use previous deployment)
2. **Check health endpoint** via bypass
3. **Identify root cause** in DEV logs
4. **Fix in DEV** (never in PROD)
5. **Test fix** locally and in DEV
6. **Deploy fix** to PROD
7. **Monitor** for 10 minutes

### Rollback Script
```bash
#!/bin/bash
# emergency-rollback.sh
echo "🚨 Rolling back deployment..."

# Stop current service
pm2 delete neighborgigs

# Restore previous version
git checkout HEAD~1

# Rebuild
bun run build

# Start previous version
pm2 start ecosystem.config.js

# Verify health
sleep 5
curl https://neighborgigs.dev/health

echo "✅ Rollback complete"
```

---

## Key Takeaways

1. **Never use Flexible SSL in production**
2. **Always have a /health endpoint**
3. **Test origin directly before Cloudflare**
4. **Check logs immediately on 520**
5. **Fix in DEV, promote to PROD**
6. **Monitor health check continuously**

**Remember:** Cloudflare 520 means the origin sent garbage. Fix the origin, not Cloudflare.
