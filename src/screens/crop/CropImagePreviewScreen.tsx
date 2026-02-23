import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'CropImagePreview'>;

export const CropImagePreviewScreen = ({ navigation, route }: Props) => {
  const { imageUrl } = route.params;
  const validImageUrl =
    typeof imageUrl === 'string' &&
    imageUrl.trim() &&
    imageUrl.trim().toLowerCase() !== 'null' &&
    imageUrl.trim().toLowerCase() !== 'undefined'
      ? imageUrl.trim()
      : '';

  return (
    <Screen>
      <View style={styles.container}>
        <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
          <Image source={require('../../../assets/images/cancel_icon.png')} style={styles.closeIcon} resizeMode="contain" />
        </Pressable>

        <Image
          source={validImageUrl ? { uri: validImageUrl } : require('../../../assets/images/defult_crop_plane.png')}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: 20,
    marginRight: 10,
  },
  closeIcon: {
    width: 30,
    height: 30,
  },
  image: {
    flex: 1,
    marginTop: 10,
    marginHorizontal: 5,
  },
});
