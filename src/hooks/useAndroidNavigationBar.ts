import { useCallback } from 'react';
import { Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

let AndroidNavigationBar: any = null;
try {
  AndroidNavigationBar = require('expo-navigation-bar');
} catch {
  AndroidNavigationBar = null;
}

export const useAndroidNavigationBar = (
  activeColor: string,
  buttonStyle: 'light' | 'dark' = 'light'
) => {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS === 'android' && AndroidNavigationBar) {
        if (typeof AndroidNavigationBar.setBackgroundColorAsync === 'function') {
          AndroidNavigationBar.setBackgroundColorAsync(activeColor).catch(() => undefined);
        }
        if (typeof AndroidNavigationBar.setButtonStyleAsync === 'function') {
          AndroidNavigationBar.setButtonStyleAsync(buttonStyle).catch(() => undefined);
        }
      }
      return undefined;
    }, [activeColor, buttonStyle])
  );
};
