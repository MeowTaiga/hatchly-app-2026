import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';
import * as SecureStore from 'expo-secure-store';
import { setApiTokenGetter, api, type ApiUser } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  token: string | null;
  user: ApiUser | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  isHydrated: boolean;
}

interface AuthActions {
  setAuth: (token: string, user: ApiUser, isNewUser: boolean) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
  /** Refreshes user data from the API (e.g. after updating pet image). */
  refreshUser: () => Promise<void>;
  /** Merges updated user from API response (e.g. after PATCH) for instant UI. */
  mergeUserFromApi: (user: ApiUser) => Promise<void>;
}

type AuthContextValue = AuthState & AuthActions;

type Action =
  | { type: 'SET_AUTH'; token: string; user: ApiUser; hasCompletedOnboarding: boolean }
  | { type: 'COMPLETE_ONBOARDING' }
  | { type: 'LOGOUT' }
  | { type: 'HYDRATE'; token: string | null; user: ApiUser | null; hasCompletedOnboarding: boolean }
  | { type: 'REFRESH_USER'; user: ApiUser };

// ─── Keys ───────────────────────────────────────────────────────────────────

const TOKEN_KEY = 'hatchly_auth_token';
const USER_KEY = 'hatchly_auth_user';
const ONBOARDING_KEY = 'hatchly_onboarding_complete';

// ─── Reducer ────────────────────────────────────────────────────────────────

const initialState: AuthState = {
  token: null,
  user: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  isHydrated: false,
};

function authReducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_AUTH':
      return {
        ...state,
        token: action.token,
        user: action.user,
        isAuthenticated: true,
        hasCompletedOnboarding: action.hasCompletedOnboarding,
      };
    case 'COMPLETE_ONBOARDING':
      return { ...state, hasCompletedOnboarding: true };
    case 'LOGOUT':
      return { ...initialState, isHydrated: true };
    case 'HYDRATE':
      return {
        ...state,
        token: action.token,
        user: action.user,
        isAuthenticated: !!action.token,
        hasCompletedOnboarding: action.hasCompletedOnboarding,
        isHydrated: true,
      };
    case 'REFRESH_USER':
      return { ...state, user: action.user };
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Keep the API client in sync with the current token
  useEffect(() => {
    setApiTokenGetter(() => state.token);
  }, [state.token]);

  const setAuth = useCallback(async (token: string, user: ApiUser, isNewUser: boolean) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));

    // Trust the backend's onboardingComplete flag for existing users
    const hasCompleted = !isNewUser && user.onboardingComplete === true;
    if (hasCompleted) {
      await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    }
    dispatch({ type: 'SET_AUTH', token, user, hasCompletedOnboarding: hasCompleted });
  }, []);

  const completeOnboarding = useCallback(async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');

    // Fetch fresh user data so pet, subscription, etc. are up to date
    try {
      const freshUser = await api.getMe();
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(freshUser));
      dispatch({ type: 'SET_AUTH', token: state.token!, user: freshUser, hasCompletedOnboarding: true });
    } catch {
      dispatch({ type: 'COMPLETE_ONBOARDING' });
    }
  }, [state.token]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    dispatch({ type: 'LOGOUT' });
  }, []);

  const refreshUser = useCallback(async () => {
    if (!state.token) return;
    try {
      const freshUser = await api.getMe();
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(freshUser));
      dispatch({ type: 'REFRESH_USER', user: freshUser });
    } catch {
      // Ignore — user stays with cached data
    }
  }, [state.token]);

  const mergeUserFromApi = useCallback(async (user: ApiUser) => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    dispatch({ type: 'REFRESH_USER', user });
  }, []);

  const hydrate = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      const localOnboarding = await SecureStore.getItemAsync(ONBOARDING_KEY);
      let user = userJson ? JSON.parse(userJson) : null;

      if (token && user) {
        setApiTokenGetter(() => token);
        try {
          user = await api.getMe();
          await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        } catch {
          // Offline / token expired — fall back to cached user
        }
      }

      // Backend is the source of truth for onboarding completion.
      // Sync SecureStore if the two disagree.
      const backendComplete = user?.onboardingComplete === true;
      const localComplete = localOnboarding === 'true';
      let hasCompleted: boolean;

      if (backendComplete && !localComplete) {
        await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
        hasCompleted = true;
      } else if (!backendComplete && localComplete && user) {
        await SecureStore.deleteItemAsync(ONBOARDING_KEY);
        hasCompleted = false;
      } else {
        hasCompleted = backendComplete || localComplete;
      }

      dispatch({ type: 'HYDRATE', token, user, hasCompletedOnboarding: hasCompleted });
    } catch {
      dispatch({ type: 'HYDRATE', token: null, user: null, hasCompletedOnboarding: false });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, setAuth, completeOnboarding, logout, hydrate, refreshUser, mergeUserFromApi }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
