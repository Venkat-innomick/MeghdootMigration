import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { useTranslation } from "react-i18next";

const TERMS_URL =
  "https://sites.google.com/view/meghdoot-terms-and-conditions/home";

export const TermsScreen = () => {
  const { t } = useTranslation();
  useAndroidNavigationBar(colors.background, "dark");
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>{t("info.termsTitle")}</Text>
        <Text style={styles.body}>{t("info.termsBody")}</Text>
        <Pressable
          style={styles.button}
          onPress={() => Linking.openURL(TERMS_URL)}
        >
          <Text style={styles.buttonText}>{t("info.termsOpenPage")}</Text>
        </Pressable>
        {/* <Text style={styles.url}>{TERMS_URL}</Text> */}
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: "center" },
  title: {
    fontFamily: "RobotoMedium",
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.md,
  },
  body: {
    fontFamily: "RobotoRegular",
    fontSize: 16,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontFamily: "RobotoMedium", fontSize: 16 },
  url: {
    marginTop: spacing.sm,
    fontFamily: "RobotoRegular",
    color: colors.primary,
  },
});
