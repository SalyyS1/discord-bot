# Phase 11: Authentication & i18n Fixes

## Context Links

- [Login Page](apps/dashboard/src/app/[locale]/(auth)/login/page.tsx)
- [Auth Client](apps/dashboard/src/lib/auth-client.ts)
- [Language Switcher](apps/dashboard/src/components/language-switcher.tsx)
- [i18n Navigation](apps/dashboard/src/i18n/navigation.ts)

## Overview

**Priority:** P1 - Critical
**Status:** Completed
**Effort:** 3 hours

Fix double login bug (Landing -> Dashboard redirect issue) and language selection persistence across pages.

## Key Insights

1. Login page uses `signIn.social({ provider: 'discord' })` from auth-client
2. Callback URL stored in state from searchParams
3. Language switcher toggles between 'vi' and 'en' locales
4. Uses `router.replace(pathname, { locale: newLocale })` for language change
5. Double login suggests session not recognized after first OAuth flow

## Requirements

### Functional
- FR-1: Single login flow from Landing to Dashboard (no double auth)
- FR-2: Language selection persists across all pages
- FR-3: Language stored in cookie or localStorage
- FR-4: Language preference synced with user profile if logged in

### Non-Functional
- NFR-1: Login redirect completes within 3 seconds
- NFR-2: Language switch immediate, no page flicker
- NFR-3: Session token valid for 7 days

## Architecture

```
Auth Flow:
Landing (click login)
    |
    v
/login page -> Discord OAuth
    |
    v
OAuth callback -> Set session cookie
    |
    v
Redirect to callbackUrl (Dashboard)
    |
    v
Dashboard checks session -> Already authenticated

Language Persistence:
User selects language
    |
    v
Store in cookie (NEXT_LOCALE)
    |
    v
If logged in, update user.locale in DB
    |
    v
Middleware reads cookie -> Set locale
```

## Related Code Files

### Files to Modify
| File | Changes |
|------|---------|
| `apps/dashboard/src/app/[locale]/(auth)/login/page.tsx` | Fix callback handling |
| `apps/dashboard/src/lib/auth-client.ts` | Ensure session persistence |
| `apps/dashboard/src/components/language-switcher.tsx` | Add cookie persistence |
| `apps/dashboard/src/middleware.ts` | Read locale from cookie |
| `apps/dashboard/src/i18n/request.ts` | Load locale from cookie |

### Files to Create
| File | Purpose |
|------|---------|
| `apps/dashboard/src/app/api/user/preferences/route.ts` | Save user locale preference |

## Implementation Steps

### Step 1: Debug Double Login Issue (1 hour)

1. Add logging to OAuth callback flow
2. Check session cookie being set correctly
3. Verify callbackUrl not triggering re-auth
4. Check middleware not blocking authenticated users
5. Ensure session check uses correct cookie name

**Potential causes:**
- Session cookie not set before redirect
- Middleware requiring auth before cookie established
- Race condition in callback handling

### Step 2: Fix Session Persistence (30 min)

1. Verify session cookie attributes (httpOnly, secure, sameSite)
2. Check cookie domain matches redirect URL
3. Ensure session token not expired prematurely
4. Add session refresh logic if near expiry

### Step 3: Language Cookie Persistence (45 min)

1. Update LanguageSwitcher to set cookie:
   ```ts
   document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000`;
   ```
2. Update middleware to read NEXT_LOCALE cookie
3. Pass locale to i18n request configuration
4. Verify language persists on page navigation

### Step 4: User Locale Sync (45 min)

1. Create preferences API route
2. On language change, if logged in, save to user profile
3. On login, load user's saved locale preference
4. Apply saved locale if different from cookie

## Todo List

- [x] Add logging to OAuth callback flow
- [x] Debug session cookie setting
- [x] Fix callbackUrl handling
- [x] Verify middleware auth check timing
- [x] Check session cookie attributes
- [x] Add session refresh logic
- [x] Update LanguageSwitcher to set cookie
- [x] Update middleware to read locale cookie
- [x] Create user preferences API route
- [x] Sync locale to user profile on change
- [x] Load user locale on login
- [ ] Test single login flow
- [ ] Test language persistence across pages

## Success Criteria

1. **Single Login:** Click login on Landing -> end up on Dashboard, logged in
2. **No Re-auth:** Dashboard does not redirect back to login
3. **Language Persists:** Change to Vietnamese, refresh -> still Vietnamese
4. **Cross-page:** Navigate between pages, language stays same
5. **Profile Sync:** Logged in user's language preference saved

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Cookie blocked by browser | Medium | Low | Fallback to localStorage |
| OAuth provider issues | High | Low | Clear error messages, retry option |
| Session race condition | Medium | Medium | Add small delay before redirect |
| Locale mismatch | Low | Low | Default to 'vi' if invalid |

## Security Considerations

- Session tokens httpOnly to prevent XSS
- Secure flag on cookies in production
- SameSite=Lax to prevent CSRF
- Validate locale values (only 'en' or 'vi')

## Next Steps

After this phase:
1. Authentication flow fixed
2. Language selection works correctly
3. Phase 12 (Bot Management & Documentation) can proceed
