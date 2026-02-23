import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList as RNFlatList,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { cropService, weatherService } from "../../api/services";
import { CropAdvisoryItem, DashboardLocation } from "../../types/domain";
import { useAppStore } from "../../store/appStore";
import {
  buildByLocationPayload,
  getLanguageLabel,
  getUserProfileId,
  parseLocationWeatherList,
} from "../../utils/locationApi";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return "";
};

const pickUri = (...values: any[]) => {
  const value = pickText(...values);
  if (!value) return "";
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("file://")
  )
    return value;
  return "";
};

const metric = (label: string, value: string, icon: any) => ({
  label,
  value,
  icon,
});
const toNum = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    )
      return Number(value);
  }
  return 0;
};

const parseAdvisoryList = (payload: any): CropAdvisoryItem[] => {
  const base = payload?.result || payload?.data || payload;
  if (Array.isArray(base)) return base as CropAdvisoryItem[];
  return (base?.objCropAdvisoryDetailsList ||
    base?.ObjCropAdvisoryDetailsList ||
    base?.objCropAdvisoryTopList ||
    base?.ObjCropAdvisoryTopList ||
    []) as CropAdvisoryItem[];
};

export const DashboardScreen = () => {
  useAndroidNavigationBar(colors.darkGreen, "light");
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const selectedLocation = useAppStore((s) => s.selectedLocation);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [advisories, setAdvisories] = useState<CropAdvisoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"block" | "district">("block");
  const [weatherIndex, setWeatherIndex] = useState(0);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const payload = buildByLocationPayload(userId, languageLabel);
      const weather = await weatherService.getByLocation(payload);
      const locationList = parseLocationWeatherList(
        weather,
      ) as DashboardLocation[];
      const crop = await cropService.getAdvisoryTop({
        Id: userId,
        UserProfileID: userId,
        userProfileID: userId,
        LanguageType: languageLabel,
        languageType: languageLabel,
        Type: "Farmer",
        RefreshDateTime: new Date().toISOString().slice(0, 10),
      });

      setLocations(locationList);
      setAppLocations(locationList);
      if (locationList.length > 0) {
        const match = selectedLocation
          ? locationList.find((item: any) => {
              const districtID = toNum(item.districtID, item.DistrictID);
              const blockID = toNum(item.blockID, item.BlockID);
              const asdID = toNum(item.asdID, item.AsdID);
              return (
                districtID === selectedLocation.districtID &&
                blockID === selectedLocation.blockID &&
                asdID === selectedLocation.asdID
              );
            })
          : null;
        const target: any = match || (locationList[0] as any);
        setSelectedLocation({
          districtID: toNum(target?.districtID, target?.DistrictID),
          blockID: toNum(target?.blockID, target?.BlockID),
          asdID: toNum(target?.asdID, target?.AsdID),
        });
      }
      setAdvisories(parseAdvisoryList(crop));
    } catch {
      // Keep previously available local/store data on transient API failures.
      if (!locations.length) {
        const fallback = useAppStore.getState().locations || [];
        setLocations(fallback as DashboardLocation[]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    languageLabel,
    locations.length,
    selectedLocation,
    setAppLocations,
    setSelectedLocation,
    userId,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentLocation = useMemo(() => {
    if (!locations.length) return null;
    if (!selectedLocation) return locations[0] as any;
    const match = locations.find((item: any) => {
      const districtID = toNum(item.districtID, item.DistrictID);
      const blockID = toNum(item.blockID, item.BlockID);
      const asdID = toNum(item.asdID, item.AsdID);
      return (
        districtID === selectedLocation.districtID &&
        blockID === selectedLocation.blockID &&
        asdID === selectedLocation.asdID
      );
    });
    return (match || locations[0]) as any;
  }, [locations, selectedLocation]);

  const currentLocationIndex = useMemo(() => {
    if (!locations.length) return 0;
    if (!currentLocation) return 0;
    const idx = locations.findIndex((item: any) => {
      return (
        toNum(item.districtID, item.DistrictID) ===
          toNum((currentLocation as any).districtID, (currentLocation as any).DistrictID) &&
        toNum(item.blockID, item.BlockID) ===
          toNum((currentLocation as any).blockID, (currentLocation as any).BlockID) &&
        toNum(item.asdID, item.AsdID) === toNum((currentLocation as any).asdID, (currentLocation as any).AsdID)
      );
    });
    return idx >= 0 ? idx : 0;
  }, [currentLocation, locations]);

  useEffect(() => {
    setWeatherIndex(currentLocationIndex);
  }, [currentLocationIndex]);

  const weatherMetrics = useMemo(() => {
    if (!currentLocation) return [];
    return [
      metric(
        "Rainfall",
        pickText(currentLocation.rainFall, currentLocation.RainFall, "-"),
        require("../../../assets/images/ic_rainfall.png"),
      ),
      metric(
        "Wind Speed",
        pickText(currentLocation.windSpeed, currentLocation.WindSpeed, "-"),
        require("../../../assets/images/ic_windspeed.png"),
      ),
      metric(
        "Humidity",
        pickText(currentLocation.humidity, currentLocation.Humidity, "-"),
        require("../../../assets/images/ic_humidity.png"),
      ),
      metric(
        "Direction",
        pickText(
          currentLocation.windDirection,
          currentLocation.WindDirection,
          "-",
        ),
        require("../../../assets/images/ic_winddirection.png"),
      ),
    ];
  }, [currentLocation]);

  const advisoryRows = useMemo(() => {
    if (!currentLocation) return advisories;
    const districtId = toNum((currentLocation as any).districtID, (currentLocation as any).DistrictID);
    const blockId = toNum((currentLocation as any).blockID, (currentLocation as any).BlockID);
    const asdId = toNum((currentLocation as any).asdID, (currentLocation as any).AsdID);

    return advisories.filter((row: any) => {
      const rowDistrict = toNum(row.districtID, row.DistrictID);
      const rowBlock = toNum(row.blockID, row.BlockID);
      const rowAsd = toNum(row.asdID, row.AsdID);

      // If API row has no location IDs, keep it visible.
      if (!rowDistrict && !rowBlock && !rowAsd) return true;

      if (activeTab === "district") {
        return rowDistrict === districtId;
      }

      if (asdId > 0) return rowDistrict === districtId && rowAsd === asdId;
      return rowDistrict === districtId && rowBlock === blockId;
    });
  }, [activeTab, advisories, currentLocation]);

  const cardWidth = Math.max(width - 32, 280);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData();
            }}
          />
        }
        data={advisoryRows}
        keyExtractor={(item, index) =>
          `${(item as any).cropAdvisoryID || (item as any).CropAdvisoryID || index}`
        }
        ListHeaderComponent={
          <View>
            <View style={styles.topTabs}>
              <Pressable
                style={[styles.topTab, activeTab === "block" && styles.topTabActive]}
                onPress={() => setActiveTab("block")}
              >
                <Text style={activeTab === "block" ? styles.topTabTextActive : styles.topTabText}>Block/ASD</Text>
              </Pressable>
              <Pressable
                style={[styles.topTab, activeTab === "district" && styles.topTabActive]}
                onPress={() => setActiveTab("district")}
              >
                <Text style={activeTab === "district" ? styles.topTabTextActive : styles.topTabText}>District</Text>
              </Pressable>
            </View>

            <RNFlatList
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              data={locations}
              initialScrollIndex={0}
              keyExtractor={(item: any, index) =>
                `${toNum(item.stateID, item.StateID)}-${toNum(item.districtID, item.DistrictID)}-${toNum(item.blockID, item.BlockID)}-${toNum(item.asdID, item.AsdID)}-${index}`
              }
              getItemLayout={(_, index) => ({ length: cardWidth, offset: cardWidth * index, index })}
              renderItem={({ item }) => {
                const itemMetrics = [
                  metric("Rainfall", pickText((item as any).rainFall, (item as any).RainFall, "-"), require("../../../assets/images/ic_rainfall.png")),
                  metric("Wind Speed", pickText((item as any).windSpeed, (item as any).WindSpeed, "-"), require("../../../assets/images/ic_windspeed.png")),
                  metric("Humidity", pickText((item as any).humidity, (item as any).Humidity, "-"), require("../../../assets/images/ic_humidity.png")),
                  metric("Direction", pickText((item as any).windDirection, (item as any).WindDirection, "-"), require("../../../assets/images/ic_winddirection.png")),
                ];

                return (
                  <Pressable style={[styles.weatherCardPress, { width: cardWidth }]} onPress={() => navigation.navigate("Forecast")}>
                    <ImageBackground
                      source={
                        pickUri((item as any)?.cloudImage, (item as any)?.CloudImage)
                          ? { uri: pickUri((item as any)?.cloudImage, (item as any)?.CloudImage) }
                          : require("../../../assets/images/ic_profileMenuBG.png")
                      }
                      style={styles.weatherCard}
                      imageStyle={styles.weatherCardBg}
                    >
                      <Text style={styles.placeName}>
                        {pickText((item as any)?.placeName, (item as any)?.PlaceName, (item as any)?.districtName, (item as any)?.DistrictName, "Location")}
                      </Text>
                      <Text style={styles.dateText}>{pickText((item as any)?.date, (item as any)?.Date, "-")}</Text>
                      <Text style={styles.minMaxText}>
                        Min {pickText((item as any)?.minTemp, (item as any)?.MinTemp, "-")} C | Max {pickText((item as any)?.maxTemp, (item as any)?.MaxTemp, "-")} C
                      </Text>
                      <Text style={styles.weatherType}>{pickText((item as any)?.weatherType, (item as any)?.WeatherType, "-")}</Text>

                      <View style={styles.metricsGrid}>
                        {itemMetrics.map((m) => (
                          <View key={m.label} style={styles.metricRow}>
                            <Image source={m.icon} style={styles.metricIcon} resizeMode="contain" />
                            <View>
                              <Text style={styles.metricLabel}>{m.label}</Text>
                              <Text style={styles.metricValue}>{m.value}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </ImageBackground>
                  </Pressable>
                );
              }}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / cardWidth);
                const item: any = locations[index];
                if (!item) return;
                setWeatherIndex(index);
                setSelectedLocation({
                  districtID: toNum(item.districtID, item.DistrictID),
                  blockID: toNum(item.blockID, item.BlockID),
                  asdID: toNum(item.asdID, item.AsdID),
                });
              }}
            />

            {locations.length > 1 ? (
              <View style={styles.dotsRow}>
                {locations.map((_, idx) => (
                  <View key={`dot-${idx}`} style={[styles.dot, idx === weatherIndex && styles.dotActive]} />
                ))}
              </View>
            ) : null}

            {pickText((currentLocation as any)?.warningMessage, (currentLocation as any)?.WarningMessage) ? (
              <View
                style={[
                  styles.warningWrap,
                  { backgroundColor: pickText((currentLocation as any)?.colorCode, (currentLocation as any)?.ColorCode) || "#F7CE52" },
                ]}
              >
                <Text style={styles.warningText}>
                  {pickText((currentLocation as any)?.warningMessage, (currentLocation as any)?.WarningMessage)}
                </Text>
              </View>
            ) : null}

            <Text style={styles.recentTitle}>Recent crop advisories</Text>
          </View>
        }
        renderItem={({ item }) => {
          const row: any = item;
          const title = pickText(
            row.title,
            row.Title,
            row.cropName,
            row.CropName,
            "Crop Advisory",
          );
          const created = pickText(row.createdDate, row.CreatedDate, "");
          const category = pickText(
            row.category,
            row.Category,
            row.cropCategoryName,
            row.CropCategoryName,
            "-",
          );
          const imageUri = pickUri(
            row.localFilePath,
            row.LocalFilePath,
            row.imagePath,
            row.ImagePath,
          );
          const categoryImage = pickUri(row.ccImg, row.CCImg);

          return (
            <Pressable
              style={styles.advisoryCard}
              onPress={() => navigation.navigate("CropAdvisory")}
            >
              <Image
                source={
                  imageUri
                    ? { uri: imageUri }
                    : require("../../../assets/images/defult_crop_plane.png")
                }
                style={styles.advisoryImage}
                resizeMode="cover"
              />

              <View style={styles.advisoryBody}>
                <View style={styles.advisoryTopRow}>
                  <Text style={styles.advisoryTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  <Text style={styles.advisoryDate}>{created}</Text>
                </View>

                <View style={styles.categoryRow}>
                  <Image
                    source={
                      categoryImage
                        ? { uri: categoryImage }
                        : require("../../../assets/images/ic_crop.png")
                    }
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.noData}>No advisory data.</Text>
        }
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  container: { paddingBottom: 20 },
  topTabs: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    flexDirection: "row",
  },
  topTab: {
    flex: 1,
    height: 35,
    backgroundColor: colors.darkGreenGray,
    alignItems: "center",
    justifyContent: "center",
  },
  topTabActive: {
    backgroundColor: colors.primary,
  },
  topTabText: {
    color: colors.primary,
    fontFamily: "RobotoMedium",
    fontSize: 14,
  },
  topTabTextActive: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 14,
  },
  weatherCardPress: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  weatherCard: {
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    minHeight: 240,
  },
  weatherCardBg: {
    borderRadius: 8,
  },
  placeName: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 24,
  },
  dateText: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    marginTop: 2,
  },
  minMaxText: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    marginTop: 4,
  },
  weatherType: {
    color: "#fff",
    fontFamily: "RobotoMedium",
    fontSize: 14,
    marginTop: 2,
  },
  metricsGrid: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  metricRow: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
  },
  metricIcon: {
    width: 25,
    height: 25,
    marginRight: 8,
  },
  metricLabel: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  metricValue: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  recentTitle: {
    marginHorizontal: 16,
    marginBottom: 5,
    color: colors.text,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  dotsRow: {
    marginTop: -6,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#C8C8C8",
  },
  dotActive: {
    backgroundColor: colors.darkGreen,
  },
  warningWrap: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  warningText: {
    textAlign: "center",
    color: "#111",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  advisoryCard: {
    marginHorizontal: 16,
    marginTop: 15,
    marginBottom: 3,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fff",
    flexDirection: "row",
  },
  advisoryImage: {
    width: 65,
    height: 65,
    borderRadius: 32,
  },
  advisoryBody: {
    flex: 1,
    marginLeft: 8,
    justifyContent: "center",
  },
  advisoryTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  advisoryTitle: {
    flex: 1,
    marginRight: 8,
    color: colors.darkGreen,
    fontFamily: "RobotoRegular",
    fontSize: 16,
  },
  advisoryDate: {
    color: colors.muted,
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  categoryRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  categoryIcon: {
    width: 20,
    height: 20,
  },
  categoryText: {
    marginLeft: 4,
    color: colors.text,
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  noData: {
    marginTop: spacing.lg,
    textAlign: "center",
    fontFamily: "RobotoRegular",
    color: colors.muted,
  },
});
