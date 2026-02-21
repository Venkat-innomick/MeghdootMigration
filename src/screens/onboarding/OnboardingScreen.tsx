import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';

interface Props {
  title: string;
  description: string;
  image: any;
  onNext: () => void;
  onSkip: () => void;
}

export const OnboardingScreen = ({ title, description, image, onNext, onSkip }: Props) => {
  return (
    <Screen backgroundColor={colors.onBoard}>
      <StatusBar style="light" backgroundColor={colors.onBoard} />
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>

        <View style={styles.imageWrap}>
          <Image source={image} style={styles.image} resizeMode="contain" />
        </View>

        <Pressable style={styles.nextButton} onPress={onNext}>
          <Text style={styles.nextText}>Next</Text>
        </Pressable>

        <Pressable onPress={onSkip} style={styles.skipWrap}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 30,
    paddingBottom: 50,
    backgroundColor: colors.onBoard,
  },
  title: {
    marginTop: 10,
    marginBottom: 10,
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 24,
  },
  description: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    marginBottom: 10,
  },
  imageWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 250,
    height: 250,
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
    fontSize: 14,
  },
  skipWrap: {
    marginTop: 10,
    alignItems: 'center',
  },
  skipText: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
});
