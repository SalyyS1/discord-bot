#!/bin/bash
# Phase 6 Post-Implementation Setup Script
# Fixes imports and verifies installation

set -e

DASHBOARD_DIR="/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard"

echo "========================================="
echo "Phase 6 - User Profile Setup Script"
echo "========================================="
echo ""

cd "$DASHBOARD_DIR"

# Step 1: Fix import statements
echo "Step 1: Fixing import statements..."
find src/lib/auth src/app/api/user src/app/\[locale\]/\(dashboard\)/profile -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i "s|from '@/lib/db'|from '@repo/database'|g" {} +
echo "✓ Import statements updated"
echo ""

# Step 2: Check if required UI components exist
echo "Step 2: Checking shadcn/ui components..."
COMPONENTS_DIR="src/components/ui"
REQUIRED_COMPONENTS=(
  "alert-dialog.tsx"
  "badge.tsx"
  "button.tsx"
  "card.tsx"
  "command.tsx"
  "input.tsx"
  "label.tsx"
  "popover.tsx"
  "switch.tsx"
)

MISSING_COMPONENTS=()
for component in "${REQUIRED_COMPONENTS[@]}"; do
  if [ ! -f "$COMPONENTS_DIR/$component" ]; then
    MISSING_COMPONENTS+=("$component")
  fi
done

if [ ${#MISSING_COMPONENTS[@]} -eq 0 ]; then
  echo "✓ All required UI components exist"
else
  echo "⚠ Missing UI components:"
  for component in "${MISSING_COMPONENTS[@]}"; do
    echo "  - $component"
  done
  echo ""
  echo "Install them with:"
  echo "npx shadcn-ui@latest add alert-dialog switch"
fi
echo ""

# Step 3: Verify API routes exist
echo "Step 3: Verifying API routes..."
API_ROUTES=(
  "src/app/api/user/guilds/route.ts"
  "src/app/api/user/sessions/route.ts"
  "src/app/api/user/data/route.ts"
  "src/app/api/user/notification-preferences/route.ts"
)

for route in "${API_ROUTES[@]}"; do
  if [ -f "$route" ]; then
    echo "✓ $route"
  else
    echo "✗ $route"
  fi
done
echo ""

# Step 4: Verify profile pages exist
echo "Step 4: Verifying profile pages..."
PROFILE_PAGES=(
  "src/app/[locale]/(dashboard)/profile/layout.tsx"
  "src/app/[locale]/(dashboard)/profile/page.tsx"
  "src/app/[locale]/(dashboard)/profile/settings/page.tsx"
  "src/app/[locale]/(dashboard)/profile/sessions/page.tsx"
  "src/app/[locale]/(dashboard)/profile/data/page.tsx"
)

for page in "${PROFILE_PAGES[@]}"; do
  if [ -f "$page" ]; then
    echo "✓ $page"
  else
    echo "✗ $page"
  fi
done
echo ""

# Step 5: Verify components exist
echo "Step 5: Verifying profile components..."
COMPONENTS=(
  "src/components/profile/user-profile-header.tsx"
  "src/components/profile/connected-accounts-card.tsx"
  "src/components/profile/active-sessions-list.tsx"
  "src/components/profile/user-notification-settings.tsx"
  "src/components/profile/account-danger-zone.tsx"
  "src/components/navigation/guild-server-selector.tsx"
)

for component in "${COMPONENTS[@]}"; do
  if [ -f "$component" ]; then
    echo "✓ $component"
  else
    echo "✗ $component"
  fi
done
echo ""

# Step 6: Verify library files exist
echo "Step 6: Verifying library files..."
LIB_FILES=(
  "src/lib/auth/discord-api-client.ts"
  "src/lib/auth/guild-access-validator.ts"
  "src/lib/auth/auth-helpers.ts"
  "src/middleware/guild-access-protection.ts"
)

for lib in "${LIB_FILES[@]}"; do
  if [ -f "$lib" ]; then
    echo "✓ $lib"
  else
    echo "✗ $lib"
  fi
done
echo ""

# Step 7: Type checking
echo "Step 7: Running type check..."
if npm run typecheck; then
  echo "✓ Type check passed"
else
  echo "✗ Type check failed - review errors above"
  exit 1
fi
echo ""

# Step 8: List created files
echo "Step 8: Summary of created files..."
echo "Total files created: $(find src/lib/auth src/app/api/user src/app/\[locale\]/\(dashboard\)/profile src/components/profile src/components/navigation src/middleware -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)"
echo ""

echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Review type check results"
echo "2. Install missing UI components if any"
echo "3. Test API endpoints"
echo "4. Test profile pages UI"
echo "5. Verify guild access validation"
echo ""
