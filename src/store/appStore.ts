import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DashboardLocation, UserProfile } from '../types/domain';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface SelectedLocationRef {
  districtID: number;
  blockID: number;
  asdID: number;
}

interface AppState {
  isHydrated: boolean;
  onboardingDone: boolean;
  onboardingStarted: boolean;
  language: string;
  user: UserProfile | null;
  locations: DashboardLocation[];
  selectedLocation: SelectedLocationRef | null;
  setHydrated: (ready: boolean) => void;
  beginOnboarding: () => void;
  completeOnboarding: () => void;
  setLanguage: (language: string) => void;
  setUser: (user: UserProfile | null) => void;
  setLocations: (locations: DashboardLocation[]) => void;
  setSelectedLocation: (location: SelectedLocationRef | null) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isHydrated: false,
      onboardingDone: false,
      onboardingStarted: false,
      language: 'en',
      user: null,
      locations: [],
      selectedLocation: null,
      setHydrated: (ready) => set({ isHydrated: ready }),
      beginOnboarding: () => set({ onboardingStarted: true }),
      completeOnboarding: () => set({ onboardingDone: true, onboardingStarted: true }),
      setLanguage: (language) => set({ language }),
      setUser: (user) => set({ user }),
      setLocations: (locations) => set({ locations }),
      setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
      logout: () => set({ user: null, selectedLocation: null, locations: [] }),
    }),
    {
      name: STORAGE_KEYS.auth,
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version) => {
        // Force onboarding to show once after migration from older app state.
        if (version < 2 && persistedState) {
          return {
            ...persistedState,
            onboardingDone: false,
            onboardingStarted: false,
            selectedLocation: null,
          };
        }
        if (version < 3 && persistedState) {
          return { ...persistedState, onboardingStarted: false, selectedLocation: null };
        }
        if (version < 4 && persistedState) {
          return {
            ...persistedState,
            onboardingStarted: Boolean(
              persistedState.onboardingStarted ??
                (persistedState.onboardingDone ? true : persistedState.language)
            ),
          };
        }
        return persistedState as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
