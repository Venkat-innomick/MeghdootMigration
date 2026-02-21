import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Image, ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { DashboardLocation } from '../../types/domain';
import { userService, weatherService } from '../../api/services';
import { useAppStore } from '../../store/appStore';

const pickNum = (...values: any[]) => {
  for (const v of values) {
    if (typeof v === 'number') return v;
  }
  return 0;
};

const pickStr = (...values: any[]) => {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v;
  }
  return '';
};

export const LocationsScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);

  const userId = useMemo(() => user?.typeOfRole || user?.userProfileId || 0, [user]);

  const load = async () => {
    if (!user) return;
    const response = await weatherService.getByLocation({
      userProfileID: user.userProfileId,
      languageType: language,
    });
    setLocations((response.result || response.data || []) as DashboardLocation[]);
  };

  useEffect(() => {
    load();
  }, [language, user]);

  const deleteLocation = async (item: DashboardLocation) => {
    if (!userId) return;

    const blockId = pickNum((item as any).blockID, (item as any).BlockID);
    const asdId = pickNum((item as any).asdID, (item as any).AsdID);
    const districtId = pickNum((item as any).districtID, (item as any).DistrictID);

    if (!districtId || (!blockId && !asdId)) {
      Alert.alert('Delete failed', 'Location identifiers missing.');
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        UserProfileID: userId,
        DistrictID: districtId,
      };
      if (asdId) payload.AsdID = asdId;
      else payload.BlockID = blockId;

      const response = await userService.deleteLocation(payload);
      if (response.isSuccessful === false) {
        Alert.alert('Delete failed', response.errorMessage || 'Unable to delete location');
        return;
      }

      setLocations((prev) =>
        prev.filter((l) => {
          const lBlock = pickNum((l as any).blockID, (l as any).BlockID);
          const lAsd = pickNum((l as any).asdID, (l as any).AsdID);
          const lDistrict = pickNum((l as any).districtID, (l as any).DistrictID);
          return !(lDistrict === districtId && lBlock === blockId && lAsd === asdId);
        })
      );
    } catch (error: any) {
      Alert.alert('Delete failed', error.message || 'Unable to delete location');
    }
  };

  return (
    <Screen>
      <View style={styles.root}>
        <FlatList
          data={locations}
          keyExtractor={(item, index) => `${pickNum((item as any).stateID, (item as any).StateID)}-${pickNum((item as any).districtID, (item as any).DistrictID)}-${index}`}
          contentContainerStyle={styles.container}
          ListHeaderComponent={<Text style={styles.headerTitle}>Added locations</Text>}
          renderItem={({ item }) => {
            const city = pickStr((item as any).cityName, (item as any).CityName, (item as any).districtName, (item as any).DistrictName);
            const state = pickStr((item as any).stateName, (item as any).StateName);
            const imagePath = pickStr((item as any).cloudImage, (item as any).CloudImage);
            return (
              <View style={styles.cardWrap}>
                <ImageBackground
                  source={imagePath ? { uri: imagePath } : require('../../../assets/images/ic_profileMenuBG.png')}
                  style={styles.card}
                  imageStyle={styles.cardBg}
                >
                  <Text style={styles.cityText} numberOfLines={1}>{city || 'Location'}</Text>
                  <Text style={styles.stateText} numberOfLines={1}>{state || '-'}</Text>
                </ImageBackground>

                <Pressable style={styles.deleteButton} onPress={() => deleteLocation(item)}>
                  <Image source={require('../../../assets/images/ic_delete.png')} style={styles.deleteIcon} resizeMode="contain" />
                  <Text style={styles.deleteText}>Delete</Text>
                </Pressable>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.empty}>No locations.</Text>}
        />

        <Pressable style={styles.addButton} onPress={() => navigation.navigate('Search')}>
          <Text style={styles.addButtonText}>Add location</Text>
        </Pressable>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  container: { paddingTop: 5, paddingHorizontal: 5, paddingBottom: 100 },
  headerTitle: {
    marginLeft: 15,
    marginBottom: 5,
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  cardWrap: {
    marginHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  card: {
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 19,
  },
  cardBg: {
    borderRadius: 10,
  },
  cityText: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
  stateText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    marginTop: 2,
  },
  deleteButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    backgroundColor: '#DE4141',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: {
    width: 18,
    height: 18,
  },
  deleteText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
    marginLeft: 4,
  },
  addButton: {
    position: 'absolute',
    left: 5,
    right: 5,
    bottom: 20,
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
  empty: {
    marginTop: spacing.lg,
    textAlign: 'center',
    color: colors.muted,
    fontFamily: 'RobotoRegular',
  },
});
