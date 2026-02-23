import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'CropAudioPlayer'>;

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const CropAudioPlayerScreen = ({ navigation, route }: Props) => {
  const { title = 'Audio', imageUrl = '', audioUrl = '' } = route.params;
  const validImageUrl =
    typeof imageUrl === 'string' &&
    imageUrl.trim() &&
    imageUrl.trim().toLowerCase() !== 'null' &&
    imageUrl.trim().toLowerCase() !== 'undefined'
      ? imageUrl.trim()
      : '';

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [statusText, setStatusText] = useState('');

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.max(0, Math.min(1, position / duration));
  }, [position, duration]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      if (!audioUrl) return;

      const onStatus = (status: AVPlaybackStatus) => {
        if (!mounted) return;
        if (!status.isLoaded) {
          if (status.error) setStatusText('error...');
          return;
        }

        setPosition(status.positionMillis || 0);
        setDuration(status.durationMillis || 0);
        setIsPlaying(!!status.isPlaying);

        if (status.isBuffering) setStatusText('loading...');
        else if (status.didJustFinish) setStatusText('completed...');
        else if (status.isPlaying) setStatusText('playing...');
        else setStatusText('paused...');
      };

      const created = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false, progressUpdateIntervalMillis: 300 },
        onStatus
      );

      if (!mounted) {
        await created.sound.unloadAsync();
        return;
      }

      setSound(created.sound);
    };

    load().catch(() => setStatusText('error...'));

    return () => {
      mounted = false;
      if (sound) {
        sound.unloadAsync().catch(() => {});
      }
    };
  }, [audioUrl]);

  const close = async () => {
    if (sound) {
      await sound.stopAsync().catch(() => {});
      await sound.unloadAsync().catch(() => {});
    }
    navigation.goBack();
  };

  const togglePlay = async () => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;

    if (status.isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }
  };

  const seekBy = async (seconds: number) => {
    if (!sound) return;
    const status = await sound.getStatusAsync();
    if (!status.isLoaded) return;

    const current = status.positionMillis || 0;
    const target = Math.max(0, Math.min((status.durationMillis || 0), current + seconds * 1000));
    await sound.setPositionAsync(target);
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} onPress={close} />

      <View style={styles.sheet}>
        <Pressable style={styles.closeWrap} onPress={close}>
          <Image source={require('../../../assets/images/ic_popupDown.png')} style={styles.closeIcon} resizeMode="contain" />
        </Pressable>

        <View style={styles.artFrame}>
          <Image
            source={validImageUrl ? { uri: validImageUrl } : require('../../../assets/images/defult_crop_plane.png')}
            style={styles.art}
            resizeMode="cover"
          />
          <Text style={styles.cropName}>{title}</Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable onPress={() => seekBy(-10)}>
            <Image source={require('../../../assets/images/ic_backSec.png')} style={styles.sideCtrl} resizeMode="contain" />
          </Pressable>
          <Pressable onPress={togglePlay}>
            <Image
              source={isPlaying ? require('../../../assets/images/ic_pause.png') : require('../../../assets/images/ic_play.png')}
              style={styles.mainCtrl}
              resizeMode="contain"
            />
          </Pressable>
          <Pressable onPress={() => seekBy(10)}>
            <Image source={require('../../../assets/images/ic_forwardSec.png')} style={styles.sideCtrl} resizeMode="contain" />
          </Pressable>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatTime(position)}</Text>
          <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>

        <Text style={styles.statusText}>{audioUrl ? statusText : 'audio unavailable'}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  closeWrap: {
    alignSelf: 'center',
  },
  closeIcon: {
    width: 30,
    height: 30,
  },
  artFrame: {
    marginTop: 2,
    height: 250,
    borderRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  art: {
    ...StyleSheet.absoluteFillObject,
  },
  cropName: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  controlsRow: {
    marginTop: 10,
    marginHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideCtrl: {
    width: 35,
    height: 35,
  },
  mainCtrl: {
    width: 50,
    height: 50,
  },
  progressTrack: {
    marginTop: 12,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#DDDDDD',
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: colors.darkGreen,
  },
  timeRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 10,
  },
  statusText: {
    marginTop: 10,
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 12,
    textAlign: 'center',
  },
});
