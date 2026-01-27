# Research Report: Next.js 15 App Router Best Practices for Discord Bot Dashboards

**Date:** 2026-01-27  
**Scope:** Better-Auth, TanStack Query, next-intl, Stripe, Glass-morphism UI

---

## 1. Better-Auth + Discord OAuth Integration

### Setup Pattern

```ts
// lib/auth.ts
import { betterAuth } from 'better-auth';

export const auth = betterAuth({
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      permissions: 2048 | 16384, // Bot scopes: Send Messages + Embed Links
    },
  },
  database: {
    /* Drizzle/Prisma adapter */
  },
});

// app/api/auth/[...all]/route.ts
import { toNextJsHandler } from 'better-auth/next-js';
export const { POST, GET } = toNextJsHandler(auth);
```

### Client Usage

```ts
// lib/auth-client.ts
import { createAuthClient } from 'better-auth/client';
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
});

// Sign in
await authClient.signIn.social({ provider: 'discord' });
```

### Security Considerations

- Redirect URL: `{baseURL}/api/auth/callback/discord`
- Use `bot` scope only when adding bots to servers (not just user auth)
- Store tokens in HttpOnly cookies (Better-Auth default)
- Enable rate limiting plugin for production

---

## 2. Server vs Client Components for Real-Time Data

### Decision Matrix

| Use Case             | Component Type   | Rationale                        |
| -------------------- | ---------------- | -------------------------------- |
| Initial guild list   | Server Component | SEO, fast initial load           |
| Guild settings form  | Client Component | User interactions                |
| Live bot status      | Client Component | WebSocket/polling needed         |
| User profile display | Server Component | Static after auth                |
| Command statistics   | Hybrid           | Server prefetch + client refresh |

### Pattern: Server Prefetch + Client Hydration

```tsx
// app/dashboard/page.tsx (Server Component)
export default async function DashboardPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['guilds'],
    queryFn: getGuilds,
  });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GuildList /> {/* Client Component */}
    </HydrationBoundary>
  );
}
```

**Performance tip**: Avoid `fetchQuery` in Server Components if rendering result directly - causes ownership conflicts during revalidation.

---

## 3. TanStack Query for API State Management

### App Router Setup

```tsx
// app/providers.tsx
'use client';
import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 }, // Prevent immediate refetch on hydration
      dehydrate: {
        shouldDehydrateQuery: (q) => defaultShouldDehydrateQuery(q) || q.state.status === 'pending',
      },
    },
  });
}

let browserClient: QueryClient | undefined;
export function getQueryClient() {
  if (isServer) return makeQueryClient();
  if (!browserClient) browserClient = makeQueryClient();
  return browserClient;
}
```

### Streaming Pattern (v5.40+)

```tsx
// app/guilds/page.tsx - No await needed!
export default function GuildsPage() {
  const queryClient = getQueryClient();
  queryClient.prefetchQuery({ queryKey: ['guilds'], queryFn: getGuilds });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<GuildSkeleton />}>
        <Guilds />
      </Suspense>
    </HydrationBoundary>
  );
}

// Client uses useSuspenseQuery for streaming
const { data } = useSuspenseQuery({ queryKey: ['guilds'], queryFn: getGuilds });
```

---

## 4. Internationalization (next-intl)

### File Structure

```
src/
  i18n/
    request.ts        # Server-side locale config
  messages/
    en.json
    ja.json
    vi.json
  app/
    [locale]/         # Optional: locale-based routing
      layout.tsx
      page.tsx
```

### Server Setup

```ts
// i18n/request.ts
import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  const locale = (await cookies()).get('locale')?.value || 'en';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
```

### Usage Patterns

```tsx
// Server Component
import { getTranslations } from 'next-intl/server';
const t = await getTranslations('Dashboard');
<h1>{t('title')}</h1>;

// Client Component
import { useTranslations } from 'next-intl';
const t = useTranslations('Dashboard');
```

**Tip**: Wrap children in `<NextIntlClientProvider>` in root layout for client access.

---

## 5. Stripe Subscription Integration

### Subscription Flow Architecture

```
User clicks "Subscribe"
  -> Create Checkout Session (API Route)
  -> Redirect to Stripe Checkout
  -> Webhook: checkout.session.completed
  -> Create/update subscription in DB
  -> Provision features via entitlements
```

### Key Implementation Points

```ts
// app/api/checkout/route.ts
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId, userId } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/dashboard?success=true`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    metadata: { userId },
  });
  return Response.json({ url: session.url });
}
```

### Subscription Status Handling

| Status     | Action                                  |
| ---------- | --------------------------------------- |
| `active`   | Full feature access                     |
| `trialing` | Full access during trial                |
| `past_due` | Show warning banner, allow grace period |
| `canceled` | Revoke access at period end             |
| `unpaid`   | Immediate access revocation             |

**Security**: Always verify webhook signatures; use `stripe.webhooks.constructEvent()`.

---

## 6. Glass-morphism UI Patterns

### Core CSS Properties

```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}
```

### Tailwind CSS Implementation

```tsx
// components/ui/glass-card.tsx
export function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
      bg-white/5 dark:bg-black/20
      backdrop-blur-xl
      border border-white/10
      rounded-2xl
      shadow-xl shadow-black/20
      p-6
    "
    >
      {children}
    </div>
  );
}
```

### Discord Bot Dashboard Best Practices

1. **Dark theme primary**: Discord users expect dark mode
2. **Accent colors**: Use Discord's blurple (#5865F2) for primary actions
3. **Frosted navigation**: Glass sidebar with 60-80% opacity
4. **Depth hierarchy**: Use blur intensity to create layers (8px bg, 16px modals)
5. **Subtle borders**: 1px white/10 for card separation

### Performance Optimization

- Avoid `backdrop-filter` on mobile (CPU-intensive); use solid fallbacks
- Limit blur to top-level containers, not repeated list items
- Use `will-change: backdrop-filter` sparingly on animated elements

---

## Performance Optimization Summary

| Technique          | Impact             | Implementation                           |
| ------------------ | ------------------ | ---------------------------------------- |
| Streaming SSR      | -40% TTFB          | `prefetchQuery` without await + Suspense |
| staleTime: 60s     | Fewer refetches    | QueryClient defaultOptions               |
| Server Components  | -30% JS bundle     | Use for static content                   |
| Image optimization | -60% image size    | Next.js `<Image>` component              |
| Route prefetching  | Instant navigation | `<Link prefetch>` (default on)           |

---

## Security Checklist

- [ ] CSRF protection: Better-Auth handles via double-submit cookies
- [ ] XSS: React's default escaping + CSP headers
- [ ] Stripe webhooks: Signature verification required
- [ ] Discord tokens: Never expose to client; server-only
- [ ] Rate limiting: Better-Auth plugin + API route middleware
- [ ] Session management: HttpOnly, Secure, SameSite=Lax cookies

---

## Citations

1. Better-Auth Discord: https://www.better-auth.com/docs/authentication/discord
2. TanStack Query SSR: https://tanstack.com/query/latest/docs/framework/react/guides/ssr
3. TanStack Advanced SSR: https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
4. next-intl App Router: https://next-intl.dev/docs/getting-started/app-router
5. Stripe Subscriptions: https://docs.stripe.com/billing/subscriptions/overview

---

## Unresolved Questions

1. Optimal staleTime for bot status polling? (Currently 60s may be too long for real-time feel)
2. Better-Auth session refresh strategy during long dashboard sessions?
3. Stripe Customer Portal vs custom UI for subscription management?
