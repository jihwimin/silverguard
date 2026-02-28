import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'silverguard_onboarding_complete';
const VERIFIED_KEY = 'silverguard_verified';

export const [AppProvider, useApp] = createContextHook(() => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const [onboarding, verified] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(VERIFIED_KEY),
        ]);
        setHasSeenOnboarding(onboarding === 'true');
        setIsVerified(verified === 'true');
      } catch (e) {
        console.log('Failed to load app state:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadState();
  }, []);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setHasSeenOnboarding(true);
    } catch (e) {
      console.log('Failed to save onboarding state:', e);
    }
  }, []);

  const completeVerification = useCallback(async () => {
    try {
      await AsyncStorage.setItem(VERIFIED_KEY, 'true');
      setIsVerified(true);
    } catch (e) {
      console.log('Failed to save verification state:', e);
    }
  }, []);

  const resetState = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEY),
        AsyncStorage.removeItem(VERIFIED_KEY),
      ]);
      setHasSeenOnboarding(false);
      setIsVerified(false);
    } catch (e) {
      console.log('Failed to reset state:', e);
    }
  }, []);

  return {
    hasSeenOnboarding,
    isVerified,
    isLoading,
    completeOnboarding,
    completeVerification,
    resetState,
  };
});