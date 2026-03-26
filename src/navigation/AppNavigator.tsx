import React, { useEffect, useState } from 'react';
import { Alert, Image, ImageSourcePropType, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CommonActions, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItem } from '@react-navigation/drawer';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as NavigationBar from 'expo-navigation-bar';
import Constants from 'expo-constants';
import { RootStackParamList, AuthStackParamList, OnboardingStackParamList } from './types';
import { useAppStore } from '../store/appStore';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../constants/api';
import i18n from '../locales/i18n';
import { LANGUAGES } from '../constants/languages';

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
import { SplashScreen } from '../screens/splash/SplashScreen';
import { unregisterPushTokenForUser } from '../hooks/usePushNotifications';
import { rootNavigationRef } from './navigationRef';

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

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const looksLikeBase64 = (value: string) => {
  if (!value || value.length < 40) return false;
  const trimmed = value.trim();
  return /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);
};

const resolveProfileImage = (rawPath: string | undefined): ImageSourcePropType => {
  if (!rawPath || !rawPath.trim()) return require('../../assets/images/ic_defaultProfile.png');

  const value = rawPath.trim();
  if (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    return require('../../assets/images/ic_defaultProfile.png');
  }
  if (value.startsWith('data:image/')) return { uri: value };
  if (looksLikeBase64(value)) return { uri: `data:image/jpeg;base64,${value}` };
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://')) {
    return { uri: value };
  }

  const base = ((Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || API_BASE_URL).replace(/\/+$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return { uri: `${base}${path}` };
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
  const language = useAppStore((s) => s.language);
  const t = (key: string) => i18n.t(key, { lng: language });

  return (
    <Tabs.Navigator
      screenOptions={({ route, navigation }) => ({
        ...MainHeader({
          navigation,
          title:
            route.name === 'Home'
              ? t('home.home')
              : route.name === 'PastWeather'
              ? t('home.pastWeather')
              : route.name === 'Forecast'
              ? t('home.forecast')
              : route.name === 'Locations'
              ? t('home.locations')
              : t('common.appName'),
        }),
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
      <Tabs.Screen name="Home" component={DashboardScreen} options={{ title: t('home.home') }} />
      <Tabs.Screen name="PastWeather" component={PastWeatherScreen} options={{ title: t('home.pastWeather') }} />
      <Tabs.Screen name="Forecast" component={ForecastScreen} options={{ title: t('home.forecast') }} />
      <Tabs.Screen name="Locations" component={LocationsScreen} options={{ title: t('home.locations') }} />
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
  const onboardingStarted = useAppStore((s) => s.onboardingStarted);

  return (
    <OnboardingStack.Navigator
      initialRouteName={onboardingStarted ? 'OnboardingOne' : 'Language'}
      screenOptions={{ headerShown: false }}
    >
      <OnboardingStack.Screen name="Language" component={LanguageSelectionScreen} />
      <OnboardingStack.Screen name="OnboardingOne" component={OnboardingOneScreen} />
      <OnboardingStack.Screen name="OnboardingTwo" component={OnboardingTwoScreen} />
      <OnboardingStack.Screen name="OnboardingThree" component={OnboardingThreeScreen} />
    </OnboardingStack.Navigator>
  );
};

const MenuContent = (props: any) => {
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const t = (key: string) => i18n.t(key, { lng: language });
  const logout = useAppStore((s) => s.logout);
  const user: any = useAppStore((s) => s.user);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const profileImageRaw = user?.imagePath || user?.ImagePath;
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const profileImage = imageLoadFailed
    ? require('../../assets/images/ic_defaultProfile.png')
    : resolveProfileImage(profileImageRaw);
  useEffect(() => {
    setImageLoadFailed(false);
  }, [profileImageRaw]);
  const fullName =
    pickText(user?.firstName, user?.FirstName) || pickText(user?.lastName, user?.LastName)
      ? `${pickText(user?.firstName, user?.FirstName)} ${pickText(user?.lastName, user?.LastName)}`.trim()
      : 'User';
  const goMenu = (screen: string) => {
    setAndroidNavBar(colors.background, 'dark');
    props.navigation.closeDrawer();
    props.navigation.getParent?.()?.navigate(screen);
  };
  const handleLogout = () => {
    Alert.alert(t('menu.logout'), t('menu.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          const userProfileId = Number(
            user?.userProfileId ??
              user?.UserProfileID ??
              user?.typeOfRole ??
              user?.TypeOfRole ??
              0
          );
          await unregisterPushTokenForUser(userProfileId);
          logout();
          setAndroidNavBar(colors.background, 'dark');
          props.navigation.closeDrawer();
          props.navigation
            .getParent?.()
            ?.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              })
            );
        },
      },
    ]);
  };

  return (
    <DrawerContentScrollView {...props} style={{ backgroundColor: colors.gladeGreen }}>
      <Pressable
        style={styles.profileHeader}
        onPress={() => props.navigation.getParent()?.navigate('Profile')}
      >
        <Image
          source={require('../../assets/images/ic_profileMenuBG.png')}
          style={styles.profileHeaderBg}
          resizeMode="cover"
        />
        <Image
          source={profileImage}
          style={styles.profileAvatar}
          resizeMode="cover"
          onError={() => setImageLoadFailed(true)}
        />
        <Text style={styles.profileName}>{fullName}</Text>
      </Pressable>
      <DrawerItem label={t('menu.allCrops')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_allCrop.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('AllCrops')} />
      <DrawerItem label={t('menu.favourites')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_fav.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Favourites')} />
      <DrawerItem label={t('menu.nowcast')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_nowcast.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Nowcast')} />
      <DrawerItem label={t('menu.notifications')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_notification.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Notifications')} />
      <DrawerItem
        label={t('menu.language')}
        labelStyle={{ color: '#fff' }}
        icon={() => <Image source={require('../../assets/images/ic_languageWhite.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />}
        onPress={() => setLanguageModalOpen(true)}
      />
      <DrawerItem label={t('menu.disclaimer')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_disclaimer.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('Disclaimer')} />
      <DrawerItem label={t('menu.about')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_about.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={() => goMenu('About')} />
      <DrawerItem label={t('menu.logout')} labelStyle={{ color: '#fff' }} icon={() => <Image source={require('../../assets/images/ic_logout.png')} style={{ width: 24, height: 24 }} resizeMode="contain" />} onPress={handleLogout} />

      <Modal
        visible={languageModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLanguageModalOpen(false)}
      >
        <Pressable style={styles.langModalBackdrop} onPress={() => setLanguageModalOpen(false)}>
          <Pressable style={styles.langModalCard} onPress={() => undefined}>
            <Text style={styles.langModalTitle}>{t('menu.language')}</Text>
            <ScrollView style={styles.langModalScroll} showsVerticalScrollIndicator>
              {LANGUAGES.map((item) => {
                const active = language === item.code;
                return (
                  <Pressable
                    key={item.code}
                    style={[styles.langModalItem, active && styles.langModalItemActive]}
                    onPress={() => {
                      setLanguage(item.code);
                      i18n.changeLanguage(item.code).catch(() => undefined);
                      setLanguageModalOpen(false);
                    }}
                  >
                    <Text style={[styles.langModalItemText, active && styles.langModalItemTextActive]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </DrawerContentScrollView>
  );
};

const styles = StyleSheet.create({
  profileHeader: {
    backgroundColor: colors.gladeGreen,
    padding: 16,
    alignItems: 'center',
  },
  profileHeaderBg: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 10,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#fff',
    marginTop: -92,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  profileName: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
  langModalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  langModalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    maxHeight: '70%',
  },
  langModalTitle: {
    fontFamily: 'RobotoMedium',
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#e5e5e5',
    borderBottomWidth: 1,
  },
  langModalScroll: {
    maxHeight: 360,
  },
  langModalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#ececec',
    borderBottomWidth: 1,
  },
  langModalItemActive: {
    backgroundColor: '#EAF7EE',
  },
  langModalItemText: {
    fontFamily: 'RobotoRegular',
    fontSize: 16,
    color: colors.text,
  },
  langModalItemTextActive: {
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
  },
});

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
    </Drawer.Navigator>
  );
};

export const AppNavigator = () => {
  const language = useAppStore((s) => s.language);
  const t = (key: string) => i18n.t(key, { lng: language });
  useEffect(() => {
    i18n.changeLanguage(language).catch(() => undefined);
  }, [language]);
  return (
    <NavigationContainer ref={rootNavigationRef}>
      <RootStack.Navigator initialRouteName="Splash">
        <RootStack.Screen name="Splash" component={SplashScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Onboarding" component={OnboardingNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
        <RootStack.Screen name="Main" component={MainDrawer} options={{ headerShown: false }} />
        <RootStack.Screen name="CropAdvisory" component={CropAdvisoryScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('crop.cropAdvisoryTitle') }} />
        <RootStack.Screen name="CropFeedback" component={CropFeedbackScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('crop.cropAdvisoryFeedbackTitle') }} />
        <RootStack.Screen name="CropAudioPlayer" component={CropAudioPlayerScreen} options={{ headerShown: false, presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <RootStack.Screen name="CropImagePreview" component={CropImagePreviewScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="AllCrops" component={AllCropsScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.allCrops') }} />
        <RootStack.Screen name="Favourites" component={FavouritesScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.favourites') }} />
        <RootStack.Screen name="Nowcast" component={NowcastScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.nowcast') }} />
        <RootStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.notifications') }} />
        <RootStack.Screen name="Disclaimer" component={DisclaimerScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.disclaimer') }} />
        <RootStack.Screen name="About" component={AboutScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('menu.about') }} />
        <RootStack.Screen name="Search" component={SearchScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Profile" component={ProfileScreen} options={{ headerStyle: { backgroundColor: colors.primary }, headerTintColor: '#fff', title: t('profile.title') }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
