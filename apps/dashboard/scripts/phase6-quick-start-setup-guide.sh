#!/bin/bash
# Quick Start Guide - Phase 6 Implementation
# Run this to get started immediately

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Phase 6 - User Profile & Account Separation              ║"
echo "║  Quick Start Guide                                         ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

DASHBOARD_DIR="/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard"

# Check if we're in the right directory
if [ ! -d "$DASHBOARD_DIR" ]; then
  echo "❌ Error: Dashboard directory not found at $DASHBOARD_DIR"
  exit 1
fi

cd "$DASHBOARD_DIR"

echo "📍 Working directory: $(pwd)"
echo ""

# Step 1: Show created files
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 1: Verifying created files..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

FILES_CREATED=0
FILES_MISSING=0

check_file() {
  if [ -f "$1" ]; then
    echo "  ✅ $1"
    ((FILES_CREATED++))
  else
    echo "  ❌ $1 (MISSING)"
    ((FILES_MISSING++))
  fi
}

echo "Library Files:"
check_file "src/lib/auth/discord-api-client.ts"
check_file "src/lib/auth/guild-access-validator.ts"
check_file "src/lib/auth/auth-helpers.ts"
check_file "src/middleware/guild-access-protection.ts"

echo ""
echo "API Routes:"
check_file "src/app/api/user/guilds/route.ts"
check_file "src/app/api/user/sessions/route.ts"
check_file "src/app/api/user/data/route.ts"
check_file "src/app/api/user/notification-preferences/route.ts"

echo ""
echo "Profile Pages:"
check_file "src/app/[locale]/(dashboard)/profile/layout.tsx"
check_file "src/app/[locale]/(dashboard)/profile/page.tsx"
check_file "src/app/[locale]/(dashboard)/profile/settings/page.tsx"
check_file "src/app/[locale]/(dashboard)/profile/sessions/page.tsx"
check_file "src/app/[locale]/(dashboard)/profile/data/page.tsx"

echo ""
echo "Components:"
check_file "src/components/profile/user-profile-header.tsx"
check_file "src/components/profile/connected-accounts-card.tsx"
check_file "src/components/profile/active-sessions-list.tsx"
check_file "src/components/profile/user-notification-settings.tsx"
check_file "src/components/profile/account-danger-zone.tsx"
check_file "src/components/navigation/guild-server-selector.tsx"

echo ""
echo "📊 Files Created: $FILES_CREATED"
echo "📊 Files Missing: $FILES_MISSING"
echo ""

# Step 2: Fix imports
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 2: Fixing import statements..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "Updating imports from '@/lib/db' to '@repo/database'..."
find src/lib/auth src/app/api/user src/app/\[locale\]/\(dashboard\)/profile \
  -type f \( -name "*.ts" -o -name "*.tsx" \) \
  -exec sed -i "s|from '@/lib/db'|from '@repo/database'|g" {} + 2>/dev/null || true

echo "✅ Import statements updated"
echo ""

# Step 3: Check UI components
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 3: Checking UI components..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MISSING_UI=()
for component in alert-dialog badge button card command input label popover switch; do
  if [ ! -f "src/components/ui/${component}.tsx" ]; then
    MISSING_UI+=("$component")
  fi
done

if [ ${#MISSING_UI[@]} -eq 0 ]; then
  echo "✅ All required UI components exist"
else
  echo "⚠️  Missing UI components: ${MISSING_UI[*]}"
  echo ""
  echo "Install them with:"
  echo "  npx shadcn-ui@latest add ${MISSING_UI[*]}"
fi
echo ""

# Step 4: Type check
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Step 4: Running type check..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if command -v npm &> /dev/null; then
  if npm run typecheck 2>&1; then
    echo ""
    echo "✅ Type check PASSED"
  else
    echo ""
    echo "⚠️  Type check FAILED - review errors above"
    echo ""
    echo "Common fixes:"
    echo "  1. Install missing UI components"
    echo "  2. Check import paths"
    echo "  3. Verify @repo/database exports prisma"
  fi
else
  echo "⚠️  npm not found - skipping type check"
fi
echo ""

# Step 5: Show next steps
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Install missing UI components (if any):"
echo "   npx shadcn-ui@latest add alert-dialog switch"
echo ""
echo "2. Run tests:"
echo "   npm test -- phase6"
echo ""
echo "3. Start dev server:"
echo "   npm run dev"
echo ""
echo "4. Test API endpoints:"
echo "   curl -X GET http://localhost:3000/api/user/guilds"
echo ""
echo "5. Manual testing checklist:"
echo "   - Navigate to /profile"
echo "   - Test guild access validation"
echo "   - Test session management"
echo "   - Test data export/deletion"
echo ""
echo "📚 Documentation:"
echo "   - Complete Guide: docs/phase6-complete-implementation-guide.md"
echo "   - Verification: docs/phase6-verification-checklist.md"
echo ""
echo "🎉 Phase 6 implementation is ready for testing!"
echo ""
