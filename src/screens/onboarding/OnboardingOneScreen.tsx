import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';
import { useAppStore } from '../../store/appStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingOne'>;

export const OnboardingOneScreen = ({ navigation }: Props) => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const handleSkip = () => {
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
      title="Get Accurate Cropping Advisory"
      description="Location specific weather based accurate crop advisories translated by Expert panels are integrated with the app for farmer’s guidance on cultural practices. District and block level advisories are also available for livestock, fisheries, aquaculture, sericulture & apiculture."
      image={require('../../../assets/images/ic_onBoardOne.png')}
      onNext={() => navigation.navigate('OnboardingTwo')}
      onSkip={handleSkip}
    />
  );
};
