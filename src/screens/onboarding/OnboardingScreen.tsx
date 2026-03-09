import React from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { useTranslation } from "react-i18next";

interface Props {
  titleKey: string;
  descriptionKey: string;
  image: any;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingScreen = ({
  titleKey,
  descriptionKey,
  image,
  onNext,
  onSkip,
}: Props) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Screen
      backgroundColor={colors.onBoard}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="light" backgroundColor={colors.onBoard} />
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.content}>
            <Text style={styles.title}>{t(titleKey)}</Text>
            <Text style={styles.description}>{t(descriptionKey)}</Text>

            <View style={styles.imageWrap}>
              <Image source={image} style={styles.image} resizeMode="contain" />
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable style={styles.nextButton} onPress={onNext}>
              <Text style={styles.nextText}>{t("onboarding.next")}</Text>
            </Pressable>

            <Pressable onPress={onSkip} style={styles.skipWrap}>
              <Text style={styles.skipText}>{t("onboarding.skip")}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 20,
    backgroundColor: colors.onBoard,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    paddingBottom: 20,
  },
  content: {
    flexShrink: 1,
  },
  title: {
    marginTop: 10,
    marginBottom: 10,
    textAlign: "center",
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 24,
    lineHeight: 30,
    paddingHorizontal: 12,
    flexShrink: 1,
  },
  description: {
    textAlign: "center",
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 8,
    marginBottom: 6,
    flexShrink: 1,
  },
  imageWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  image: {
    width: 250,
    height: 250,
  },
  actions: {
    marginTop: 12,
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
    fontSize: 14,
  },
  skipWrap: {
    marginTop: 15,
    alignItems: "center",
  },
  skipText: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 14,
  },
});
