import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Platform,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../components/Screen";
import { LANGUAGES } from "../../constants/languages";
import { useAppStore } from "../../store/appStore";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { OnboardingStackParamList } from "../../navigation/types";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<OnboardingStackParamList, "Language">;

export const LanguageSelectionScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const beginOnboarding = useAppStore((s) => s.beginOnboarding);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const language = useAppStore((s) => s.language);

  const selectedLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label || "English",
    [language],
  );

  return (
    <Screen
      backgroundColor={colors.onBoard}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="light" backgroundColor={colors.onBoard} />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Choose Language</Text>
          <Text style={styles.subtitle}>
            A Mobile App to Assist Farmers for Weather Based Farm Management
          </Text>

          <View style={styles.logoWrap}>
            <Image
              source={require("../../../assets/images/ic_logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.selectorWrap}>
            <Pressable style={styles.selector} onPress={() => setOpen(true)}>
              <Text style={styles.selectorText}>{selectedLabel}</Text>
              <Image
                source={require("../../../assets/images/ic_dropDownWhite.png")}
                style={styles.arrow}
              />
            </Pressable>
            <Text style={styles.selectorLabel}>Select Language</Text>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.nextButton}
              onPress={() => {
                beginOnboarding();
                navigation.replace("OnboardingOne");
              }}
            >
              <Text style={styles.nextText}>Next</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {LANGUAGES.map((item) => (
                <Pressable
                  key={item.code}
                  style={styles.modalItem}
                  onPress={() => {
                    setLanguage(item.code);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.onBoard,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  content: {
    flexShrink: 1,
  },
  title: {
    marginTop: 30,
    textAlign: "center",
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 24,
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 12,
    lineHeight: 18,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  logo: {
    marginTop: 12,
    alignSelf: "center",
    width: 150,
    height: 150,
  },
  selectorWrap: {
    marginTop: 60,
  },
  selector: {
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#fff",
    backgroundColor: colors.onBoard,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  arrow: {
    width: 21,
    height: 11,
  },
  selectorLabel: {
    position: "absolute",
    top: Platform.OS === "ios" ? -12 : -15,
    left: 30,
    paddingHorizontal: 6,
    backgroundColor: colors.onBoard,
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  actions: {
    marginTop: 60,
  },
  nextButton: {
    backgroundColor: colors.darkGreen,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  nextText: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000066",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    maxHeight: "60%",
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalItemText: {
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.text,
  },
});
