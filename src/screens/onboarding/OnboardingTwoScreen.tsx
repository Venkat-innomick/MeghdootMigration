import React from 'react';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';
import { useAppStore } from '../../store/appStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTwo'>;

export const OnboardingTwoScreen = ({ navigation }: Props) => {
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
      title="Supports Different Languages"
      description="The app facilitates the information in English and 12 Indian languages (Hindi, Telugu, Assamese, Gujarati, Kannada, Malayalam, Marathi, Odia, Tamil, Mizo, Bengali and Punjabi). It is a user-friendly interface for easy navigation and querying by farmers."
      image={require('../../../assets/images/ic_onBoardTwo.png')}
      onNext={() => navigation.navigate('OnboardingThree')}
      onSkip={handleSkip}
    />
  );
};
