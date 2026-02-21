import React from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme/colors';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '__';
};

const InfoField = ({ label, value, divider = true }: { label: string; value: string; divider?: boolean }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <Text style={styles.fieldValue}>{value}</Text>
    {divider ? <View style={styles.divider} /> : null}
  </View>
);

export const ProfileScreen = () => {
  const user: any = useAppStore((s) => s.user);

  const stateName = pickText(user?.stateName, user?.StateName);
  const districtName = pickText(user?.districtName, user?.DistrictName);
  const blockName = pickText(user?.blockName, user?.BlockName, user?.asdName, user?.AsdName);
  const language = pickText(user?.languageName, user?.LanguageName, user?.language, user?.Language);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.avatarWrap}>
          <Image
            source={user?.imagePath ? { uri: user.imagePath } : require('../../../assets/images/default-profile.png')}
            style={styles.avatar}
          />
        </View>

        <View style={styles.contentWrap}>
          <Text style={styles.sectionTitle}>General</Text>
          <InfoField label="Name" value={pickText(user?.firstName, user?.FirstName)} />
          <InfoField label="Mobile Number" value={pickText(user?.mobileNumber, user?.LogInId, user?.MobileNumber)} />

          <Text style={styles.sectionTitle}>Profile Language</Text>
          <InfoField label="Language" value={language} />

          <Text style={styles.sectionTitle}>Location Details</Text>
          <InfoField label="State" value={stateName} />
          <InfoField label="District" value={districtName} />
          <InfoField label="Block/ASD" value={blockName} />
          <InfoField label="Village" value={pickText(user?.villageName, user?.VillageName)} />
          <InfoField label="Panchayat" value={pickText(user?.panchayatName, user?.PanchayatName)} divider={false} />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 20,
  },
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  contentWrap: {
    paddingHorizontal: 10,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 10,
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
  fieldWrap: {
    marginBottom: 2,
  },
  fieldLabel: {
    color: '#A0A0A0',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  fieldValue: {
    marginTop: 2,
    color: '#363636',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  divider: {
    marginTop: 6,
    marginBottom: 8,
    height: 1,
    backgroundColor: '#EBEBEB',
  },
});
