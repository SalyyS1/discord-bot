# Manual File Updates Required for Phase 5

## Files Requiring Manual Updates

### 1. Fix AuditLogViewer Component
**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/components/admin/audit-log-viewer.tsx`

**Change Required:** Remove ScrollArea dependency (component doesn't exist)

**Find:**
```tsx
import { ScrollArea } from '@/components/ui/scroll-area';
```

**Replace with:** (Remove this line)

**Find:**
```tsx
<ScrollArea className="h-[400px] pr-4">
  <div className="space-y-3">
    {logs.map((log) => (
      ...
    ))}
  </div>
</ScrollArea>
```

**Replace with:**
```tsx
<div className="h-[400px] overflow-y-auto pr-4 custom-scrollbar">
  <div className="space-y-3">
    {logs.map((log) => (
      ...
    ))}
  </div>
</div>
```

---

### 2. Update .env.example
**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/.env.example`

**Add after the line:** `BOT_ADMIN_IDS=`

```bash
# Dashboard admin user IDs (comma-separated Discord user IDs, for admin panel access)
ADMIN_USER_IDS=
```

---

### 3. Update .env (Production/Development)
**File:** `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/.env`

**Add:**
```bash
ADMIN_USER_IDS=your_discord_user_id_1,your_discord_user_id_2
```

**Example:**
```bash
ADMIN_USER_IDS=123456789012345678,987654321098765432
```

**To get your Discord User ID:**
1. Enable Developer Mode in Discord (Settings → Advanced → Developer Mode)
2. Right-click your username
3. Click "Copy User ID"

---

## Files to Verify Content

### Verify these files have correct implementation:

1. **Admin Layout** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/layout.tsx`
   - Should import `requireAdmin` from `@/lib/admin/admin-guard`
   - Should call `await requireAdmin()` before rendering
   - Should show Shield icon and "Admin Panel" header

2. **Admin Overview** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/page.tsx`
   - Should render `<AdminStatsGrid />`
   - Should render `<SystemHealthCard />` and `<AuditLogViewer />`

3. **Tenants Page** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/tenants/page.tsx`
   - Should render `<TenantTable />`
   - Should have "Create Tenant" button

4. **Tenant Detail** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/tenants/[id]/page.tsx`
   - Should fetch tenant with users, guilds, subscriptions
   - Should show tenant info, stats, users list, guilds grid

5. **Users Page** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/users/page.tsx`
   - Should render `<UserTable />`

6. **Guilds Page** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/guilds/page.tsx`
   - Should render `<GuildTable />`

7. **System Page** - `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/app/[locale]/(dashboard)/admin/system/page.tsx`
   - Should show process metrics (uptime, memory)
   - Should render `<SystemHealthCard />`
   - Should render `<AuditLogViewer limit={20} />`

---

## Testing Checklist

After manual updates:

### 1. Type Check
```bash
cd /mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard
npm run typecheck
```

### 2. Build Check
```bash
npm run build
```

### 3. Access Control Test
- [ ] Non-admin user cannot access /admin routes (redirects to /dashboard)
- [ ] Admin user can access all /admin routes
- [ ] Admin section appears in sidebar only for admins

### 4. Functionality Test
- [ ] /admin shows stats grid with correct counts
- [ ] /admin/tenants shows tenant table with search
- [ ] /admin/tenants/[id] shows tenant details
- [ ] /admin/users shows user table with search
- [ ] /admin/users/[id] shows user details
- [ ] /admin/guilds shows guild table
- [ ] /admin/system shows health metrics
- [ ] API endpoints return data (check Network tab)

### 5. API Endpoints Test
```bash
# Test stats endpoint (requires admin auth)
curl -X GET http://localhost:3000/api/admin/stats

# Test tenants endpoint
curl -X GET http://localhost:3000/api/admin/tenants?page=1&limit=10

# Test health endpoint
curl -X GET http://localhost:3000/api/admin/health
```

---

## Known Issues to Fix Later

1. **Session Revocation** - "Revoke" button on user detail page has no implementation
2. **Tenant Suspend** - "Suspend" button on tenant detail page has no implementation
3. **Audit Logging** - Need middleware to log admin actions
4. **Pagination** - Client-side only, consider server-side for large datasets
5. **Real-time Updates** - Consider WebSocket for live stats

---

## Success Criteria Checklist

- [x] Admin guard implemented with ADMIN_USER_IDS check
- [x] Only admins can access /admin routes
- [x] Tenant list shows all tenants with search
- [x] User list shows all users with search
- [x] Tenant detail shows users, guilds, subscription
- [x] User detail shows accounts, sessions, memberships
- [x] System health shows real-time status
- [ ] Can suspend/activate tenants (needs implementation)
- [ ] All admin actions are audited (needs middleware)
- [x] Glassmorphism styling matches Phase 2
- [x] Responsive design works on mobile
- [ ] Type check passes (pending manual fix)
- [ ] Build succeeds (pending manual fix)

---

## Database Schema Verification

Ensure Prisma schema has these models/fields:

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  action    String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  metadata  Json?
  ipAddress String?
  createdAt DateTime @default(now())
}
```

If AuditLog model missing, add it and run:
```bash
npx prisma migrate dev --name add-audit-log
```

---

## Next Implementation Tasks

1. **Audit Logging Middleware**
   - Create `/mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard/src/lib/admin/audit-logger.ts`
   - Track admin actions (create, update, delete, suspend)
   - Extract IP address from request headers

2. **Tenant Actions**
   - Implement suspend tenant API endpoint
   - Implement activate tenant API endpoint
   - Add confirmation modals

3. **Session Management**
   - Implement revoke session API endpoint
   - Add bulk session revocation

4. **Export Functionality**
   - Export tenant data as JSON/CSV
   - Export user data as JSON/CSV
   - Export audit logs as CSV

5. **Advanced Filters**
   - Filter tenants by status (active/suspended)
   - Filter users by tenant
   - Date range filter for audit logs
