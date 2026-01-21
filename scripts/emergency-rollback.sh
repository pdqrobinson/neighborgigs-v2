#!/bin/bash
# Emergency Rollback Script
#
# Usage: ./scripts/emergency-rollback.sh
#
# Immediately rolls back to previous working version
# Use when 520 errors detected in PROD

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${RED}🚨 EMERGENCY ROLLBACK INITIATED${NC}"
echo -e "${YELLOW}Do you want to continue?${NC}"
echo
echo "This will:"
echo "  1. Stop current service"
echo "  2. Restore previous version (git checkout HEAD~1)"
echo "  3. Rebuild application"
echo "  4. Start previous version"
echo "  5. Verify health"
echo
read -p "Type 'yes' to continue: " -r
echo

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo -e "${YELLOW}Rollback cancelled${NC}"
    exit 0
fi

echo -e "${BLUE}Starting rollback...${NC}"
echo

# === 1. STOP CURRENT SERVICE ===
echo -e "${BLUE}Step 1: Stopping current service${NC}"
pm2 delete neighborgigs 2>/dev/null || true
sleep 2
echo -e "${GREEN}✅ Service stopped${NC}"
echo

# === 2. RESTORE PREVIOUS VERSION ===
echo -e "${BLUE}Step 2: Restoring previous version${NC}"

# Check if we have previous commits
if ! git rev-parse HEAD~1 >/dev/null 2>&1; then
    echo -e "${RED}❌ No previous commit found${NC}"
    echo -e "${YELLOW}Cannot rollback further${NC}"
    exit 1
fi

echo "Current commit: $(git log --oneline -1)"
echo "Rolling back to: $(git log --oneline -2 | tail -1)"

git checkout HEAD~1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git checkout failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Version restored${NC}"
echo

# === 3. REBUILD APPLICATION ===
echo -e "${BLUE}Step 3: Rebuilding application${NC}"

# Clear cache
rm -rf node_modules/.vite 2>/dev/null || true

# Build
bun run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}Manual intervention required${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo

# === 4. START PREVIOUS VERSION ===
echo -e "${BLUE}Step 4: Starting previous version${NC}"

# Start service
NODE_ENV=production PORT=58289 bun run prod &

# Wait for startup
echo "Waiting for service to start..."
sleep 5

# Verify it's running
if pgrep -f "bun.*server.ts" > /dev/null; then
    echo -e "${GREEN}✅ Service started${NC}"
else
    echo -e "${RED}❌ Service failed to start${NC}"
    echo -e "${YELLOW}Check logs: tail -f /dev/shm/prod.log${NC}"
    exit 1
fi
echo

# === 5. VERIFY HEALTH ===
echo -e "${BLUE}Step 5: Verifying health${NC}"

HEALTH_URL="http://localhost:58289/health"
ATTEMPTS=0
MAX_ATTEMPTS=10
HEALTH_OK=false

while [ $ATTEMPTS -lt $MAX_ATTEMPTS ]; do
    ATTEMPTS=$((ATTEMPTS + 1))
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        HEALTH_OK=true
        break
    fi
    
    echo "Attempt $ATTEMPTS/$MAX_ATTEMPTS: HTTP $HTTP_CODE"
    sleep 1
done

if [ "$HEALTH_OK" = true ]; then
    echo -e "${GREEN}✅ Health check passed (200)${NC}"
    
    # Show health response
    RESPONSE=$(curl -s "$HEALTH_URL")
    echo "Response: $RESPONSE"
else
    echo -e "${RED}❌ Health check failed after $MAX_ATTEMPTS attempts${NC}"
    
    # Show logs
    echo -e "${YELLOW}Recent logs:${NC}"
    tail -n 20 /dev/shm/prod.log 2>/dev/null || echo "No logs yet"
    
    exit 1
fi
echo

# === CHECK CLOUDFLARE ===
echo -e "${BLUE}Step 6: Checking Cloudflare${NC}"

CLOUDFLARE_URL="https://neighborgigs.dev/health"
echo "Checking: $CLOUDFLARE_URL"

CLOUDFLARE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$CLOUDFLARE_URL" 2>/dev/null)

if [ "$CLOUDFLARE_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Cloudflare is routing correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Cloudflare health check: $CLOUDFLARE_CODE${NC}"
    echo -e "${YELLOW}DNS propagation may be in progress${NC}"
fi

echo

# === SUCCESS ===
echo -e "${GREEN}🎉 ROLLBACK COMPLETE!${NC}"
echo
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo "1. Check logs: tail -f /dev/shm/prod.log"
echo "2. Test site: curl https://neighborgigs.dev"
echo "3. Check 520 errors: bun scripts/520-diagnose.ts neighborgigs.dev prod"
echo "4. Fix issue in DEV environment"
echo "5. Test fix locally"
echo "6. Deploy fix to PROD"
echo
echo -e "${BLUE}Documentation:${NC}"
echo "  - 520 Emergency Response: docs/520_EMERGENCY_RESPONSE.md"
echo "  - 520 Diagnostic: docs/CLOUDFLARE_520_DIAGNOSTIC.md"
echo
echo -e "${RED}DO NOT deploy again until issue is fixed in DEV!${NC}"
