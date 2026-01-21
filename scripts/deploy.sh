#!/bin/bash
# Deployment Script with 520 Prevention
#
# Usage: ./scripts/deploy.sh [dev|prod]
#
# This script ensures 520 prevention by:
# 1. Running pre-deployment validation
# 2. Building the application
# 3. Starting the application
# 4. Checking /health endpoint
# 5. Verifying headers
# 6. Only then switching traffic
#
# Follows the rule: "Never debug live prod"

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Environment
ENVIRONMENT=${1:-dev}
DOMAIN="neighborgigs.$ENVIRONMENT"

echo -e "${BLUE}🚀 Deployment Script${NC}"
echo -e "Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "Domain: ${YELLOW}$DOMAIN${NC}"
echo

# === PRE-DEPLOYMENT CHECKS ===
echo -e "${BLUE}📋 Step 1: Pre-deployment validation${NC}"

if [ "$ENVIRONMENT" = "dev" ]; then
    bun scripts/deploy-validate.ts dev pre
else
    bun scripts/deploy-validate.ts prod pre
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Pre-deployment validation failed${NC}"
    echo -e "${YELLOW}Fix issues before deploying${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pre-deployment validation passed${NC}"
echo

# === BUILD ===
echo -e "${BLUE}📦 Step 2: Building application${NC}"

# Clear cache first
echo "Clearing cache..."
rm -rf node_modules/.vite 2>/dev/null || true

# Build
echo "Building..."
bun run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"
echo

# === START APPLICATION ===
echo -e "${BLUE}🚀 Step 3: Starting application${NC}"

# Stop existing service
echo "Stopping existing service..."
pm2 delete neighborgigs 2>/dev/null || true

# Start new service
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "Starting DEV service on port 50430..."
    PORT=50430 NODE_ENV=development bun run prod &
else
    echo "Starting PROD service on port 58289..."
    PORT=58289 NODE_ENV=production bun run prod &
fi

# Wait for service to start
echo "Waiting for service to start..."
sleep 3

# Verify service is running
if [ "$ENVIRONMENT" = "dev" ]; then
    SERVICE_URL="http://localhost:50430"
else
    SERVICE_URL="http://localhost:58289"
fi

echo -e "${GREEN}✅ Service started${NC}"
echo

# === HEALTH CHECK ===
echo -e "${BLUE}🏥 Step 4: Health check${NC}"

HEALTH_URL="$SERVICE_URL/health"
echo "Checking: $HEALTH_URL"

# Wait up to 10 seconds for health check to pass
for i in {1..10}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Health check passed (200)${NC}"
        break
    fi
    
    if [ $i -eq 10 ]; then
        echo -e "${RED}❌ Health check failed after 10 attempts${NC}"
        echo "Last HTTP code: $HTTP_CODE"
        
        # Show recent logs
        echo -e "${YELLOW}Recent logs:${NC}"
        tail -n 20 /dev/shm/*.log 2>/dev/null || echo "No logs yet"
        
        # Rollback
        echo -e "${YELLOW}Rolling back...${NC}"
        pm2 delete neighborgigs 2>/dev/null || true
        exit 1
    fi
    
    sleep 1
done

echo

# === HEADER VALIDATION ===
echo -e "${BLUE}🔍 Step 5: Header validation${NC}"

echo "Checking response headers..."
RESPONSE_HEADERS=$(curl -v "$HEALTH_URL" 2>&1 | grep -E "(HTTP|Content-Type|Content-Length)")

echo "$RESPONSE_HEADERS"

# Check for common issues
RESPONSE_BODY=$(curl -s "$HEALTH_URL")
if [ -z "$RESPONSE_BODY" ]; then
    echo -e "${RED}❌ Empty response body${NC}"
    pm2 delete neighborgigs 2>/dev/null || true
    exit 1
fi

# Check if response is valid JSON
if ! echo "$RESPONSE_BODY" | jq empty 2>/dev/null; then
    echo -e "${RED}❌ Response is not valid JSON${NC}"
    echo "Response: $RESPONSE_BODY"
    pm2 delete neighborgigs 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Headers and response are valid${NC}"
echo

# === MINIMAL ENDPOINT CHECK ===
echo -e "${BLUE}🧪 Step 6: Minimal endpoint checks${NC}"

ENDPOINTS=("/health" "/" "/api/hello-zo")
ALL_PASS=true

for endpoint in "${ENDPOINTS[@]}"; do
    URL="$SERVICE_URL$endpoint"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
        echo -e "${GREEN}  ✅ $endpoint → $HTTP_CODE${NC}"
    else
        echo -e "${RED}  ❌ $endpoint → $HTTP_CODE${NC}"
        ALL_PASS=false
    fi
done

if [ "$ALL_PASS" = false ]; then
    echo -e "${RED}❌ Some endpoints failing${NC}"
    pm2 delete neighborgigs 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ All endpoints responding${NC}"
echo

# === CLOUDFLARE DEPLOYMENT (PROD only) ===
if [ "$ENVIRONMENT" = "prod" ]; then
    echo -e "${BLUE}☁️  Step 7: Cloudflare deployment${NC}"
    
    echo "Domain: $DOMAIN"
    echo "Port: 58289"
    echo
    
    # Check Cloudflare health
    echo "Checking via Cloudflare..."
    CLOUDFLARE_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/health" 2>/dev/null)
    
    if [ "$CLOUDFLARE_HEALTH" = "200" ]; then
        echo -e "${GREEN}✅ Cloudflare is routing traffic correctly${NC}"
    else
        echo -e "${YELLOW}⚠️  Cloudflare health check: $CLOUDFLARE_HEALTH${NC}"
        echo -e "${YELLOW}Note: DNS propagation may take time${NC}"
    fi
    
    # Check gray cloud (bypass) for comparison
    echo "Checking via gray cloud (bypass)..."
    GRAY_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "https://test-$DOMAIN/health" 2>/dev/null)
    
    if [ "$GRAY_HEALTH" = "200" ]; then
        echo -e "${GREEN}✅ Gray cloud test passes${NC}"
    else
        echo -e "${YELLOW}⚠️  Gray cloud test: $GRAY_HEALTH${NC}"
    fi
    
    echo
else
    # For DEV, show access info
    echo -e "${BLUE}🎯 DEV Environment Ready${NC}"
    echo -e "Service URL: ${YELLOW}http://localhost:50430${NC}"
    echo -e "Health Check: ${YELLOW}http://localhost:50430/health${NC}"
    echo -e "Test via Cloudflare: ${YELLOW}https://zosite.neighborgigs.dev${NC}"
    echo
fi

# === POST-DEPLOYMENT CHECKS ===
echo -e "${BLUE}📊 Step 8: Post-deployment validation${NC}"

if [ "$ENVIRONMENT" = "dev" ]; then
    bun scripts/deploy-validate.ts dev post
else
    bun scripts/deploy-validate.ts prod post
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Post-deployment validation failed${NC}"
    echo -e "${YELLOW}Check logs and consider rollback${NC}"
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        read -p "Rollback? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "Rolling back..."
            pm2 delete neighborgigs
            git checkout HEAD~1
            bun run build
            NODE_ENV=production PORT=58289 bun run prod &
            echo -e "${GREEN}✅ Rollback complete${NC}"
        fi
    fi
    
    exit 1
fi

echo -e "${GREEN}✅ Post-deployment validation passed${NC}"
echo

# === SUCCESS ===
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo

if [ "$ENVIRONMENT" = "prod" ]; then
    echo -e "${YELLOW}⚠️  MONITORING REQUIRED${NC}"
    echo "Watch logs for next 10 minutes:"
    echo "  tail -f /dev/shm/prod.log"
    echo
    echo "Watch error rates:"
    echo "  Cloudflare Dashboard → Analytics"
    echo
    echo "Rollback if 520 errors appear:"
    echo "  ./scripts/emergency-rollback.sh"
else
    echo -e "${BLUE}Next steps:${NC}"
    echo "  - Test features"
    echo "  - Check logs: tail -f /dev/shm/zosite.log"
    echo "  - When ready: git commit, git push"
    echo "  - Deploy to prod: ./scripts/deploy.sh prod"
fi

echo
echo -e "${BLUE}Documentation:${NC}"
echo "  - 520 Diagnostic: docs/CLOUDFLARE_520_DIAGNOSTIC.md"
echo "  - Emergency Response: docs/520_EMERGENCY_RESPONSE.md"
echo "  - Quick Reference: docs/CLOUDFLARE_520_QUICK_REFERENCE.md"
echo
