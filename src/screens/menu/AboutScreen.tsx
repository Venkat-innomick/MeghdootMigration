import React from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

const ABOUT_TEXT = `Meghdoot, a joint initiative of India Meteorological Department (IMD), Indian Institute of Tropical meteorology (IITM) and Indian Council of Agricultural Research (ICAR) aims to deliver critical information to farmers through a simple and easy to use mobile application.

The mobile application was developed by the Digital Agriculture research team at International Crops Research Institute for the Semi-Arid Tropics (ICRISAT), Hyderabad in collaboration with IITM, Pune and IMD, Delhi.

The app seamlessly aggregates contextualized district and crop wise advisories issued by Agro Met Field Units (AMFU) every Tuesday and Friday with the forecast and historic weather information to the fingertips of the farmers. The advisories are also issued in vernacular wherever available.`;

export const AboutScreen = () => {
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.imagesRow}>
          <Image source={require('../../../assets/images/imd.png')} style={styles.logo} />
          <Image source={require('../../../assets/images/iitmp.png')} style={styles.logo} />
          <Image source={require('../../../assets/images/icar.png')} style={styles.logo} />
          <Image source={require('../../../assets/images/icrisat.png')} style={styles.logo} />
        </ScrollView>

        <Text style={styles.body}>{ABOUT_TEXT}</Text>

        <View style={styles.links}>
          <Pressable onPress={() => Linking.openURL('http://www.imd.gov.in/')}>
            <Text style={styles.link}>IMD</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://www.tropmet.res.in/')}>
            <Text style={styles.link}>IITM</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://icar.org.in/')}>
            <Text style={styles.link}>ICAR</Text>
          </Pressable>
          <Pressable onPress={() => Linking.openURL('https://www.icrisat.org/')}>
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
    resizeMode: 'contain',
    backgroundColor: '#fff',
  },
  body: { fontFamily: 'RobotoRegular', fontSize: 16, lineHeight: 24, color: colors.text },
  links: { marginTop: spacing.md, gap: spacing.xs },
  link: { color: colors.primary, textDecorationLine: 'underline', fontFamily: 'RobotoMedium' },
});
