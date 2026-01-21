# ☁️ Cloudflare 520 Quick Reference

## ⚡ What is a 520?
**Origin sent garbage** - Cloudflare connected but got:
- Empty response
- Invalid HTTP
- Connection reset
- Malformed headers
- App crashed

**Cloudflare's message:** *"I'm not forwarding that."*

---

## 🎯 5-Second Diagnosis

```bash
# 1. Check environment
curl http://localhost:50430/health          # DEV
curl https://neighborgigs.dev/health        # PROD

# 2. Check logs
tail -n 20 /dev/shm/zosite.log 2>/dev/null  # DEV
tail -n 20 /dev/shm/prod.log 2>/dev/null    # PROD

# 3. Run diagnostic
cd /home/workspace/neighborgigs
bun scripts/520-diagnose.ts [domain] [dev|prod]
```

---

## 🚨 PROD Emergency (520 Detected)

### Immediate Actions (First 30 seconds):
1. **STOP DEPLOYMENTS**
2. **ROLLBACK NOW:**
   ```bash
   cd /home/workspace/neighborgigs
   git checkout HEAD~1
   bun run build
   NODE_ENV=production PORT=58289 bun run prod &
   ```
3. **Check /health** (via bypass: `test-neighborgigs.dev`)
4. **Save logs:** `cp /dev/shm/*.log ~/logs-backup/`
5. **Fix in DEV** (never in PROD)

### Rollback Script:
```bash
#!/bin/bash
echo "🚨 Rolling back..."
pm2 delete neighborgigs 2>/dev/null || true
cd /home/workspace/neighborgigs
git checkout HEAD~1
bun run build
NODE_ENV=production PORT=58289 bun run prod &
sleep 3
curl -f http://localhost:58289/health && echo "✅ Done" || echo "❌ Failed"
```

---

## 🛠️ DEV Diagnostic Flow

### Step 1: Check Origin Directly
```bash
curl -v http://localhost:50430/health
# Look for: 200 OK, Content-Type: application/json
```

### Step 2: Check Logs
```bash
tail -n 50 /dev/shm/zosite.log 2>/dev/null
# Look for: error, crash, 520, invalid
```

### Step 3: Check Headers
```bash
curl -I http://localhost:50430/health
# Must have: Content-Type: application/json
```

### Step 4: Test Minimal Endpoints
```bash
curl http://localhost:50430/health
curl http://localhost:50430/
curl http://localhost:50430/api/hello-zo
```

---

## 🔧 Common Fixes (Copy-Paste)

### Fix 1: Add /health Endpoint
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

### Fix 2: Error Handling (Prevent Crashes)
```typescript
// Add to server.ts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't crash
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  // Don't crash
});
```

### Fix 3: Increase Timeout
```typescript
// In server.ts export
export default {
  fetch: app.fetch,
  port: 50430,
  idleTimeout: 255, // 255 seconds max
};
```

### Fix 4: Check SSL Mode (PROD only)
```bash
# Via Cloudflare API
bun scripts/cloudflare-api.ts set-ssl strict

# Or manually: Dashboard → SSL/TLS → Full (Strict)
```

---

## 📊 Deployment Checklist

### Pre-Deployment (DEV)
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

### Post-Deployment (PROD)
```bash
# 1. Check via Cloudflare
curl https://neighborgigs.dev/health

# 2. Check via bypass
curl https://test-neighborgigs.dev/health

# 3. Monitor logs
tail -f /dev/shm/prod.log

# 4. Watch for 520
# Cloudflare Dashboard → Analytics
```

---

## 🎯 520 Matrix

| Problem | Check | Fix |
|---------|-------|-----|
| **No /health** | `curl` fails | Add endpoint |
| **App crash** | Logs show error | Add error handling |
| **Empty body** | `curl` shows headers only | Ensure response has body |
| **Invalid headers** | `curl -v` shows issues | Fix header format |
| **Timeout** | Request takes >30s | Increase timeout |
| **SSL mismatch** | Works locally only | Set Cloudflare SSL to Full (Strict) |
| **Port conflict** | "Address in use" | Kill old process |

---

## 📞 When to Escalate

### Contact Zo Team If:
1. **Cannot access logs**
2. **Cannot start service**
3. **Cannot fix in DEV**
4. **PROD is down and rollback failed**

### Provide:
- Environment (DEV/PROD)
- Domain
- Time of error
- Output of: `bun scripts/520-diagnose.ts`
- Last 20 lines from: `tail -n 20 /dev/shm/*.log`

---

## 💡 Golden Rules

1. **Never debug live PROD** - Rollback first
2. **Fix in DEV, promote to PROD** - No hotfixes
3. **Always have /health** - Required for diagnosis
4. **Check logs immediately** - Don't guess
5. **Test without Cloudflare** - Isolate origin vs Cloudflare
6. **Never use Flexible SSL** - Causes 520s
7. **Promotion is atomic** - One deploy, verify, done

---

## 🎯 30-Second Recovery

**520 in PROD? Do this NOW:**

```bash
cd /home/workspace/neighborgigs
pm2 delete neighborgigs
git checkout HEAD~1
bun run build
NODE_ENV=production PORT=58289 bun run prod &
curl http://localhost:58289/health
```

**Then:** Fix in DEV, test, promote.

**Remember:** Cloudflare 520 = origin problem. Fix origin, not Cloudflare.
