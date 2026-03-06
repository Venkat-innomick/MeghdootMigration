import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const registerForPushNotifications = async () => {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;

  if (settings.status !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Keep old Xamarin behavior: send raw platform token only (FCM/APNS).
  try {
    const deviceToken = await Notifications.getDevicePushTokenAsync();
    const data =
      typeof deviceToken?.data === 'string'
        ? deviceToken.data
        : String(deviceToken?.data || '');
    if (data) return data;
  } catch {
    return null;
  }
  return null;
};
