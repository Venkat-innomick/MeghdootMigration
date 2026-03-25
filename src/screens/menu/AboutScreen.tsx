import React from "react";
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { useTranslation } from "react-i18next";

export const AboutScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imagesRow}
        >
          <Image
            source={require("../../../assets/images/imd.png")}
            style={styles.logo}
          />
          <Image
            source={require("../../../assets/images/iitmp.png")}
            style={styles.logo}
          />
          <Image
            source={require("../../../assets/images/icar.png")}
            style={styles.logo}
          />
          <Image
            source={require("../../../assets/images/icrisat.png")}
            style={styles.logo}
          />
        </ScrollView>

        <Text style={styles.body}>{t("info.aboutBody")}</Text>

        <View style={styles.links}>
          <Pressable onPress={() => Linking.openURL("http://www.imd.gov.in/")}>
            <Text style={styles.link}>IMD</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://www.tropmet.res.in/")}
          >
            <Text style={styles.link}>IITM</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL("https://icar.org.in/")}>
            <Text style={styles.link}>ICAR</Text>
          </Pressable>
          <Pressable
            onPress={() => Linking.openURL("https://www.icrisat.org/")}
          >
            <Text style={styles.link}>ICRISAT</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg },
  imagesRow: { gap: spacing.sm, paddingBottom: spacing.md },
  logo: {
    width: 180,
    height: 110,
    borderRadius: 8,
    resizeMode: "contain",
    backgroundColor: "#fff",
  },
  body: {
    fontFamily: "RobotoRegular",
    fontSize: 16,
    lineHeight: 24,
    color: colors.text,
  },
  links: { marginTop: spacing.md, gap: spacing.xs },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
    fontFamily: "RobotoMedium",
  },
});
