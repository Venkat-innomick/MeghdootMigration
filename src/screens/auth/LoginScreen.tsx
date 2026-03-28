import React, { useMemo, useState } from "react";
import { CommonActions } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthStackParamList } from "../../navigation/types";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { useAppStore } from "../../store/appStore";
import { userService } from "../../api/services";
import { LANGUAGES } from "../../constants/languages";
import i18n from "../../locales/i18n";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { useTranslation } from "react-i18next";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export const LoginScreen = ({ navigation }: Props) => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const setUser = useAppStore((s) => s.setUser);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const currentLanguageLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label || "English",
    [language],
  );

  const showLoginMessage = (message: string) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
      return;
    }
    Alert.alert("", message, [{ text: t("common.ok") }]);
  };

  const login = async () => {
    const trimmedMobile = mobile.trim();
    if (trimmedMobile.length !== 10) {
      showLoginMessage(t("auth.validationMobile"));
      return;
    }
    setLoading(true);
    try {
      // Match Xamarin payload contract for GetUserLoginDetails.
      const response = await userService.login({
        LogInId: trimmedMobile,
        LogInPassword: "1234",
        LanguageType: currentLanguageLabel,
        Refreshdatetime: "2016-01-01",
      });

      const root: any = response || {};
      const responseRoot = root?.result ?? root?.data ?? root;
      const isSuccessful = Boolean(
        responseRoot?.IsSuccessful ??
          responseRoot?.isSuccessful ??
          root?.IsSuccessful ??
          root?.isSuccessful,
      );
      const users = (
        responseRoot?.ObjUserList ||
        responseRoot?.objUserList ||
        root?.ObjUserList ||
        root?.objUserList ||
        responseRoot ||
        []
      ) as any[];
      const data = Array.isArray(users) ? users[0] : users;
      const hasUser = Boolean(data && typeof data === "object");

      if (!isSuccessful || !hasUser) {
        showLoginMessage(
          responseRoot?.ErrorMessage ||
            responseRoot?.errorMessage ||
            root?.ErrorMessage ||
            root?.errorMessage ||
            t("auth.invalidCredentials"),
        );
        return;
      }

      const roleId = Number(data?.RoleId ?? data?.roleId ?? 0);
      const typeOfRole = Number(data?.TypeOfRole ?? data?.typeOfRole ?? 0);
      const userProfileId = Number(
        data?.UserProfileID ??
          data?.userProfileId ??
          0,
      );
      const mobileNumber = data.LogInId || data.mobileNumber || trimmedMobile;
      const apiImagePath = data.ImagePath || data.imagePath || "";
      const cacheKey = `${STORAGE_KEYS.profileImageCache}:${mobileNumber}`;
      const cachedImagePath = apiImagePath
        ? ""
        : (await AsyncStorage.getItem(cacheKey)) || "";
      const imagePath = apiImagePath || cachedImagePath || undefined;

      if (roleId === 1) {
        const storedUser = {
          userProfileId,
          firstName: data.FirstName || data.firstName || "",
          lastName: data.LastName || data.lastName || "",
          mobileNumber,
          imagePath,
          isLogout: false,
          typeOfRole,
          // Persist location/profile fields used by other screens.
          ...(data.StateName ? { stateName: data.StateName } : {}),
          ...(data.DistrictName ? { districtName: data.DistrictName } : {}),
          ...(data.BlockName ? { blockName: data.BlockName } : {}),
          ...(data.AsdName ? { asdName: data.AsdName } : {}),
          ...(data.VillageName ? { villageName: data.VillageName } : {}),
          ...(data.PanchayatName ? { panchayatName: data.PanchayatName } : {}),
          ...(data.LanguageName ? { languageName: data.LanguageName } : {}),
        };
        await AsyncStorage.setItem(
          STORAGE_KEYS.loggedInUser,
          JSON.stringify(storedUser),
        );
        setUser(storedUser);
        navigation
          .getParent()
          ?.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Main" }],
            }),
          );
      } else {
        showLoginMessage(t("auth.invalidCredentials"));
      }
    } catch (error: any) {
      showLoginMessage(error.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingTop: insets.top }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerBlock}>
            <Text style={styles.title}>{t("auth.loginTitle")}</Text>
            <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>
            <Image
              source={require("../../../assets/images/ic_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.formBlock}>
            <View style={styles.fieldWrap}>
              <Text style={styles.floatLabel}>{t("auth.enterMobileNumber")}</Text>
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="number-pad"
                maxLength={10}
                placeholder={t("auth.mobilePlaceholder")}
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.floatLabel}>{t("auth.selectLanguage")}</Text>
              <Pressable
                style={styles.langHeader}
                onPress={() => setLangOpen(true)}
              >
                <Text style={styles.langHeaderText}>
                  {currentLanguageLabel}
                </Text>
                <Image
                  source={require("../../../assets/images/dropdown.png")}
                  style={styles.dropdownIcon}
                  resizeMode="contain"
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <Pressable
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={login}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? t("auth.signingIn") : t("auth.loginButton")}
              </Text>
            </Pressable>

            <Text style={styles.orText}>{t("common.or")}</Text>

            <Pressable
              style={styles.outlineButton}
              onPress={() =>
                navigation.navigate("Registration", {
                  selectedLanguageCode: language,
                })
              }
            >
              <Text style={styles.outlineButtonText}>{t("auth.signUpButton")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setLangOpen(false)}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <Text style={styles.modalTitle}>{t("auth.selectLanguage")}</Text>
            <ScrollView
              style={styles.langListScroll}
              showsVerticalScrollIndicator
            >
              {LANGUAGES.map((item) => (
                <Pressable
                  key={item.code}
                  style={styles.langItem}
                  onPress={() => {
                    setLanguage(item.code);
                    i18n.changeLanguage(item.code).catch(() => undefined);
                    setLangOpen(false);
                  }}
                >
                  <Text style={styles.langItemText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 25,
    paddingBottom: 20,
    flexGrow: 1,
  },
  headerBlock: {},
  formBlock: {},
  title: {
    marginTop: 40,
    textAlign: "center",
    fontFamily: "RobotoMedium",
    fontSize: 24,
    color: colors.darkGreen,
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.lightGreen,
  },
  logo: {
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 15,
    width: 150,
    height: 150,
  },
  fieldWrap: {
    marginTop: 14,
  },
  floatLabel: {
    alignSelf: "flex-start",
    marginLeft: 22,
    marginBottom: -9,
    zIndex: 1,
    paddingHorizontal: 6,
    backgroundColor: "#fff",
    color: colors.muted,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.text,
    backgroundColor: "#fff",
  },
  langHeader: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 46,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  langHeaderText: {
    fontFamily: "RobotoRegular",
    color: colors.text,
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  dropdownIcon: {
    width: 15,
    height: 15,
  },
  langListScroll: {
    maxHeight: 320,
  },
  langItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  langItemText: {
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.text,
  },
  primaryButton: {
    marginTop: 0,
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionsWrap: {
    marginTop: 40,
    marginBottom: 15,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  orText: {
    marginTop: 10,
    textAlign: "center",
    fontFamily: "RobotoRegular",
    color: colors.muted,
  },
  outlineButton: {
    marginTop: 10,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  outlineButtonText: {
    color: colors.primary,
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    maxHeight: "70%",
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  modalTitle: {
    fontFamily: "RobotoMedium",
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#ececec",
  },
});
