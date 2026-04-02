import React, { useEffect, useMemo, useState } from "react";
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
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import {
  cropService,
  mastersService,
  userService,
  weatherService,
} from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { DistrictMasterItem, StateMasterItem } from "../../types/domain";
import {
  buildByLocationPayload,
  getLanguageLabel,
  getUserProfileId,
  isApiSuccess,
  parseLocationWeatherList,
  sameLocation,
  toNum,
  toText,
} from "../../utils/locationApi";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { API_REFRESH_DATES } from "../../utils/apiDates";
import { useTranslation } from "react-i18next";

type SearchBlockItem = {
  blockID: number;
  blockName: string;
  districtID: number;
  stateID: number;
  isAsd: boolean;
  favourite: boolean;
};

const usesAsdMasters = (stateID: number) => stateID === 28 || stateID === 36;
const isAlreadyExistsMessage = (value: unknown) =>
  typeof value === "string" && /already\s+exist/i.test(value);

export const SearchScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const user: any = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const appLocations = useAppStore((s) => s.locations);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);
  const setPromotedLocation = useAppStore((s) => s.setPromotedLocation);
  const setCurrentLocationOverride = useAppStore(
    (s) => s.setCurrentLocationOverride,
  );
  const setTemporarySearchData = useAppStore((s) => s.setTemporarySearchData);

  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState<StateMasterItem[]>([]);
  const [districts, setDistricts] = useState<DistrictMasterItem[]>([]);
  const [blocks, setBlocks] = useState<SearchBlockItem[]>([]);
  const [selectedState, setSelectedState] = useState<StateMasterItem | null>(
    null,
  );
  const [selectedDistrict, setSelectedDistrict] =
    useState<DistrictMasterItem | null>(null);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [districtPickerOpen, setDistrictPickerOpen] = useState(false);

  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

  const refreshFavouriteFlags = async (items: SearchBlockItem[]) => {
    if (!userId) return items;
    const payload = buildByLocationPayload(userId, languageLabel);
    const weather = await weatherService.getByLocation(payload);
    const locations = parseLocationWeatherList(weather) as any[];
    return items.map((item) => {
      const exists = locations.some((loc) =>
        sameLocation(loc, {
          districtID: item.districtID,
          blockID: item.isAsd ? 0 : item.blockID,
          asdID: item.isAsd ? item.blockID : 0,
        }),
      );
      return { ...item, favourite: exists };
    });
  };

  const moveToHomeForItem = async (item: SearchBlockItem) => {
    setPromotedLocation({
      districtID: item.districtID,
      blockID: item.isAsd ? 0 : item.blockID,
      asdID: item.isAsd ? item.blockID : 0,
    });
    setCurrentLocationOverride(null);
    setSelectedLocation({
      districtID: item.districtID,
      blockID: item.isAsd ? 0 : item.blockID,
      asdID: item.isAsd ? item.blockID : 0,
    });
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate("Main", {
      screen: "MainTabs",
      params: { screen: "Home" },
    });
  };

  const parseSelectedAdvisories = (payload: any) => {
    const base = payload?.result || payload?.data || payload;
    if (Array.isArray(base)) return base;
    return (base?.objCropAdvisoryDetailsList ||
      base?.ObjCropAdvisoryDetailsList ||
      base?.objCropAdvisoryTopList ||
      base?.ObjCropAdvisoryTopList ||
      []) as any[];
  };

  const shapeSelectedWeatherRows = (item: SearchBlockItem, rows: any[]) => {
    const districtRows = rows.filter(
      (row: any) =>
        toNum(row?.districtID ?? row?.DistrictID) === item.districtID &&
        toNum(row?.blockID ?? row?.BlockID) === 0 &&
        toNum(row?.asdID ?? row?.AsdID) === 0,
    );

    const exactRows = rows.filter((row: any) => {
      const districtID = toNum(row?.districtID ?? row?.DistrictID);
      const blockID = toNum(row?.blockID ?? row?.BlockID);
      const asdID = toNum(row?.asdID ?? row?.AsdID);

      if (districtID !== item.districtID) return false;
      if (item.isAsd) return asdID === item.blockID;
      return blockID === item.blockID;
    });

    return [...exactRows, ...districtRows];
  };

  const ensureSelectedWeatherCard = (item: SearchBlockItem, rows: any[]) => {
    const exactExists = rows.some((row: any) => {
      const districtID = toNum(row?.districtID ?? row?.DistrictID);
      const blockID = toNum(row?.blockID ?? row?.BlockID);
      const asdID = toNum(row?.asdID ?? row?.AsdID);
      return (
        districtID === item.districtID &&
        blockID === (item.isAsd ? 0 : item.blockID) &&
        asdID === (item.isAsd ? item.blockID : 0)
      );
    });
    if (exactExists) return rows;

    const districtRow =
      rows.find(
        (row: any) =>
          toNum(row?.districtID ?? row?.DistrictID) === item.districtID &&
          toNum(row?.blockID ?? row?.BlockID) === 0 &&
          toNum(row?.asdID ?? row?.AsdID) === 0,
      ) || rows[0];

    if (!districtRow) return rows;

    const syntheticRow = {
      ...districtRow,
      stateID: item.stateID,
      StateID: item.stateID,
      districtID: item.districtID,
      DistrictID: item.districtID,
      blockID: item.isAsd ? 0 : item.blockID,
      BlockID: item.isAsd ? 0 : item.blockID,
      asdID: item.isAsd ? item.blockID : 0,
      AsdID: item.isAsd ? item.blockID : 0,
      blockName: item.isAsd ? "" : item.blockName,
      BlockName: item.isAsd ? "" : item.blockName,
      asdName: item.isAsd ? item.blockName : "",
      AsdName: item.isAsd ? item.blockName : "",
      placeName: item.blockName,
      PlaceName: item.blockName,
      districtWiseWeatherData: districtRow,
    };

    return [syntheticRow, ...rows];
  };

  const shapeSelectedAdvisoryRows = (item: SearchBlockItem, rows: any[]) =>
    rows.filter((row: any) => {
      const districtID = toNum(row?.districtID ?? row?.DistrictID);
      const blockID = toNum(row?.blockID ?? row?.BlockID);
      const asdID = toNum(row?.asdID ?? row?.AsdID);

      if (districtID && districtID !== item.districtID) return false;
      if (item.isAsd) {
        if (asdID && asdID !== item.blockID) return false;
      } else if (blockID && blockID !== item.blockID) {
        return false;
      }
      return true;
    });

  const loadSelectedLocationData = async (item: SearchBlockItem) => {
    const weatherPayload: Record<string, unknown> = {
      StateID: item.stateID,
      DistrictID: item.districtID,
      LanguageType: languageLabel,
      RefreshDateTime: API_REFRESH_DATES.current(),
    };
    const cropPayload: Record<string, unknown> = {
      StateID: item.stateID,
      DistrictID: item.districtID,
      LanguageType: languageLabel,
    };

    if (item.isAsd) {
      weatherPayload.AsdID = item.blockID;
      cropPayload.AsdID = item.blockID;
    } else {
      weatherPayload.BlockID = item.blockID;
      cropPayload.BlockID = item.blockID;
    }

    const [weather, crop] = await Promise.all([
      weatherService.getTodayWeather(weatherPayload),
      cropService.getGpsAdvisoryTop(cropPayload),
    ]);

    const shapedWeatherRows = shapeSelectedWeatherRows(
      item,
      parseLocationWeatherList(weather) as any[],
    );

    return {
      locations: ensureSelectedWeatherCard(item, shapedWeatherRows),
      advisories: shapeSelectedAdvisoryRows(
        item,
        parseSelectedAdvisories(crop),
      ),
    };
  };

  const loadStates = async () => {
    setLoading(true);
    try {
      const list = await mastersService.getStates(
        languageLabel,
        API_REFRESH_DATES.searchMasters,
      );
      const normalized = (list as any[])
        .map((s, index) => ({
          stateID: toNum(s.stateID ?? s.StateID, 0),
          stateName: toText(s.stateName ?? s.StateName),
        }))
        .filter((s) => s.stateID > 0 && !!s.stateName && s.stateID !== 37);
      const unique = normalized.filter(
        (s, i, arr) => arr.findIndex((x) => x.stateID === s.stateID) === i,
      );
      setStates(unique);
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("home.unableLoadStates"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStates();
  }, [languageLabel]);

  const selectState = async (state: StateMasterItem) => {
    setSelectedState(state);
    setSelectedDistrict(null);
    setBlocks([]);
    setLoading(true);
    try {
      const list = await mastersService.getDistricts(
        state.stateID,
        languageLabel,
        API_REFRESH_DATES.searchMasters,
      );
      const normalized = (list as any[])
        .map((d, index) => ({
          districtID: toNum(d.districtID ?? d.DistrictID, 0),
          districtName: toText(d.districtName ?? d.DistrictName),
          stateID: toNum(d.stateID ?? d.StateID, state.stateID),
        }))
        .filter(
          (d) =>
            d.districtID > 0 && !!d.districtName && d.stateID === state.stateID,
        );
      const unique = normalized.filter(
        (d, i, arr) =>
          arr.findIndex((x) => x.districtID === d.districtID) === i,
      );
      setDistricts(unique);
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("register.unableLoadDistricts"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const selectDistrict = async (district: DistrictMasterItem) => {
    setSelectedDistrict(district);
    setLoading(true);
    try {
      const districtStateID = toNum(
        (district as any).stateID ??
          (district as any).StateID ??
          selectedState?.stateID,
        0,
      );
      const isAsd = usesAsdMasters(districtStateID);
      const raw = isAsd
        ? await mastersService.getAsd(district.districtID, languageLabel)
        : await mastersService.getBlocks(district.districtID, languageLabel);

      const mapped: SearchBlockItem[] = (raw as any[])
        .map((item: any, index: number) => ({
          blockID: isAsd
            ? toNum(item.asdID ?? item.AsdID, 0)
            : toNum(item.blockID ?? item.BlockID, 0),
          blockName: isAsd
            ? toText(item.asdName ?? item.AsdName)
            : toText(item.blockName ?? item.BlockName),
          districtID: toNum(
            item.districtID ?? item.DistrictID,
            district.districtID,
          ),
          stateID: districtStateID,
          isAsd,
          favourite: false,
        }))
        .filter(
          (item) =>
            item.blockID > 0 &&
            !!item.blockName &&
            item.districtID === district.districtID,
        );
      const unique = mapped.filter(
        (b, i, arr) =>
          arr.findIndex(
            (x) => x.blockID === b.blockID && x.districtID === b.districtID,
          ) === i,
      );
      const withFav = await refreshFavouriteFlags(unique);
      setBlocks(withFav);
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("register.unableLoadBlocks"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const addLocation = async (item: SearchBlockItem) => {
    if (!userId) {
      Alert.alert("", t("home.userNotFoundPleaseLoginAgain"), [
        { text: t("common.ok") },
      ]);
      return;
    }
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

      const response: any = await userService.saveLocation(payload);
      const responseMessage =
        typeof response?.errorMessage === "string" && response.errorMessage.trim()
          ? response.errorMessage.trim()
          : typeof response?.ErrorMessage === "string" &&
              response.ErrorMessage.trim()
            ? response.ErrorMessage.trim()
            : "";
      const localizedResponseMessage = isAlreadyExistsMessage(responseMessage)
        ? t("home.locationAlreadyExists")
        : responseMessage;

      if (!isApiSuccess(response) || responseMessage) {
        Alert.alert(
          "",
          localizedResponseMessage || t("home.unableAddLocation"),
          [{ text: t("common.ok") }],
        );
        return;
      }
      Alert.alert("", t("home.locationAddedSuccessfully"), [
        {
          text: t("common.ok"),
          onPress: async () => {
            setBlocks((prev) =>
              prev.map((b) =>
                b.blockID === item.blockID && b.districtID === item.districtID
                  ? { ...b, favourite: true }
                  : b,
              ),
            );

            const refreshedWeather = await weatherService.getByLocation(
              buildByLocationPayload(userId, languageLabel),
            );
            const refreshedLocations = parseLocationWeatherList(
              refreshedWeather,
            ) as any[];
            const savedExists = refreshedLocations.some((loc) =>
              sameLocation(loc, {
                districtID: item.districtID,
                blockID: item.isAsd ? 0 : item.blockID,
                asdID: item.isAsd ? item.blockID : 0,
              }),
            );

            if (savedExists) {
              setCurrentLocationOverride(null);
              setSelectedLocation({
                districtID: item.districtID,
                blockID: item.isAsd ? 0 : item.blockID,
                asdID: item.isAsd ? item.blockID : 0,
              });
              setPromotedLocation({
                districtID: item.districtID,
                blockID: item.isAsd ? 0 : item.blockID,
                asdID: item.isAsd ? item.blockID : 0,
              });
              setAppLocations(refreshedLocations);
              return;
            }

            const result = await loadSelectedLocationData(item);
            const nextLocations = [...refreshedLocations];
            result.locations.forEach((row) => {
              const exists = nextLocations.some((loc) =>
                sameLocation(loc, {
                  districtID: toNum(
                    (row as any)?.districtID ?? (row as any)?.DistrictID,
                  ),
                  blockID: toNum(
                    (row as any)?.blockID ?? (row as any)?.BlockID,
                  ),
                  asdID: toNum((row as any)?.asdID ?? (row as any)?.AsdID),
                }),
              );
              if (!exists) nextLocations.push(row as any);
            });

            setAppLocations(nextLocations as any[]);
            setCurrentLocationOverride(null);
            setSelectedLocation({
              districtID: item.districtID,
              blockID: item.isAsd ? 0 : item.blockID,
              asdID: item.isAsd ? item.blockID : 0,
            });
            setPromotedLocation({
              districtID: item.districtID,
              blockID: item.isAsd ? 0 : item.blockID,
              asdID: item.isAsd ? item.blockID : 0,
            });

            const store = useAppStore.getState();
            setTemporarySearchData({
              locations: [...store.temporarySearchLocations, ...result.locations].filter(
                (row, index, arr) =>
                  arr.findIndex((candidate) =>
                    sameLocation(candidate, {
                      districtID: toNum(
                        (row as any)?.districtID ?? (row as any)?.DistrictID,
                      ),
                      blockID: toNum(
                        (row as any)?.blockID ?? (row as any)?.BlockID,
                      ),
                      asdID: toNum((row as any)?.asdID ?? (row as any)?.AsdID),
                    }),
                  ) === index,
              ) as any[],
              advisories: store.temporarySearchAdvisories,
            });
          },
        },
      ]);
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("home.unableAddLocation"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    }
  };

  const removeLocation = async (item: SearchBlockItem) => {
    if (!userId) {
      Alert.alert("", t("home.userNotFoundPleaseLoginAgain"), [
        { text: t("common.ok") },
      ]);
      return;
    }
    try {
      if ((appLocations?.length || 0) <= 1) {
        Alert.alert("", t("search.cannotDeleteOnlySavedLocation"), [
          { text: t("common.ok") },
        ]);
        return;
      }
      const payload: Record<string, unknown> = {
        UserProfileID: userId,
        DistrictID: item.districtID,
      };
      if (item.isAsd) payload.AsdID = item.blockID;
      else payload.BlockID = item.blockID;

      const response: any = await userService.deleteLocation(payload);
      if (!isApiSuccess(response)) {
        Alert.alert(
          "",
          response?.errorMessage ||
            response?.ErrorMessage ||
            t("home.unableDeleteLocation"),
          [{ text: t("common.ok") }],
        );
        return;
      }
      setBlocks((prev) =>
        prev.map((b) =>
          b.blockID === item.blockID && b.districtID === item.districtID
            ? { ...b, favourite: false }
            : b,
        ),
      );
      const currentLocations = useAppStore.getState().locations || [];
      setAppLocations(
        currentLocations.filter((loc) => {
          const districtID = toNum(
            (loc as any)?.districtID ?? (loc as any)?.DistrictID,
          );
          const blockID = toNum((loc as any)?.blockID ?? (loc as any)?.BlockID);
          const asdID = toNum((loc as any)?.asdID ?? (loc as any)?.AsdID);
          return !(
            districtID === item.districtID &&
            blockID === (item.isAsd ? 0 : item.blockID) &&
            asdID === (item.isAsd ? item.blockID : 0)
          );
        }),
      );
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("home.unableDeleteLocation"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    }
  };

  const onRowPress = async (item: SearchBlockItem) => {
    setLoading(true);
    try {
      if (item.favourite) {
        setTemporarySearchData({ locations: [], advisories: [] });
        await moveToHomeForItem(item);
        return;
      }

      const result = await loadSelectedLocationData(item);
      if (!result.locations.length && !result.advisories.length) {
        Alert.alert("", t("search.noDataForSelectedLocation"), [
          { text: t("common.ok") },
        ]);
        return;
      }
      setAppLocations(result.locations as any[]);
      setTemporarySearchData(result);
      await moveToHomeForItem(item);
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e?.message || t("search.unableOpenSelectedLocation"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const chooseCurrentLocation = async () => {
    if (!userId) {
      Alert.alert("", t("home.userNotFoundPleaseLoginAgain"), [
        { text: t("common.ok") },
      ]);
      return;
    }

    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("", t("search.locationPermissionRequired"), [
          { text: t("common.ok") },
        ]);
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCurrentLocationOverride({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setPromotedLocation(null);
      setTemporarySearchData({ locations: [], advisories: [] });
      setAppLocations([]);
      setSelectedLocation(null);

      if (navigation.canGoBack()) navigation.goBack();
      else
        navigation.navigate("Main", {
          screen: "MainTabs",
          params: { screen: "Home" },
        });
    } catch (e: any) {
      setTimeout(() => {
        Alert.alert("", e.message || t("search.unableGetCurrentLocation"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen edges={["top", "left", "right", "bottom"]}>
      <StatusBar style="light" backgroundColor={colors.primary} />
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Image
              source={require("../../../assets/images/back.png")}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </Pressable>

          <View style={styles.selectorsWrap}>
            <Pressable
              style={styles.selector}
              onPress={() => setStatePickerOpen(true)}
            >
              <Text
                style={[
                  styles.selectorText,
                  !selectedState && styles.selectorPlaceholder,
                ]}
              >
                {selectedState?.stateName || t("search.selectState")}
              </Text>
              <Image
                source={require("../../../assets/images/dropdown.png")}
                style={styles.dropdownIcon}
                resizeMode="contain"
              />
            </Pressable>

            {districts.length > 0 ? (
              <Pressable
                style={[styles.selector, styles.secondSelector]}
                onPress={() => setDistrictPickerOpen(true)}
              >
                <Text
                  style={[
                    styles.selectorText,
                    !selectedDistrict && styles.selectorPlaceholder,
                  ]}
                >
                  {selectedDistrict?.districtName || t("search.selectDistrict")}
                </Text>
                <Image
                  source={require("../../../assets/images/dropdown.png")}
                  style={styles.dropdownIcon}
                  resizeMode="contain"
                />
              </Pressable>
            ) : null}

            <Pressable
              style={styles.currentLocationRow}
              onPress={chooseCurrentLocation}
            >
              <Image
                source={require("../../../assets/images/ic_currentLocation.png")}
                style={styles.currentLocationIcon}
                resizeMode="contain"
              />
              <Text style={styles.currentLocationText}>
                {t("search.chooseCurrentLocation")}
              </Text>
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
            keyExtractor={(item, index) =>
              `${item.stateID}-${item.districtID}-${item.blockID}-${index}`
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {selectedDistrict
                  ? t("home.noDataCurrentlyAvailable")
                  : t("search.selectStateAndDistrictToLoadBlocks")}
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onRowPress(item)}>
                <Text style={styles.rowName}>{item.blockName}</Text>
                <Pressable
                  style={styles.addedWrap}
                  onPress={(event) => {
                    event.stopPropagation();
                    item.favourite ? removeLocation(item) : addLocation(item);
                  }}
                >
                  <Image
                    source={
                      item.favourite
                        ? require("../../../assets/images/ic_addedFav.png")
                        : require("../../../assets/images/ic_searchfav.png")
                    }
                    style={styles.addIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.addText}>
                    {item.favourite ? t("search.added") : t("home.add")}
                  </Text>
                </Pressable>
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
      </View>

      <Modal
        visible={statePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setStatePickerOpen(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setStatePickerOpen(false)}
        >
          <View style={styles.modalCard}>
            <ScrollView>
              {states.map((item) => (
                <Pressable
                  key={`s-${item.stateID}-${item.stateName}`}
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
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setDistrictPickerOpen(false)}
        >
          <View style={styles.modalCard}>
            <ScrollView>
              {districts.map((item) => (
                <Pressable
                  key={`d-${item.districtID}-${item.districtName}`}
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
    flexDirection: "row",
    alignItems: "flex-start",
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
    backgroundColor: "#F0F0F0",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  secondSelector: { marginTop: 15 },
  selectorText: {
    fontFamily: "RobotoRegular",
    fontSize: 14,
    color: colors.darkGreen,
  },
  selectorPlaceholder: { color: colors.darkGreen },
  dropdownIcon: { width: 21, height: 11 },
  currentLocationRow: {
    marginTop: 8,
    marginBottom: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  currentLocationIcon: { width: 20, height: 20 },
  currentLocationText: {
    marginLeft: 5,
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center" },
  row: {
    marginTop: 10,
    marginBottom: 5,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowName: {
    flex: 1,
    color: colors.primary,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  addedWrap: {
    marginLeft: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  addIcon: { width: 20, height: 20 },
  addText: {
    marginLeft: 2,
    color: colors.primary,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: colors.frameBorder,
    marginHorizontal: 0,
  },
  empty: {
    textAlign: "center",
    color: colors.muted,
    marginTop: spacing.xl,
    fontFamily: "RobotoRegular",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "#00000055",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    maxHeight: "70%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: spacing.xs,
  },
  modalItem: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  modalItemText: {
    color: colors.text,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
});
