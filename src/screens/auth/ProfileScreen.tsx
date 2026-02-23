import React, { useCallback, useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme/colors';
import { useAndroidNavigationBar } from '../../hooks/useAndroidNavigationBar';
import { API_BASE_URL } from '../../constants/api';
import { userService } from '../../api/services';
import { LANGUAGES } from '../../constants/languages';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '__';
};

const looksLikeBase64 = (value: string) => {
  if (!value || value.length < 40) return false;
  const trimmed = value.trim();
  return /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);
};

const resolveProfileImage = (rawPath: string | undefined): ImageSourcePropType => {
  if (!rawPath || !rawPath.trim()) return require('../../../assets/images/default-profile.png');

  const value = rawPath.trim();
  if (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined') {
    return require('../../../assets/images/default-profile.png');
  }
  if (value.startsWith('data:image/')) return { uri: value };
  if (looksLikeBase64(value)) return { uri: `data:image/jpeg;base64,${value}` };
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://')) return { uri: value };

  const base = ((Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) || API_BASE_URL).replace(/\/+$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;
  return { uri: `${base}${path}` };
};

const InfoField = ({ label, value, divider = true }: { label: string; value: string; divider?: boolean }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
    {divider ? <View style={styles.divider} /> : null}
  </View>
);

export const ProfileScreen = () => {
  useAndroidNavigationBar(colors.background, 'dark');
  const user: any = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const languageCode = useAppStore((s) => s.language);
  const [loading, setLoading] = useState(false);
  const [updatingImage, setUpdatingImage] = useState(false);

  const languageLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === languageCode)?.label || 'English',
    [languageCode]
  );

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const mobile = user?.mobileNumber || user?.LogInId || user?.MobileNumber;
        if (!mobile) return;

        setLoading(true);
        try {
          const response: any = await userService.login({
            LogInId: mobile,
            LogInPassword: '1234',
            LanguageType: languageLabel,
            Refreshdatetime: '2016-01-01',
          });
          const root = response || {};
          const users = (root.ObjUserList || root.objUserList || root.result || root.data || []) as any[];
          const data = Array.isArray(users) ? users[0] : users;
          if (!data) return;

          const typeOfRole = Number(
            data?.TypeOfRole ?? data?.typeOfRole ?? data?.UserProfileID ?? data?.userProfileId ?? user?.userProfileId ?? 0
          );

          setUser({
            userProfileId: typeOfRole || user?.userProfileId || 0,
            firstName: data.FirstName || data.firstName || user?.firstName || '',
            lastName: data.LastName || data.lastName || user?.lastName || '',
            mobileNumber: data.LogInId || data.mobileNumber || user?.mobileNumber || '',
            imagePath: data.ImagePath || data.imagePath || user?.imagePath,
            isLogout: false,
            typeOfRole: typeOfRole || user?.typeOfRole,
            ...(data.StateID ? { stateID: data.StateID } : {}),
            ...(data.DistrictID ? { districtID: data.DistrictID } : {}),
            ...(data.BlockID ? { blockID: data.BlockID } : {}),
            ...(data.AsdID ? { asdID: data.AsdID } : {}),
            ...(data.StateName ? { stateName: data.StateName } : {}),
            ...(data.DistrictName ? { districtName: data.DistrictName } : {}),
            ...(data.BlockName ? { blockName: data.BlockName } : {}),
            ...(data.AsdName ? { asdName: data.AsdName } : {}),
            ...(data.VillageName ? { villageName: data.VillageName } : {}),
            ...(data.PanchayatName ? { panchayatName: data.PanchayatName } : {}),
            ...(data.LanguageName ? { languageName: data.LanguageName } : {}),
          } as any);
        } finally {
          setLoading(false);
        }
      };

      loadProfile().catch(() => setLoading(false));
    }, [languageLabel, setUser, user?.LogInId, user?.MobileNumber, user?.mobileNumber])
  );

  const profileImage = resolveProfileImage(user?.imagePath || user?.ImagePath);

  const stateName = pickText(user?.stateName, user?.StateName);
  const districtName = pickText(user?.districtName, user?.DistrictName);
  const blockName = pickText(user?.blockName, user?.BlockName, user?.asdName, user?.AsdName);
  const language = pickText(user?.languageName, user?.LanguageName, user?.language, user?.Language);
  const stateID = Number(user?.stateID ?? user?.StateID ?? 0);
  const blockLabel = stateID === 28 || stateID === 36 ? 'ASD' : 'Block';
  const first = (typeof user?.firstName === 'string' && user.firstName.trim())
    ? user.firstName.trim()
    : (typeof user?.FirstName === 'string' ? user.FirstName.trim() : '');
  const last = (typeof user?.lastName === 'string' && user.lastName.trim())
    ? user.lastName.trim()
    : (typeof user?.LastName === 'string' ? user.LastName.trim() : '');
  const profileName = `${first} ${last}`.trim() || '__';

  const persistProfileImage = useCallback(
    async (base64Image: string) => {
      const userProfileId = Number(user?.typeOfRole ?? user?.TypeOfRole ?? user?.userProfileId ?? user?.UserProfileID ?? 0);
      if (!userProfileId) {
        Alert.alert('Profile', 'Unable to update image. Please login again.');
        return;
      }

      setUpdatingImage(true);
      try {
        try {
          const response: any = await userService.saveProfile({
            UserProfileID: userProfileId,
            UserProfileImage: base64Image,
          });
          const ok = Boolean(response?.isSuccessful ?? response?.IsSuccessful ?? true);
          if (!ok) {
            Alert.alert('Profile', response?.errorMessage || response?.ErrorMessage || 'Unable to update profile image');
            return;
          }
        } catch {
          // Old Xamarin app also persisted locally even when upload path was not active.
        }

        setUser({
          ...(user || {}),
          imagePath: base64Image,
        });
      } finally {
        setUpdatingImage(false);
      }
    },
    [setUser, user]
  );

  const pickAndSaveImage = useCallback(
    async (mode: 'camera' | 'library') => {
      let ImagePicker: any = null;
      try {
        ImagePicker = require('expo-image-picker');
      } catch {
        Alert.alert('Profile', 'Install expo-image-picker to enable photo update.');
        return;
      }

      if (mode === 'camera') {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraPermission?.status !== 'granted' || libraryPermission?.status !== 'granted') {
          Alert.alert('Profile', 'Camera/Photos permission denied.');
          return;
        }
      } else {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryPermission?.status !== 'granted') {
          Alert.alert('Profile', 'Photos permission denied.');
          return;
        }
      }

      const mediaType =
        ImagePicker?.MediaTypeOptions?.Images ??
        ImagePicker?.MediaType?.Images ??
        ['images'];
      const commonOptions = {
        mediaTypes: mediaType,
        allowsEditing: true,
        quality: 0.6,
        base64: true,
      };

      const result =
        mode === 'camera'
          ? await ImagePicker.launchCameraAsync(commonOptions)
          : await ImagePicker.launchImageLibraryAsync(commonOptions);

      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      const base64Image = asset?.base64 as string | undefined;
      if (!base64Image) {
        Alert.alert('Profile', 'Unable to read selected image.');
        return;
      }
      await persistProfileImage(base64Image);
    },
    [persistProfileImage]
  );

  const onEditProfileImage = useCallback(() => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Take Photo', 'Choose From Library'],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickAndSaveImage('camera');
          if (index === 2) pickAndSaveImage('library');
        }
      );
      return;
    }

    Alert.alert('Choose One', '', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: () => pickAndSaveImage('camera') },
      { text: 'Choose From Library', onPress: () => pickAndSaveImage('library') },
    ]);
  }, [pickAndSaveImage]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarWrap}>
          <Image source={profileImage} style={styles.avatar} />
          <Pressable style={styles.avatarEditBtn} onPress={onEditProfileImage}>
            <Text style={styles.avatarEditGlyph}>↑</Text>
          </Pressable>
        </View>

        <View style={styles.contentWrap}>
          <Text style={styles.sectionTitle}>General</Text>
          <InfoField label="Name" value={profileName} />
          <InfoField label="Mobile Number" value={pickText(user?.mobileNumber, user?.LogInId, user?.MobileNumber)} />

          <Text style={styles.sectionTitle}>Profile Language</Text>
          <InfoField label="Language" value={language} />

          <Text style={styles.sectionTitle}>Location Details</Text>
          <InfoField label="State" value={stateName} />
          <InfoField label="District" value={districtName} />
          <InfoField label={blockLabel} value={blockName} />
          <InfoField label="Village" value={pickText(user?.villageName, user?.VillageName)} />
          <InfoField label="Panchayat" value={pickText(user?.panchayatName, user?.PanchayatName)} divider={false} />
        </View>
      </ScrollView>
      {loading ? (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {updatingImage ? (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarEditBtn: {
    position: 'absolute',
    right: 0,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditIcon: {
    width: 18,
    height: 18,
    tintColor: colors.primary,
  },
  avatarEditGlyph: {
    color: colors.primary,
    fontFamily: 'RobotoMedium',
    fontSize: 18,
    lineHeight: 18,
  },
  contentWrap: {
    paddingHorizontal: 10,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
  fieldWrap: {
    marginBottom: 2,
  },
  fieldLabel: {
    color: '#A0A0A0',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  fieldValue: {
    marginTop: 2,
    color: '#363636',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  divider: {
    marginTop: 6,
    marginBottom: 8,
    height: 1,
    backgroundColor: '#EBEBEB',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000020',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
