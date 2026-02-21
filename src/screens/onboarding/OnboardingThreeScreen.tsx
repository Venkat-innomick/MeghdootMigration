import React from 'react';
import { useAppStore } from '../../store/appStore';
import { OnboardingScreen } from './OnboardingScreen';

export const OnboardingThreeScreen = () => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  return (
    <OnboardingScreen
      title="Notifications"
      description="Get nowcast warnings and important weather alerts instantly."
      image={require('../../../assets/images/ic_onBoardThress.png')}
      onNext={completeOnboarding}
      onSkip={completeOnboarding}
    />
  );
};
