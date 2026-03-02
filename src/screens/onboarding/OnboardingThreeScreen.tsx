import React from 'react';
import { useAppStore } from '../../store/appStore';
import { OnboardingScreen } from './OnboardingScreen';

export const OnboardingThreeScreen = () => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  return (
    <OnboardingScreen
      title="Real Time Weather Update"
      description="The app displayed a quantitative weather forecast for critical weather parameters (rainfall, temperatures, wind, relative humidity, and cloudiness) for the next five days, encompassing all districts and blocks across the country."
      image={require('../../../assets/images/ic_onBoardThress.png')}
      onNext={completeOnboarding}
      onSkip={completeOnboarding}
    />
  );
};
