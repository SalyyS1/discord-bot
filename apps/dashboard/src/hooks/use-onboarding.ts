'use client';

import { useState, useEffect } from 'react';

const ONBOARDING_KEY = 'sylabot_onboarding_completed';

interface OnboardingData {
    hasCompletedOnboarding: boolean;
    serverSelected: boolean;
    featureEnabled: boolean;
}

/**
 * Hook for managing onboarding state
 */
export function useOnboarding() {
    const [onboardingData, setOnboardingData] = useState<OnboardingData>({
        hasCompletedOnboarding: true,
        serverSelected: false,
        featureEnabled: false,
    });
    const [showWelcome, setShowWelcome] = useState(false);

    useEffect(() => {
        // Check if onboarding completed
        const completed = localStorage.getItem(ONBOARDING_KEY);
        if (!completed) {
            setOnboardingData((prev) => ({ ...prev, hasCompletedOnboarding: false }));
            setShowWelcome(true);
        }
    }, []);

    const completeOnboarding = () => {
        localStorage.setItem(ONBOARDING_KEY, 'true');
        setOnboardingData((prev) => ({ ...prev, hasCompletedOnboarding: true }));
        setShowWelcome(false);
    };

    const markServerSelected = () => {
        setOnboardingData((prev) => ({ ...prev, serverSelected: true }));
    };

    const markFeatureEnabled = () => {
        setOnboardingData((prev) => ({ ...prev, featureEnabled: true }));
    };

    const skipOnboarding = () => {
        completeOnboarding();
    };

    return {
        ...onboardingData,
        showWelcome,
        setShowWelcome,
        completeOnboarding,
        markServerSelected,
        markFeatureEnabled,
        skipOnboarding,
    };
}
