import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { mastersService, userService, weatherService } from '../../api/services';
import { useAppStore } from '../../store/appStore';
import { DistrictMasterItem, StateMasterItem } from '../../types/domain';
import {
  buildByLocationPayload,
  getLanguageLabel,
  getUserProfileId,
  isApiSuccess,
  parseLocationWeatherList,
  toNum,
  toText,
} from '../../utils/locationApi';

type LocationRow = {
  stateID: number;
  districtID: number;
  blockID: number;
  asdID: number;
  stateName: string;
  cityName: string;
  colorCode: string;
  cloudImage: string;
  isCurrentLocation: boolean;
};

type Option = { id: number; label: string };

const pickUri = (...values: any[]) => {
  for (const v of values) {
    if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://') || v.startsWith('file://'))) {
      return v;
    }
  }
  return '';
};

export const LocationsScreen = () => {
  const navigation = useNavigation<any>();
  const user: any = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const appLocations = useAppStore((s) => s.locations);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);

  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<LocationRow[]>([]);

  const [addOpen, setAddOpen] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [districts, setDistricts] = useState<DistrictMasterItem[]>([]);
  const [blocks, setBlocks] = useState<Option[]>([]);
  const [selectedState, setSelectedState] = useState<StateMasterItem | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictMasterItem | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Option | null>(null);

  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);
  const [blockPickerOpen, setBlockPickerOpen] = useState(false);

  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

  const mapRawLocations = React.useCallback((list: any[]): LocationRow[] => {
    const mapped: LocationRow[] = (list || []).map((item: any) => {
      const stateID = toNum(item.stateID ?? item.StateID ?? item.stateId ?? item.StateId);
      const districtID = toNum(item.districtID ?? item.DistrictID ?? item.districtId ?? item.DistrictId);
      const blockID = toNum(item.blockID ?? item.BlockID ?? item.blockId ?? item.BlockId);
      const asdID = toNum(item.asdID ?? item.AsdID ?? item.asdId ?? item.AsdId);
      const cityName =
        toText(item.cityName ?? item.CityName) ||
        toText(item.placeName ?? item.PlaceName) ||
        toText(item.blockName ?? item.BlockName) ||
        toText(item.asdName ?? item.AsdName) ||
        toText(item.districtName ?? item.DistrictName) ||
        'Location';

      return {
        stateID,
        districtID,
        blockID,
        asdID,
        stateName: toText(item.stateName ?? item.StateName) || '--',
        cityName,
        colorCode: toText(item.colorCode ?? item.ColorCode) || '#FFFFFF',
        cloudImage: pickUri(item.cloudImage ?? item.CloudImage ?? item.imagePath ?? item.ImagePath),
        isCurrentLocation: Boolean(item.isCurrentLocation ?? item.IsCurrentLocation),
      };
    });

    return mapped.filter((x) => x.districtID > 0);
  }, []);

  const normalizedLocations = useMemo(() => {
    const map = new Map<string, LocationRow>();
    for (const raw of locations) {
      const key = `${raw.stateID}-${raw.districtID}-${raw.blockID}-${raw.asdID}-${raw.isCurrentLocation ? 1 : 0}`;
      if (!map.has(key)) map.set(key, raw);
    }
    return Array.from(map.values());
  }, [locations]);

  const currentLocation = useMemo(
    () => normalizedLocations.find((x) => x.isCurrentLocation) || null,
    [normalizedLocations]
  );

  const addedLocations = useMemo(
    () => normalizedLocations.filter((x) => !x.isCurrentLocation),
    [normalizedLocations]
  );

  const loadLocations = async () => {
    if (!userId) {
      setLocations([]);
      return [] as LocationRow[];
    }
    setLoading(true);
    try {
      const payload = buildByLocationPayload(userId, languageLabel);
      const response = await weatherService.getByLocation(payload);
      const list = parseLocationWeatherList(response);
      setAppLocations(list as any[]);
      const filtered = mapRawLocations(list as any[]);
      setLocations(filtered);
      return filtered;
    } catch {
      setLocations([]);
      return [] as LocationRow[];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appLocations?.length) {
      setLocations(mapRawLocations(appLocations as any[]));
    }
  }, [appLocations, mapRawLocations]);

  const loadStates = async () => {
    const res = await mastersService.getStates(languageLabel);
    const mapped = (res as any[])
      .map((s, index) => ({
        stateID: toNum(s.stateID ?? s.StateID, 0),
        stateName: toText(s.stateName ?? s.StateName),
      }))
      .filter((s) => s.stateID > 0 && !!s.stateName && s.stateID !== 37);
    const unique = mapped.filter((s, i, arr) => arr.findIndex((x) => x.stateID === s.stateID) === i);
    setStates(unique);
  };

  const onStateSelect = async (state: StateMasterItem) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setBlocks([]);
    setAddLoading(true);
    try {
      const res = await mastersService.getDistricts(state.stateID, languageLabel);
      const mapped = (res as any[])
        .map((d, index) => ({
          districtID: toNum(d.districtID ?? d.DistrictID, 0),
          districtName: toText(d.districtName ?? d.DistrictName),
          stateID: toNum(d.stateID ?? d.StateID, state.stateID),
        }))
        .filter((d) => d.districtID > 0 && !!d.districtName && d.stateID === state.stateID);
      const unique = mapped.filter((d, i, arr) => arr.findIndex((x) => x.districtID === d.districtID) === i);
      setDistricts(unique);
    } finally {
      setAddLoading(false);
    }
  };

  const onDistrictSelect = async (district: DistrictMasterItem) => {
    if (!selectedState) return;
    setSelectedDistrict(district);
    setSelectedBlock(null);
    setAddLoading(true);
    try {
      const isAsd = selectedState.stateID === 28 || selectedState.stateID === 36;
      const res = isAsd
        ? await mastersService.getAsd(district.districtID, languageLabel)
        : await mastersService.getBlocks(district.districtID, languageLabel);

      const mapped = (res as any[])
        .map((b, index) => ({
          id: toNum(b.asdID ?? b.AsdID ?? b.blockID ?? b.BlockID, 0),
          label: toText(b.asdName ?? b.AsdName ?? b.blockName ?? b.BlockName),
        }))
        .filter((b) => b.id > 0 && !!b.label);
      const unique = mapped.filter((b, i, arr) => arr.findIndex((x) => x.id === b.id) === i);
      setBlocks(unique);
    } finally {
      setAddLoading(false);
    }
  };

  const openAdd = async () => {
    setAddOpen(true);
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setDistricts([]);
    setBlocks([]);
    setAddLoading(true);
    try {
      await loadStates();
    } catch {
      Alert.alert('Error', 'Unable to load states');
    } finally {
      setAddLoading(false);
    }
  };

  const saveAddedLocation = async () => {
    if (!userId) {
      Alert.alert('Failed', 'User not found. Please login again.');
      return;
    }
    if (!selectedState) {
      Alert.alert('Validation', 'Please select state');
      return;
    }
    if (!selectedDistrict) {
      Alert.alert('Validation', 'Please select district');
      return;
    }
    if (!selectedBlock) {
      Alert.alert(
        'Validation',
        selectedState.stateID === 28 || selectedState.stateID === 36 ? 'Please select ASD' : 'Please select block'
      );
      return;
    }

    const payload: Record<string, unknown> = {
      UALID: 0,
      UserProfileID: userId,
      StateID: selectedState.stateID,
      DistrictID: selectedDistrict.districtID,
      Createdby: userId,
      Updatedby: userId,
    };
    if (selectedState.stateID === 28 || selectedState.stateID === 36) payload.AsdID = selectedBlock.id;
    else payload.BlockID = selectedBlock.id;

    setAddLoading(true);
    try {
      const response: any = await userService.saveLocation(payload);
      if (!isApiSuccess(response)) {
        Alert.alert('Failed', response?.errorMessage || response?.ErrorMessage || 'Unable to add location');
        return;
      }

      // Optimistic UI update to match Xamarin immediate feedback.
      const optimistic: LocationRow = {
        stateID: selectedState.stateID,
        districtID: selectedDistrict.districtID,
        blockID: selectedState.stateID === 28 || selectedState.stateID === 36 ? 0 : selectedBlock.id,
        asdID: selectedState.stateID === 28 || selectedState.stateID === 36 ? selectedBlock.id : 0,
        stateName: selectedState.stateName,
        cityName: selectedBlock.label,
        colorCode: '#FFFFFF',
        cloudImage: '',
        isCurrentLocation: false,
      };

      setLocations((prev) => [
        ...prev,
        optimistic,
      ]);
      setAddOpen(false);
      let refreshed = await loadLocations();
      let existsAfterRefresh = refreshed.some(
        (x) =>
          x.stateID === optimistic.stateID &&
          x.districtID === optimistic.districtID &&
          x.blockID === optimistic.blockID &&
          x.asdID === optimistic.asdID
      );
      if (!existsAfterRefresh) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        refreshed = await loadLocations();
        existsAfterRefresh = refreshed.some(
          (x) =>
            x.stateID === optimistic.stateID &&
            x.districtID === optimistic.districtID &&
            x.blockID === optimistic.blockID &&
            x.asdID === optimistic.asdID
        );
      }
      if (!existsAfterRefresh) {
        setLocations((prev) => {
          const already = prev.some(
            (x) =>
              x.stateID === optimistic.stateID &&
              x.districtID === optimistic.districtID &&
              x.blockID === optimistic.blockID &&
              x.asdID === optimistic.asdID
          );
          return already ? prev : [...prev, optimistic];
        });
      }
      Alert.alert('Success', 'Location added successfully');
      navigation.navigate('Home');
    } catch (e: any) {
      Alert.alert('Failed', e.message || 'Unable to add location');
    } finally {
      setAddLoading(false);
    }
  };

  const deleteLocation = async (item: LocationRow) => {
    if (!userId) return;
    if (normalizedLocations.length <= 1) {
      Alert.alert('Info', `Cannot delete only location (${item.stateName}, ${item.cityName}).`);
      return;
    }
    if (item.isCurrentLocation) {
      Alert.alert('Info', 'Current location cannot be deleted.');
      return;
    }

    const payload: Record<string, unknown> = {
      UserProfileID: userId,
      DistrictID: item.districtID,
    };
    if (item.asdID > 0) payload.AsdID = item.asdID;
    else payload.BlockID = item.blockID;

    try {
      setLocations((prev) =>
        prev.filter(
          (x) =>
            !(
              x.districtID === item.districtID &&
              x.blockID === item.blockID &&
              x.asdID === item.asdID &&
              !x.isCurrentLocation
            )
        )
      );
      const response: any = await userService.deleteLocation(payload);
      if (!isApiSuccess(response)) {
        Alert.alert('Delete failed', response?.errorMessage || response?.ErrorMessage || 'Unable to delete location');
        await loadLocations();
        return;
      }
      await loadLocations();
    } catch (e: any) {
      Alert.alert('Delete failed', e.message || 'Unable to delete location');
    }
  };

  useEffect(() => {
    if (!appLocations?.length) {
      loadLocations();
    }
  }, [userId, languageLabel]);

  useFocusEffect(
    React.useCallback(() => {
      loadLocations().catch(() => setLocations([]));
    }, [userId, languageLabel])
  );

  const renderCard = (item: LocationRow, showDelete = true) => (
    <View style={styles.cardWrap}>
      <ImageBackground
        source={item.cloudImage ? { uri: item.cloudImage } : require('../../../assets/images/ic_profileMenuBG.png')}
        style={styles.card}
        imageStyle={styles.cardBg}
      >
        <Text style={[styles.cityText, { color: item.colorCode || '#fff' }]} numberOfLines={1}>
          {item.cityName || 'Location'}
        </Text>
        <Text style={[styles.stateText, { color: item.colorCode || '#fff' }]} numberOfLines={1}>
          {item.stateName || '--'}
        </Text>
      </ImageBackground>

      {showDelete ? (
        <Pressable style={styles.deleteButton} onPress={() => deleteLocation(item)}>
          <Image source={require('../../../assets/images/ic_delete.png')} style={styles.deleteIcon} resizeMode="contain" />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const openInHome = (item: LocationRow) => {
    setSelectedLocation({
      districtID: item.districtID,
      blockID: item.blockID,
      asdID: item.asdID,
    });
    navigation.navigate('Home');
  };

  return (
    <Screen>
      <View style={styles.root}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={addedLocations}
            keyExtractor={(item, index) => `${item.stateID}-${item.districtID}-${item.blockID}-${item.asdID}-${index}`}
            contentContainerStyle={styles.container}
            ListHeaderComponent={
              <>
                {currentLocation ? (
                  <>
                    <Text style={styles.currentLbl}>Current Locations</Text>
                    <Pressable onPress={() => openInHome(currentLocation)}>{renderCard(currentLocation, false)}</Pressable>
                    <View style={styles.separator} />
                  </>
                ) : null}
                {addedLocations.length ? <Text style={styles.addedLbl}>Added locations</Text> : null}
              </>
            }
            ListEmptyComponent={<Text style={styles.empty}>No data currently available.</Text>}
            renderItem={({ item }) => <Pressable onPress={() => openInHome(item)}>{renderCard(item, true)}</Pressable>}
          />
        )}

        <Pressable style={styles.addButton} onPress={openAdd}>
          <Text style={styles.addButtonText}>Add location</Text>
        </Pressable>
      </View>

      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => setAddOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Add location</Text>

            <Pressable style={styles.selector} onPress={() => setStatePickerOpen(true)}>
              <Text style={[styles.selectorText, !selectedState && styles.selectorPlaceholder]}>
                {selectedState?.stateName || 'Select state'}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <Pressable style={[styles.selector, { marginTop: 10 }]} onPress={() => selectedState && setDistrictPickerOpen(true)}>
              <Text style={[styles.selectorText, !selectedDistrict && styles.selectorPlaceholder]}>
                {selectedDistrict?.districtName || 'Select district'}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <Pressable style={[styles.selector, { marginTop: 10 }]} onPress={() => selectedDistrict && setBlockPickerOpen(true)}>
              <Text style={[styles.selectorText, !selectedBlock && styles.selectorPlaceholder]}>
                {selectedBlock?.label || ((selectedState?.stateID === 28 || selectedState?.stateID === 36) ? 'Select ASD' : 'Select block')}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setAddOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={saveAddedLocation}>
                <Text style={styles.saveText}>Add</Text>
              </Pressable>
            </View>

            {addLoading ? (
              <View style={styles.modalLoader}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal visible={statePickerOpen} transparent animationType="fade" onRequestClose={() => setStatePickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setStatePickerOpen(false)}>
          <View style={styles.pickerCard}>
            <ScrollView>
              {states.map((item) => (
                <Pressable
                  key={`s-${item.stateID}-${item.stateName}`}
                  style={styles.pickerItem}
                  onPress={() => {
                    setStatePickerOpen(false);
                    onStateSelect(item);
                  }}
                >
                  <Text style={styles.pickerText}>{item.stateName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={districtPickerOpen} transparent animationType="fade" onRequestClose={() => setDistrictPickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setDistrictPickerOpen(false)}>
          <View style={styles.pickerCard}>
            <ScrollView>
              {districts.map((item) => (
                <Pressable
                  key={`d-${item.districtID}-${item.districtName}`}
                  style={styles.pickerItem}
                  onPress={() => {
                    setDistrictPickerOpen(false);
                    onDistrictSelect(item);
                  }}
                >
                  <Text style={styles.pickerText}>{item.districtName}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={blockPickerOpen} transparent animationType="fade" onRequestClose={() => setBlockPickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setBlockPickerOpen(false)}>
          <View style={styles.pickerCard}>
            <ScrollView>
              {blocks.map((item) => (
                <Pressable
                  key={`b-${item.id}-${item.label}`}
                  style={styles.pickerItem}
                  onPress={() => {
                    setBlockPickerOpen(false);
                    setSelectedBlock(item);
                  }}
                >
                  <Text style={styles.pickerText}>{item.label}</Text>
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
  root: { flex: 1 },
  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingTop: 5, paddingHorizontal: 5, paddingBottom: 100 },
  currentLbl: {
    marginLeft: 15,
    marginBottom: 4,
    color: '#024764',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
  },
  addedLbl: {
    marginLeft: 15,
    marginBottom: 5,
    color: '#363636',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  separator: { height: 1, backgroundColor: '#ECECEC', marginHorizontal: 0, marginBottom: 8 },
  cardWrap: { marginHorizontal: 10, marginTop: 10, marginBottom: 5 },
  card: {
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 19,
  },
  cardBg: { borderRadius: 10 },
  cityText: { color: '#fff', fontFamily: 'RobotoMedium', fontSize: 16 },
  stateText: { color: '#fff', fontFamily: 'RobotoRegular', fontSize: 14, marginTop: 2 },
  deleteButton: {
    position: 'absolute',
    right: 10,
    top: 8,
    backgroundColor: '#DE4141',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteIcon: { width: 18, height: 18 },
  deleteText: { color: '#fff', fontFamily: 'RobotoRegular', fontSize: 12, marginLeft: 4 },
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
  addButtonText: { color: '#fff', fontFamily: 'RobotoMedium', fontSize: 14 },
  empty: { marginTop: 20, textAlign: 'center', color: colors.muted, fontFamily: 'RobotoRegular' },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 28,
  },
  modalTitle: {
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
    fontSize: 16,
    marginBottom: 10,
  },
  selector: {
    height: 44,
    borderRadius: 4,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: { color: colors.darkGreen, fontFamily: 'RobotoRegular', fontSize: 14 },
  selectorPlaceholder: { color: '#5F5F5F' },
  dropdownIcon: { width: 21, height: 11 },
  modalActions: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#ECECEC', marginRight: 8 },
  saveBtn: { backgroundColor: colors.primary, marginLeft: 8 },
  cancelText: { color: '#333', fontFamily: 'RobotoRegular', fontSize: 14 },
  saveText: { color: '#fff', fontFamily: 'RobotoMedium', fontSize: 14 },
  modalLoader: { marginTop: 10, alignItems: 'center' },

  pickerOverlay: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  pickerCard: {
    maxHeight: '70%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  pickerText: { color: colors.text, fontFamily: 'RobotoRegular', fontSize: 14 },
});
