import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { useAppStore } from '../../store/appStore';
import { userService } from '../../api/services';
import { LANGUAGES } from '../../constants/languages';
import i18n from '../../locales/i18n';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const setUser = useAppStore((s) => s.setUser);
  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);

  const currentLanguageLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label || 'English',
    [language]
  );

  const login = async () => {
    if (mobile.length !== 10) {
      Alert.alert('Validation', 'Please enter valid mobile number');
      return;
    }
    setLoading(true);
    try {
      const response = await userService.login({ mobileNo: mobile, languageType: currentLanguageLabel });
      const data = (response.result || response.data) as any;
      if (data) {
        setUser({
          userProfileId: data.userProfileId || data.typeOfRole || 0,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          mobileNumber: mobile,
          imagePath: data.imagePath,
          isLogout: false,
          typeOfRole: data.typeOfRole,
        });
      } else {
        Alert.alert('Login failed', response.errorMessage || 'Unable to login');
      }
    } catch (error: any) {
      Alert.alert('Login failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={styles.title}>LOGIN / SIGN UP</Text>
            <Text style={styles.subtitle}>Register to get weather and crop advisory updates</Text>
            <Image source={require('../../../assets/images/ic_logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View>
            <View style={styles.fieldWrap}>
              <Text style={styles.floatLabel}>Enter Mobile Number</Text>
              <TextInput
                style={styles.input}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="number-pad"
                maxLength={10}
                placeholder="Mobile"
                placeholderTextColor={colors.muted}
              />
            </View>

            <View style={styles.fieldWrap}>
              <Text style={styles.floatLabel}>Select Language</Text>
              <Pressable style={styles.langHeader} onPress={() => setLangOpen((s) => !s)}>
                <Text style={styles.langHeaderText}>{currentLanguageLabel}</Text>
                <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
              </Pressable>
              {langOpen && (
                <View style={styles.langList}>
                  {LANGUAGES.map((item) => (
                    <Pressable
                      key={item.code}
                      style={styles.langItem}
                      onPress={() => {
                        setLanguage(item.code);
                        i18n.changeLanguage(item.code).catch(() => undefined);
                        setLangOpen(false);
                      }}
                    >
                      <Text style={styles.langItemText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={login} disabled={loading}>
              <Text style={styles.primaryButtonText}>{loading ? 'Signing In...' : 'Login'}</Text>
            </Pressable>

            <Text style={styles.orText}>or</Text>

            <Pressable style={styles.outlineButton} onPress={() => navigation.navigate('Registration')}>
              <Text style={styles.outlineButtonText}>Sign-Up</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 25,
    paddingBottom: 20,
    paddingTop: 0,
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  title: {
    marginTop: 40,
    textAlign: 'center',
    fontFamily: 'RobotoMedium',
    fontSize: 24,
    color: colors.darkGreen,
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    color: colors.lightGreen,
  },
  logo: {
    alignSelf: 'center',
    marginTop: 10,
    width: 150,
    height: 150,
  },
  fieldWrap: {
    marginTop: 14,
  },
  floatLabel: {
    alignSelf: 'flex-start',
    marginLeft: 22,
    marginBottom: -9,
    zIndex: 1,
    paddingHorizontal: 6,
    backgroundColor: '#fff',
    color: colors.muted,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    color: colors.text,
    backgroundColor: '#fff',
  },
  langHeader: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  langHeaderText: {
    fontFamily: 'RobotoRegular',
    color: colors.text,
    fontSize: 14,
  },
  dropdownIcon: {
    width: 21,
    height: 11,
  },
  langList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: '#fff',
    maxHeight: 220,
  },
  langItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  langItemText: {
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    color: colors.text,
  },
  primaryButton: {
    marginTop: 0,
    backgroundColor: colors.primary,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionsWrap: {
    marginTop: 24,
    marginBottom: 15,
  },
  buttonDisabled: { opacity: 0.7 },
  primaryButtonText: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
  orText: {
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'RobotoRegular',
    color: colors.muted,
  },
  outlineButton: {
    marginTop: 10,
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 22,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  outlineButtonText: {
    color: colors.primary,
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
});
