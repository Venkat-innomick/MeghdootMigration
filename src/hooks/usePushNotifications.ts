import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DrawerActions } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { notificationService } from '../api/services';
import { registerForPushNotifications } from '../utils/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateFromPush, rootNavigationRef } from '../navigation/navigationRef';

const PUSH_TOKEN_KEY = 'agromet_push_token';

const getUserProfileId = (user: any) =>
  Number(
    user?.userProfileId ??
      user?.UserProfileID ??
      user?.typeOfRole ??
      user?.TypeOfRole ??
      0,
  );

export const unregisterPushTokenForUser = async (userProfileId: number) => {
  if (!userProfileId) return;
  const token = (await AsyncStorage.getItem(PUSH_TOKEN_KEY)) || '';
  if (!token) return;

  try {
    await notificationService.deleteToken({
      Id: 0,
      UserProfileId: userProfileId,
      Token: token,
    });
  } catch {
    // Keep logout flow resilient.
  }

  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
};

export const usePushNotifications = () => {
  const user = useAppStore((s) => s.user);
  const userProfileId = getUserProfileId(user);
  const inFlightRef = useRef(false);
  const registeredRef = useRef(false);
  const foregroundAlertShownRef = useRef(false);

  useEffect(() => {
    if (!userProfileId) {
      registeredRef.current = false;
      return;
    }
    if (inFlightRef.current || registeredRef.current) return;

    const register = async () => {
      inFlightRef.current = true;
      try {
        const token = await registerForPushNotifications();
        if (!token) return;

        await notificationService.addOrUpdateToken({
          Id: 0,
          UserProfileId: userProfileId,
          Token: token,
        });

        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
        registeredRef.current = true;
      } catch {
        // Notification registration must not crash app flow.
      } finally {
        inFlightRef.current = false;
      }
    };

    register().catch(() => {
      inFlightRef.current = false;
    });
  }, [userProfileId]);

  useEffect(() => {
    const openNowcast = () => {
      navigateFromPush('Main');
      setTimeout(() => {
        if (rootNavigationRef.isReady()) {
          rootNavigationRef.dispatch(DrawerActions.jumpTo('Nowcast'));
        }
      }, 80);
    };

    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      if (foregroundAlertShownRef.current) return;
      foregroundAlertShownRef.current = true;
      const title = event.request.content.title || 'Notification';
      const message = event.request.content.body || '';
      Alert.alert(title, message, [
        {
          text: 'Open',
          onPress: () => {
            openNowcast();
            foregroundAlertShownRef.current = false;
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {
            foregroundAlertShownRef.current = false;
          },
        },
      ]);
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(() => {
      openNowcast();
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);
};
