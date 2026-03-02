import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";

interface Props {
  title: string;
  description: string;
  image: any;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingScreen = ({
  title,
  description,
  image,
  onNext,
  onSkip,
}: Props) => {
  const insets = useSafeAreaInsets();

  return (
    <Screen
      backgroundColor={colors.onBoard}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar style="light" backgroundColor={colors.onBoard} />
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.imageWrap}>
            <Image source={image} style={styles.image} resizeMode="contain" />
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.nextButton} onPress={onNext}>
            <Text style={styles.nextText}>Next</Text>
          </Pressable>

          <Pressable onPress={onSkip} style={styles.skipWrap}>
            <Text style={styles.skipText}>Skip &gt;&gt;</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingBottom: 50,
    backgroundColor: colors.onBoard,
  },
  content: {},
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
    marginBottom: 6,
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
