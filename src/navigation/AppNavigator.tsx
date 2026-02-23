import React from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import { RootStackParamList, AuthStackParamList, OnboardingStackParamList } from './types';
import { useAppStore } from '../store/appStore';
import { colors } from '../theme/colors';

import { LanguageSelectionScreen } from '../screens/onboarding/LanguageSelectionScreen';
import { OnboardingOneScreen } from '../screens/onboarding/OnboardingOneScreen';
import { OnboardingTwoScreen } from '../screens/onboarding/OnboardingTwoScreen';
import { OnboardingThreeScreen } from '../screens/onboarding/OnboardingThreeScreen';

import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegistrationScreen } from '../screens/auth/RegistrationScreen';
import { TermsScreen } from '../screens/auth/TermsScreen';
import { ProfileScreen } from '../screens/auth/ProfileScreen';

import { DashboardScreen } from '../screens/home/DashboardScreen';
import { PastWeatherScreen } from '../screens/home/PastWeatherScreen';
import { ForecastScreen } from '../screens/home/ForecastScreen';
import { LocationsScreen } from '../screens/home/LocationsScreen';

import { AllCropsScreen } from '../screens/menu/AllCropsScreen';
import { FavouritesScreen } from '../screens/menu/FavouritesScreen';
import { NowcastScreen } from '../screens/notification/NowcastScreen';
import { NotificationsScreen } from '../screens/notification/NotificationsScreen';
import { DisclaimerScreen } from '../screens/menu/DisclaimerScreen';
import { AboutScreen } from '../screens/menu/AboutScreen';
import { CropAdvisoryScreen } from '../screens/crop/CropAdvisoryScreen';
import { CropFeedbackScreen } from '../screens/crop/CropFeedbackScreen';
import { CropAudioPlayerScreen } from '../screens/crop/CropAudioPlayerScreen';
import { CropImagePreviewScreen } from '../screens/crop/CropImagePreviewScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { LanguageSettingsScreen } from '../screens/menu/LanguageSettingsScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Drawer = createDrawerNavigator();
const Tabs = createBottomTabNavigator();

const setAndroidNavBar = (backgroundColor: string, buttonStyle: 'light' | 'dark') => {
  if (typeof NavigationBar.setBackgroundColorAsync === 'function') {
    NavigationBar.setBackgroundColorAsync(backgroundColor).catch(() => undefined);
  }
  if (typeof NavigationBar.setButtonStyleAsync === 'function') {
    NavigationBar.setButtonStyleAsync(buttonStyle).catch(() => undefined);
  }
};

const MainHeader = ({ navigation, title }: any) => ({
  title,
  headerStyle: { backgroundColor: colors.primary },
  headerTintColor: '#fff',
  headerTitleStyle: { fontFamily: 'RobotoMedium', fontSize: 18 },
  headerLeft: () => (
    <Pressable onPress={() => navigation.openDrawer()} style={{ marginLeft: 8 }}>
      <Image source={require('../../assets/images/menu.png')} style={{ width: 25, height: 25 }} resizeMode="contain" />
    </Pressable>
  ),
  headerRight: () => (
    <Pressable onPress={() => navigation.getParent()?.navigate('Search')} style={{ marginRight: 8 }}>
      <Image source={require('../../assets/images/ic_search.png')} style={{ width: 25, height: 25 }} resizeMode="contain" />
    </Pressable>
  ),
});

const HomeTabs = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tabs.Navigator
      screenOptions={({ route, navigation }) => ({
        ...MainHeader({ navigation, title: 'MEGHDOOT' }),
        tabBarStyle: {
          backgroundColor: colors.darkGreen,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 6),
          height: 64 + Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: colors.lightYellow,
        tabBarInactiveTintColor: '#fff',
        tabBarLabelStyle: { fontSize: 12, fontFamily: 'RobotoRegular', marginBottom: 2 },
        tabBarIcon: ({ focused }) => {
          let icon = require('../../assets/images/ic_home.png');
          if (route.name === 'Home') {
            icon = focused
              ? require('../../assets/images/ic_homeYellow.png')
              : require('../../assets/images/ic_home.png');
          } else if (route.name === 'PastWeather') {
            icon = focused
              ? require('../../assets/images/ic_pastweatherYellow.png')
              : require('../../assets/images/ic_pastweather.png');
          } else if (route.name === 'Forecast') {
            icon = focused
              ? require('../../assets/images/ic_forecastYellow.png')
              : require('../../assets/images/ic_forecast.png');
          } else if (route.name === 'Locations') {
            icon = focused
              ? require('../../assets/images/ic_locationYellow.png')
              : require('../../assets/images/ic_location.png');
          }
          return <Image source={icon} style={{ width: 20, height: 20 }} resizeMode="contain" />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ title: 'Home' }} />
      <Tabs.Screen name="PastWeather" component={PastWeatherScreen} options={{ title: 'Past Weather' }} />
      <Tabs.Screen name="Forecast" component={ForecastScreen} options={{ title: 'Forecast' }} />
      <Tabs.Screen name="Locations" component={LocationsScreen} options={{ title: 'Locations' }} />
    </Tabs.Navigator>
  );
};

const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Registration" component={RegistrationScreen} />
      <AuthStack.Screen name="Terms" component={TermsScreen} />
    </AuthStack.Navigator>
  );
};

const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Language" component={LanguageSelectionScreen} />
      <OnboardingStack.Screen name="OnboardingOne" component={OnboardingOneScreen} />
      <OnboardingStack.Screen name="OnboardingTwo" component={OnboardingTwoScreen} />
      <OnboardingStack.Screen name="OnboardingThree" component={OnboardingThreeScreen} />
    </OnboardingStack.Navigator>
  );
};

const MenuContent = (props: any) => {
  const logout = useAppStore((s) => s.logout);
  const user = useAppStore((s) => s.user);
  const goMenu = (screen: string) => {
    setAndroidNavBar(colors.background, 'dark');
    props.navigation.navigate(screen);
  };
  const goHome = () => {
    setAndroidNavBar(colors.darkGreen, 'light');
    props.navigation.navigate('MainTabs');
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: colors.gladeGreen }}>
      <Pressable
        style={{ backgroundColor: colors.gladeGreen, padding: 16, alignItems: 'center' }}
        onPress={() => props.navigation.getParent()?.navigate('Profile')}
      >
        <Image source={require('../../assets/images/ic_profileMenuBG.png')} style={{ width: '100%', height: 120, borderRadius: 8, marginBottom: 8 }} resizeMode="cover" />
        <Text style={{ color: '#fff', fontFamily: 'RobotoMedium', fontSize: 16 }}>{`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User'}</Text>
      </Pressable>
      <DrawerItem label="Home" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_home.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={goHome} />
      <DrawerItem label="All Crops" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_allCrop.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('AllCrops')} />
      <DrawerItem label="My Favourites" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_fav.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Favourites')} />
      <DrawerItem label="Nowcast" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_nowcast.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Nowcast')} />
      <DrawerItem label="Notifications" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_notification.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Notifications')} />
      <DrawerItem label="Change Language" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_languageWhite.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('LanguageSettings')} />
      <DrawerItem label="Disclaimer" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_disclaimer.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Disclaimer')} />
      <DrawerItem label="About" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_about.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('About')} />
      <DrawerItem label="Logout" labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_logout.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => logout()} />
    </DrawerContentScrollView>
  );
};

const MainDrawer = () => {
  return (
    <Drawer.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'RobotoMedium', fontSize: 18 },
        drawerStyle: { backgroundColor: colors.gladeGreen },
      }}
      drawerContent={(props) => <MenuContent {...props} />}
    >
      <Drawer.Screen name="MainTabs" component={HomeTabs} options={{ headerShown: false }} />
      <Drawer.Screen name="AllCrops" component={AllCropsScreen} options={{ title: 'All Crops' }} />
      <Drawer.Screen name="Favourites" component={FavouritesScreen} options={{ title: 'Favourite List' }} />
      <Drawer.Screen name="Nowcast" component={NowcastScreen} options={{ title: 'Nowcast' }} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
      <Drawer.Screen name="LanguageSettings" component={LanguageSettingsScreen} options={{ title: 'Change Language' }} />
      <Drawer.Screen name="Disclaimer" component={DisclaimerScreen} options={{ title: 'Disclaimer' }} />
      <Drawer.Screen name="About" component={AboutScreen} options={{ title: 'About' }} />
    </Drawer.Navigator>
  );
};

export const AppNavigator = () => {
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const user = useAppStore((s) => s.user);

  return (
    <NavigationContainer>
      <RootStack.Navigator>
        {!onboardingDone ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} options={{ headerShown: false }} />
        ) : !user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
            <RootStack.Screen name="CropAdvisory" component={CropAdvisoryScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: 'Crop Advisory' }} />
            <RootStack.Screen name="CropFeedback" component={CropFeedbackScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: 'Crop Advisory Feedback' }} />
            <RootStack.Screen name="CropAudioPlayer" component={CropAudioPlayerScreen} options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
            <RootStack.Screen name="CropImagePreview" component={CropImagePreviewScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: 'Notifications' }} />
            <RootStack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="Profile" component={ProfileScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: 'Profile' }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
