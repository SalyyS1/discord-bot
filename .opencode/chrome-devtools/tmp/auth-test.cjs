const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--disable-web-security'],
  });
  const page = await browser.newPage();

  // Navigate to the domain first to establish secure context
  await page.goto('https://sylabot.site', { waitUntil: 'networkidle2' });

  // Set cookies with proper secure context
  await page.setCookie(
    {
      name: '__Secure-better-auth.session_token',
      value: 'FxiCxPf4FCBqhb3ocOob0Tj2U77rX6ea.LnfX0T2TsQmxZEkC8ZNv3beUS%2B24Ma57iU67IWN6HxI%3D',
      domain: 'sylabot.site',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    },
    {
      name: '__Secure-better-auth.session_data',
      value:
        'eyJzZXNzaW9uIjp7InNlc3Npb24iOnsiZXhwaXJlc0F0IjoiMjAyNi0wMi0wM1QxNToyODo0MC4yMDdaIiwidG9rZW4iOiJGeGlDeFBmNEZDQnFoYjNvY09vYjBUajJVNzdyWDZlYSIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMjdUMTU6Mjg6NDAuMjA3WiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMjdUMTU6Mjg6NDAuMjA3WiIsImlwQWRkcmVzcyI6IjExOC42OC4xMjIuMjI2IiwidXNlckFnZW50IjoiTW96aWxsYS81LjAgKFdpbmRvd3MgTlQgMTAuMDsgV2luNjQ7IHg2NDsgcnY6MTQ3LjApIEdlY2tvLzIwMTAwMTAxIEZpcmVmb3gvMTQ3LjAiLCJ1c2VySWQiOiJoc1k2TkNCZ2dYQnFobTV0aDlhcnRidWpVNnVESGl0RiIsImlkIjoidEJqN29XWFh5aFVhbVBZRWxmMHBkWUtwREFYZ1Nrb1EifSwidXNlciI6eyJuYW1lIjoiU2FseXl5IiwiZW1haWwiOiJnZ2doNDIwMTVAZ21haWwuY29tIiwiZW1haWxWZXJpZmllZCI6dHJ1ZSwiaW1hZ2UiOiJodHRwczovL2Nkbi5kaXNjb3JkYXBwLmNvbS9hdmF0YXJzLzc4NDcyODcyMjQ1OTk4Mzg3NC85OGU3YWRhZDU4NDg5NGQzNmZkZWQ4ZmI5YjcyY2MxMC5wbmciLCJjcmVhdGVkQXQiOiIyMDI2LTAxLTI2VDE4OjA5OjMxLjA5N1oiLCJ1cGRhdGVkQXQiOiIyMDI2LTAxLTI2VDE4OjA5OjMxLjA5N1oiLCJpZCI6ImhzWTZOQ0JnZ1hCcWhtNXRoOWFydGJ1alU2dURIaXRGIn0sInVwZGF0ZWRBdCI6MTc2OTUzOTk0MjY5OCwidmVyc2lvbiI6IjEifSwiZXhwaXJlc0F0IjoxNzY5NTQwMjQyNjk4LCJzaWduYXR1cmUiOiJxaUJoalRQdWNNaXZLN2lIczg3NWtZbUxuZ3BfNXo3YTNoSlFlcXVfNUlzIn0',
      domain: 'sylabot.site',
      path: '/',
      secure: true,
      httpOnly: true,
      sameSite: 'Lax',
    }
  );

  // Get cookies to verify
  const cookies = await page.cookies();
  console.log(
    'Cookies set:',
    cookies.map((c) => c.name)
  );

  // Navigate to dashboard
  await page.goto('https://sylabot.site/vi/dashboard/voice', { waitUntil: 'networkidle2' });

  console.log(
    JSON.stringify(
      {
        success: true,
        url: page.url(),
        title: await page.title(),
      },
      null,
      2
    )
  );

  // Keep browser open for session reuse - save endpoint
  const wsEndpoint = browser.wsEndpoint();
  require('fs').writeFileSync('.browser-session.json', JSON.stringify({ wsEndpoint }));

  browser.disconnect();
})();
