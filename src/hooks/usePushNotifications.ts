import { useEffect, useRef } from 'react';
import {
  getInitialNotification,
  getMessaging,
  onMessage,
  onNotificationOpenedApp,
} from '@react-native-firebase/messaging';
import { useAppStore } from '../store/appStore';
import { notificationService } from '../api/services';
import {
  presentForegroundNotification,
  registerForPushNotifications,
  subscribeToForegroundNotificationResponses,
  subscribeToPushTokenRefresh,
} from '../utils/notification';
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
  const triggerNowcastRefresh = useAppStore((s) => s.triggerNowcastRefresh);
  const userProfileId = getUserProfileId(user);
  const inFlightRef = useRef(false);
  const registeredRef = useRef(false);
  const handledInitialResponseRef = useRef(false);

  useEffect(() => {
    if (!userProfileId) return;

    const unsubscribe = subscribeToPushTokenRefresh(async (token) => {
      if (!token) return;
      try {
        await notificationService.addOrUpdateToken({
          Id: 0,
          UserProfileId: userProfileId,
          Token: token,
        });
        await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
      } catch {
        // Ignore token refresh failures; next app start will retry registration.
      }
    });

    return unsubscribe;
  }, [userProfileId]);

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
    const openScreenWhenReady = (
      screen: 'Nowcast' | 'Notifications',
      attempts = 0,
    ) => {
      if (rootNavigationRef.isReady()) {
        navigateFromPush(screen);
        return;
      }

      if (attempts >= 10) {
        return;
      }

      setTimeout(() => {
        openScreenWhenReady(screen, attempts + 1);
      }, 120);
    };

    const openNowcast = () => {
      // Xamarin always routes notification taps through the nowcast flow
      // and refreshes the page when it is already visible.
      triggerNowcastRefresh();
      openScreenWhenReady('Nowcast');
    };

    const getNotificationData = (message: any | null | undefined) =>
      (message?.data || {}) as Record<string, any>;

    const getNotificationText = (remoteMessage: any | null | undefined) => {
      const notification = remoteMessage?.notification;
      const data = getNotificationData(remoteMessage);
      const title =
        (typeof data.title === 'string' && data.title.trim()) ||
        (typeof notification?.title === 'string' && notification.title.trim()) ||
        'Notification';
      const body =
        (typeof data.body === 'string' && data.body.trim()) ||
        (typeof notification?.body === 'string' && notification.body.trim()) ||
        '';
      return { title, body };
    };

    const handleNotificationOpenFromData = (data: Record<string, any>) => {
      void data;
      openNowcast();
    };

    const handleNotificationOpen = (message: any | null | undefined) => {
      const data = getNotificationData(message);
      handleNotificationOpenFromData(data);
    };

    const handleInitialNotificationResponse = async () => {
      if (handledInitialResponseRef.current) return;
      const message = await getInitialNotification(getMessaging());
      if (!message) return;
      handledInitialResponseRef.current = true;
      handleNotificationOpen(message);
    };

    const receivedSub = onMessage(getMessaging(), (message) => {
      const { title, body } = getNotificationText(message);
      presentForegroundNotification(title, body, getNotificationData(message)).catch(
        () => undefined,
      );
    });

    const responseSub = onNotificationOpenedApp(getMessaging(), (message) => {
      handledInitialResponseRef.current = true;
      handleNotificationOpen(message);
    });

    const foregroundResponseSub = subscribeToForegroundNotificationResponses((data) => {
      handleNotificationOpenFromData(data);
    });

    handleInitialNotificationResponse().catch(() => undefined);

    return () => {
      receivedSub();
      responseSub();
      foregroundResponseSub();
    };
  }, [triggerNowcastRefresh]);
};
