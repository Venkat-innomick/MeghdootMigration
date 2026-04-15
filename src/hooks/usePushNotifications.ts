import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { DrawerActions } from '@react-navigation/native';
import { useAppStore } from '../store/appStore';
import { notificationService } from '../api/services';
import { registerForPushNotifications } from '../utils/notification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { navigateFromPush, rootNavigationRef } from '../navigation/navigationRef';
import { getUserProfileId } from '../utils/locationApi';

const PUSH_TOKEN_KEY = 'agromet_push_token';

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
  const handledInitialResponseRef = useRef(false);

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

    const getNotificationText = (
      notification:
        | Notifications.Notification
        | Notifications.NotificationResponse['notification']
        | null
        | undefined,
    ) => {
      const content = notification?.request?.content;
      const data = (content?.data || {}) as Record<string, any>;
      const title =
        (typeof data.title === 'string' && data.title.trim()) ||
        (typeof content?.title === 'string' && content.title.trim()) ||
        'Notification';
      const message =
        (typeof data.body === 'string' && data.body.trim()) ||
        (typeof content?.body === 'string' && content.body.trim()) ||
        '';
      return { title, message };
    };

    const handleNotificationOpen = () => {
      openNowcast();
    };

    const handleInitialNotificationResponse = async () => {
      if (handledInitialResponseRef.current) return;
      const response = await Notifications.getLastNotificationResponseAsync();
      if (!response) return;
      handledInitialResponseRef.current = true;
      handleNotificationOpen();
    };

    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      if (foregroundAlertShownRef.current) return;
      foregroundAlertShownRef.current = true;
      const { title, message } = getNotificationText(event);
      Alert.alert(title, message, [
        {
          text: 'Open',
          onPress: () => {
            handleNotificationOpen();
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
      handledInitialResponseRef.current = true;
      handleNotificationOpen();
    });

    handleInitialNotificationResponse().catch(() => undefined);

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);
};
