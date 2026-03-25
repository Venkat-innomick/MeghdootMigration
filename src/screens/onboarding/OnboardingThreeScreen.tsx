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
      titleKey="onboarding.titleOnBoardThree"
      descriptionKey="onboarding.discrptionOnBoardThree"
      image={require('../../../assets/images/ic_onBoardThress.png')}
      onNext={finishOnboarding}
      onSkip={finishOnboarding}
    />
  );
};
