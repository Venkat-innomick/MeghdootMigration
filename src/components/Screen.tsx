import React, { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface ScreenProps extends PropsWithChildren {
  backgroundColor?: string;
  edges?: Edge[];
}

export const Screen = ({
  children,
  backgroundColor = colors.background,
  edges = ['left', 'right', 'bottom'],
}: ScreenProps) => {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={edges}>
      <View style={styles.container}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
});
