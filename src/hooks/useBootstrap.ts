import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import '../locales/i18n';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

export const useBootstrap = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      await Font.loadAsync({
        RobotoRegular: require('../../assets/fonts/Roboto-Regular.ttf'),
        RobotoMedium: require('../../assets/fonts/Roboto-Medium.ttf'),
        RobotoLight: require('../../assets/fonts/Roboto-Light.ttf'),
        RobotoCondensed: require('../../assets/fonts/RobotoCondensed-Regular.ttf'),
      });
      if (mounted) {
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
