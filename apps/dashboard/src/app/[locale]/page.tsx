import { Navbar } from '@/components/landing/navbar';
import { HeroSection } from '@/components/landing/hero-section';
import { FeaturesSection } from '@/components/landing/features-section';
import { StatsSection } from '@/components/landing/stats-section';
import { TestimonialsSection } from '@/components/landing/testimonials-section';
import { ReviewCarouselSection } from '@/components/reviews/review-carousel-section';
import { PricingCTASection } from '@/components/landing/pricing-cta-section';
import { Footer } from '@/components/landing/footer';

// This is the Public Landing Page
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-cyan-500/30 overflow-x-hidden scroll-smooth">
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturesSection />
        <ReviewCarouselSection />
        <PricingCTASection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
}
