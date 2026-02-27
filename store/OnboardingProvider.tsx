import React, { createContext, useCallback, useContext, useReducer, useRef } from 'react';
import { API_BASE_URL } from '@/constants/api';
import { api } from '@/lib/api';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PetOption {
  name: string;
  vibe: string;
  category: string;
  special: boolean;
  baseColor: string;
  secondaryColor: string;
  image: string | null;
}

export interface OnboardingData {
  name: string;
  personalityVibe: string;
  companionStyle: string;
  phone: string;
  gender: string;
  birthday: string;
  heightFeet: number;
  heightInches: number;
  currentWeight: number;
  goalWeight: number;
  activityLevel: string;
  goals: string[];
  dietary: string[];
  selectedPet: PetOption | null;
  /** User-chosen nickname for their pet (set on the pet-name screen) */
  petCustomName: string;
}

interface PetGenState {
  petOptions: PetOption[];
  petGenLoading: boolean;
  petGenError: string;
}

/** Whether the user is going through full onboarding or just signing in */
export type OnboardingMode = 'onboarding' | 'signin';

interface OnboardingActions {
  setField: <K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => void;
  toggleArrayItem: (key: 'goals' | 'dietary', item: string) => void;
  getData: () => OnboardingData;
  reset: () => void;
  setPetOptions: (pets: PetOption[]) => void;
  setPetGenLoading: (loading: boolean) => void;
  setPetGenError: (error: string) => void;
  startPetGeneration: (token: string, personalityVibe: string, companionStyle: string) => void;
  setMode: (mode: OnboardingMode) => void;
  /**
   * Fire-and-forget save of current onboarding data + the step the user
   * just completed. No-op if user isn't authenticated yet.
   */
  saveProgress: (stepName: string) => void;
  /**
   * Hydrates provider state from the backend OnboardingProfile.
   * Call on app relaunch when the user is authenticated but onboarding
   * is incomplete, so they can resume where they left off.
   */
  hydrateFromBackend: () => Promise<void>;
}

type OnboardingContextValue = OnboardingData & PetGenState & { mode: OnboardingMode } & OnboardingActions;

type Action =
  | { type: 'SET_FIELD'; key: string; value: unknown }
  | { type: 'TOGGLE_ARRAY'; key: 'goals' | 'dietary'; item: string }
  | { type: 'SET_PET_OPTIONS'; pets: PetOption[] }
  | { type: 'SET_PET_GEN_LOADING'; loading: boolean }
  | { type: 'SET_PET_GEN_ERROR'; error: string }
  | { type: 'SET_MODE'; mode: OnboardingMode }
  | { type: 'HYDRATE'; data: Partial<OnboardingData> }
  | { type: 'RESET' };

// ─── Defaults ───────────────────────────────────────────────────────────────

const initialData: OnboardingData = {
  name: '',
  personalityVibe: '',
  companionStyle: '',
  phone: '',
  gender: '',
  birthday: '',
  heightFeet: 5,
  heightInches: 6,
  currentWeight: 150,
  goalWeight: 0,
  activityLevel: '',
  goals: [],
  dietary: [],
  selectedPet: null,
  petCustomName: '',
};

const initialPetGen: PetGenState = {
  petOptions: [],
  petGenLoading: false,
  petGenError: '',
};

type FullState = OnboardingData & PetGenState & { mode: OnboardingMode };

const initialState: FullState = { ...initialData, ...initialPetGen, mode: 'onboarding' };

// ─── Reducer ────────────────────────────────────────────────────────────────

function onboardingReducer(state: FullState, action: Action): FullState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.key]: action.value };
    case 'TOGGLE_ARRAY': {
      const current = state[action.key];
      const next = current.includes(action.item)
        ? current.filter((i) => i !== action.item)
        : [...current, action.item];
      return { ...state, [action.key]: next };
    }
    case 'SET_PET_OPTIONS':
      return { ...state, petOptions: action.pets, petGenLoading: false, petGenError: '' };
    case 'SET_PET_GEN_LOADING':
      return { ...state, petGenLoading: action.loading };
    case 'SET_PET_GEN_ERROR':
      return { ...state, petGenError: action.error, petGenLoading: false };
    case 'SET_MODE':
      return { ...state, mode: action.mode };
    case 'HYDRATE':
      return { ...state, ...action.data };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ─── Context ────────────────────────────────────────────────────────────────

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ─── Provider ───────────────────────────────────────────────────────────────

/**
 * Ephemeral provider for multi-step onboarding form data.
 * Also manages background pet image generation state.
 * Cleared after the user completes onboarding and data is sent to the backend.
 */
export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(onboardingReducer, initialState);
  const abortRef = useRef<AbortController | null>(null);

  const setField = useCallback(<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) => {
    dispatch({ type: 'SET_FIELD', key, value });
  }, []);

  const toggleArrayItem = useCallback((key: 'goals' | 'dietary', item: string) => {
    dispatch({ type: 'TOGGLE_ARRAY', key, item });
  }, []);

  const getData = useCallback((): OnboardingData => ({
    name: state.name,
    personalityVibe: state.personalityVibe,
    companionStyle: state.companionStyle,
    phone: state.phone,
    gender: state.gender,
    birthday: state.birthday,
    heightFeet: state.heightFeet,
    heightInches: state.heightInches,
    currentWeight: state.currentWeight,
    goalWeight: state.goalWeight,
    activityLevel: state.activityLevel,
    goals: state.goals,
    dietary: state.dietary,
    selectedPet: state.selectedPet,
    petCustomName: state.petCustomName,
  }), [state]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: 'RESET' });
  }, []);

  const setPetOptions = useCallback((pets: PetOption[]) => {
    dispatch({ type: 'SET_PET_OPTIONS', pets });
  }, []);

  const setPetGenLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_PET_GEN_LOADING', loading });
  }, []);

  const setPetGenError = useCallback((error: string) => {
    dispatch({ type: 'SET_PET_GEN_ERROR', error });
  }, []);

  const setMode = useCallback((mode: OnboardingMode) => {
    dispatch({ type: 'SET_MODE', mode });
  }, []);

  /**
   * Fire-and-forget: persists current onboarding data + the step name to
   * the backend so we can track drop-off. Silently no-ops if the user
   * isn't authenticated yet (pre-verify steps).
   */
  const saveProgress = useCallback(
    (stepName: string) => {
      const data: Record<string, unknown> = {
        name: state.name || undefined,
        personalityVibe: state.personalityVibe || undefined,
        companionStyle: state.companionStyle || undefined,
        gender: state.gender || undefined,
        birthday: state.birthday || undefined,
        heightFeet: state.heightFeet,
        heightInches: state.heightInches,
        currentWeight: state.currentWeight,
        goalWeight: state.goalWeight,
        activityLevel: state.activityLevel || undefined,
        goals: state.goals.length ? state.goals : undefined,
        dietary: state.dietary.length ? state.dietary : undefined,
      };

      api.saveOnboardingProgress(stepName, data).catch(() => {
        // Silent — user may not be authenticated yet
      });
    },
    [state],
  );

  /**
   * Hydrates the onboarding provider from the backend OnboardingProfile.
   * Maps backend field names → provider field names and dispatches a
   * single HYDRATE action. No-op if the profile doesn't exist yet.
   */
  const hydrateFromBackend = useCallback(async () => {
    try {
      const { profile } = await api.getOnboardingProgress();
      if (!profile) return;

      const data: Partial<OnboardingData> = {};
      if (profile.displayName)      data.name = profile.displayName;
      if (profile.personalityVibe)   data.personalityVibe = profile.personalityVibe;
      if (profile.companionStyle)    data.companionStyle = profile.companionStyle;
      if (profile.gender)            data.gender = profile.gender;
      if (profile.birthday)          data.birthday = profile.birthday;
      if (profile.heightFeet != null) data.heightFeet = profile.heightFeet;
      if (profile.heightInches != null) data.heightInches = profile.heightInches;
      if (profile.currentWeight)     data.currentWeight = profile.currentWeight;
      if (profile.goalWeight)        data.goalWeight = profile.goalWeight;
      if (profile.activityLevel)     data.activityLevel = profile.activityLevel;
      if (profile.goals?.length)     data.goals = profile.goals;
      if (profile.dietary?.length)   data.dietary = profile.dietary;

      dispatch({ type: 'HYDRATE', data });
    } catch {
      // Silent — user may not be authenticated
    }
  }, []);

  /**
   * Fires off pet generation in the background.
   * Called right after phone verification succeeds.
   * Images generate while the user fills out the remaining onboarding screens.
   */
  const startPetGeneration = useCallback(
    (token: string, personalityVibe: string, companionStyle: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'SET_PET_GEN_LOADING', loading: true });

      fetch(`${API_BASE_URL}/pets/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ personalityVibe, companionStyle }),
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((json) => {
          if (!controller.signal.aborted) {
            if (json.success && json.data?.pets) {
              dispatch({ type: 'SET_PET_OPTIONS', pets: json.data.pets });
            } else {
              dispatch({
                type: 'SET_PET_GEN_ERROR',
                error: json.message ?? 'Failed to generate pets',
              });
            }
          }
        })
        .catch((err) => {
          if (!controller.signal.aborted) {
            dispatch({ type: 'SET_PET_GEN_ERROR', error: err.message ?? 'Network error' });
          }
        });
    },
    [],
  );

  return (
    <OnboardingContext.Provider
      value={{
        ...state,
        setField,
        toggleArrayItem,
        getData,
        reset,
        setPetOptions,
        setPetGenLoading,
        setPetGenError,
        startPetGeneration,
        setMode,
        saveProgress,
        hydrateFromBackend,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used within <OnboardingProvider>');
  return ctx;
}
