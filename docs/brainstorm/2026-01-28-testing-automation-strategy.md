# Testing & Automation Strategy Brainstorm

**Date:** 2026-01-28  
**Status:** Approved  
**Stakeholders:** Development Team

---

## Problem Statement

The Discord Bot Dashboard monorepo currently has **critical gaps** in testing and automation:

- Only 2 unit test files exist (in `packages/security`)
- No E2E, component, visual, accessibility, or performance tests
- CI/CD pipeline runs lint/typecheck/build but **no tests**
- No structured debugging workflow for UI issues
- No performance monitoring or budgets

This creates significant risk for a production application with:

- 90+ API routes
- 68+ UI components
- Payment processing (Stripe/SePay)
- Multi-tenant architecture
- i18n support (en/vi)

---

## Current Stack Analysis

| Component      | Technology                                       |
| -------------- | ------------------------------------------------ |
| Monorepo       | Turborepo + pnpm                                 |
| Dashboard      | Next.js 15 (App Router), React 19, TypeScript    |
| UI             | Tailwind CSS 4, shadcn/ui (Radix), Framer Motion |
| Auth           | better-auth + Discord OAuth                      |
| Data           | TanStack Query, Prisma, Redis                    |
| Payments       | Stripe + SePay                                   |
| i18n           | next-intl (en, vi)                               |
| CI/CD          | GitHub Actions (lint → build → deploy)           |
| Existing Tests | Vitest (2 files in security package)             |

---

## Evaluated Approaches

### 1. Testing Strategy

#### Option A: Playwright-First (SELECTED)

Single tool for E2E, visual regression, and component testing.

**Pros:**

- Unified tooling reduces complexity
- Built-in browser automation
- Excellent Next.js integration
- Matches existing chrome-devtools skill

**Cons:**

- Slower than Vitest for pure unit tests
- Requires running dev server

#### Option B: Vitest + Playwright Split

Separate tools for unit/component vs E2E tests.

**Rejected:** Added complexity of maintaining two test runners.

#### Option C: Minimal Happy Path

Only test 5-10 critical journeys.

**Rejected:** Insufficient coverage for payment/auth flows.

### 2. Debugging Workflow

#### Selected Approach: Structured Capture + Production Monitoring

1. **Local debugging script** capturing:
   - Screenshots
   - Console errors
   - DOM state (ARIA snapshot)
   - Performance metrics

2. **Production monitoring** via:
   - PostHog (already integrated)
   - Error boundary reporting
   - Performance tracking

### 3. Performance Optimization

#### Target Metrics (Core Web Vitals)

| Metric | Target | Risk Areas                         |
| ------ | ------ | ---------------------------------- |
| LCP    | <2.5s  | Dashboard charts, guild list       |
| INP    | <200ms | Form interactions, dropdowns       |
| CLS    | <0.1   | Loading skeletons, dynamic content |

#### Optimization Strategy

1. Implement streaming SSR (React 19)
2. Lazy load heavy components (recharts, embed-editor)
3. Prefetch critical data with TanStack Query
4. Set performance budgets in CI

### 4. CI/CD Integration

#### Enhanced Pipeline Structure

```
lint → test:unit → test:component → build → test:e2e → deploy
```

#### New Jobs

- `test:unit` - Vitest for packages
- `test:component` - Vitest + Testing Library for dashboard
- `test:e2e` - Playwright with parallelization
- Artifact upload on failure (screenshots, traces)

---

## Final Recommended Solution

### Phase 1: Foundation (Week 1)

**Goal:** Establish testing infrastructure and 5 critical E2E tests

1. Install Playwright and configure for Next.js
2. Create test utilities (auth helpers, fixtures)
3. Write 5 critical E2E tests:
   - Login flow (Discord OAuth mock)
   - Dashboard navigation
   - Guild settings CRUD
   - Autoresponder creation
   - Error state handling
4. Add `test:e2e` job to CI pipeline
5. Create debugging capture script

### Phase 2: Component Testing (Week 2)

**Goal:** Test UI components in isolation

1. Add Testing Library to dashboard
2. Test critical components:
   - Form components (with validation)
   - Server selector
   - Embed editor
   - Payment checkout
3. Add visual regression tests for key pages
4. Configure screenshot comparison in CI

### Phase 3: Performance & Accessibility (Week 3)

**Goal:** Automated quality gates

1. Add performance budget checks
2. Implement accessibility testing (axe-core)
3. Set up Core Web Vitals monitoring
4. Add performance job to CI
5. Create performance dashboard/alerts

### Phase 4: Maintenance (Ongoing)

**Goal:** Sustainable testing culture

1. Require tests for new features (PR template)
2. Weekly test coverage review
3. Flaky test monitoring and fixes
4. Keep CI time under 10 minutes

---

## Implementation Considerations

### Risks

| Risk               | Mitigation                                 |
| ------------------ | ------------------------------------------ |
| CI time bloat      | Parallel shards, smart test selection      |
| Flaky tests        | Retry logic, proper waits, test isolation  |
| Mock complexity    | Shared fixtures, MSW for API mocking       |
| Maintenance burden | Focus on critical paths, not 100% coverage |

### Dependencies

- Playwright installation (~200MB)
- MSW for API mocking
- axe-playwright for accessibility
- GitHub Actions minutes budget

### Success Metrics

| Metric          | Target             |
| --------------- | ------------------ |
| E2E test count  | 20+ critical flows |
| CI pass rate    | >95%               |
| CI duration     | <10 minutes        |
| Bug escape rate | Reduce by 50%      |
| Core Web Vitals | All green          |

---

## File Structure

```
discord-bot-monorepo/
├── e2e/                           # Playwright E2E tests
│   ├── playwright.config.ts
│   ├── fixtures/
│   │   ├── auth.ts               # Auth helpers
│   │   └── test-data.ts          # Shared test data
│   ├── tests/
│   │   ├── auth.spec.ts
│   │   ├── dashboard.spec.ts
│   │   ├── guilds.spec.ts
│   │   ├── settings.spec.ts
│   │   └── billing.spec.ts
│   └── visual/
│       └── snapshots/
├── apps/dashboard/
│   ├── __tests__/                # Component tests
│   │   ├── components/
│   │   └── setup.ts
│   └── vitest.config.ts
├── packages/*/
│   └── __tests__/                # Unit tests (existing)
├── scripts/
│   └── debug-capture.sh          # Debugging workflow
└── .github/workflows/
    └── deploy.yml                # Enhanced CI
```

---

## Next Steps

1. **Create detailed implementation plan** with task breakdown
2. **Set up Playwright** in the monorepo
3. **Write first E2E test** (login flow)
4. **Enhance CI pipeline** with test jobs
5. **Document testing standards** for team

---

## Appendix: Test Categories

### E2E Tests (Playwright)

| Category     | Tests                                            |
| ------------ | ------------------------------------------------ |
| Auth         | Login, logout, session expiry, permission denied |
| Dashboard    | Navigation, guild switching, responsive layout   |
| Settings     | CRUD operations, validation, sync status         |
| Features     | Autoresponders, tickets, leveling, giveaways     |
| Billing      | Checkout flow, subscription management           |
| Error States | API failures, network issues, auth errors        |

### Component Tests (Vitest + Testing Library)

| Component | Test Focus                                   |
| --------- | -------------------------------------------- |
| Forms     | Validation, submission, error display        |
| Selectors | Channel/role selection, search, multi-select |
| Editors   | Embed editor, message preview                |
| Modals    | Open/close, form state, confirmation         |
| Tables    | Sorting, pagination, actions                 |

### Visual Regression

| Page      | Breakpoints             |
| --------- | ----------------------- |
| Landing   | Desktop, tablet, mobile |
| Dashboard | Desktop, tablet         |
| Settings  | Desktop                 |
| Billing   | Desktop, mobile         |

### Performance Budgets

| Resource  | Budget         |
| --------- | -------------- |
| JS Bundle | <500KB gzipped |
| CSS       | <50KB gzipped  |
| LCP       | <2.5s          |
| TTI       | <3.5s          |
| CLS       | <0.1           |
