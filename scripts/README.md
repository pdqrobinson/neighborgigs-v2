# Scripts for Cloudflare 520 Prevention & Diagnosis

This directory contains scripts for preventing, diagnosing, and fixing Cloudflare 520 errors in the 2-environment model (DEV zosite → PROD public).

## 🎯 Quick Reference

| Script | Purpose | When to Use |
|--------|---------|-------------|
| `deploy.sh` | Deploy with 520 prevention | Before any deployment |
| `emergency-rollback.sh` | Instant rollback on 520 | PROD 520 detected |
| `520-diagnose.ts` | Deep 520 diagnosis | When 520 occurs |
| `deploy-validate.ts` | Pre/post deployment checks | Deployment validation |
| `health-monitor.ts` | Continuous health monitoring | Monitoring deployments |
| `cloudflare-api.ts` | Cloudflare API checks | SSL/DNS issues |

## 🚀 Installation

All scripts are already executable. Make sure they have execute permissions:
```bash
chmod +x scripts/*.sh
chmod +x scripts/*.ts  # For Bun scripts
```

## 🔧 Usage

### Deploy Safely (PREVENT 520s)
```bash
# Deploy to DEV
./scripts/deploy.sh dev

# Deploy to PROD
./scripts/deploy.sh prod
```

**What it does:**
1. ✅ Pre-deployment validation
2. ✅ Build application
3. ✅ Start application
4. ✅ Health check (/health)
5. ✅ Header validation
6. ✅ Minimal endpoint tests
7. ✅ Post-deployment validation
8. ✅ Cloudflare check (PROD only)

### Emergency Rollback (FIX 520s)
```bash
# When 520 detected in PROD
./scripts/emergency-rollback.sh
```

**What it does:**
1. Stops current service
2. Restores previous version (git checkout HEAD~1)
3. Rebuilds application
4. Starts previous version
5. Verifies health
6. Checks Cloudflare

### Diagnose 520s
```bash
# Diagnose DEV
bun scripts/520-diagnose.ts [domain] dev

# Diagnose PROD
bun scripts/520-diagnose.ts [domain] prod
```

**What it does:**
- Step 0: Environment check
- Step 1: Origin without Cloudflare
- Step 2: Check origin logs
- Step 3: Validate headers
- Step 4: Bypass Cloudflare
- Step 5: SSL/TLS check
- Step 6: Timeout check
- Step 7: Minimal request test

### Validate Deployment
```bash
# Pre-deployment check
bun scripts/deploy-validate.ts dev pre
bun scripts/deploy-validate.ts prod pre

# Post-deployment check
bun scripts/deploy-validate.ts dev post
bun scripts/deploy-validate.ts prod post
```

**What it checks:**
- Git working directory clean
- Build health
- Environment match
- Health endpoint
- Port availability (DEV)
- Database connectivity
- SSL/TLS config (PROD)
- Timeouts
- Response headers
- Error logs
- Cloudflare connection (PROD)

### Monitor Health
```bash
# Monitor DEV for 5 minutes
bun scripts/health-monitor.ts dev 300

# Monitor PROD for 10 minutes
bun scripts/health-monitor.ts prod 600
```

**What it monitors:**
- /health endpoint (every 5s)
- Response time
- HTTP status codes
- 520/502 errors
- Log errors
- Generates report

### Cloudflare API (Optional)
```bash
# Check SSL mode
bun scripts/cloudflare-api.ts check-ssl

# Check DNS
bun scripts/cloudflare-api.ts check-dns

# Check 520 errors
bun scripts/cloudflare-api.ts check-errors

# Set SSL mode
bun scripts/cloudflare-api.ts set-ssl strict
```

**Requirements:**
- Set `CLOUDFLARE_API_KEY` in Settings → Developers

## 🎯 Workflow

### Normal Deployment (520 Prevention)
```bash
# 1. Test in DEV
./scripts/deploy.sh dev

# 2. Monitor DEV for a while
bun scripts/health-monitor.ts dev 300

# 3. Deploy to PROD
./scripts/deploy.sh prod

# 4. Monitor PROD closely
bun scripts/health-monitor.ts prod 600

# 5. Watch logs
tail -f /dev/shm/prod.log
```

### When 520 Detected (Emergency Response)
```bash
# 1. STOP - Don't deploy more
# 2. Rollback immediately
./scripts/emergency-rollback.sh

# 3. Diagnose in DEV
bun scripts/520-diagnose.ts [domain] dev

# 4. Fix in DEV
# ... edit code ...

# 5. Test fix
./scripts/deploy.sh dev
bun scripts/health-monitor.ts dev 300

# 6. Promote to PROD
./scripts/deploy.sh prod
```

## 📊 Output Files

All scripts generate markdown reports in `docs/`:

- `520-report-[env]-[date].md` - 520 diagnostic results
- `deploy-validation-[env]-[action]-[date].md` - Deployment validation
- `health-report-[env]-[date].md` - Health monitoring results

## 🔍 Troubleshooting

### Script fails to run
```bash
# Check permissions
ls -la scripts/

# Fix permissions
chmod +x scripts/*.sh
chmod +x scripts/*.ts
```

### Health check fails
```bash
# Check if service is running
pm2 list

# Check if port is listening
lsof -i :50430  # DEV
lsof -i :58289  # PROD

# Check logs
tail -f /dev/shm/zosite.log  # DEV
tail -f /dev/shm/prod.log    # PROD
```

### Cloudflare API errors
```bash
# Set API key
# Go to: /?t=settings&s=developers
# Set: CLOUDFLARE_API_KEY

# Verify
echo $CLOUDFLARE_API_KEY
```

## 📚 Documentation

For detailed information:

1. **520 Diagnostic Flow**: `docs/CLOUDFLARE_520_DIAGNOSTIC.md`
2. **Emergency Response**: `docs/520_EMERGENCY_RESPONSE.md`
3. **Quick Reference**: `docs/CLOUDFLARE_520_QUICK_REFERENCE.md`
4. **Cloudflare Config**: `docs/CLOUDFLARE_CONFIG_CHECKLIST.md`

## 🎯 Key Principles

1. **Prevention > Reaction** - Use `deploy.sh` for every deployment
2. **Fix in DEV, Promote to PROD** - Never hotfix production
3. **Monitor Continuously** - Use `health-monitor.ts` during deployments
4. **Rollback First, Fix Second** - When 520 hits PROD, rollback immediately
5. **Never Debug Live PROD** - All diagnosis happens in DEV

## 🚨 Emergency Contacts

If you cannot fix 520 errors:

1. **Zo Team**: https://support.zocomputer.com
2. **Email**: help@zocomputer.com
3. **Discord**: https://discord.gg/invite/zocomputer

**Information to provide:**
- Environment (DEV/PROD)
- Domain
- Time of error
- Output of diagnostic script
- Last 100 lines from logs
