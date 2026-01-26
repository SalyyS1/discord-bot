import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['vi', 'en'],
  defaultLocale: 'vi',
});

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
