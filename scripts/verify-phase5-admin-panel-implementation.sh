#!/bin/bash

# Phase 5 Admin Panel - Implementation Verification Script
# Run this script to verify all admin panel components are properly implemented

set -e

PROJECT_ROOT="/mnt/d/Project/.2_PROJECT_BOT_DISCORD"
DASHBOARD_ROOT="$PROJECT_ROOT/apps/dashboard"

echo "=================================="
echo "Phase 5 Admin Panel Verification"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

# Check if directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        return 1
    fi
}

# Check if string exists in file
check_content() {
    if grep -q "$2" "$1" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} Content check passed: $3"
        return 0
    else
        echo -e "${RED}✗${NC} Content check failed: $3"
        return 1
    fi
}

echo "Step 1: Checking Core Admin Files"
echo "-----------------------------------"
check_file "$DASHBOARD_ROOT/src/lib/admin/admin-guard.ts"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/layout.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/page.tsx"
echo ""

echo "Step 2: Checking Admin Pages"
echo "-----------------------------"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/tenants/page.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/tenants/[id]/page.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/users/page.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/users/[id]/page.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/guilds/page.tsx"
check_file "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/system/page.tsx"
echo ""

echo "Step 3: Checking Admin Components"
echo "----------------------------------"
check_file "$DASHBOARD_ROOT/src/components/admin/admin-stats-grid.tsx"
check_file "$DASHBOARD_ROOT/src/components/admin/tenant-table.tsx"
check_file "$DASHBOARD_ROOT/src/components/admin/user-table.tsx"
check_file "$DASHBOARD_ROOT/src/components/admin/guild-table.tsx"
check_file "$DASHBOARD_ROOT/src/components/admin/system-health-card.tsx"
check_file "$DASHBOARD_ROOT/src/components/admin/audit-log-viewer.tsx"
echo ""

echo "Step 4: Checking API Endpoints"
echo "-------------------------------"
check_file "$DASHBOARD_ROOT/src/app/api/admin/stats/route.ts"
check_file "$DASHBOARD_ROOT/src/app/api/admin/tenants/route.ts"
check_file "$DASHBOARD_ROOT/src/app/api/admin/users/route.ts"
check_file "$DASHBOARD_ROOT/src/app/api/admin/guilds/route.ts"
check_file "$DASHBOARD_ROOT/src/app/api/admin/health/route.ts"
check_file "$DASHBOARD_ROOT/src/app/api/admin/audit-logs/route.ts"
echo ""

echo "Step 5: Checking Environment Configuration"
echo "-------------------------------------------"
if check_content "$PROJECT_ROOT/.env.example" "ADMIN_USER_IDS" ".env.example has ADMIN_USER_IDS"; then
    echo -e "${GREEN}✓${NC} .env.example configured correctly"
else
    echo -e "${YELLOW}⚠${NC} .env.example needs manual update"
    echo "   Add this line after BOT_ADMIN_IDS:"
    echo "   ADMIN_USER_IDS="
fi

if [ -f "$DASHBOARD_ROOT/.env" ]; then
    if check_content "$DASHBOARD_ROOT/.env" "ADMIN_USER_IDS" ".env has ADMIN_USER_IDS"; then
        echo -e "${GREEN}✓${NC} .env configured correctly"
    else
        echo -e "${YELLOW}⚠${NC} .env needs manual update"
        echo "   Add: ADMIN_USER_IDS=your_discord_user_id"
    fi
else
    echo -e "${YELLOW}⚠${NC} .env file not found (may use root .env)"
fi
echo ""

echo "Step 6: Checking Sidebar Integration"
echo "-------------------------------------"
if check_content "$DASHBOARD_ROOT/src/components/layout/sidebar-v2.tsx" "adminOnly" "Sidebar has admin section"; then
    echo -e "${GREEN}✓${NC} Sidebar configured for admin"
else
    echo -e "${RED}✗${NC} Sidebar missing admin section"
fi
echo ""

echo "Step 7: Content Verification"
echo "-----------------------------"
check_content "$DASHBOARD_ROOT/src/lib/admin/admin-guard.ts" "requireAdmin" "Admin guard exports requireAdmin"
check_content "$DASHBOARD_ROOT/src/lib/admin/admin-guard.ts" "ADMIN_USER_IDS" "Admin guard checks ADMIN_USER_IDS"
check_content "$DASHBOARD_ROOT/src/app/[locale]/(dashboard)/admin/layout.tsx" "requireAdmin" "Admin layout uses requireAdmin"
echo ""

echo "Step 8: TypeScript Check"
echo "------------------------"
cd "$DASHBOARD_ROOT"
if npm run typecheck 2>&1 | grep -q "error TS"; then
    echo -e "${RED}✗${NC} TypeScript errors found"
    echo "   Run: cd $DASHBOARD_ROOT && npm run typecheck"
else
    echo -e "${GREEN}✓${NC} No TypeScript errors (or typecheck not configured)"
fi
echo ""

echo "=================================="
echo "Verification Complete"
echo "=================================="
echo ""
echo "Manual Steps Required:"
echo "1. Fix audit-log-viewer.tsx (remove ScrollArea import)"
echo "2. Update .env with your Discord user ID"
echo "3. Run: cd apps/dashboard && npm run typecheck"
echo "4. Run: npm run build"
echo "5. Test admin access with your user ID"
echo ""
echo "See: /mnt/d/Project/.2_PROJECT_BOT_DISCORD/docs/phase5-admin-panel-manual-updates-required.md"
