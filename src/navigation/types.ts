import { DistrictWarningItem } from "../types/domain";

export type RootStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  CropAdvisory:
    | {
        advisoryId?: number;
        cropId?: number;
        cropCategoryId?: number;
        cropName?: string;
        stateID?: number;
        districtID?: number;
        blockID?: number;
        asdID?: number;
        items?: any[];
        initialIndex?: number;
        fromFavourites?: boolean;
      }
    | undefined;
  CropFeedback: {
    advisoryId: number;
    userProfileId: number;
    feedbackId?: number;
    userRating?: number;
    onSubmitted?: (payload: { feedbackId: number; userRating: number }) => void;
  };
  CropAudioPlayer: {
    audioUrl: string;
    title?: string;
    imageUrl?: string;
  };
  CropImagePreview: {
    imageUrl: string;
  };
  AllCrops: undefined;
  Favourites: undefined;
  Nowcast:
    | {
        items?: any[];
        location?: string;
      }
    | undefined;
  Notifications: undefined;
  WarningAlerts:
    | {
        items: DistrictWarningItem[];
        location?: string;
      }
    | undefined;
  Disclaimer: undefined;
  About: undefined;
  Search: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Registration:
    | {
        selectedLanguageCode?: string;
      }
    | undefined;
  Terms: undefined;
};

export type OnboardingStackParamList = {
  Language: undefined;
  OnboardingOne: undefined;
  OnboardingTwo: undefined;
  OnboardingThree: undefined;
};
