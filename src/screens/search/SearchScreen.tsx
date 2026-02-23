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

type SearchBlockItem = {
  blockID: number;
  blockName: string;
  districtID: number;
  stateID: number;
  isAsd: boolean;
  favourite: boolean;
};

export const SearchScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const navigation = useNavigation<any>();
  const user: any = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);

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

  const loadStates = async () => {
    setLoading(true);
    try {
      const list = await mastersService.getStates(languageLabel);
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
      Alert.alert("Error", e.message || "Unable to load states");
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
      Alert.alert("Error", e.message || "Unable to load districts");
    } finally {
      setLoading(false);
    }
  };

  const selectDistrict = async (district: DistrictMasterItem) => {
    if (!selectedState) return;
    setSelectedDistrict(district);
    setLoading(true);
    try {
      const isAsd =
        selectedState.stateID === 28 || selectedState.stateID === 36;
      const raw = isAsd
        ? await mastersService.getAsd(district.districtID, languageLabel)
        : await mastersService.getBlocks(district.districtID, languageLabel);

      const mapped: SearchBlockItem[] = (raw as any[])
        .map((item: any, index: number) => ({
          blockID: toNum(
            item.asdID ?? item.AsdID ?? item.blockID ?? item.BlockID,
            0,
          ),
          blockName: toText(
            item.asdName ?? item.AsdName ?? item.blockName ?? item.BlockName,
          ),
          districtID: district.districtID,
          stateID: selectedState.stateID,
          isAsd,
          favourite: false,
        }))
        .filter((item) => item.blockID > 0 && !!item.blockName);
      const unique = mapped.filter(
        (b, i, arr) =>
          arr.findIndex(
            (x) => x.blockID === b.blockID && x.districtID === b.districtID,
          ) === i,
      );
      const withFav = await refreshFavouriteFlags(unique);
      setBlocks(withFav);
    } catch (e: any) {
      Alert.alert("Error", e.message || "Unable to load blocks");
    } finally {
      setLoading(false);
    }
  };

  const addLocation = async (item: SearchBlockItem) => {
    if (!userId) {
      Alert.alert("Failed", "User profile not loaded. Please login again.");
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
      if (!isApiSuccess(response)) {
        Alert.alert(
          "Failed",
          response?.errorMessage ||
            response?.ErrorMessage ||
            "Unable to add location",
        );
        return;
      }
      const refreshed = await refreshFavouriteFlags(blocks);
      setBlocks(
        refreshed.map((b) =>
          b.blockID === item.blockID && b.districtID === item.districtID
            ? { ...b, favourite: true }
            : b,
        ),
      );
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Unable to add location");
    }
  };

  const removeLocation = async (item: SearchBlockItem) => {
    if (!userId) {
      Alert.alert("Failed", "User profile not loaded. Please login again.");
      return;
    }
    try {
      const payload: Record<string, unknown> = {
        UserProfileID: userId,
        DistrictID: item.districtID,
      };
      if (item.isAsd) payload.AsdID = item.blockID;
      else payload.BlockID = item.blockID;

      const response: any = await userService.deleteLocation(payload);
      if (!isApiSuccess(response)) {
        Alert.alert(
          "Failed",
          response?.errorMessage ||
            response?.ErrorMessage ||
            "Unable to delete location",
        );
        return;
      }
      const refreshed = await refreshFavouriteFlags(blocks);
      setBlocks(
        refreshed.map((b) =>
          b.blockID === item.blockID && b.districtID === item.districtID
            ? { ...b, favourite: false }
            : b,
        ),
      );
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Unable to delete location");
    }
  };

  const chooseCurrentLocation = async () => {
    if (!userId) {
      Alert.alert("Failed", "User profile not loaded. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission", "Location permission is required.");
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const payload: Record<string, unknown> = {
        ...buildByLocationPayload(userId, languageLabel),
        Latitude: current.coords.latitude,
        Longitude: current.coords.longitude,
      };

      const weather = await weatherService.getByLocation(payload);
      const list = parseLocationWeatherList(weather) as any[];
      if (!list.length) {
        Alert.alert("Info", "No location data found for current position.");
        return;
      }

      setAppLocations(list as any[]);
      const target =
        list.find((x: any) =>
          Boolean(x.isCurrentLocation ?? x.IsCurrentLocation),
        ) || list[0];
      setSelectedLocation({
        districtID: toNum(target?.districtID ?? target?.DistrictID),
        blockID: toNum(target?.blockID ?? target?.BlockID),
        asdID: toNum(target?.asdID ?? target?.AsdID),
      });

      if (navigation.canGoBack()) navigation.goBack();
      else
        navigation.navigate("Main", {
          screen: "MainTabs",
          params: { screen: "Home" },
        });
    } catch (e: any) {
      Alert.alert("Failed", e.message || "Unable to get current location");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
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
                {selectedState?.stateName || "Select state"}
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
                  {selectedDistrict?.districtName || "Select district"}
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
                Choose current location
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
                Select state and district to load blocks.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <Text style={styles.rowName}>{item.blockName}</Text>
                <Pressable
                  style={styles.addedWrap}
                  onPress={() =>
                    item.favourite ? removeLocation(item) : addLocation(item)
                  }
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
                    {item.favourite ? "Added" : "Add"}
                  </Text>
                </Pressable>
              </View>
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
