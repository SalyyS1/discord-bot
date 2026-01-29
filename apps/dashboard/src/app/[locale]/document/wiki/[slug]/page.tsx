import { notFound } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { mdxComponents } from '@/components/docs/mdx-content-components';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

const validSlugs = [
  'getting-started',
  'moderation',
  'tickets',
  'giveaways',
  'leveling',
  'tempvoice',
  'welcome',
];

interface WikiPageProps {
  params: Promise<{ slug: string; locale: string }>;
}

export async function generateStaticParams() {
  return validSlugs.map((slug) => ({
    slug,
  }));
}

export async function generateMetadata({ params }: WikiPageProps): Promise<Metadata> {
  const { slug } = await params;
  const title = slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return {
    title: `${title} - SylaBot Wiki`,
    description: `Learn about ${title.toLowerCase()} features in SylaBot dashboard`,
  };
}

async function getWikiContent(slug: string, locale: string) {
  try {
    // Dynamic import of MDX content based on locale and slug
    const content = await import(`@/content/wiki/${locale}/${slug}.mdx`);
    return content;
  } catch (error) {
    // Fallback to English if locale version doesn't exist
    try {
      const content = await import(`@/content/wiki/en/${slug}.mdx`);
      return content;
    } catch {
      return null;
    }
  }
}

export default async function WikiPage({ params }: WikiPageProps) {
  const { slug, locale } = await params;

  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const content = await getWikiContent(slug, locale);

  if (!content) {
    notFound();
  }

  const Component = content.default;

  return (
    <div className="space-y-6">
      <GlassCard padding="lg" className="prose prose-invert max-w-none">
        <Component components={mdxComponents} />
      </GlassCard>
    </div>
  );
}
