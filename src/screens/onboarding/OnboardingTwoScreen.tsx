import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingTwo'>;

export const OnboardingTwoScreen = ({ navigation }: Props) => {
  return (
    <OnboardingScreen
      title="Crop Advisory"
      description="View crop advisories in simple language for your selected location."
      image={require('../../../assets/images/ic_onBoardTwo.png')}
      onNext={() => navigation.navigate('OnboardingThree')}
      onSkip={() => navigation.navigate('OnboardingThree')}
    />
  );
};
