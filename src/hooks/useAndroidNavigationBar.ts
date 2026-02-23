import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as NavigationBar from 'expo-navigation-bar';

export const useAndroidNavigationBar = (
  activeColor: string,
  buttonStyle: 'light' | 'dark' = 'light'
) => {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android') {
        if (typeof NavigationBar.setBackgroundColorAsync === 'function') {
          NavigationBar.setBackgroundColorAsync(activeColor).catch(() => undefined);
        }
        if (typeof NavigationBar.setButtonStyleAsync === 'function') {
          NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => undefined);
        }
      }
      return undefined;
    }, [activeColor, buttonStyle])
  );
};
