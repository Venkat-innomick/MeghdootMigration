import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import '../locales/i18n';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useAppStore } from '../store/appStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const useBootstrap = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const startedAt = Date.now();
      let storedUser: any = null;
      let onboardingDone = false;
      let storedLanguage = 'en';
      let onboardingStarted = false;

      try {
        const directUser = await AsyncStorage.getItem(STORAGE_KEYS.loggedInUser);
        storedUser = directUser ? JSON.parse(directUser) : null;
      } catch {
        storedUser = null;
      }

      try {
        onboardingDone =
          (await AsyncStorage.getItem(STORAGE_KEYS.onboardingDone)) === 'true';
      } catch {
        onboardingDone = false;
      }

      try {
        storedLanguage =
          (await AsyncStorage.getItem(STORAGE_KEYS.language)) || 'en';
      } catch {
        storedLanguage = 'en';
      }

      try {
        onboardingStarted =
          (await AsyncStorage.getItem(STORAGE_KEYS.onboardingStarted)) === 'true';
      } catch {
        onboardingStarted = false;
      }

      await Font.loadAsync({
        RobotoRegular: require('../../assets/fonts/Roboto-Regular.ttf'),
        RobotoMedium: require('../../assets/fonts/Roboto-Medium.ttf'),
        RobotoLight: require('../../assets/fonts/Roboto-Light.ttf'),
        RobotoCondensed: require('../../assets/fonts/RobotoCondensed-Regular.ttf'),
      });
      if (mounted) {
        useAppStore.setState({
          isHydrated: true,
          user: storedUser,
          language: storedLanguage,
          onboardingDone,
          onboardingStarted,
        });
        const remainingDelay = Math.max(0, 4000 - (Date.now() - startedAt));
        if (remainingDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingDelay));
        }
        setReady(true);
        await SplashScreen.hideAsync();
      }
    };

    init().catch(async () => {
      if (mounted) {
        setReady(true);
        await SplashScreen.hideAsync().catch(() => undefined);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return ready;
};
