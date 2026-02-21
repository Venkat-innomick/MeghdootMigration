import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const TERMS_URL = 'https://sites.google.com/view/meghdoot-terms-and-conditions/home';

export const TermsScreen = () => {
  return (
    <Screen>
      <View style={styles.container}>
        <Text style={styles.title}>Terms and conditions</Text>
        <Text style={styles.body}>
          The original Xamarin app opens terms in a web view. Tap below to open the same terms page.
        </Text>
        <Pressable style={styles.button} onPress={() => Linking.openURL(TERMS_URL)}>
          <Text style={styles.buttonText}>Open Terms Page</Text>
        </Pressable>
        <Text style={styles.url}>{TERMS_URL}</Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  title: { fontFamily: 'RobotoMedium', fontSize: 24, color: colors.text, marginBottom: spacing.md },
  body: { fontFamily: 'RobotoRegular', fontSize: 16, color: colors.muted, marginBottom: spacing.lg },
  button: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center' },
  buttonText: { color: '#fff', fontFamily: 'RobotoMedium', fontSize: 16 },
  url: { marginTop: spacing.sm, fontFamily: 'RobotoRegular', color: colors.primary },
});
