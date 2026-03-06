import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './types';

export const rootNavigationRef = createNavigationContainerRef<RootStackParamList>();

export const navigateFromPush = (
  screen: keyof RootStackParamList,
  params?: RootStackParamList[keyof RootStackParamList],
) => {
  if (rootNavigationRef.isReady()) {
    rootNavigationRef.navigate(screen as any, params as any);
  }
};

