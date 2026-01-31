# Phase 6 Implementation - Manual Verification Checklist

## Pre-Flight Checks

### 1. Run Setup Script
```bash
cd /mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard
chmod +x scripts/phase6-post-implementation-setup.sh
./scripts/phase6-post-implementation-setup.sh
```

### 2. Install Missing UI Components (if needed)
```bash
cd /mnt/d/Project/.2_PROJECT_BOT_DISCORD/apps/dashboard
npx shadcn-ui@latest add alert-dialog
npx shadcn-ui@latest add switch
```

### 3. Type Check
```bash
npm run typecheck
```

## Integration Tasks

### Update Existing Files

#### A. Update server-selector.tsx (if exists)
**Option 1**: Replace completely
```bash
mv src/components/server-selector.tsx src/components/server-selector.tsx.backup
mv src/components/navigation/guild-server-selector.tsx src/components/server-selector.tsx
```

**Option 2**: Update endpoint only
Replace fetch call in existing file:
```typescript
// Change from:
const response = await fetch('/api/guilds');

// To:
const response = await fetch('/api/user/guilds');
```

#### B. Export from auth/index.ts (if exists)
Add to `src/lib/auth/index.ts`:
```typescript
export {
  getUserAccessibleGuilds,
  validateUserGuildAccess
} from './guild-access-validator';

export {
  getSessionWithGuildAccess
} from './auth-helpers';
```

#### C. Update existing guild routes
Add middleware to guild-specific routes in `src/app/api/guilds/[guildId]/**/route.ts`:
```typescript
import { guildAccessMiddleware } from '@/middleware/guild-access-protection';

export async function GET(request: Request, { params }: { params: { guildId: string } }) {
  const accessError = await guildAccessMiddleware(request, params.guildId);
  if (accessError) return accessError;

  // ... existing code
}
```

## Functional Testing

### API Endpoints

#### Test Guild Access
```bash
# Get accessible guilds
curl -X GET http://localhost:3000/api/user/guilds \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"

# Expected: List of guilds where user has MANAGE_GUILD and bot is present
```

#### Test Sessions Management
```bash
# List sessions
curl -X GET http://localhost:3000/api/user/sessions \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"

# Revoke session
curl -X DELETE "http://localhost:3000/api/user/sessions?sessionId=SESSION_ID" \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"
```

#### Test Data Export
```bash
# Export user data
curl -X GET http://localhost:3000/api/user/data \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -o user-data.json
```

#### Test Account Deletion
```bash
# Delete account
curl -X DELETE http://localhost:3000/api/user/data \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"confirmation":"DELETE_MY_ACCOUNT"}'
```

#### Test Preferences
```bash
# Get preferences
curl -X GET http://localhost:3000/api/user/notification-preferences \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN"

# Update preferences
curl -X PUT http://localhost:3000/api/user/notification-preferences \
  -H "Cookie: better-auth.session_token=YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notifications":{"emailNotifications":true,"discordDMs":false}}'
```

### UI Testing

#### Profile Pages
- [ ] Navigate to `/profile` - shows overview
- [ ] Navigate to `/profile/settings` - shows notification settings
- [ ] Navigate to `/profile/sessions` - shows active sessions
- [ ] Navigate to `/profile/data` - shows GDPR options
- [ ] Tab navigation works correctly
- [ ] Profile header displays correct user info
- [ ] Connected accounts card shows Discord account

#### Server Selector
- [ ] Only shows guilds where user has MANAGE_GUILD
- [ ] Only shows guilds where bot is present
- [ ] Clicking guild navigates to `/dashboard/{guildId}`
- [ ] Shows guild icons correctly
- [ ] Search functionality works

#### Sessions Management
- [ ] Lists all active sessions
- [ ] Shows device type (desktop/mobile)
- [ ] Shows IP address and last active
- [ ] Current session marked correctly
- [ ] Can revoke non-current sessions
- [ ] Cannot revoke current session (button disabled)
- [ ] Page refreshes after revoke

#### Notification Settings
- [ ] All toggles work
- [ ] Settings save successfully
- [ ] Success message displays
- [ ] Settings persist after page reload

#### Danger Zone
- [ ] Export data downloads JSON file
- [ ] JSON contains all user data
- [ ] Delete account requires confirmation
- [ ] Confirmation must match exactly
- [ ] Account deletion redirects to logout

### Security Testing

#### Guild Access Validation
Test with user who:
- [ ] Has MANAGE_GUILD permission → can access
- [ ] Is guild owner → can access
- [ ] Has ADMINISTRATOR permission → can access
- [ ] Has no permissions → cannot access
- [ ] Guild has no bot → cannot access
- [ ] Not member of guild → cannot access

#### Session Security
- [ ] Cannot revoke other user's sessions
- [ ] Cannot access other user's data
- [ ] Session expires correctly
- [ ] Expired session requires re-login

#### Data Privacy
- [ ] Exported data contains no access tokens
- [ ] Exported data contains no sensitive credentials
- [ ] User can only export own data
- [ ] User can only delete own account
- [ ] Account deletion cascades correctly

## Performance Testing

### API Response Times
- [ ] `/api/user/guilds` < 1s (with caching)
- [ ] `/api/user/sessions` < 500ms
- [ ] `/api/user/data` < 2s

### Caching
- [ ] Guild data cached for 5 minutes
- [ ] Discord API calls minimized
- [ ] No N+1 query issues

## Database Verification

### Check Data Structure
```sql
-- Verify sessions are created
SELECT id, "userId", "expiresAt", "ipAddress", "userAgent"
FROM "Session"
WHERE "userId" = 'USER_ID';

-- Verify accounts linked
SELECT id, "userId", "providerId", "accountId"
FROM "Account"
WHERE "userId" = 'USER_ID';

-- Verify guilds in database
SELECT id, name, icon
FROM "Guild"
LIMIT 10;
```

### Check Cascade Deletion
```sql
-- Before deletion
SELECT COUNT(*) FROM "User" WHERE id = 'USER_ID';
SELECT COUNT(*) FROM "Account" WHERE "userId" = 'USER_ID';
SELECT COUNT(*) FROM "Session" WHERE "userId" = 'USER_ID';

-- After deletion (all should be 0)
-- Verify cascade works correctly
```

## Edge Cases

### Guild Access
- [ ] User joins new guild → appears in selector after cache expires
- [ ] User leaves guild → disappears from selector
- [ ] Bot leaves guild → guild disappears from accessible list
- [ ] User permission downgraded → loses access immediately
- [ ] Access token expired → refreshes automatically

### Sessions
- [ ] Multiple sessions from same device
- [ ] Session from unknown user agent
- [ ] Very old sessions (> 30 days)
- [ ] Revoking last session except current

### Data Operations
- [ ] Export very large user data (100+ sessions)
- [ ] Delete account with many linked guilds
- [ ] Export when no data exists
- [ ] Multiple rapid export requests

## Known Issues / Limitations

1. **Preferences Storage**: Currently preferences are not persisted to database (requires schema migration)
2. **Cache Strategy**: No Redis/memory cache implemented yet (5-min browser cache only)
3. **Rate Limiting**: No rate limiting on API endpoints
4. **Audit Logging**: No audit trail for sensitive operations
5. **Email Notifications**: Email sending not implemented (UI only)

## Recommended Enhancements

### Short-term
1. Add Redis cache for guild access results
2. Implement rate limiting on sensitive endpoints
3. Add audit logging for account deletion
4. Add email confirmation for account deletion

### Long-term
1. Add preferences table to database schema
2. Implement notification delivery system
3. Add 2FA support
4. Add session device fingerprinting
5. Add IP-based anomaly detection

## Success Criteria

All checkboxes above must be checked ✓ before considering Phase 6 complete.

### Critical Path
- [x] Type check passes
- [ ] All API endpoints functional
- [ ] Guild access validation working
- [ ] Profile pages render correctly
- [ ] Session management working
- [ ] GDPR compliance verified
- [ ] No data leakage between users
- [ ] Security testing passed

## Sign-off

- [ ] Developer verified: All tests pass
- [ ] Code review completed
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Ready for production deployment
