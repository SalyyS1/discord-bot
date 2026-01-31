import { notFound } from 'next/navigation';
import { GlassCard } from '@/components/ui/glass-card';
import { mdxComponents } from '@/components/docs/mdx-content-components';
import type { Metadata } from 'next';

// Static imports for MDX content - avoids DYNAMIC_SERVER_USAGE errors
import GettingStartedEn from '@/content/wiki/en/getting-started.mdx';
import ModerationEn from '@/content/wiki/en/moderation.mdx';
import TicketsEn from '@/content/wiki/en/tickets.mdx';
import GiveawaysEn from '@/content/wiki/en/giveaways.mdx';
import LevelingEn from '@/content/wiki/en/leveling.mdx';
import TempvoiceEn from '@/content/wiki/en/tempvoice.mdx';
import WelcomeEn from '@/content/wiki/en/welcome.mdx';

import GettingStartedVi from '@/content/wiki/vi/getting-started.mdx';
import ModerationVi from '@/content/wiki/vi/moderation.mdx';
import TicketsVi from '@/content/wiki/vi/tickets.mdx';
import GiveawaysVi from '@/content/wiki/vi/giveaways.mdx';
import LevelingVi from '@/content/wiki/vi/leveling.mdx';
import TempvoiceVi from '@/content/wiki/vi/tempvoice.mdx';
import WelcomeVi from '@/content/wiki/vi/welcome.mdx';

const wikiContent: Record<string, Record<string, React.ComponentType<{ components?: Record<string, React.ComponentType> }>>> = {
  en: {
    'getting-started': GettingStartedEn,
    moderation: ModerationEn,
    tickets: TicketsEn,
    giveaways: GiveawaysEn,
    leveling: LevelingEn,
    tempvoice: TempvoiceEn,
    welcome: WelcomeEn,
  },
  vi: {
    'getting-started': GettingStartedVi,
    moderation: ModerationVi,
    tickets: TicketsVi,
    giveaways: GiveawaysVi,
    leveling: LevelingVi,
    tempvoice: TempvoiceVi,
    welcome: WelcomeVi,
  },
};

const validSlugs = Object.keys(wikiContent.en);

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

function getWikiContent(slug: string, locale: string) {
  // Get content from static import map
  const localeContent = wikiContent[locale] || wikiContent.en;
  return localeContent[slug] || wikiContent.en[slug] || null;
}

export default async function WikiPage({ params }: WikiPageProps) {
  const { slug, locale } = await params;

  if (!validSlugs.includes(slug)) {
    notFound();
  }

  const Component = getWikiContent(slug, locale);

  if (!Component) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <GlassCard padding="lg" className="prose prose-invert max-w-none">
        <Component components={mdxComponents} />
      </GlassCard>
    </div>
  );
}
