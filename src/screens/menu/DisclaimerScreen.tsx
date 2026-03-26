import React from "react";
import { Image, ScrollView, StyleSheet, Text } from "react-native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { useTranslation } from "react-i18next";

export const DisclaimerScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Image
          source={require("../../../assets/images/disclaimer.png")}
          style={styles.hero}
        />
        <Text style={styles.body}>{t("info.disclaimerBody")}</Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.lg },
  hero: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  },
  body: {
    marginHorizontal: 20,
    marginTop: 10,
    fontFamily: "RobotoRegular",
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
});
