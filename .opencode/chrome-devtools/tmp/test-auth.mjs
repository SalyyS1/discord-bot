import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const cookies = [
  {
    name: '__Secure-better-auth.session_data',
    value:
      'eyJzZXNzaW9uIjp7InNlc3Npb24iOnsiZXhwaXJlc0F0IjoiMjAyNi0wMi0wM1QxOToyNTo1My41MjlaIiwidG9rZW4iOiJ5aXlxNWphTkxkY3BLTEZtTjlXbUhBVW9oVGFLeGc4biIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjdUMTk6MjU6NTMuNTI5WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMjdUMTk6MjU6NTMuNTI5WiIsImlwQWRkcmVzcyI6IjExOC42OC4xMjIuMjI2IiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NCkgQXBwbGVXZWJLaXQvNTM3LjM2IChLSFRNTCwgbGlrZSBHZWNrbykgQ2hyb21lLzE0NC4wLjAuMCBTYWZhcmkvNTM3LjM2IiwidXNlcklkIjoiaHNZNk5DQmdnWEJxaG01dGg5YXJ0YnVqVTZ1REhpdEYiLCJpZCI6Ikl5eUZHMEhmR2ZWREltNnZaMjhQQkJtcXhhT1RMMDJiIn0sInVzZXIiOnsibmFtZSI6IlNhbHl5eSIsImVtYWlsIjoiZ2dnaDQyMDE1QGdtYWlsLmNvbSIsImVtYWlsVmVyaWZpZWQiOnRydWUsImltYWdlIjoiaHR0cHM6Ly9jZG4uZGlzY29yZGFwcC5jb20vYXZhdGFycy83ODQ3Mjg3MjI0NTk5ODM4NzQvOThlN2FkYWQ1ODQ4OTRkMzZmZGVkOGZiOWI3MmNjMTAucG5nIiwiY3JlYXRlZEF0IjoiMjAyNi0wMS0yNlQxODowOTozMS4wOTdaIiwidXBkYXRlZEF0IjoiMjAyNi0wMS0yNlQxODowOTozMS4wOTdaIiwiaWQiOiJoc1k2TkNCZ2dYQnFobTV0aDlhcnRidWpVNnVESGl0RiJ9LCJ1cGRhdGVkQXQiOjE3Njk1NDE5NTM1MzcsInZlcnNpb24iOiIxIn0sImV4cGlyZXNBdCI6MTc2OTU0MjI1MzUzNywic2lnbmF0dXJlIjoiVU9OZTcxVjl1OGUyN084U3VwaHBCTXNmdHVmT0FYb2dUdzhlUW1DUzZvSSJ9',
    domain: 'sylabot.site',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  },
  {
    name: '__Secure-better-auth.session_token',
    value: 'yiyq5jaNLdcpKLFmN9WmHAUohTaKxg8n.KxazJrCjda8ix19LjcwC1UemePcGbVdVCVpc3suf7rE%3D',
    domain: 'sylabot.site',
    path: '/',
    secure: true,
    httpOnly: true,
    sameSite: 'Lax',
  },
];

async function main() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();

  // First navigate to establish domain context
  await page.goto('https://sylabot.site', { waitUntil: 'networkidle2' });

  // Set cookies
  await page.setCookie(...cookies);
  console.log(
    'Cookies set:',
    cookies.map((c) => c.name)
  );

  // Verify cookies were set
  const setCookies = await page.cookies();
  console.log(
    'Verified cookies:',
    setCookies.map((c) => c.name)
  );

  // Navigate to dashboard
  await page.goto('https://sylabot.site/vi/dashboard/voice', { waitUntil: 'networkidle2' });

  // Wait a bit for any redirects
  await new Promise((r) => setTimeout(r, 2000));

  const finalUrl = page.url();
  const title = await page.title();

  console.log(
    JSON.stringify(
      {
        success: !finalUrl.includes('login'),
        finalUrl,
        title,
        authenticated: !finalUrl.includes('login'),
      },
      null,
      2
    )
  );

  // Take screenshot
  const screenshotPath =
    'D:/Project/.2_PROJECT_BOT_DISCORD/.opencode/chrome-devtools/screenshots/dashboard-test.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('Screenshot saved:', screenshotPath);

  // Keep browser open for inspection
  // await browser.close();
}

main().catch(console.error);
