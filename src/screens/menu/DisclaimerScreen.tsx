import React from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const DISCLAIMER_TEXT = `This MEGHDOOT app has been designed for general public and intends to enable easier access to real time weather based information. It does not guarantee accuracy of the weather information nor any other aspect with regards to any information published on the app.

The user assumes the entire risk related to the use of information on this app. In no event shall the MoES or its constituents be liable to you or to any third party for any direct, indirect, incidental, consequential, special or exemplary damages or lost profit resulting from any use or misuse of this data.`;

export const DisclaimerScreen = () => {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <Image source={require('../../../assets/images/disclaimer.png')} style={styles.hero} />
        <Text style={styles.body}>{DISCLAIMER_TEXT}</Text>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  hero: {
    width: '100%',
    maxHeight: 260,
    aspectRatio: 16 / 9,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  body: { fontFamily: 'RobotoRegular', fontSize: 16, lineHeight: 24, color: colors.text },
});
