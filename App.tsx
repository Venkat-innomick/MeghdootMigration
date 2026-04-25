import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useBootstrap } from './src/hooks/useBootstrap';
import { usePushNotifications } from './src/hooks/usePushNotifications';
import {
  setupBackgroundMessaging,
  setupForegroundNotifications,
} from './src/utils/notification';

function PushNotificationsBootstrap() {
  usePushNotifications();
  return null;
}

export default function App() {
  const ready = useBootstrap();

  useEffect(() => {
    setupBackgroundMessaging();
    setupForegroundNotifications().catch(() => undefined);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <PushNotificationsBootstrap />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
