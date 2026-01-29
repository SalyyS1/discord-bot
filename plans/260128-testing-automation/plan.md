# Browser Testing & Automation Implementation Plan

---

title: "Browser Testing & Automation"
description: "Add comprehensive E2E, component, visual, and performance testing to Discord Bot Dashboard"
status: pending
priority: P1
effort: 24h
branch: main
tags: [testing, playwright, vitest, ci/cd, e2e]
created: 2026-01-28

---

## Overview

Add comprehensive browser testing to Discord Bot Dashboard monorepo. Currently has **ZERO** E2E/component/visual/accessibility tests. Only 2 Vitest unit tests exist in `packages/security`.

### Codebase Summary

- **Routes**: 60 API routes
- **Components**: 66 UI components
- **Stack**: Next.js 15, React 19, Turborepo + pnpm
- **CI**: lint -> typecheck -> build (NO tests)
- **Auth**: better-auth + Discord OAuth
- **i18n**: next-intl (en, vi)

---

## Phase 1: E2E Foundation (Week 1) - 8h

### Task 1.1: Install Playwright (30m)

```bash
cd apps/dashboard
pnpm add -D @playwright/test
npx playwright install --with-deps chromium
```

**Files to create:**

- `apps/dashboard/playwright.config.ts`
- `apps/dashboard/e2e/` directory

### Task 1.2: Create Playwright Config (30m)

```ts
// apps/dashboard/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Task 1.3: Create Auth Fixtures (1h)

Mock Discord OAuth for E2E tests - avoid real Discord API calls.

```ts
// apps/dashboard/e2e/fixtures/auth.ts
import { test as base, expect, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  mockSession: { userId: string; guildId: string };
};

export const test = base.extend<AuthFixtures>({
  mockSession: async ({}, use) => {
    await use({
      userId: 'test-user-123',
      guildId: 'test-guild-456',
    });
  },

  authenticatedPage: async ({ page, mockSession }, use) => {
    // Inject mock session via localStorage/cookies before navigation
    await page.addInitScript((session) => {
      // Mock better-auth session
      localStorage.setItem(
        '__session',
        JSON.stringify({
          user: {
            id: session.userId,
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://cdn.discordapp.com/embed/avatars/0.png',
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        })
      );
    }, mockSession);

    await use(page);
  },
});

export { expect };
```

### Task 1.4: Create Test Data Helpers (1h)

```ts
// apps/dashboard/e2e/fixtures/test-data.ts
export const testGuild = {
  id: 'test-guild-456',
  name: 'Test Server',
  icon: null,
  owner: true,
  permissions: '8', // Administrator
  features: [],
};

export const testAutoresponder = {
  trigger: 'hello',
  response: 'Hello, {user}!',
  matchMode: 'exact' as const,
  ignoreCase: true,
  cooldown: 5,
};

export const testSettings = {
  prefix: '!',
  language: 'en',
  timezone: 'UTC',
};

// API mock helper
export async function mockAPI(page: Page, route: string, response: unknown) {
  await page.route(`**/api/${route}`, (r) => r.fulfill({ json: response }));
}
```

### Task 1.5: Write 5 Critical E2E Tests (3h)

#### Test 1: Login Flow

```ts
// apps/dashboard/e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('shows login button when not authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /login|sign in/i })).toBeVisible();
  });

  test('redirects to Discord OAuth on login click', async ({ page }) => {
    await page.goto('/');

    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.getByRole('link', { name: /login|sign in/i }).click(),
    ]);

    // Verify Discord OAuth URL
    expect(popup.url()).toContain('discord.com/oauth2');
  });

  test('shows user menu when authenticated', async ({ page }) => {
    // Mock auth state
    await page.route('**/api/auth/**', (route) =>
      route.fulfill({
        json: { user: { id: '123', name: 'Test User' } },
      })
    );

    await page.goto('/dashboard');
    await expect(page.getByTestId('user-menu')).toBeVisible();
  });
});
```

#### Test 2: Dashboard Navigation

```ts
// apps/dashboard/e2e/tests/dashboard.spec.ts
import { test, expect } from './fixtures/auth';
import { mockAPI, testGuild } from './fixtures/test-data';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await mockAPI(page, 'guilds', [testGuild]);
  });

  test('displays server list', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');
    await expect(page.getByText(testGuild.name)).toBeVisible();
  });

  test('navigates between sidebar items', async ({ authenticatedPage: page }) => {
    await page.goto(`/dashboard/${testGuild.id}`);

    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/settings/);

    // Navigate to autoresponders
    await page.getByRole('link', { name: /autorespond/i }).click();
    await expect(page).toHaveURL(/autorespond/);
  });

  test('guild selector works', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    await page.getByTestId('server-selector').click();
    await page.getByRole('option', { name: testGuild.name }).click();

    await expect(page).toHaveURL(new RegExp(testGuild.id));
  });
});
```

#### Test 3: Guild Settings CRUD

```ts
// apps/dashboard/e2e/tests/settings.spec.ts
import { test, expect } from './fixtures/auth';
import { mockAPI, testGuild, testSettings } from './fixtures/test-data';

test.describe('Guild Settings', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await mockAPI(page, 'guilds', [testGuild]);
    await mockAPI(page, `guilds/${testGuild.id}/settings`, testSettings);
  });

  test('loads and displays current settings', async ({ authenticatedPage: page }) => {
    await page.goto(`/dashboard/${testGuild.id}/settings`);

    await expect(page.getByLabel(/prefix/i)).toHaveValue(testSettings.prefix);
    await expect(page.getByLabel(/language/i)).toContainText(/english/i);
  });

  test('saves settings changes', async ({ authenticatedPage: page }) => {
    // Mock PATCH endpoint
    let savedData: unknown;
    await page.route(`**/api/guilds/${testGuild.id}/settings`, async (route) => {
      if (route.request().method() === 'PATCH') {
        savedData = route.request().postDataJSON();
        await route.fulfill({ json: { ...testSettings, ...savedData } });
      } else {
        await route.fulfill({ json: testSettings });
      }
    });

    await page.goto(`/dashboard/${testGuild.id}/settings`);

    // Change prefix
    await page.getByLabel(/prefix/i).fill('?');
    await page.getByRole('button', { name: /save/i }).click();

    // Verify save
    await expect(page.getByText(/saved/i)).toBeVisible();
    expect(savedData).toMatchObject({ prefix: '?' });
  });

  test('shows unsaved changes warning', async ({ authenticatedPage: page }) => {
    await page.goto(`/dashboard/${testGuild.id}/settings`);

    await page.getByLabel(/prefix/i).fill('?');

    // Try to navigate away
    await page.getByRole('link', { name: /autorespond/i }).click();

    // Confirm dialog appears
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/unsaved changes/i)).toBeVisible();
  });
});
```

#### Test 4: Autoresponder Creation

```ts
// apps/dashboard/e2e/tests/autoresponder.spec.ts
import { test, expect } from './fixtures/auth';
import { mockAPI, testGuild, testAutoresponder } from './fixtures/test-data';

test.describe('Autoresponders', () => {
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await mockAPI(page, 'guilds', [testGuild]);
    await mockAPI(page, `guilds/${testGuild.id}/autoresponders`, []);
  });

  test('creates new autoresponder', async ({ authenticatedPage: page }) => {
    let createdData: unknown;
    await page.route(`**/api/guilds/${testGuild.id}/autoresponders`, async (route) => {
      if (route.request().method() === 'POST') {
        createdData = route.request().postDataJSON();
        await route.fulfill({ json: { id: '1', ...createdData } });
      } else {
        await route.fulfill({ json: [] });
      }
    });

    await page.goto(`/dashboard/${testGuild.id}/autoresponders`);

    // Click create button
    await page.getByRole('button', { name: /create|add|new/i }).click();

    // Fill form
    await page.getByLabel(/trigger/i).fill(testAutoresponder.trigger);
    await page.getByLabel(/response/i).fill(testAutoresponder.response);

    // Submit
    await page.getByRole('button', { name: /save|create/i }).click();

    // Verify
    await expect(page.getByText(testAutoresponder.trigger)).toBeVisible();
    expect(createdData).toMatchObject({
      trigger: testAutoresponder.trigger,
      response: testAutoresponder.response,
    });
  });

  test('validates required fields', async ({ authenticatedPage: page }) => {
    await page.goto(`/dashboard/${testGuild.id}/autoresponders`);

    await page.getByRole('button', { name: /create|add|new/i }).click();
    await page.getByRole('button', { name: /save|create/i }).click();

    // Should show validation errors
    await expect(page.getByText(/required|cannot be empty/i)).toBeVisible();
  });
});
```

#### Test 5: Error State Handling

```ts
// apps/dashboard/e2e/tests/errors.spec.ts
import { test, expect } from './fixtures/auth';
import { testGuild } from './fixtures/test-data';

test.describe('Error Handling', () => {
  test('shows error card on API failure', async ({ authenticatedPage: page }) => {
    await page.route('**/api/guilds/**', (route) =>
      route.fulfill({ status: 500, json: { error: 'Internal Server Error' } })
    );

    await page.goto(`/dashboard/${testGuild.id}/settings`);

    await expect(page.getByTestId('error-card')).toBeVisible();
    await expect(page.getByText(/error|failed|try again/i)).toBeVisible();
  });

  test('retry button refetches data', async ({ authenticatedPage: page }) => {
    let callCount = 0;
    await page.route('**/api/guilds/**', (route) => {
      callCount++;
      if (callCount === 1) {
        return route.fulfill({ status: 500 });
      }
      return route.fulfill({ json: [testGuild] });
    });

    await page.goto('/dashboard');
    await expect(page.getByTestId('error-card')).toBeVisible();

    await page.getByRole('button', { name: /retry/i }).click();

    await expect(page.getByText(testGuild.name)).toBeVisible();
  });

  test('handles network offline', async ({ authenticatedPage: page }) => {
    await page.goto('/dashboard');

    // Simulate offline
    await page.context().setOffline(true);
    await page.reload();

    await expect(page.getByText(/offline|network|connection/i)).toBeVisible();
  });
});
```

### Task 1.6: Add Package Scripts (15m)

```json
// apps/dashboard/package.json - add to scripts
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

```json
// package.json (root) - add to scripts
{
  "scripts": {
    "test": "turbo test",
    "test:e2e": "turbo test:e2e"
  }
}
```

### Task 1.7: Add CI Job (1h)

```yaml
# .github/workflows/deploy.yml - add after build job

# E2E Tests
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: build
  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Setup pnpm
      uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'pnpm'

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Download dashboard build
      uses: actions/download-artifact@v4
      with:
        name: dashboard-build
        path: apps/dashboard/.next

    - name: Install Playwright browsers
      run: npx playwright install --with-deps chromium
      working-directory: apps/dashboard

    - name: Run E2E tests
      run: pnpm --filter @repo/dashboard test:e2e
      env:
        BASE_URL: http://localhost:3000

    - name: Upload test results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: playwright-report
        path: apps/dashboard/playwright-report/
        retention-days: 7
```

Update job dependencies:

```yaml
deploy-staging:
  needs: [build, e2e] # Add e2e dependency
```

### Task 1.8: Add Debug Capture Script (30m)

```bash
#!/bin/bash
# scripts/debug-capture.sh
# Capture browser state for debugging failed tests

set -e

URL="${1:-http://localhost:3000}"
OUTPUT_DIR="debug-captures/$(date +%Y%m%d-%H%M%S)"

mkdir -p "$OUTPUT_DIR"

echo "Capturing debug info from $URL..."

# Using chrome-devtools skill (if available)
if command -v opencode &> /dev/null; then
  opencode chrome-devtools screenshot "$URL" --output "$OUTPUT_DIR/screenshot.png"
  opencode chrome-devtools console "$URL" --output "$OUTPUT_DIR/console.log"
  opencode chrome-devtools network "$URL" --output "$OUTPUT_DIR/network.har"
else
  # Fallback to Playwright
  npx playwright screenshot "$URL" "$OUTPUT_DIR/screenshot.png"
fi

echo "Debug capture saved to $OUTPUT_DIR"
```

---

## Phase 2: Component Testing (Week 2) - 6h

### Task 2.1: Configure Vitest for Dashboard (1h)

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

```ts
// apps/dashboard/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules', 'e2e', '.next'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
```

```ts
// apps/dashboard/__tests__/setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard',
  useParams: () => ({ locale: 'en' }),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
```

### Task 2.2: Component Test Examples (2h)

**Priority components to test:**

1. `server-selector.tsx` - critical for guild switching
2. `embed-editor.tsx` - complex form logic
3. `payment-checkout.tsx` - money flow
4. Form validation components

```ts
// apps/dashboard/__tests__/components/server-selector.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerSelector } from '@/components/server-selector';
import { describe, it, expect, vi } from 'vitest';

const mockGuilds = [
  { id: '1', name: 'Server One', icon: null },
  { id: '2', name: 'Server Two', icon: 'abc123' },
];

describe('ServerSelector', () => {
  it('renders guild list', () => {
    render(<ServerSelector guilds={mockGuilds} onSelect={vi.fn()} />);

    expect(screen.getByText('Server One')).toBeInTheDocument();
    expect(screen.getByText('Server Two')).toBeInTheDocument();
  });

  it('calls onSelect when guild clicked', () => {
    const onSelect = vi.fn();
    render(<ServerSelector guilds={mockGuilds} onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Server One'));

    expect(onSelect).toHaveBeenCalledWith(mockGuilds[0]);
  });

  it('shows empty state when no guilds', () => {
    render(<ServerSelector guilds={[]} onSelect={vi.fn()} />);

    expect(screen.getByText(/no servers/i)).toBeInTheDocument();
  });
});
```

### Task 2.3: Visual Regression Setup (1h)

```ts
// apps/dashboard/e2e/visual/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('dashboard matches snapshot', async ({ page }) => {
    // Mock auth + data
    await page.route('**/api/**', (route) => {
      if (route.request().url().includes('guilds')) {
        return route.fulfill({ json: [{ id: '1', name: 'Test' }] });
      }
      return route.continue();
    });

    await page.goto('/dashboard/1');
    await expect(page).toHaveScreenshot('dashboard.png', {
      animations: 'disabled',
    });
  });

  test('dark mode matches snapshot', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage-dark.png');
  });
});
```

### Task 2.4: Add Component Test CI (1h)

```yaml
# Add to .github/workflows/deploy.yml after lint job

unit-test:
  name: Unit & Component Tests
  runs-on: ubuntu-latest
  needs: lint
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile
    - run: pnpm --filter @repo/security test
    - run: pnpm --filter @repo/dashboard test:unit
    - name: Upload coverage
      uses: codecov/codecov-action@v4
      if: always()
```

Update build dependency:

```yaml
build:
  needs: [lint, unit-test] # Add unit-test
```

---

## Phase 3: Performance & Accessibility (Week 3) - 6h

### Task 3.1: Accessibility Testing (2h)

```bash
pnpm add -D @axe-core/playwright
```

```ts
// apps/dashboard/e2e/tests/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage has no critical violations', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();

    expect(results.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
  });

  test('dashboard has no critical violations', async ({ page }) => {
    // Mock auth
    await page.route('**/api/**', (route) => route.fulfill({ json: {} }));
    await page.goto('/dashboard');

    const results = await new AxeBuilder({ page })
      .exclude('.third-party-widget') // Exclude uncontrollable elements
      .analyze();

    expect(results.violations.filter((v) => v.impact === 'critical')).toHaveLength(0);
  });
});
```

### Task 3.2: Performance Budgets (2h)

```ts
// apps/dashboard/e2e/tests/performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Performance', () => {
  test('homepage loads under performance budget', async ({ page }) => {
    await page.goto('/');

    // Check bundle size via coverage
    await page.coverage.startJSCoverage();
    await page.reload();
    const jsCoverage = await page.coverage.stopJSCoverage();

    const totalBytes = jsCoverage.reduce((acc, entry) => acc + entry.text.length, 0);
    const totalKB = totalBytes / 1024;

    expect(totalKB).toBeLessThan(500); // 500KB budget
  });

  test('LCP under 2.5s', async ({ page }) => {
    await page.goto('/');

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    expect(lcp).toBeLessThan(2500);
  });

  test('no layout shifts above threshold', async ({ page }) => {
    await page.goto('/');

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // Good CLS
  });
});
```

### Task 3.3: Performance CI Job (1h)

```yaml
performance:
  name: Performance Audit
  runs-on: ubuntu-latest
  needs: e2e
  if: github.event_name == 'pull_request'
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: ${{ env.PNPM_VERSION }}
    - uses: actions/setup-node@v4
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: 'pnpm'
    - run: pnpm install --frozen-lockfile

    - name: Download dashboard build
      uses: actions/download-artifact@v4
      with:
        name: dashboard-build
        path: apps/dashboard/.next

    - name: Run Lighthouse
      uses: treosh/lighthouse-ci-action@v12
      with:
        configPath: ./lighthouserc.json
        uploadArtifacts: true
```

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "startServerCommand": "pnpm --filter @repo/dashboard start",
      "url": ["http://localhost:3000/", "http://localhost:3000/dashboard"]
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.8 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    },
    "upload": {
      "target": "temporary-public-storage"
    }
  }
}
```

---

## Phase 4: Maintenance & Documentation (Ongoing) - 4h

### Task 4.1: Update PR Template (30m)

```markdown
<!-- .github/pull_request_template.md -->

## Description

<!-- Brief description of changes -->

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation

## Testing

- [ ] Unit tests added/updated
- [ ] E2E tests added/updated (if UI changes)
- [ ] Visual regression checked (if styling changes)
- [ ] Accessibility verified (if UI changes)

## Checklist

- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Tests pass locally
```

### Task 4.2: Testing Documentation (1h)

````markdown
<!-- docs/testing.md -->

# Testing Guide

## Running Tests

```bash
# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# E2E with UI
pnpm test:e2e:ui

# All tests
pnpm test
```
````

## Writing Tests

### E2E Tests

- Place in `apps/dashboard/e2e/tests/`
- Use auth fixtures for authenticated tests
- Mock API responses, don't hit real endpoints

### Component Tests

- Place in `apps/dashboard/__tests__/components/`
- Test user interactions, not implementation
- Use Testing Library queries

### Visual Tests

- Run `pnpm test:e2e:update-snapshots` to update baselines
- Review screenshot diffs carefully in CI

## CI Pipeline

```
lint -> unit-test -> build -> e2e -> performance
                                  -> deploy-staging
```

````

### Task 4.3: Flaky Test Monitoring (1h)

Add retry configuration and flaky test tracking:

```ts
// playwright.config.ts additions
export default defineConfig({
  // ... existing config
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    // Track flaky tests
    ['./e2e/reporters/flaky-reporter.ts'],
  ],
});
````

```ts
// apps/dashboard/e2e/reporters/flaky-reporter.ts
import { Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { appendFileSync } from 'fs';

class FlakyReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    if (result.retry > 0 && result.status === 'passed') {
      // Test was flaky - passed on retry
      const log = `${new Date().toISOString()} | FLAKY | ${test.title} | Retries: ${result.retry}\n`;
      appendFileSync('test-results/flaky-tests.log', log);
    }
  }
}

export default FlakyReporter;
```

### Task 4.4: CI Optimization (30m)

Target: Keep CI under 10 minutes

```yaml
# Optimizations in deploy.yml:

e2e:
  # Use matrix for parallel test sharding
  strategy:
    matrix:
      shard: [1, 2, 3]
  steps:
    - run: pnpm --filter @repo/dashboard test:e2e --shard=${{ matrix.shard }}/3

# Merge sharded results
e2e-report:
  needs: e2e
  steps:
    - uses: actions/download-artifact@v4
      with:
        pattern: playwright-report-*
        merge-multiple: true
    - run: npx playwright merge-reports ./all-reports --reporter=html
```

---

## File Structure Summary

```
apps/dashboard/
├── playwright.config.ts          # Playwright config
├── vitest.config.ts              # Vitest config
├── e2e/
│   ├── fixtures/
│   │   ├── auth.ts               # Auth fixtures
│   │   └── test-data.ts          # Mock data
│   ├── tests/
│   │   ├── auth.spec.ts          # Auth tests
│   │   ├── dashboard.spec.ts     # Navigation tests
│   │   ├── settings.spec.ts      # Settings CRUD
│   │   ├── autoresponder.spec.ts # Autoresponder tests
│   │   ├── errors.spec.ts        # Error handling
│   │   ├── accessibility.spec.ts # A11y tests
│   │   └── performance.spec.ts   # Perf tests
│   ├── visual/
│   │   └── visual.spec.ts        # Visual regression
│   └── reporters/
│       └── flaky-reporter.ts     # Flaky test tracking
├── __tests__/
│   ├── setup.ts                  # Vitest setup
│   └── components/
│       └── server-selector.test.tsx

.github/
├── workflows/deploy.yml          # Enhanced with test jobs
└── pull_request_template.md      # Updated PR template

scripts/
└── debug-capture.sh              # Debug helper

lighthouserc.json                 # Lighthouse CI config
docs/testing.md                   # Testing documentation
```

---

## Success Metrics

| Metric          | Target    | Measurement              |
| --------------- | --------- | ------------------------ |
| E2E test count  | 20+       | `playwright test --list` |
| CI pass rate    | >95%      | GitHub Actions history   |
| CI duration     | <10min    | GitHub Actions timing    |
| Core Web Vitals | All green | Lighthouse CI            |
| Bug escape rate | -50%      | Issue tracker            |

---

## Implementation Order

```
Week 1 (Phase 1):
├── Day 1: Tasks 1.1-1.3 (Playwright setup, fixtures)
├── Day 2-3: Tasks 1.4-1.5 (Test data, 5 E2E tests)
├── Day 4: Tasks 1.6-1.7 (Scripts, CI job)
└── Day 5: Task 1.8 + testing/debugging

Week 2 (Phase 2):
├── Day 1: Task 2.1 (Vitest config)
├── Day 2-3: Task 2.2 (Component tests)
├── Day 4: Task 2.3 (Visual regression)
└── Day 5: Task 2.4 (CI integration)

Week 3 (Phase 3):
├── Day 1-2: Tasks 3.1-3.2 (A11y + Perf tests)
├── Day 3: Task 3.3 (Perf CI)
└── Day 4-5: Phase 4 tasks (Docs, maintenance)
```

---

## Risks & Mitigations

| Risk                              | Mitigation                                         |
| --------------------------------- | -------------------------------------------------- |
| Discord OAuth mocking complexity  | Use localStorage session injection, not real OAuth |
| Flaky tests                       | Retry config, explicit waits, mock APIs            |
| CI timeout                        | Shard tests, cache deps, parallel jobs             |
| Visual regression false positives | Disable animations, use threshold tolerance        |
| React 19 Testing Library issues   | Use canary version if needed                       |

---

## Unresolved Questions

1. **Auth mocking strategy**: Should we use MSW for API mocking or Playwright's route.fulfill()? Route.fulfill is simpler but MSW is more realistic.

2. **Test database**: Do we need a test database for integration tests, or is mocking sufficient for now?

3. **Locale testing**: Should visual regression tests run for both en/vi locales? This doubles snapshot count.
