import React from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "../../components/Screen";
import { LANGUAGES } from "../../constants/languages";
import { useAppStore } from "../../store/appStore";
import { spacing } from "../../theme/spacing";
import { colors } from "../../theme/colors";
import i18n from "../../locales/i18n";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";

export const LanguageSettingsScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const current = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Change Language</Text>
        <FlatList
          data={LANGUAGES}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => {
            const active = current === item.code;
            return (
              <Pressable
                style={[styles.item, active && styles.itemActive]}
                onPress={() => {
                  setLanguage(item.code);
                  i18n.changeLanguage(item.code).catch(() => undefined);
                }}
              >
                <Text
                  style={[styles.itemText, active && styles.itemTextActive]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg },
  title: {
    fontFamily: "RobotoMedium",
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.md,
  },
  item: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemText: { fontFamily: "RobotoRegular", color: colors.text, fontSize: 16 },
  itemTextActive: { color: "#fff" },
});
