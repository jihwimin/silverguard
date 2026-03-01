import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import createContextHook from '@nkzw/create-context-hook';

const ONBOARDING_KEY = 'silverguard_onboarding_complete';
const VERIFIED_KEY = 'silverguard_verified';
const AUTH_TOKEN_KEY = 'silverguard_auth_token';
const AUTH_USER_KEY = 'silverguard_auth_user';

export type AuthUser = { userId: string; role: string; phoneE164: string };

export const [AppProvider, useApp] = createContextHook(() => {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(false);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [authToken, setAuthTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const [onboarding, verified, token, userJson] = await Promise.all([
          AsyncStorage.getItem(ONBOARDING_KEY),
          AsyncStorage.getItem(VERIFIED_KEY),
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(AUTH_USER_KEY),
        ]);
        setHasSeenOnboarding(onboarding === 'true');
        setIsVerified(verified === 'true');
        setAuthTokenState(token);
        if (userJson) {
          try {
            setUserState(JSON.parse(userJson) as AuthUser);
          } catch (_) {}
        }
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

  const setAuth = useCallback(async (token: string, authUser: AuthUser) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(authUser)),
      ]);
      setAuthTokenState(token);
      setUserState(authUser);
      await AsyncStorage.setItem(VERIFIED_KEY, 'true');
      setIsVerified(true);
    } catch (e) {
      console.log('Failed to save auth:', e);
    }
  }, []);

  const clearAuth = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
      setAuthTokenState(null);
      setUserState(null);
    } catch (e) {
      console.log('Failed to clear auth:', e);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
        AsyncStorage.removeItem(VERIFIED_KEY),
      ]);
      setAuthTokenState(null);
      setUserState(null);
      setIsVerified(false);
    } catch (e) {
      console.log('Failed to logout:', e);
    }
  }, []);

  const resetState = useCallback(async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ONBOARDING_KEY),
        AsyncStorage.removeItem(VERIFIED_KEY),
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(AUTH_USER_KEY),
      ]);
      setHasSeenOnboarding(false);
      setIsVerified(false);
      setAuthTokenState(null);
      setUserState(null);
    } catch (e) {
      console.log('Failed to reset state:', e);
    }
  }, []);

  return {
    hasSeenOnboarding,
    isVerified,
    authToken,
    user,
    isLoading,
    completeOnboarding,
    completeVerification,
    setAuth,
    clearAuth,
    logout,
    resetState,
  };
});