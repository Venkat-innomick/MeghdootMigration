import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { OnboardingStackParamList } from '../../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';
import { useAppStore } from '../../store/appStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTwo'>;

export const OnboardingTwoScreen = ({ navigation }: Props) => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const handleSkip = async () => {
    completeOnboarding();
    await AsyncStorage.setItem(STORAGE_KEYS.onboardingDone, 'true');
    navigation.getParent()?.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      })
    );
  };

  return (
    <OnboardingScreen
      titleKey="onboarding.titleOnBoardTwo"
      descriptionKey="onboarding.discrptionOnBoardTwo"
      image={require('../../../assets/images/ic_onBoardTwo.png')}
      onNext={() => navigation.navigate('OnboardingThree')}
      onSkip={handleSkip}
    />
  );
};
