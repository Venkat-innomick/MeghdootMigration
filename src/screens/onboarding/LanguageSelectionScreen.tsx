import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '../../components/Screen';
import { LANGUAGES } from '../../constants/languages';
import { useAppStore } from '../../store/appStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Language'>;

export const LanguageSelectionScreen = ({ navigation }: Props) => {
  const [open, setOpen] = useState(false);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const language = useAppStore((s) => s.language);

  const selectedLabel = useMemo(
    () => LANGUAGES.find((l) => l.code === language)?.label || 'English',
    [language]
  );

  return (
    <Screen backgroundColor={colors.onBoard}>
      <StatusBar style="light" backgroundColor={colors.onBoard} />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Select Language</Text>
        <Text style={styles.subtitle}>Register to get weather and crop advisory updates</Text>

        <Image source={require('../../../assets/images/ic_logo.png')} style={styles.logo} resizeMode="contain" />

        <View style={styles.selectorWrap}>
          <Pressable style={styles.selector} onPress={() => setOpen(true)}>
            <Text style={styles.selectorText}>{selectedLabel}</Text>
            <Image source={require('../../../assets/images/ic_dropDownWhite.png')} style={styles.arrow} />
          </Pressable>
          <Text style={styles.selectorLabel}>Select Language</Text>
        </View>

        <Pressable style={styles.nextButton} onPress={() => navigation.navigate('OnboardingOne')}>
          <Text style={styles.nextText}>Next</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {LANGUAGES.map((item) => (
                <Pressable
                  key={item.code}
                  style={styles.modalItem}
                  onPress={() => {
                    setLanguage(item.code);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.onBoard,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    marginTop: 40,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 24,
  },
  subtitle: {
    marginTop: 10,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  logo: {
    marginTop: 20,
    alignSelf: 'center',
    width: 200,
    height: 200,
  },
  selectorWrap: {
    marginTop: 20,
  },
  selector: {
    height: 48,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#fff',
    backgroundColor: colors.onBoard,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  arrow: {
    width: 21,
    height: 11,
  },
  selectorLabel: {
    position: 'absolute',
    top: -8,
    left: 30,
    paddingHorizontal: 6,
    backgroundColor: colors.onBoard,
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  nextButton: {
    marginTop: 40,
    backgroundColor: colors.darkGreen,
    borderRadius: 22,
    alignItems: 'center',
    paddingVertical: 12,
  },
  nextText: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    maxHeight: '60%',
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalItemText: {
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    color: colors.text,
  },
});
