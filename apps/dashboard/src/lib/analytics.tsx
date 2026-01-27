'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect, ReactNode } from 'react';

// Initialize PostHog
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
            if (process.env.NODE_ENV === 'development') {
                posthog.debug();
            }
        },
        capture_pageview: false, // We'll capture manually for better control
        persistence: 'localStorage',
    });
}

interface PostHogProviderProps {
    children: ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
    return <PHProvider client={ posthog }> { children } </PHProvider>;
}

/**
 * Analytics service using PostHog
 */
export const analytics = {
    /**
     * Track page view
     */
    pageView: (path: string) => {
        if (typeof window !== 'undefined') {
            posthog.capture('$pageview', { $current_url: path });
        }
    },

    /**
     * Track feature usage
     */
    featureUsed: (feature: string, action: string, properties?: Record<string, unknown>) => {
        posthog.capture('feature_used', {
            feature,
            action,
            ...properties,
        });
    },

    /**
     * Track CTA click
     */
    ctaClick: (cta: string, location: string) => {
        posthog.capture('cta_click', { cta, location });
    },

    /**
     * Track upgrade intent
     */
    upgradeIntent: (tier: string, source: string) => {
        posthog.capture('upgrade_intent', { tier, source });
    },

    /**
     * Track payment started
     */
    paymentStarted: (provider: 'stripe' | 'sepay', tier: string, amount: number) => {
        posthog.capture('payment_started', { provider, tier, amount });
    },

    /**
     * Track payment completed
     */
    paymentCompleted: (provider: 'stripe' | 'sepay', tier: string, amount: number) => {
        posthog.capture('payment_completed', { provider, tier, amount });
    },

    /**
     * Identify user
     */
    identify: (userId: string, properties?: Record<string, unknown>) => {
        posthog.identify(userId, properties);
    },

    /**
     * Set user properties
     */
    setUserProperties: (properties: Record<string, unknown>) => {
        posthog.people.set(properties);
    },

    /**
     * Reset (on logout)
     */
    reset: () => {
        posthog.reset();
    },
};

/**
 * React hook for analytics
 */
export function useAnalytics() {
    return analytics;
}

/**
 * Hook to track page views on route changes
 */
export function usePageView(path: string) {
    useEffect(() => {
        analytics.pageView(path);
    }, [path]);
}
