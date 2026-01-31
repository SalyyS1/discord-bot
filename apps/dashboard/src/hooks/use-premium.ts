'use client';

import { useGuildContext } from '@/context/guild-context';

interface PremiumFeature {
    id: string;
    name: string;
    description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
    { id: 'tickets', name: 'Ticket System', description: 'Full support ticket management' },
    { id: 'advanced_leveling', name: 'Advanced Leveling', description: 'XP multipliers, voice XP, custom messages' },
    { id: 'unlimited_autoresponders', name: 'Unlimited Auto-Responders', description: 'No limit on auto-responders' },
    { id: 'analytics', name: 'Server Analytics', description: 'Detailed server insights' },
    { id: 'custom_branding', name: 'Custom Branding', description: 'Remove SylaBot branding' },
];

interface PremiumStatus {
    isPremium: boolean;
    expiresAt: Date | null;
    tier: 'FREE' | 'PREMIUM';
}

/**
 * Hook for checking premium status and feature access
 */
export function usePremium() {
    const { selectedGuildId } = useGuildContext();

    // In a real implementation, this would fetch from API
    // For now, return demo data
    const status: PremiumStatus = {
        isPremium: false,
        expiresAt: null,
        tier: 'FREE',
    };

    const hasFeature = (featureId: string): boolean => {
        if (status.isPremium) return true;
        // Free features that don't require premium
        const freeFeatures = ['welcome', 'basic_moderation', 'leveling_basic', 'giveaways_basic'];
        return freeFeatures.includes(featureId);
    };

    const getUpgradeUrl = (): string => {
        return `/pricing${selectedGuildId ? `?guild=${selectedGuildId}` : ''}`;
    };

    return {
        ...status,
        hasFeature,
        getUpgradeUrl,
        premiumFeatures: PREMIUM_FEATURES,
    };
}
