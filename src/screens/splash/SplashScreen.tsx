import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import React, { useEffect } from "react";
import { Image, StyleSheet, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { STORAGE_KEYS } from "../../constants/storageKeys";
import { RootStackParamList } from "../../navigation/types";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";

type Props = NativeStackScreenProps<RootStackParamList, "Splash">;

export const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    let mounted = true;

    const restoreAndRoute = async () => {
      const startedAt = Date.now();
      let storedUser: any = null;
      let directOnboardingDone = false;
      const persistApi = (useAppStore as any).persist;

      try {
        const directUser = await AsyncStorage.getItem(
          STORAGE_KEYS.loggedInUser,
        );
        storedUser = directUser ? JSON.parse(directUser) : null;
      } catch {
        storedUser = null;
      }

      try {
        directOnboardingDone =
          (await AsyncStorage.getItem(STORAGE_KEYS.onboardingDone)) === "true";
      } catch {
        directOnboardingDone = false;
      }

      try {
        await persistApi?.rehydrate?.();
      } catch {
        // ignore; startup will use whatever store state is available
      }

      if (!mounted) {
        return;
      }

      const state = useAppStore.getState();
      if (storedUser && !state.user) {
        useAppStore.setState({
          isHydrated: true,
          user: storedUser,
        });
      }

      const remainingDelay = Math.max(0, 4000 - (Date.now() - startedAt));
      if (remainingDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, remainingDelay));
      }

      if (!mounted) {
        return;
      }

      const nextRoute =
        storedUser || state.user
          ? "Main"
          : !directOnboardingDone && !state.onboardingDone
            ? "Onboarding"
            : "Auth";

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: nextRoute }],
        }),
      );
    };

    restoreAndRoute();

    return () => {
      mounted = false;
    };
  }, [navigation]);

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
