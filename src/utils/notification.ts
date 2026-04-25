import { PermissionsAndroid, Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import { getApps } from '@react-native-firebase/app';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

export const setupBackgroundMessaging = () => {
  if (!getApps().length) {
    return;
  }
  setBackgroundMessageHandler(getMessaging(), async () => {
    // Background remote notifications are handled by the OS; keep the handler registered.
  });
};

export const setupForegroundNotifications = async () => {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'default',
      name: 'Default',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
};

export const presentForegroundNotification = async (
  title: string,
  body: string,
  data: Record<string, unknown> = {},
) => {
  const notificationData = data as Record<string, string | number | object>;

  await notifee.displayNotification({
    title,
    body,
    data: notificationData,
    android: {
      channelId: 'default',
      pressAction: {
        id: 'default',
      },
      smallIcon: 'ic_notification',
      color: '#749C53',
      sound: 'default',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        alert: true,
        badge: false,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
};

export const subscribeToForegroundNotificationResponses = (
  listener: (data: Record<string, unknown>) => void,
) => {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.PRESS) {
      return;
    }

    const data = (detail.notification?.data || {}) as Record<string, unknown>;
    listener(data);
  });
};

const ensurePushPermissions = async () => {
  if (Platform.OS === 'android') {
    if (Platform.Version < 33) {
      return true;
    }

    const status = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return status === PermissionsAndroid.RESULTS.GRANTED;
  }

  const status = await requestPermission(getMessaging());
  if (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  ) {
    return true;
  }
  return false;
};

const getFirebaseMessagingToken = async () => {
  if (!getApps().length) {
    return null;
  }

  const token = await getToken(getMessaging());
  if (!token) {
    return null;
  }
  return token;
};

export const registerForPushNotifications = async () => {
  const granted = await ensurePushPermissions();
  if (!granted) {
    return null;
  }

  try {
    return await getFirebaseMessagingToken();
  } catch {
    return null;
  }
};

export const subscribeToPushTokenRefresh = (
  listener: (token: string) => void | Promise<void>,
) => {
  if (!getApps().length) {
    return () => undefined;
  }

  return onTokenRefresh(getMessaging(), (token) => {
    void listener(token);
  });
};
