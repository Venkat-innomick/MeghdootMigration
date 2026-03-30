import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { OnboardingStackParamList } from '../../navigation/types';
import { useAppStore } from '../../store/appStore';
import { OnboardingScreen } from './OnboardingScreen';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingThree'>;

export const OnboardingThreeScreen = ({ navigation }: Props) => {
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const finishOnboarding = async () => {
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
      titleKey="onboarding.titleOnBoardThree"
      descriptionKey="onboarding.discrptionOnBoardThree"
      image={require('../../../assets/images/ic_onBoardThress.png')}
      onNext={finishOnboarding}
      onSkip={finishOnboarding}
    />
  );
};
