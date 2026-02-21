import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { OnboardingScreen } from './OnboardingScreen';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'OnboardingOne'>;

export const OnboardingOneScreen = ({ navigation }: Props) => {
  return (
    <OnboardingScreen
      title="Weather Forecast"
      description="Get district and block level weather forecast for better farm planning."
      image={require('../../../assets/images/ic_onBoardOne.png')}
      onNext={() => navigation.navigate('OnboardingTwo')}
      onSkip={() => navigation.navigate('OnboardingThree')}
    />
  );
};
