import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ActionSheetIOS,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { mastersService, userService, weatherService } from '../../api/services';
import { useAppStore } from '../../store/appStore';
import { API_REFRESH_DATES } from '../../utils/apiDates';
import { DistrictMasterItem, StateMasterItem } from '../../types/domain';
import {
  getLanguageLabel,
  getUserProfileId,
  isApiSuccess,
  mergeUserProfileLocation,
  parseLocationWeatherList,
  parseUserLocationsList,
  toNum,
  toText,
} from '../../utils/locationApi';
import { useAndroidNavigationBar } from '../../hooks/useAndroidNavigationBar';
import { useTranslation } from 'react-i18next';

type LocationRow = {
  stateID: number;
  districtID: number;
  blockID: number;
  asdID: number;
  tempStateID: number;
  tempDistrictID: number;
  tempBlockID: number;
  tempAsdID: number;
  stateName: string;
  cityName: string;
  colorCode: string;
  cloudImage: string;
  cloudCover: number;
  weatherType: string;
  isCurrentLocation: boolean;
  districtName: string;
  blockName: string;
  asdName: string;
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

const getHomeLikeMetricColor = (cloudCover: number) => {
  const whiteTheme = cloudCover === 3 || cloudCover === 4;
  return whiteTheme ? '#FFFFFF' : '#223C67';
};

const normalizeImageKey = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const file = value.split('/').pop() || value;
  const noExt = file.replace(/\.[a-z0-9]+$/i, '');
  return noExt.trim().toLowerCase();
};

const locationBgImageMap: Record<string, ImageSourcePropType> = {
  clearsky_new: require('../../../assets/images/Clearsky_new.png'),
  mainly_clear: require('../../../assets/images/Mainly_Clear.png'),
  partly_cloudy: require('../../../assets/images/Partly_Cloudy.png'),
  generally_cloudy: require('../../../assets/images/generally_cloudy.png'),
  cloudy: require('../../../assets/images/Cloudy.png'),
};

const cloudKeyByCover = (cloudCover: number) => {
  if (cloudCover < 0) return '';
  if (cloudCover === 0) return 'clearsky_new';
  if (cloudCover === 1 || cloudCover === 2) return 'mainly_clear';
  if (cloudCover === 3 || cloudCover === 4) return 'partly_cloudy';
  if (cloudCover === 5 || cloudCover === 6 || cloudCover === 7) return 'generally_cloudy';
  return 'cloudy';
};

const cloudKeyByWeatherText = (value: string) => {
  const text = value.toLowerCase();
  if (text.includes('clear')) return 'clearsky_new';
  if (text.includes('partly')) return 'partly_cloudy';
  if (text.includes('mainly')) return 'mainly_clear';
  if (text.includes('cloud')) return 'generally_cloudy';
  return '';
};

const pickXamarinCloudImageName = (item: any) => {
  const direct = toText(item.cloudImage ?? item.CloudImage);
  const directKey = normalizeImageKey(direct);
  if (directKey && locationBgImageMap[directKey]) return directKey;
  return cloudKeyByCover(toNum(item.cloudCover ?? item.CloudCover, -1));
};

const shapeLocationRows = (rows: LocationRow[]) => rows;

const usesAsdMasters = (stateID: number) => stateID === 28 || stateID === 36;
const isAlreadyExistsMessage = (value: unknown) =>
  typeof value === 'string' && /already\s+exist/i.test(value);
const getSubLocationLabel = (stateID: number, t: (key: string) => string) =>
  usesAsdMasters(stateID) ? t('home.asd') : t('home.block');

const pickLocationWeatherRow = (savedLocation: any, weatherRows: any[]) => {
  const stateID = toNum(savedLocation?.stateID ?? savedLocation?.StateID, 0);
  const districtID = toNum(savedLocation?.districtID ?? savedLocation?.DistrictID, 0);
  const blockID = toNum(savedLocation?.blockID ?? savedLocation?.BlockID, 0);
  const asdID = toNum(savedLocation?.asdID ?? savedLocation?.AsdID, 0);

  const exactRow = weatherRows.find((row: any) => {
    const rowStateID = toNum(row?.stateID ?? row?.StateID, 0);
    const rowDistrictID = toNum(row?.districtID ?? row?.DistrictID, 0);
    const rowBlockID = toNum(row?.blockID ?? row?.BlockID, 0);
    const rowAsdID = toNum(row?.asdID ?? row?.AsdID, 0);

    if (rowStateID !== stateID || rowDistrictID !== districtID) return false;
    if (asdID > 0) return rowAsdID === asdID;
    return rowBlockID === blockID;
  });

  if (exactRow) return exactRow;

  return (
    weatherRows.find((row: any) => {
      const rowStateID = toNum(row?.stateID ?? row?.StateID, 0);
      const rowDistrictID = toNum(row?.districtID ?? row?.DistrictID, 0);
      const rowBlockID = toNum(row?.blockID ?? row?.BlockID, 0);
      const rowAsdID = toNum(row?.asdID ?? row?.AsdID, 0);

      return (
        rowStateID === stateID &&
        rowDistrictID === districtID &&
        rowBlockID === 0 &&
        rowAsdID === 0
      );
    }) || null
  );
};

export const LocationsScreen = () => {
  useAndroidNavigationBar(colors.darkGreen, 'light');
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomSafeInset = insets.bottom > 0 ? insets.bottom : 24;
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
  const lastLanguageRef = useRef(languageLabel);
  const isIOS = Platform.OS === 'ios';
  const canSubmitAddLocation = Boolean(
    selectedState && selectedDistrict,
  );

  const openIosPicker = (
    title: string,
    labels: string[],
    onSelect: (index: number) => void,
  ) => {
    const options = [...labels, t('common.cancel')];
    const cancelButtonIndex = options.length - 1;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options,
        cancelButtonIndex,
        userInterfaceStyle: 'light',
      },
      (buttonIndex) => {
        if (buttonIndex === cancelButtonIndex || buttonIndex < 0) return;
        onSelect(buttonIndex);
      },
    );
  };

  const mapRawLocations = React.useCallback((list: any[]): LocationRow[] => {
    const mapped: LocationRow[] = (list || []).map((item: any) => {
      const stateID = toNum(item.stateID ?? item.StateID ?? item.stateId ?? item.StateId);
      const districtID = toNum(item.districtID ?? item.DistrictID ?? item.districtId ?? item.DistrictId);
      const blockID = toNum(item.blockID ?? item.BlockID ?? item.blockId ?? item.BlockId);
      const asdID = toNum(item.asdID ?? item.AsdID ?? item.asdId ?? item.AsdId);
      const tempStateID = toNum(item.tempStateID ?? item.TempStateID ?? item.tempstateID);
      const tempDistrictID = toNum(item.tempDistrictID ?? item.TempDistrictID ?? item.tempdistrictID);
      const tempBlockID = toNum(item.tempBlockID ?? item.TempBlockID ?? item.tempblockID);
      const tempAsdID = toNum(item.tempAsdID ?? item.TempAsdID ?? item.tempasdID);
      const cloudCover = toNum(item.cloudCover ?? item.CloudCover, -1);
      const weatherType = toText(item.weatherType ?? item.WeatherType ?? item.cloud ?? item.Cloud);
      const districtName = toText(item.districtName ?? item.DistrictName);
      const blockName = toText(item.blockName ?? item.BlockName);
      const asdName = toText(item.asdName ?? item.AsdName);
      const cityName = blockName || asdName || districtName || t('home.location');
      const cloudImage = pickXamarinCloudImageName(item);

      return {
        stateID,
        districtID,
        blockID,
        asdID,
        tempStateID,
        tempDistrictID,
        tempBlockID,
        tempAsdID,
        stateName: toText(item.stateName ?? item.StateName) || '--',
        cityName,
        colorCode: toText(item.colorCode ?? item.ColorCode) || '#FFFFFF',
        cloudImage,
        cloudCover,
        weatherType,
        isCurrentLocation: Boolean(item.isCurrentLocation ?? item.IsCurrentLocation),
        districtName,
        blockName,
        asdName,
      };
    });

    return shapeLocationRows(mapped.filter((x) => x.districtID > 0));
  }, [t]);

  const enrichLocationsWithWeather = React.useCallback(
    async (baseList: any[]) => {
      if (!userId) return mapRawLocations(baseList as any[]);

      try {
        const weatherResponse = await weatherService.getByLocation({
          Id: userId,
          LanguageType: languageLabel,
          RefreshDateTime: API_REFRESH_DATES.current(),
        });
        const weatherRows = parseLocationWeatherList(weatherResponse) as any[];
        if (!weatherRows.length) return mapRawLocations(baseList as any[]);

        const mergedList = (baseList || []).map((item: any) => {
          const weatherRow = pickLocationWeatherRow(item, weatherRows);
          if (!weatherRow) return item;

          return {
            ...weatherRow,
            ...item,
            stateID: toNum(item?.stateID ?? item?.StateID, toNum(weatherRow?.stateID ?? weatherRow?.StateID, 0)),
            districtID: toNum(item?.districtID ?? item?.DistrictID, toNum(weatherRow?.districtID ?? weatherRow?.DistrictID, 0)),
            blockID: toNum(item?.blockID ?? item?.BlockID, toNum(weatherRow?.blockID ?? weatherRow?.BlockID, 0)),
            asdID: toNum(item?.asdID ?? item?.AsdID, toNum(weatherRow?.asdID ?? weatherRow?.AsdID, 0)),
            stateName: toText(item?.stateName ?? item?.StateName, weatherRow?.stateName ?? weatherRow?.StateName),
            districtName: toText(item?.districtName ?? item?.DistrictName, weatherRow?.districtName ?? weatherRow?.DistrictName),
            blockName: toText(item?.blockName ?? item?.BlockName, weatherRow?.blockName ?? weatherRow?.BlockName),
            asdName: toText(item?.asdName ?? item?.AsdName, weatherRow?.asdName ?? weatherRow?.AsdName),
          };
        });

        return mapRawLocations(mergedList as any[]);
      } catch {
        return mapRawLocations(baseList as any[]);
      }
    },
    [languageLabel, mapRawLocations, userId],
  );

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

  const loadLocations = async (forceRemote = false) => {
    if (!userId) {
      setLocations([]);
      return [] as LocationRow[];
    }
    if (!forceRemote && appLocations?.length) {
      const filtered = await enrichLocationsWithWeather(appLocations as any[]);
      setLocations(filtered);
      return filtered;
    }
    setLoading(true);
    try {
      const response = await userService.getUserLocations({
        UserProfileID: userId,
        LanguageType: languageLabel,
        RefreshDateTime: API_REFRESH_DATES.current(),
      });
      const list = mergeUserProfileLocation(
        parseUserLocationsList(response) as any[],
        user,
      );
      setAppLocations(list as any[]);
      const filtered = await enrichLocationsWithWeather(list as any[]);
      setLocations(filtered);
      return filtered;
    } catch {
      return locations;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appLocations?.length) {
      enrichLocationsWithWeather(appLocations as any[])
        .then(setLocations)
        .catch(() => setLocations(mapRawLocations(appLocations as any[])));
    }
  }, [appLocations, enrichLocationsWithWeather, mapRawLocations]);

  const loadStates = async () => {
    const res = await mastersService.getStates(
      languageLabel,
      API_REFRESH_DATES.searchMasters,
    );
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
    setDistricts([]);
    setBlocks([]);
    setAddLoading(true);
    try {
      const res = await mastersService.getDistricts(
        state.stateID,
        languageLabel,
        API_REFRESH_DATES.searchMasters,
      );
      const mapped = (res as any[])
        .map((d, index) => ({
          districtID: toNum(d.districtID ?? d.DistrictID, 0),
          districtName: toText(d.districtName ?? d.DistrictName),
          stateID: toNum(d.stateID ?? d.StateID, state.stateID),
        }))
        .filter((d) => d.districtID > 0 && !!d.districtName && d.stateID === state.stateID);
      const unique = mapped.filter((d, i, arr) => arr.findIndex((x) => x.districtID === d.districtID) === i);
      setDistricts(unique);
    } catch (e: any) {
      setDistricts([]);
      Alert.alert('', e.message || t('register.unableLoadDistricts'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setAddLoading(false);
    }
  };

  const onDistrictSelect = async (district: DistrictMasterItem) => {
    setSelectedDistrict(district);
    setSelectedBlock(null);
    setBlocks([]);
    await loadBlocksForDistrict(district, selectedState);
  };

  const loadBlocksForDistrict = async (
    districtArg?: DistrictMasterItem | null,
    stateArg?: StateMasterItem | null,
  ) => {
    const district = districtArg ?? selectedDistrict;
    const state = stateArg ?? selectedState;
    if (!district || !state) return;
    setAddLoading(true);
    try {
      const isAsd = usesAsdMasters(state.stateID);
      const res = isAsd
        ? await mastersService.getAsd(district.districtID, languageLabel)
        : await mastersService.getBlocks(district.districtID, languageLabel);

      const rawList = Array.isArray(res)
        ? res
        : (
            (res as any)?.ObjAsdMasterList ||
            (res as any)?.ObjBlockMasterList ||
            (res as any)?.result?.ObjAsdMasterList ||
            (res as any)?.result?.ObjBlockMasterList ||
            (res as any)?.data?.ObjAsdMasterList ||
            (res as any)?.data?.ObjBlockMasterList ||
            []
          );

      const mapped = (rawList as any[])
        .map((b) => ({
          id: isAsd
            ? toNum(b.asdID ?? b.AsdID, 0)
            : toNum(b.blockID ?? b.BlockID, 0),
          label: isAsd
            ? toText(b.asdName ?? b.AsdName)
            : toText(b.blockName ?? b.BlockName),
        }))
        .filter((b) => b.id > 0 && !!b.label);
      const unique = mapped.filter(
        (b, i, arr) => arr.findIndex((x) => x.id === b.id) === i,
      );
      setBlocks(unique);
    } catch (e: any) {
      setBlocks([]);
      Alert.alert('', e.message || t('register.unableLoadBlocks'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setAddLoading(false);
    }
  };

  const openAdd = async () => {
    setAddOpen(true);
    setSelectedState(null);
    setSelectedDistrict(null);
    setSelectedBlock(null);
    setStatePickerOpen(false);
    setDistrictPickerOpen(false);
    setBlockPickerOpen(false);
    setDistricts([]);
    setBlocks([]);
    setAddLoading(true);
    try {
      await loadStates();
    } catch (e: any) {
      Alert.alert('', e?.message || t('home.unableLoadStates'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setAddLoading(false);
    }
  };

  const openStatePicker = () => {
    if (isIOS) {
      openIosPicker(
        t('register.selectStateMandatory'),
        states.map((item) => item.stateName),
        (index) => {
          const item = states[index];
          if (!item) return;
          onStateSelect(item).catch(() => undefined);
        },
      );
      return;
    }
    setStatePickerOpen(true);
  };

  const openDistrictPicker = () => {
    if (!selectedState) return;
    if (isIOS) {
      openIosPicker(
        t('register.selectDistrictMandatory'),
        districts.map((item) => item.districtName),
        (index) => {
          const item = districts[index];
          if (!item) return;
          onDistrictSelect(item).catch(() => undefined);
        },
      );
      return;
    }
    setDistrictPickerOpen(true);
  };

  const openBlockPicker = () => {
    if (!selectedDistrict) return;
    if (isIOS) {
      openIosPicker(
        t('home.selectLabel', {
          label: getSubLocationLabel(selectedState?.stateID || 0, t),
        }),
        blocks.map((item) => item.label),
        (index) => {
          const item = blocks[index];
          if (!item) return;
          setSelectedBlock(item);
        },
      );
      return;
    }
    setBlockPickerOpen(true);
  };

  const saveAddedLocation = async () => {
    if (!userId) {
      Alert.alert('', t('home.userNotFoundPleaseLoginAgain'), [
        { text: t('common.ok') },
      ]);
      return;
    }
    if (!selectedState) {
      Alert.alert('', t('register.validationSelectState'), [
        { text: t('common.ok') },
      ]);
      return;
    }
    if (!selectedDistrict) {
      Alert.alert('', t('register.validationSelectDistrict'), [
        { text: t('common.ok') },
      ]);
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
    if (usesAsdMasters(selectedState.stateID)) payload.AsdID = selectedBlock?.id || 0;
    else payload.BlockID = selectedBlock?.id || 0;

    setAddLoading(true);
    try {
      const response: any = await userService.saveLocation(payload);
      const responseMessage =
        typeof response?.errorMessage === 'string' && response.errorMessage.trim()
          ? response.errorMessage.trim()
          : typeof response?.ErrorMessage === 'string' && response.ErrorMessage.trim()
            ? response.ErrorMessage.trim()
            : '';
      const localizedResponseMessage = isAlreadyExistsMessage(responseMessage)
        ? t('home.locationAlreadyExists')
        : responseMessage;

      if (!isApiSuccess(response) || responseMessage) {
        Alert.alert('', localizedResponseMessage || t('home.unableAddLocation'), [
          { text: t('common.ok') },
        ]);
        return;
      }

      const optimistic: LocationRow = {
        stateID: selectedState.stateID,
        districtID: selectedDistrict.districtID,
        blockID: usesAsdMasters(selectedState.stateID) ? 0 : selectedBlock?.id || 0,
        asdID: usesAsdMasters(selectedState.stateID) ? selectedBlock?.id || 0 : 0,
        tempStateID: selectedState.stateID,
        tempDistrictID: selectedDistrict.districtID,
        tempBlockID: usesAsdMasters(selectedState.stateID) ? 0 : selectedBlock?.id || 0,
        tempAsdID: usesAsdMasters(selectedState.stateID) ? selectedBlock?.id || 0 : 0,
        stateName: selectedState.stateName,
        cityName: selectedBlock?.label || selectedDistrict.districtName,
        colorCode: '#FFFFFF',
        cloudImage: '',
        cloudCover: -1,
        weatherType: '',
        isCurrentLocation: false,
        districtName: selectedDistrict.districtName,
        blockName: usesAsdMasters(selectedState.stateID) ? '' : selectedBlock?.label || '',
        asdName: usesAsdMasters(selectedState.stateID) ? selectedBlock?.label || '' : '',
      };
      setAddOpen(false);
      Alert.alert('', t('home.locationAddedSuccessfully'), [
        {
          text: t('common.ok'),
          onPress: async () => {
            let refreshed = await loadLocations(true);
            let existsAfterRefresh = refreshed.some(
              (x) =>
                x.stateID === optimistic.stateID &&
                x.districtID === optimistic.districtID &&
                x.blockID === optimistic.blockID &&
                x.asdID === optimistic.asdID
            );
            if (!existsAfterRefresh) {
              await new Promise((resolve) => setTimeout(resolve, 700));
              refreshed = await loadLocations(true);
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
            setSelectedLocation({
              districtID: optimistic.districtID,
              blockID: optimistic.blockID,
              asdID: optimistic.asdID,
            });
            navigation.navigate('Home');
          },
        },
      ]);
    } catch (e: any) {
      Alert.alert('', e.message || t('home.unableAddLocation'), [
        { text: t('common.ok') },
      ]);
    } finally {
      setAddLoading(false);
    }
  };

  const deleteLocation = async (item: LocationRow) => {
    if (!userId) return;
    if (addedLocations.length <= 1) {
      Alert.alert('', t('home.cannotDeleteOnlyLocation', { state: item.stateName, city: item.cityName }), [
        { text: t('common.ok') },
      ]);
      return;
    }
    if (item.isCurrentLocation) {
      Alert.alert('', t('home.currentLocationCannotBeDeleted'), [
        { text: t('common.ok') },
      ]);
      return;
    }

    const resolvedStateID = item.tempStateID || item.stateID;
    const resolvedDistrictID = item.tempDistrictID || item.districtID;
    const resolvedBlockID = item.tempBlockID || item.blockID;
    const resolvedAsdID = item.tempAsdID || item.asdID;

    const payload: Record<string, unknown> = {
      UserProfileID: userId,
      DistrictID: resolvedDistrictID,
    };
    if (usesAsdMasters(resolvedStateID)) {
      payload.AsdID = resolvedAsdID;
    } else {
      payload.BlockID = resolvedBlockID;
    }

    Alert.alert('', `${t('home.delete')} ${item.cityName || t('home.location')}?`, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.ok'),
        onPress: async () => {
          try {
            setLocations((prev) =>
              prev.filter(
                (x) =>
                  !(
                    (x.tempDistrictID || x.districtID) === resolvedDistrictID &&
                    (x.tempBlockID || x.blockID) === resolvedBlockID &&
                    (x.tempAsdID || x.asdID) === resolvedAsdID &&
                    !x.isCurrentLocation
                  )
              )
            );
            const response: any = await userService.deleteLocation(payload);
            if (!isApiSuccess(response)) {
              Alert.alert('', response?.errorMessage || response?.ErrorMessage || t('home.unableDeleteLocation'), [
                { text: t('common.ok') },
              ]);
              await loadLocations();
              return;
            }
            await loadLocations(true);
          } catch (e: any) {
            Alert.alert('', e.message || t('home.unableDeleteLocation'), [
              { text: t('common.ok') },
            ]);
          }
        },
      },
    ]);
  };

  useEffect(() => {
    if (!appLocations?.length) {
      loadLocations();
    }
  }, [userId, languageLabel]);

  useEffect(() => {
    if (lastLanguageRef.current !== languageLabel) {
      lastLanguageRef.current = languageLabel;
      loadLocations(true).catch(() => setLocations([]));
    }
  }, [languageLabel]);

  useFocusEffect(
    React.useCallback(() => {
      if (appLocations?.length) {
        enrichLocationsWithWeather(appLocations as any[])
          .then(setLocations)
          .catch(() => setLocations(mapRawLocations(appLocations as any[])));
        return;
      }
      loadLocations().catch(() => setLocations([]));
    }, [appLocations, enrichLocationsWithWeather, mapRawLocations, userId, languageLabel])
  );

  const renderCardBody = (item: LocationRow) => {
    const uri = pickUri(item.cloudImage);
    const weatherKey =
      normalizeImageKey(item.cloudImage) ||
      cloudKeyByCover(item.cloudCover) ||
      cloudKeyByWeatherText(item.weatherType || '');
    const source =
      uri
        ? { uri }
        : locationBgImageMap[weatherKey] ||
          require('../../../assets/images/Clearsky_new.png');
    const textColor = getHomeLikeMetricColor(item.cloudCover);

    return (
      <ImageBackground
        source={source}
        style={styles.card}
        imageStyle={styles.cardBg}
      >
        <View style={styles.cityRow}>
          <Image
            source={require('../../../assets/images/ic_location.png')}
            style={[styles.cityIcon, { tintColor: textColor }]}
            resizeMode="contain"
          />
          <Text style={[styles.cityText, { color: textColor }]} numberOfLines={1}>
            {item.cityName || t('home.location')}
          </Text>
        </View>
        <Text style={[styles.stateText, { color: textColor }]} numberOfLines={1}>
          {item.stateName || '--'}
        </Text>
      </ImageBackground>
    );
  };

  const renderCard = (item: LocationRow, showDelete = true) => (
    <View style={styles.cardWrap}>
      {showDelete ? (
        <Swipeable
          overshootRight={false}
          renderRightActions={() => (
            <Pressable style={styles.swipeDelete} onPress={() => deleteLocation(item)}>
              <Image source={require('../../../assets/images/ic_delete.png')} style={styles.swipeDeleteIcon} resizeMode="contain" />
              <Text style={styles.swipeDeleteText}>{t('home.delete')}</Text>
            </Pressable>
          )}
        >
          {renderCardBody(item)}
        </Swipeable>
      ) : (
        renderCardBody(item)
      )}
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

  const listBottomPadding = 24;

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.root}>
        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={addedLocations}
            keyExtractor={(item, index) => `${item.stateID}-${item.districtID}-${item.blockID}-${item.asdID}-${index}`}
            contentContainerStyle={[
              styles.container,
              { paddingTop: 20, paddingBottom: listBottomPadding },
            ]}
            ListHeaderComponent={
              <>
                {currentLocation ? (
                  <>
                    <Text style={styles.currentLbl}>{t('home.currentLocations')}</Text>
                    <Pressable onPress={() => openInHome(currentLocation)}>{renderCard(currentLocation, false)}</Pressable>
                    {addedLocations.length ? <View style={styles.separator} /> : null}
                  </>
                ) : null}
                {addedLocations.length ? <Text style={styles.addedLbl}>{t('home.addedLocations')}</Text> : null}
              </>
            }
            ListEmptyComponent={<Text style={styles.empty}>{t('home.noDataCurrentlyAvailable')}</Text>}
            renderItem={({ item }) => <Pressable onPress={() => openInHome(item)}>{renderCard(item, true)}</Pressable>}
          />
        )}

        <Pressable style={styles.addButton} onPress={openAdd}>
          <Text style={styles.addButtonText}>{t('home.addLocation')}</Text>
        </Pressable>
      </View>

      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: bottomSafeInset + 24 }]}>
            <Text style={styles.modalTitle}>{t('home.addLocation')}</Text>

            <Pressable style={styles.selector} onPress={openStatePicker}>
              <Text style={[styles.selectorText, !selectedState && styles.selectorPlaceholder]}>
                {selectedState?.stateName || t('register.selectStateMandatory')}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <Pressable style={[styles.selector, { marginTop: 10 }]} onPress={openDistrictPicker}>
              <Text style={[styles.selectorText, !selectedDistrict && styles.selectorPlaceholder]}>
                {selectedDistrict?.districtName || t('register.selectDistrictMandatory')}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <Pressable
              style={[styles.selector, { marginTop: 10 }]}
              onPress={openBlockPicker}
            >
              <Text style={[styles.selectorText, !selectedBlock && styles.selectorPlaceholder]}>
                {selectedBlock?.label ||
                  t('home.selectLabel', {
                    label: getSubLocationLabel(selectedState?.stateID || 0, t),
                  })}
              </Text>
              <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropdownIcon} resizeMode="contain" />
            </Pressable>

            <View style={styles.modalActions}>
              <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setAddOpen(false)}>
                <Text style={styles.cancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.saveBtn,
                  !canSubmitAddLocation && styles.actionBtnDisabled,
                ]}
                disabled={!canSubmitAddLocation}
                onPress={saveAddedLocation}
              >
                <Text style={styles.saveText}>{t('home.add')}</Text>
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
              {districts.length ? (
                districts.map((item) => (
                  <Pressable
                    key={`d-${item.districtID}-${item.districtName}`}
                    style={styles.pickerItem}
                    onPress={() => {
                      setDistrictPickerOpen(false);
                      onDistrictSelect(item).catch(() => undefined);
                    }}
                  >
                    <Text style={styles.pickerText}>{item.districtName}</Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyPickerWrap}>
                  <Text style={styles.pickerText}>
                    {addLoading
                      ? t('home.loadingLabel', { label: t('home.district') })
                      : t('home.noLabelData', { label: t('home.district') })}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={blockPickerOpen} transparent animationType="fade" onRequestClose={() => setBlockPickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setBlockPickerOpen(false)}>
          <View style={styles.pickerCard}>
            <ScrollView>
              {blocks.length ? (
                blocks.map((item) => (
                  <Pressable
                    key={`b-${item.id}-${item.label}`}
                    style={[
                      styles.pickerItem,
                      selectedBlock?.id === item.id && styles.selectedPickerItem,
                    ]}
                    onPress={() => {
                      setSelectedBlock(item);
                      setBlockPickerOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerText,
                        selectedBlock?.id === item.id && styles.selectedPickerText,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))
              ) : (
                <View style={styles.emptyPickerWrap}>
                  <Text style={styles.pickerText}>
                    {addLoading
                      ? t('home.loadingLabel', { label: getSubLocationLabel(selectedState?.stateID || 0, t) })
                      : t('home.noLabelData', { label: getSubLocationLabel(selectedState?.stateID || 0, t) })}
                  </Text>
                </View>
              )}
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
  cardBg: { borderRadius: 10, resizeMode: 'cover' },
  cityRow: { flexDirection: 'row', alignItems: 'center' },
  cityIcon: { width: 15, height: 15, marginRight: 6 },
  cityText: { color: '#fff', fontFamily: 'RobotoMedium', fontSize: 16 },
  stateText: { color: '#fff', fontFamily: 'RobotoRegular', fontSize: 14, marginTop: 2 },
  swipeDelete: {
    width: 108,
    marginVertical: 10,
    borderRadius: 10,
    backgroundColor: '#DE4141',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swipeDeleteIcon: { width: 24, height: 24 },
  swipeDeleteText: { color: '#fff', fontFamily: 'RobotoRegular', fontSize: 12 },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 5,
    backgroundColor: colors.primary,
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    zIndex: 1,
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
  actionBtnDisabled: { opacity: 0.5 },
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
  inlinePickerCard: {
    marginTop: 8,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  inlinePickerScroll: {
    maxHeight: 220,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedPickerItem: {
    backgroundColor: '#EAF6EE',
  },
  emptyPickerWrap: {
    paddingHorizontal: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  pickerText: { color: colors.text, fontFamily: 'RobotoRegular', fontSize: 14 },
  selectedPickerText: { color: colors.darkGreen, fontFamily: 'RobotoMedium' },
});
