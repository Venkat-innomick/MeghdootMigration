import React, { useEffect, useMemo, useState } from "react";
import {
  Dimensions,
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
  const logos = useMemo(
    () => [
      require("../../../assets/images/imd.png"),
      require("../../../assets/images/iitmp.png"),
      require("../../../assets/images/icar.png"),
      require("../../../assets/images/icrisat.png"),
    ],
    [],
  );
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % logos.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [logos.length]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={logos[activeIndex]} style={styles.hero} />

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
  container: { paddingBottom: spacing.lg },
  hero: {
    width: Dimensions.get("window").width,
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
  links: { marginTop: spacing.md, marginHorizontal: 20, gap: spacing.xs },
  link: {
    color: colors.primary,
    textDecorationLine: "underline",
    fontFamily: "RobotoMedium",
  },
});
