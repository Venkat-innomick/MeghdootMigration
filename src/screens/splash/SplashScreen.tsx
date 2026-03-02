import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export const SplashScreen = ({ navigation }: Props) => {
  const isHydrated = useAppStore((s) => s.isHydrated);
  const onboardingDone = useAppStore((s) => s.onboardingDone);
  const user = useAppStore((s) => s.user);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (!onboardingDone) {
        navigation.replace("Onboarding");
        return;
      }

      if (!user) {
        navigation.replace("Auth");
        return;
      }

      navigation.replace("Main");
    }, 3000);

    return () => clearTimeout(timeoutId);
  }, [isHydrated, navigation, onboardingDone, user]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../../assets/images/ic_splashScreen.png")}
        style={styles.image}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.onBoard,
  },
  image: {
    width: 160,
    height: 160,
  },
});
