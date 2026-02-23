import 'react-native-gesture-handler';
import React from 'react';
import { ActivityIndicator, Image, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { useBootstrap } from './src/hooks/useBootstrap';
import { colors } from './src/theme/colors';

export default function App() {
  const ready = useBootstrap();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.onBoard }}>
        <StatusBar style="light" backgroundColor={colors.onBoard} />
        <Image
          source={require('./assets/images/ic_splashScreen.png')}
          style={{ width: 200, height: 200 }}
          resizeMode="contain"
        />
        <ActivityIndicator color="#ffffff" style={{ marginTop: 12 }} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
