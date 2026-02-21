import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DashboardLocation, UserProfile } from '../types/domain';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface AppState {
  isHydrated: boolean;
  onboardingDone: boolean;
  language: string;
  user: UserProfile | null;
  locations: DashboardLocation[];
  setHydrated: (ready: boolean) => void;
  completeOnboarding: () => void;
  setLanguage: (language: string) => void;
  setUser: (user: UserProfile | null) => void;
  setLocations: (locations: DashboardLocation[]) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isHydrated: false,
      onboardingDone: false,
      language: 'en',
      user: null,
      locations: [],
      setHydrated: (ready) => set({ isHydrated: ready }),
      completeOnboarding: () => set({ onboardingDone: true }),
      setLanguage: (language) => set({ language }),
      setUser: (user) => set({ user }),
      setLocations: (locations) => set({ locations }),
      logout: () => set({ user: null }),
    }),
    {
      name: STORAGE_KEYS.auth,
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      migrate: (persistedState: any, version) => {
        // Force onboarding to show once after migration from older app state.
        if (version < 2 && persistedState) {
          return { ...persistedState, onboardingDone: false };
        }
        return persistedState as AppState;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    }
  )
);
