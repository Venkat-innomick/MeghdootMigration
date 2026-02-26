export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  CropAdvisory:
    | {
        advisoryId?: number;
        cropId?: number;
        cropCategoryId?: number;
        cropName?: string;
      }
    | undefined;
  CropFeedback: {
    advisoryId: number;
    userProfileId: number;
    feedbackId?: number;
    avgFeedback?: number;
  };
  CropAudioPlayer: {
    audioUrl: string;
    title?: string;
    imageUrl?: string;
  };
  CropImagePreview: {
    imageUrl: string;
  };
  Notifications: undefined;
  Search: undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Registration: undefined;
  Terms: undefined;
};

export type OnboardingStackParamList = {
  Language: undefined;
  OnboardingOne: undefined;
  OnboardingTwo: undefined;
  OnboardingThree: undefined;
};
