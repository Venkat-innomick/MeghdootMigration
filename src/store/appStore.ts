import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { DashboardLocation, UserProfile } from '../types/domain';
import { STORAGE_KEYS } from '../constants/storageKeys';

interface SelectedLocationRef {
  districtID: number;
  blockID: number;
  asdID: number;
}

interface CurrentLocationOverride {
  latitude: number;
  longitude: number;
}

interface AppState {
  isHydrated: boolean;
  onboardingDone: boolean;
  onboardingStarted: boolean;
  language: string;
  user: UserProfile | null;
  locations: DashboardLocation[];
  selectedLocation: SelectedLocationRef | null;
  promotedLocation: SelectedLocationRef | null;
  currentLocationOverride: CurrentLocationOverride | null;
  temporarySearchLocations: DashboardLocation[];
  temporarySearchAdvisories: any[];
  setHydrated: (ready: boolean) => void;
  beginOnboarding: () => void;
  completeOnboarding: () => void;
  setLanguage: (language: string) => void;
  setUser: (user: UserProfile | null) => void;
  setLocations: (locations: DashboardLocation[]) => void;
  setSelectedLocation: (location: SelectedLocationRef | null) => void;
  setPromotedLocation: (location: SelectedLocationRef | null) => void;
  setCurrentLocationOverride: (location: CurrentLocationOverride | null) => void;
  setTemporarySearchData: (payload: {
    locations: DashboardLocation[];
    advisories: any[];
  }) => void;
  clearTemporarySearchData: () => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isHydrated: false,
  onboardingDone: false,
  onboardingStarted: false,
  language: 'en',
  user: null,
  locations: [],
  selectedLocation: null,
  promotedLocation: null,
  currentLocationOverride: null,
  temporarySearchLocations: [],
  temporarySearchAdvisories: [],
  setHydrated: (ready) => set({ isHydrated: ready }),
  beginOnboarding: () => {
    AsyncStorage.setItem(STORAGE_KEYS.onboardingStarted, 'true').catch(() => undefined);
    set({ onboardingStarted: true });
  },
  completeOnboarding: () => {
    AsyncStorage.setItem(STORAGE_KEYS.onboardingDone, 'true').catch(() => undefined);
    AsyncStorage.setItem(STORAGE_KEYS.onboardingStarted, 'true').catch(() => undefined);
    set({ onboardingDone: true, onboardingStarted: true });
  },
  setLanguage: (language) => {
    AsyncStorage.setItem(STORAGE_KEYS.language, language).catch(() => undefined);
    set({
      language,
      temporarySearchLocations: [],
      temporarySearchAdvisories: [],
      promotedLocation: null,
    });
  },
  setUser: (user) => {
    if (user) {
      AsyncStorage.setItem(
        STORAGE_KEYS.loggedInUser,
        JSON.stringify(user),
      ).catch(() => undefined);
    } else {
      AsyncStorage.removeItem(STORAGE_KEYS.loggedInUser).catch(() => undefined);
    }
    set({ user });
  },
  setLocations: (locations) => set({ locations }),
  setSelectedLocation: (selectedLocation) => set({ selectedLocation }),
  setPromotedLocation: (promotedLocation) => set({ promotedLocation }),
  setCurrentLocationOverride: (currentLocationOverride) =>
    set({ currentLocationOverride }),
  setTemporarySearchData: ({ locations, advisories }) =>
    set({
      temporarySearchLocations: locations,
      temporarySearchAdvisories: advisories,
    }),
  clearTemporarySearchData: () =>
    set({ temporarySearchLocations: [], temporarySearchAdvisories: [] }),
  logout: () =>
    set({
      user: null,
      selectedLocation: null,
      promotedLocation: null,
      currentLocationOverride: null,
      locations: [],
      temporarySearchLocations: [],
      temporarySearchAdvisories: [],
    }),
}));
