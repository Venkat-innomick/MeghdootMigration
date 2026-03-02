import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { OnboardingScreen } from './OnboardingScreen';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingThree'>;

export const OnboardingThreeScreen = ({ navigation }: Props) => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const finishOnboarding = () => {
    completeOnboarding();
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  };

  return (
    <OnboardingScreen
      title="Real Time Weather Update"
      description="The app displayed a quantitative weather forecast for critical weather parameters (rainfall, temperatures, wind, relative humidity, and cloudiness) for the next five days, encompassing all districts and blocks across the country."
      image={require('../../../assets/images/ic_onBoardThress.png')}
      onNext={finishOnboarding}
      onSkip={finishOnboarding}
    />
  );
};
