import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

export default getRequestConfig(async ({ requestLocale }) => {
  // Priority: 1. Request locale (from URL), 2. Cookie, 3. Default
  let locale = (await requestLocale) || 'vi';

  // If no locale in URL, check cookie
  if (!requestLocale) {
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE');
    if (localeCookie && ['vi', 'en'].includes(localeCookie.value)) {
      locale = localeCookie.value;
    }
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
