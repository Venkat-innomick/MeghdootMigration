import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { mastersService, userService, weatherService } from '../../api/services';
import { useAppStore } from '../../store/appStore';
import { DistrictMasterItem, StateMasterItem } from '../../types/domain';

type SearchBlockItem = {
  blockID: number;
  blockName: string;
  districtID: number;
  stateID: number;
  isAsd: boolean;
  favourite: boolean;
};

export const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);

  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [districts, setDistricts] = useState<DistrictMasterItem[]>([]);
  const [blocks, setBlocks] = useState<SearchBlockItem[]>([]);
  const [selectedState, setSelectedState] = useState<StateMasterItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMasterItem | null>(null);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);

  const userId = useMemo(() => user?.typeOfRole || user?.userProfileId || 0, [user]);

  const refreshFavouriteFlags = async (items: SearchBlockItem[]) => {
    if (!userId) return items;
    const weather = await weatherService.getByLocation({
      Id: userId,
      LanguageType: language,
      RefreshDateTime: new Date().toISOString().slice(0, 10),
    });
    const locations = (weather.result || weather.data || []) as any[];
    return items.map((item) => {
      const exists = locations.some((loc) =>
        item.isAsd
          ? (loc.asdID || loc.AsdID) === item.blockID && (loc.districtID || loc.DistrictID) === item.districtID
          : (loc.blockID || loc.BlockID) === item.blockID && (loc.districtID || loc.DistrictID) === item.districtID
      );
      return { ...item, favourite: exists };
    });
  };

  const loadStates = async () => {
    setLoading(true);
    try {
      const list = await mastersService.getStates(language);
      setStates(list.filter((s) => s.stateID !== 37));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load states');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStates();
  }, []);

  const selectState = async (state: StateMasterItem) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setBlocks([]);
    setLoading(true);
    try {
      const list = await mastersService.getDistricts(state.stateID, language);
      setDistricts(list.filter((d) => d.stateID === state.stateID));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load districts');
    } finally {
      setLoading(false);
    }
  };

  const selectDistrict = async (district: DistrictMasterItem) => {
    if (!selectedState) return;
    setSelectedDistrict(district);
    setLoading(true);
    try {
      const isAsd = selectedState.stateID === 28 || selectedState.stateID === 36;
      const raw = isAsd
        ? await mastersService.getAsd(district.districtID, language)
        : await mastersService.getBlocks(district.districtID, language);

      const mapped: SearchBlockItem[] = raw.map((item: any) => ({
        blockID: item.asdID || item.AsdID || item.blockID || item.BlockID,
        blockName: item.asdName || item.AsdName || item.blockName || item.BlockName,
        districtID: district.districtID,
        stateID: selectedState.stateID,
        isAsd,
        favourite: false,
      }));
      const withFav = await refreshFavouriteFlags(mapped);
      setBlocks(withFav);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unable to load blocks');
    } finally {
      setLoading(false);
    }
  };

  const addLocation = async (item: SearchBlockItem) => {
    if (!userId) return;
    try {
      const payload: Record<string, unknown> = {
        UALID: 0,
        UserProfileID: userId,
        StateID: item.stateID,
        DistrictID: item.districtID,
        Createdby: userId,
        Updatedby: userId,
      };
      if (item.isAsd) payload.AsdID = item.blockID;
      else payload.BlockID = item.blockID;

      const response = await userService.saveLocation(payload);
      if (response.isSuccessful === false) {
        Alert.alert('Failed', response.errorMessage || 'Unable to add location');
        return;
      }
      setBlocks((prev) => prev.map((b) => (b.blockID === item.blockID ? { ...b, favourite: true } : b)));
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Unable to add location');
    }
  };

  const removeLocation = async (item: SearchBlockItem) => {
    if (!userId) return;
    try {
      const payload: Record<string, unknown> = {
        UserProfileID: userId,
        DistrictID: item.districtID,
      };
      if (item.isAsd) payload.AsdID = item.blockID;
      else payload.BlockID = item.blockID;

      const response = await userService.deleteLocation(payload);
      if (response.isSuccessful === false) {
        Alert.alert('Failed', response.errorMessage || 'Unable to delete location');
        return;
      }
      setBlocks((prev) => prev.map((b) => (b.blockID === item.blockID ? { ...b, favourite: false } : b)));
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Unable to delete location');
    }
  };

  return (
    <Screen>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Image source={require('../../../assets/images/back.png')} style={styles.backIcon} resizeMode="contain" />
          </Pressable>

          <View style={styles.selectorsWrap}>
            <Pressable style={styles.selector} onPress={() => setStatePickerOpen(true)}>
              <Text style={[styles.selectorText, !selectedState && styles.selectorPlaceholder]}>
                {selectedState?.stateName || 'Select state'}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            {districts.length > 0 ? (
              <Pressable style={[styles.selector, styles.secondSelector]} onPress={() => setDistrictPickerOpen(true)}>
                <Text style={[styles.selectorText, !selectedDistrict && styles.selectorPlaceholder]}>
                  {selectedDistrict?.districtName || 'Select district'}
                </Text>
                <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
              </Pressable>
            ) : null}

            <Pressable
              style={styles.currentLocationRow}
              onPress={() => Alert.alert('Location', 'Current location support will be enabled next.')}
            >
              <Image
                source={require('../../../assets/images/ic_currentLocation.png')}
                style={styles.currentLocationIcon}
                resizeMode="contain"
              />
              <Text style={styles.currentLocationText}>Choose current location</Text>
            </Pressable>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={blocks}
            keyExtractor={(item) => `${item.districtID}-${item.blockID}`}
            ListEmptyComponent={<Text style={styles.empty}>Select state and district to load blocks.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowName}>{item.blockName}</Text>
                <Pressable style={styles.addedWrap} onPress={() => (item.favourite ? removeLocation(item) : addLocation(item))}>
                  <Image
                    source={
                      item.favourite
                        ? require('../../../assets/images/ic_addedFav.png')
                        : require('../../../assets/images/ic_searchfav.png')
                    }
                    style={styles.addIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.addText}>{item.favourite ? 'Added' : 'Add'}</Text>
                </Pressable>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      <Modal visible={statePickerOpen} transparent animationType="fade" onRequestClose={() => setStatePickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStatePickerOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {states.map((item) => (
                <Pressable
                  key={item.stateID}
                  style={styles.modalItem}
                  onPress={() => {
                    selectState(item);
                    setStatePickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.stateName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal
        visible={districtPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setDistrictPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setDistrictPickerOpen(false)}>
          <View style={styles.modalCard}>
            <ScrollView>
              {districts.map((item) => (
                <Pressable
                  key={item.districtID}
                  style={styles.modalItem}
                  onPress={() => {
                    selectDistrict(item);
                    setDistrictPickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.districtName}</Text>
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
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: 15,
    paddingTop: 25,
    paddingBottom: 5,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    width: 25,
    height: 25,
    marginTop: 8,
    marginRight: 10,
  },
  backIcon: { width: 25, height: 25 },
  selectorsWrap: { flex: 1 },
  selector: {
    height: 44,
    borderRadius: 2,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondSelector: { marginTop: 15 },
  selectorText: {
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    color: colors.darkGreen,
  },
  selectorPlaceholder: { color: colors.darkGreen },
  dropdownIcon: { width: 21, height: 11 },
  currentLocationRow: {
    marginTop: 8,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocationIcon: { width: 20, height: 20 },
  currentLocationText: {
    marginLeft: 5,
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row: {
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowName: {
    flex: 1,
    color: colors.primary,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  addedWrap: {
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addIcon: { width: 20, height: 20 },
  addText: { marginLeft: 2, color: colors.primary, fontFamily: 'RobotoRegular', fontSize: 14 },
  separator: { height: 1, backgroundColor: colors.frameBorder, marginHorizontal: 0 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: spacing.xl, fontFamily: 'RobotoRegular' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: spacing.xs,
  },
  modalItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalItemText: {
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
});
