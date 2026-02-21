import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export const registerForPushNotifications = async () => {
  const settings = await Notifications.getPermissionsAsync();
  let finalStatus = settings.status;

  if (settings.status !== 'granted') {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: Constants.expoConfig?.extra?.eas?.projectId,
  });

  return token.data;
};
