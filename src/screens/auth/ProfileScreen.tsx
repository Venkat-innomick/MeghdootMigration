import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import Constants from "expo-constants";
import { useFocusEffect } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { API_BASE_URL } from "../../constants/api";
import { userService } from "../../api/services";
import { LANGUAGES } from "../../constants/languages";
import i18n from "../../locales/i18n";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useTranslation } from "react-i18next";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "__";
};

const looksLikeBase64 = (value: string) => {
  if (!value || value.length < 40) return false;
  const trimmed = value.trim();
  return /^[A-Za-z0-9+/=\r\n]+$/.test(trimmed);
};

const appendCacheBust = (uri: string, cacheBust?: string | number) => {
  if (
    !cacheBust ||
    (!uri.startsWith("http://") && !uri.startsWith("https://"))
  ) {
    return uri;
  }
  const separator = uri.includes("?") ? "&" : "?";
  return `${uri}${separator}cb=${encodeURIComponent(String(cacheBust))}`;
};

const resolveProfileImage = (
  rawPath: string | undefined,
  cacheBust?: string | number,
): ImageSourcePropType => {
  if (!rawPath || !rawPath.trim())
    return require("../../../assets/images/ic_defaultProfile.png");

  const value = rawPath.trim();
  if (value.toLowerCase() === "null" || value.toLowerCase() === "undefined") {
    return require("../../../assets/images/ic_defaultProfile.png");
  }
  if (value.startsWith("data:image/")) return { uri: value };
  if (looksLikeBase64(value)) return { uri: `data:image/jpeg;base64,${value}` };
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://")
  )
    return { uri: appendCacheBust(value, cacheBust) };

  const base = (
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
    API_BASE_URL
  ).replace(/\/+$/, "");
  const path = value.startsWith("/") ? value : `/${value}`;
  return { uri: appendCacheBust(`${base}${path}`, cacheBust) };
};

const buildStoredUser = (data: any, fallbackUser?: any, imageVersion?: number) => {
  const effectiveImagePath =
    data?.ImagePath || data?.imagePath || fallbackUser?.imagePath;
  const typeOfRole = Number(
    data?.TypeOfRole ?? data?.typeOfRole ?? fallbackUser?.typeOfRole ?? 0,
  );
  const userProfileId = Number(
    data?.UserProfileID ??
      data?.userProfileId ??
      fallbackUser?.userProfileId ??
      0,
  );

  return {
    userProfileId,
    firstName:
      data?.FirstName || data?.firstName || fallbackUser?.firstName || "",
    lastName: data?.LastName || data?.lastName || fallbackUser?.lastName || "",
    mobileNumber:
      data?.LogInId || data?.mobileNumber || fallbackUser?.mobileNumber || "",
    imagePath: effectiveImagePath,
    imageVersion: imageVersion ?? fallbackUser?.imageVersion,
    isLogout: false,
    typeOfRole: typeOfRole || fallbackUser?.typeOfRole,
    ...(data?.StateID ? { stateID: data.StateID } : {}),
    ...(data?.DistrictID ? { districtID: data.DistrictID } : {}),
    ...(data?.BlockID ? { blockID: data.BlockID } : {}),
    ...(data?.AsdID ? { asdID: data.AsdID } : {}),
    ...(data?.StateName ? { stateName: data.StateName } : {}),
    ...(data?.DistrictName ? { districtName: data.DistrictName } : {}),
    ...(data?.BlockName ? { blockName: data.BlockName } : {}),
    ...(data?.AsdName ? { asdName: data.AsdName } : {}),
    ...(data?.VillageName ? { villageName: data.VillageName } : {}),
    ...(data?.PanchayatName ? { panchayatName: data.PanchayatName } : {}),
    ...(data?.LanguageName ? { languageName: data.LanguageName } : {}),
  };
};

const InfoField = ({
  label,
  value,
  divider = true,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
    {divider ? <View style={styles.divider} /> : null}
  </View>
);

export const ProfileScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  const user: any = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);
  const languageCode = useAppStore((s) => s.language);
  const hasLoadedProfileRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [updatingImage, setUpdatingImage] = useState(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const languageLabel = useMemo(
    () =>
      LANGUAGES.find((l) => l.code === languageCode)?.label ||
      t("profile.language"),
    [languageCode, t],
  );

  const refreshProfile = useCallback(
    async (mobileOverride?: string, imageVersion?: number) => {
      const mobile = String(
        mobileOverride ||
          user?.mobileNumber ||
          user?.LogInId ||
          user?.MobileNumber ||
          "",
      ).trim();
      if (!mobile) return null;

      const response: any = await userService.login({
        LogInId: mobile,
        LogInPassword: "1234",
        LanguageType: languageLabel,
        Refreshdatetime: "2016-01-01",
      });
      const root = response || {};
      const users = (root.ObjUserList ||
        root.objUserList ||
        root.result ||
        root.data ||
        []) as any[];
      const data = Array.isArray(users) ? users[0] : users;
      if (!data) return null;

      const nextUser = buildStoredUser(data, user, imageVersion);
      setUser(nextUser as any);
      return nextUser;
    },
    [
      languageLabel,
      setUser,
      user?.LogInId,
      user?.MobileNumber,
      user?.firstName,
      user?.imagePath,
      user?.imageVersion,
      user?.lastName,
      user?.mobileNumber,
      user?.typeOfRole,
      user?.userProfileId,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        const hasCachedProfile = !!(
          user?.stateName ||
          user?.StateName ||
          user?.districtName ||
          user?.DistrictName
        );
        if (hasLoadedProfileRef.current && hasCachedProfile) return;

        const mobile =
          user?.mobileNumber || user?.LogInId || user?.MobileNumber;
        if (!mobile) return;

        setLoading(true);
        try {
          await refreshProfile(mobile);
          hasLoadedProfileRef.current = true;
        } finally {
          setLoading(false);
        }
      };

      loadProfile().catch(() => setLoading(false));
    }, [
      refreshProfile,
      user?.LogInId,
      user?.MobileNumber,
      user?.mobileNumber,
    ]),
  );

  const profileImageRaw = user?.imagePath || user?.ImagePath;
  const profileImageVersion = user?.imageVersion;
  const profileImage = imageLoadFailed
    ? require("../../../assets/images/ic_defaultProfile.png")
    : resolveProfileImage(profileImageRaw, profileImageVersion);

  useEffect(() => {
    setImageLoadFailed(false);
  }, [profileImageRaw, profileImageVersion]);

  const stateName = pickText(user?.stateName, user?.StateName);
  const districtName = pickText(user?.districtName, user?.DistrictName);
  const blockName = pickText(
    user?.blockName,
    user?.BlockName,
    user?.asdName,
    user?.AsdName,
  );
  const language = pickText(
    user?.languageName,
    user?.LanguageName,
    user?.language,
    user?.Language,
  );
  const stateID = Number(user?.stateID ?? user?.StateID ?? 0);
  const isAsdState = stateID === 28 || stateID === 36;
  const first =
    typeof user?.firstName === "string" && user.firstName.trim()
      ? user.firstName.trim()
      : typeof user?.FirstName === "string"
        ? user.FirstName.trim()
        : "";
  const profileName = first || "__";

  const persistProfileImage = useCallback(
    async (base64Image: string) => {
      let uploadUserId = Number(
        user?.typeOfRole ??
          user?.TypeOfRole ??
          user?.userProfileId ??
          user?.UserProfileID ??
          0,
      );
      if (!uploadUserId) {
        const mobile = String(
          user?.mobileNumber || user?.LogInId || user?.MobileNumber || "",
        ).trim();
        if (mobile) {
          try {
            const response: any = await userService.login({
              LogInId: mobile,
              LogInPassword: "1234",
              LanguageType: languageLabel,
              Refreshdatetime: "2016-01-01",
            });
            const root = response || {};
            const users = (root.ObjUserList ||
              root.objUserList ||
              root.result ||
              root.data ||
              []) as any[];
            const data = Array.isArray(users) ? users[0] : users;
            const recoveredTypeOfRole = Number(
              data?.TypeOfRole ?? data?.typeOfRole ?? 0,
            );
            const recoveredUserProfileId = Number(
              data?.UserProfileID ?? data?.userProfileId ?? 0,
            );
            uploadUserId = recoveredTypeOfRole || recoveredUserProfileId;
            if (uploadUserId) {
              setUser({
                ...(user || {}),
                ...(recoveredUserProfileId
                  ? { userProfileId: recoveredUserProfileId }
                  : {}),
                ...(recoveredTypeOfRole
                  ? { typeOfRole: recoveredTypeOfRole }
                  : {}),
              });
            }
          } catch {
            // Keep the existing login-again message below.
          }
        }
      }
      if (!uploadUserId) {
        Alert.alert("", i18n.t("profile.loginAgain"), [
          { text: i18n.t("common.ok") },
        ]);
        return;
      }

      setUpdatingImage(true);
      try {
        const response: any = await userService.saveProfile({
          UserProfileID: uploadUserId,
          UserProfileImage: base64Image,
        });
        const ok = Boolean(
          response?.isSuccessful ??
            response?.IsSuccessful ??
            response?.result?.isSuccessful ??
            response?.result?.IsSuccessful ??
            false,
        );
        if (!ok) {
          throw new Error(
            response?.errorMessage ??
              response?.ErrorMessage ??
              response?.result?.errorMessage ??
              response?.result?.ErrorMessage ??
              i18n.t("profile.unableUpdateImage"),
          );
        }

        await refreshProfile(undefined, Date.now());
        if (Platform.OS === "android") {
          ToastAndroid.show(i18n.t("profile.imageUpdated"), ToastAndroid.SHORT);
        } else {
          Alert.alert("", i18n.t("profile.imageUpdated"), [
            { text: i18n.t("common.ok") },
          ]);
        }
      } catch (error: any) {
        Alert.alert("", error?.message || i18n.t("profile.unableUpdateImage"), [
          { text: i18n.t("common.ok") },
        ]);
      } finally {
        setUpdatingImage(false);
      }
    },
    [languageLabel, refreshProfile, setUser, user],
  );

  const pickAndSaveImage = useCallback(
    async (mode: "camera" | "library") => {
      let ImagePicker: any = null;
      try {
        ImagePicker = require("expo-image-picker");
      } catch {
        Alert.alert("", i18n.t("profile.installImagePicker"), [
          { text: i18n.t("common.ok") },
        ]);
        return;
      }

      if (mode === "camera") {
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();
        const libraryPermission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (
          cameraPermission?.status !== "granted" ||
          libraryPermission?.status !== "granted"
        ) {
          Alert.alert("", i18n.t("profile.cameraPhotosDenied"), [
            { text: i18n.t("common.ok") },
          ]);
          return;
        }
      } else {
        const libraryPermission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (libraryPermission?.status !== "granted") {
          Alert.alert("", i18n.t("profile.photosDenied"), [
            { text: i18n.t("common.ok") },
          ]);
          return;
        }
      }

      const mediaType = ImagePicker?.MediaTypeOptions?.Images ??
        ImagePicker?.MediaType?.Images ?? ["images"];
      const commonOptions = {
        mediaTypes: mediaType,
        allowsEditing: false,
        quality: 0.6,
        base64: true,
      };

      const result =
        mode === "camera"
          ? await ImagePicker.launchCameraAsync(commonOptions)
          : await ImagePicker.launchImageLibraryAsync(commonOptions);

      if (result?.canceled) return;
      const asset = result?.assets?.[0];
      const base64Image = asset?.base64 as string | undefined;
      if (!base64Image) {
        Alert.alert("", i18n.t("profile.unableReadImage"), [
          { text: i18n.t("common.ok") },
        ]);
        return;
      }
      await persistProfileImage(base64Image);
    },
    [persistProfileImage],
  );

  const onEditProfileImage = useCallback(() => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            i18n.t("common.cancel"),
            i18n.t("profile.takePhoto"),
            i18n.t("profile.chooseFromLibrary"),
          ],
          cancelButtonIndex: 0,
        },
        (index) => {
          if (index === 1) pickAndSaveImage("camera");
          if (index === 2) pickAndSaveImage("library");
        },
      );
      return;
    }

    setPickerOpen(true);
  }, [pickAndSaveImage]);

  return (
    <Screen>
      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setPickerOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{i18n.t("profile.chooseOne")}</Text>
            <Pressable
              style={styles.modalAction}
              onPress={() => {
                setPickerOpen(false);
                pickAndSaveImage("library");
              }}
            >
              <Text style={styles.modalActionText}>
                {i18n.t("profile.chooseFromLibrary")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalAction}
              onPress={() => {
                setPickerOpen(false);
                pickAndSaveImage("camera");
              }}
            >
              <Text style={styles.modalActionText}>
                {i18n.t("profile.takePhoto")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalAction}
              onPress={() => setPickerOpen(false)}
            >
              <Text style={styles.modalActionText}>
                {i18n.t("common.cancel")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarWrap}>
          <Image
            source={profileImage}
            style={styles.avatar}
            onError={() => setImageLoadFailed(true)}
          />
          <Pressable style={styles.avatarEditBtn} onPress={onEditProfileImage}>
            <Image
              source={require("../../../assets/images/ic_cameraGallery.png")}
              style={styles.avatarEditIcon}
              resizeMode="contain"
            />
          </Pressable>
        </View>

        <View style={styles.contentWrap}>
          <Text style={styles.sectionTitle}>{i18n.t("profile.general")}</Text>
          <InfoField label={i18n.t("profile.name")} value={profileName} />
          <InfoField
            label={i18n.t("profile.mobileNumber")}
            value={pickText(
              user?.mobileNumber,
              user?.LogInId,
              user?.MobileNumber,
            )}
          />

          <Text style={styles.sectionTitle}>
            {i18n.t("profile.profileLanguage")}
          </Text>
          <InfoField label={i18n.t("profile.language")} value={language} />

          <Text style={styles.sectionTitle}>
            {i18n.t("profile.locationDetails")}
          </Text>
          <InfoField label={i18n.t("profile.state")} value={stateName} />
          <InfoField label={i18n.t("profile.district")} value={districtName} />
          <InfoField
            label={isAsdState ? i18n.t("profile.asd") : i18n.t("profile.block")}
            value={blockName}
          />
          <InfoField
            label={i18n.t("profile.village")}
            value={pickText(user?.villageName, user?.VillageName)}
          />
          <InfoField
            label={i18n.t("profile.panchayat")}
            value={pickText(user?.panchayatName, user?.PanchayatName)}
            divider={false}
          />
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
    width: 90,
    height: 90,
    alignSelf: "center",
    alignItems: "center",
    marginBottom: 12,
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  avatarEditBtn: {
    position: "absolute",
    right: 0,
    bottom: -2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEditIcon: {
    width: 20,
    height: 20,
  },
  avatarEditGlyph: {
    color: colors.primary,
    fontFamily: "RobotoMedium",
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
    fontFamily: "RobotoMedium",
    fontSize: 14,
  },
  fieldWrap: {
    marginBottom: 2,
  },
  fieldLabel: {
    color: "#A0A0A0",
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  fieldValue: {
    marginTop: 2,
    color: "#363636",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  divider: {
    marginTop: 6,
    marginBottom: 8,
    height: 1,
    backgroundColor: "#EBEBEB",
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#00000020",
    alignItems: "center",
    justifyContent: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000055",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    paddingTop: 18,
    paddingBottom: 10,
    elevation: 6,
  },
  modalTitle: {
    paddingHorizontal: 18,
    paddingBottom: 16,
    color: "#1A1A1A",
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  modalAction: {
    minHeight: 48,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  modalActionText: {
    color: "#1A1A1A",
    fontFamily: "RobotoMedium",
    fontSize: 15,
    textAlign: "center",
  },
});
