import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList as RNFlatList,
  FlatList,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
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
import { API_REFRESH_DATES } from "../../utils/apiDates";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { useTranslation } from "react-i18next";

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

const formatAdvisoryDate = (raw: string, t: (key: string) => string) => {
  if (!raw) return "";
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toLegacy = (d: Date) =>
    `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;

  if (raw === toLegacy(today)) return t("home.today");
  if (raw === toLegacy(yesterday)) return t("home.yesterday");
  return raw;
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

const normalizeImageKey = (value: unknown) => {
  if (typeof value !== "string" || !value.trim()) return "";
  const file = value.split("/").pop() || value;
  const noExt = file.replace(/\.[a-z0-9]+$/i, "");
  return noExt.trim().toLowerCase();
};

const weatherBgImageMap: Record<string, ImageSourcePropType> = {
  Clearsky_new: require("../../../assets/images/Clearsky_new.png"),
  Mainly_Clear: require("../../../assets/images/Mainly_Clear.png"),
  Partly_Cloudy: require("../../../assets/images/Partly_Cloudy.png"),
  generally_cloudy: require("../../../assets/images/generally_cloudy.png"),
  Cloudy: require("../../../assets/images/Cloudy.png"),
};

const iconImageMap: Record<string, ImageSourcePropType> = {
  ic_rainfall: require("../../../assets/images/ic_rainfall.png"),
  ic_pastrainfall: require("../../../assets/images/ic_pastRainfall.png"),
  ic_humidity: require("../../../assets/images/ic_humidity.png"),
  ic_pasthumidity: require("../../../assets/images/ic_pastHumidity.png"),
  ic_windspeed: require("../../../assets/images/ic_windspeed.png"),
  ic_pastwindspeed: require("../../../assets/images/ic_pastWindSpeed.png"),
  ic_winddirection: require("../../../assets/images/ic_winddirection.png"),
  wind_direction_wh: require("../../../assets/images/wind_direction_wh.png"),
  east: require("../../../assets/images/east.png"),
};

const cloudImageNameByCover = (cloudCover: number) => {
  if (cloudCover < 0) return "";
  if (cloudCover === 0) return "Clearsky_new";
  if (cloudCover === 1 || cloudCover === 2) return "Mainly_Clear";
  if (cloudCover === 3 || cloudCover === 4) return "Partly_Cloudy";
  if (cloudCover === 5 || cloudCover === 6 || cloudCover === 7)
    return "generally_cloudy";
  return "Cloudy";
};

const pickXamarinCloudImageName = (item: any) => {
  const direct = pickText(item?.cloudImage, item?.CloudImage, "");
  if (direct && weatherBgImageMap[direct]) return direct;
  return cloudImageNameByCover(
    toNum(item?.cloudCover, item?.CloudCover, -1),
  );
};

const pickBlockOrAsdName = (item: any) =>
  pickText(item?.blockName, item?.BlockName, item?.asdName, item?.AsdName, "");

const pickDistrictName = (item: any) =>
  pickText(item?.districtName, item?.DistrictName, "");

const trimTempValue = (...values: any[]) =>
  pickText(...values, "--").replace(/\s*C\s*$/i, "");

const normalizeDashboardWeatherRow = (item: any) => {
  const humidityI = pickText(item?.humidityI, item?.HumidityI, "--");
  const humidityII = pickText(item?.humidityII, item?.HumidityII, "--");

  return {
    ...item,
    MinTemp: trimTempValue(
      item?.MinTemp,
      item?.minTemp,
      item?.TempMin,
      item?.tempMin,
    ),
    MaxTemp: trimTempValue(
      item?.MaxTemp,
      item?.maxTemp,
      item?.TempMax,
      item?.tempMax,
    ),
    RainFall: pickText(
      item?.RainFall,
      item?.rainFall,
      item?.Rainfall,
      item?.rainfall,
      "--",
    ),
    Humidity:
      humidityI || humidityII
        ? `${humidityII || "--"} | ${humidityI || "--"}`
        : pickText(item?.Humidity, item?.humidity, "--"),
    Date: pickText(
      item?.Date,
      item?.date,
      item?.ForeCastDate_Lang,
      item?.KisanDate_Lang,
      item?.ForeCastDate,
      item?.KisanDate,
      "--",
    ),
    WeatherType: pickText(
      item?.WeatherType,
      item?.weatherType,
      item?.Cloud,
      item?.cloud,
      "--",
    ),
  };
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

const sameLocationRef = (
  item: any,
  target: { districtID: number; blockID: number; asdID: number } | null,
) => {
  if (!target) return false;
  const districtID = toNum(item?.districtID ?? item?.DistrictID);
  const blockID = toNum(item?.blockID ?? item?.BlockID);
  const asdID = toNum(item?.asdID ?? item?.AsdID);
  return (
    districtID === target.districtID &&
    blockID === target.blockID &&
    asdID === target.asdID
  );
};

const mergeLocations = (primary: any[], secondary: any[]) => {
  const merged: any[] = [];
  [...primary, ...secondary].forEach((item) => {
    const exists = merged.some(
      (row) =>
        toNum(row?.districtID ?? row?.DistrictID) ===
          toNum(item?.districtID ?? item?.DistrictID) &&
        toNum(row?.blockID ?? row?.BlockID) ===
          toNum(item?.blockID ?? item?.BlockID) &&
        toNum(row?.asdID ?? row?.AsdID) === toNum(item?.asdID ?? item?.AsdID),
    );
    if (!exists) merged.push(item);
  });
  return merged;
};

const mergeAdvisories = (primary: any[], secondary: any[]) => {
  const merged: any[] = [];
  [...primary, ...secondary].forEach((item, index) => {
    const advisoryId = toNum(
      item?.cropAdvisoryID ?? item?.CropAdvisoryID,
      index + 1,
    );
    const exists = merged.some(
      (row, rowIndex) =>
        toNum(row?.cropAdvisoryID ?? row?.CropAdvisoryID, rowIndex + 1) ===
        advisoryId,
    );
    if (!exists) merged.push(item);
  });
  return merged;
};

const isBlockLevelRow = (item: any) =>
  toNum(item?.blockID, item?.BlockID) > 0 ||
  toNum(item?.asdID, item?.AsdID) > 0;

const isDistrictOnlyRow = (item: any) => !isBlockLevelRow(item);

const getAdvisoryScope = (item: any) => ({
  stateId: toNum(item?.stateID, item?.StateID),
  districtId: toNum(item?.districtID, item?.DistrictID),
  blockId: toNum(item?.blockID, item?.BlockID),
  asdId: toNum(item?.asdID, item?.AsdID),
  blockName: pickText(item?.block, item?.Block, item?.blockName, item?.BlockName),
  asdName: pickText(item?.asdName, item?.AsdName),
});

const isDistrictAdvisoryForLocation = (row: any, location: any) => {
  const rowScope = getAdvisoryScope(row);
  const targetScope = getAdvisoryScope(location);
  return (
    rowScope.stateId === targetScope.stateId &&
    rowScope.districtId === targetScope.districtId &&
    rowScope.blockId === 0 &&
    rowScope.asdId === 0 &&
    !rowScope.blockName &&
    !rowScope.asdName
  );
};

const isExactBlockAdvisoryForLocation = (row: any, location: any) => {
  const rowScope = getAdvisoryScope(row);
  const targetScope = getAdvisoryScope(location);

  if (
    rowScope.stateId !== targetScope.stateId ||
    rowScope.districtId !== targetScope.districtId
  ) {
    return false;
  }

  if (targetScope.asdId > 0) {
    return (
      rowScope.asdId === targetScope.asdId &&
      rowScope.blockId === 0 &&
      !!rowScope.asdName
    );
  }

  if (targetScope.blockId > 0) {
    return (
      rowScope.blockId === targetScope.blockId &&
      rowScope.asdId === 0 &&
      !!rowScope.blockName
    );
  }

  return false;
};

const enrichDashboardLocationsWithCrops = (
  rows: DashboardLocation[],
  advisories: CropAdvisoryItem[],
) => {
  return rows.map((item: any) => {
    const districtCrops = advisories.filter((row: any) =>
      isDistrictAdvisoryForLocation(row, item),
    );
    const blockCrops = advisories.filter((row: any) =>
      isExactBlockAdvisoryForLocation(row, item),
    );
    const hasBlockScope = isBlockLevelRow(item);
    const crops = hasBlockScope ? blockCrops : districtCrops;

    return {
      ...item,
      districtCrops,
      DistrictCrops: districtCrops,
      blockCrops,
      BlockCrops: blockCrops,
      crops,
      Crops: crops,
      isDistrictDataAvailable:
        hasBlockScope && !blockCrops.length && districtCrops.length > 0,
      IsDistrictDataAvailable:
        hasBlockScope && !blockCrops.length && districtCrops.length > 0,
      isNoCropVisible: crops.length === 0 && districtCrops.length === 0,
      IsNoCropVisible: crops.length === 0 && districtCrops.length === 0,
    };
  });
};

const shapeHomeLocations = (rows: any[]) => {
  const districtRows = rows.filter((item) => isDistrictOnlyRow(item));
  const blockRows = rows.filter((item) => !isDistrictOnlyRow(item));

  if (!blockRows.length) {
    return districtRows.map((item) => ({
      ...item,
      districtWiseWeatherData: item,
    }));
  }

  const mappedBlocks = blockRows.map((item) => {
    const districtMatch =
      districtRows.find(
        (district) =>
          toNum(district?.districtID, district?.DistrictID) ===
            toNum(item?.districtID, item?.DistrictID) &&
          toNum(district?.stateID, district?.StateID) ===
            toNum(item?.stateID, item?.StateID),
      ) || null;

    return {
      ...item,
      districtWiseWeatherData: districtMatch,
    };
  });

  const districtOnlyCards = districtRows
    .filter((district) => {
      const hasMappedBlock = blockRows.some(
        (item) =>
          toNum(district?.districtID, district?.DistrictID) ===
            toNum(item?.districtID, item?.DistrictID) &&
          toNum(district?.stateID, district?.StateID) ===
            toNum(item?.stateID, item?.StateID),
      );
      return !hasMappedBlock;
    })
    .map((item) => ({
      ...item,
      districtWiseWeatherData: item,
    }));

  return [...mappedBlocks, ...districtOnlyCards];
};

const orderLocationsBySelected = (
  items: DashboardLocation[],
  selected: { districtID: number; blockID: number; asdID: number } | null,
) => {
  if (!selected) return items;
  const next = [...items];
  const index = next.findIndex((item) => sameLocationRef(item, selected));
  if (index <= 0) return next;
  const [target] = next.splice(index, 1);
  next.unshift(target);
  return next;
};

const buildHomeCropPayload = async (
  userId: number,
  languageLabel: string,
  coords?: { latitude: number; longitude: number } | null,
) => {
  const payload: Record<string, unknown> = {
    Id: userId,
    LanguageType: languageLabel,
    Type: "Farmer",
    RefreshDateTime: API_REFRESH_DATES.current(),
  };

  try {
    if (coords) {
      payload.Latitude = coords.latitude;
      payload.Longitude = coords.longitude;
      return payload;
    }

    const lastKnown = await Location.getLastKnownPositionAsync();
    if (lastKnown?.coords) {
      payload.Latitude = lastKnown.coords.latitude;
      payload.Longitude = lastKnown.coords.longitude;
    }
  } catch {
    // Keep payload without GPS when unavailable, same as old fallback path.
  }

  return payload;
};

export const DashboardScreen = () => {
  useAndroidNavigationBar(colors.darkGreen, "light");
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const selectedLocation = useAppStore((s) => s.selectedLocation);
  const promotedLocation = useAppStore((s) => s.promotedLocation);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);
  const setPromotedLocation = useAppStore((s) => s.setPromotedLocation);
  const currentLocationOverride = useAppStore((s) => s.currentLocationOverride);
  const temporarySearchLocations = useAppStore(
    (s) => s.temporarySearchLocations,
  );
  const temporarySearchAdvisories = useAppStore(
    (s) => s.temporarySearchAdvisories,
  );
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [advisories, setAdvisories] = useState<CropAdvisoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"block" | "district">("block");
  const carouselRef = useRef<RNFlatList<any> | null>(null);
  const userDraggingCarouselRef = useRef(false);

  const openCropAdvisory = (params: Record<string, unknown>) => {
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() || parent || navigation;
    root.navigate("CropAdvisory", params);
  };

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const payload = buildByLocationPayload(
        userId,
        languageLabel,
        currentLocationOverride,
      );
      const weather = await weatherService.getByLocation(payload);
      const locationList = parseLocationWeatherList(
        weather,
      ) as DashboardLocation[];
      const cropPayload = await buildHomeCropPayload(
        userId,
        languageLabel,
        currentLocationOverride,
      );
      const crop = await cropService.getAdvisoryTop(cropPayload);

      const mergedLocations = mergeLocations(
        locationList,
        temporarySearchLocations,
      );
      const normalizedLocations = mergedLocations.map((item: any) =>
        normalizeDashboardWeatherRow(item),
      );
      const shapedLocations = shapeHomeLocations(
        normalizedLocations,
      ) as DashboardLocation[];
      const currentSelected = useAppStore.getState().selectedLocation;
      const nextAdvisories = mergeAdvisories(
        temporarySearchAdvisories,
        parseAdvisoryList(crop),
      ) as CropAdvisoryItem[];
      const enrichedLocations = enrichDashboardLocationsWithCrops(
        shapedLocations,
        nextAdvisories,
      ) as DashboardLocation[];
      const orderingTarget = promotedLocation || currentSelected;
      const nextLocations = orderLocationsBySelected(
        enrichedLocations,
        orderingTarget,
      );
      setLocations(nextLocations);
      // Keep shared locations aligned with the rendered Home carousel list
      // so Forecast/PastWeather read the same ordering/content as Home.
      setAppLocations(nextLocations as DashboardLocation[]);
      if (locationList.length > 0) {
        const match = currentSelected
          ? nextLocations.find((item: any) => {
              const districtID = toNum(item.districtID, item.DistrictID);
              const blockID = toNum(item.blockID, item.BlockID);
              const asdID = toNum(item.asdID, item.AsdID);
              return (
                districtID === currentSelected.districtID &&
                blockID === currentSelected.blockID &&
                asdID === currentSelected.asdID
              );
            })
          : null;
        const target: any = match || (nextLocations[0] as any);
        const nextSelected = {
          districtID: toNum(target?.districtID, target?.DistrictID),
          blockID: toNum(target?.blockID, target?.BlockID),
          asdID: toNum(target?.asdID, target?.AsdID),
        };
        if (
          !currentSelected ||
          currentSelected.districtID !== nextSelected.districtID ||
          currentSelected.blockID !== nextSelected.blockID ||
          currentSelected.asdID !== nextSelected.asdID
        ) {
          setSelectedLocation(nextSelected);
        }
      }
      setAdvisories(nextAdvisories);
    } catch (error: any) {
      // Keep previously available local/store data on transient API failures.
      if (!useAppStore.getState().locations?.length) {
        const fallback = useAppStore.getState().locations || [];
        setLocations(
          shapeHomeLocations(
            mergeLocations(
              temporarySearchLocations,
              fallback as DashboardLocation[],
            ).map((item: any) => normalizeDashboardWeatherRow(item)),
          ) as DashboardLocation[],
        );
      }
      setTimeout(() => {
        Alert.alert("", error?.message || t("common.error"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    languageLabel,
    currentLocationOverride,
    promotedLocation,
    setAppLocations,
    setPromotedLocation,
    setSelectedLocation,
    temporarySearchAdvisories,
    temporarySearchLocations,
    t,
    userId,
  ]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const carouselLocations = useMemo(() => {
    if (activeTab === "block") {
      return locations.filter((item) => isBlockLevelRow(item as any));
    }
    return locations;
  }, [activeTab, locations]);

  const currentLocation = useMemo(() => {
    if (!carouselLocations.length) return null;
    if (!selectedLocation) return carouselLocations[0] as any;
    const exactMatch = carouselLocations.find((item: any) => {
      const districtID = toNum(item.districtID, item.DistrictID);
      const blockID = toNum(item.blockID, item.BlockID);
      const asdID = toNum(item.asdID, item.AsdID);
      return (
        districtID === selectedLocation.districtID &&
        blockID === selectedLocation.blockID &&
        asdID === selectedLocation.asdID
      );
    });
    if (exactMatch) return exactMatch as any;

    if (activeTab === "district") {
      const districtMatch = carouselLocations.find((item: any) => {
        const districtID = toNum(item.districtID, item.DistrictID);
        return districtID === selectedLocation.districtID;
      });
      if (districtMatch) return districtMatch as any;
    }

    return carouselLocations[0] as any;
  }, [activeTab, carouselLocations, selectedLocation]);

  const currentLocationIndex = useMemo(() => {
    if (!carouselLocations.length) return 0;
    if (!currentLocation) return 0;
    const idx = carouselLocations.findIndex((item: any) => {
      return (
        toNum(item.districtID, item.DistrictID) ===
          toNum(
            (currentLocation as any).districtID,
            (currentLocation as any).DistrictID,
          ) &&
        toNum(item.blockID, item.BlockID) ===
          toNum(
            (currentLocation as any).blockID,
            (currentLocation as any).BlockID,
          ) &&
        toNum(item.asdID, item.AsdID) ===
          toNum((currentLocation as any).asdID, (currentLocation as any).AsdID)
      );
    });
    if (idx >= 0) return idx;

    if (activeTab === "district" && selectedLocation) {
      const districtIdx = carouselLocations.findIndex((item: any) => {
        return (
          toNum(item.districtID, item.DistrictID) ===
          selectedLocation.districtID
        );
      });
      if (districtIdx >= 0) return districtIdx;
    }

    return 0;
  }, [activeTab, carouselLocations, currentLocation, selectedLocation]);

  const canUseBlockTab = useMemo(() => {
    if (!locations.length) return false;
    const target: any = currentLocation || locations[0];
    if (!target) return false;
    const targetState = toNum(target.stateID, target.StateID);
    const targetDistrict = toNum(target.districtID, target.DistrictID);
    return locations.some((row: any) => {
      return (
        toNum(row.stateID, row.StateID) === targetState &&
        toNum(row.districtID, row.DistrictID) === targetDistrict &&
        isBlockLevelRow(row)
      );
    });
  }, [currentLocation, locations]);

  const blockTabLabel = useMemo(() => {
    const stateID = toNum(
      (currentLocation as any)?.stateID,
      (currentLocation as any)?.StateID,
      0,
    );
    return stateID === 28 || stateID === 36 ? "ASD" : t("home.block");
  }, [currentLocation, t]);

  useEffect(() => {
    if (!carouselLocations.length) return;
    carouselRef.current?.scrollToIndex({
      index: currentLocationIndex,
      animated: false,
    });
  }, [currentLocationIndex, carouselLocations.length]);

  useEffect(() => {
    if (activeTab === "block" && !canUseBlockTab) {
      setActiveTab("district");
    }
  }, [activeTab, canUseBlockTab]);

  const indicatorIndex = useMemo(() => {
    if (!carouselLocations.length) return 0;
    return Math.max(
      0,
      Math.min(currentLocationIndex, carouselLocations.length - 1),
    );
  }, [currentLocationIndex, carouselLocations.length]);

  const currentWeatherLocation = useMemo(() => {
    if (!currentLocation) return null;
    const currentBlockId = toNum(
      (currentLocation as any)?.blockID,
      (currentLocation as any)?.BlockID,
    );
    const currentAsdId = toNum(
      (currentLocation as any)?.asdID,
      (currentLocation as any)?.AsdID,
    );
    if (activeTab === "block" && currentBlockId <= 0 && currentAsdId <= 0) {
      return null;
    }
    if (activeTab === "district") {
      return (
        (currentLocation as any)?.districtWiseWeatherData || currentLocation
      );
    }
    return currentLocation;
  }, [activeTab, currentLocation]);

  const weatherMetrics = useMemo(() => {
    if (!currentWeatherLocation) return [];
    return [
      metric(
        t("home.rainfall"),
        pickText(
          (currentWeatherLocation as any).rainFall,
          (currentWeatherLocation as any).RainFall,
          "-",
        ),
        require("../../../assets/images/ic_rainfall.png"),
      ),
      metric(
        t("home.windSpeed"),
        pickText(
          (currentWeatherLocation as any).windSpeed,
          (currentWeatherLocation as any).WindSpeed,
          "-",
        ),
        require("../../../assets/images/ic_windspeed.png"),
      ),
      metric(
        t("home.humidity"),
        pickText(
          (currentWeatherLocation as any).humidity,
          (currentWeatherLocation as any).Humidity,
          "-",
        ),
        require("../../../assets/images/ic_humidity.png"),
      ),
      metric(
        t("home.windDirection"),
        pickText(
          (currentWeatherLocation as any).windDirection,
          (currentWeatherLocation as any).WindDirection,
          "-",
        ),
        require("../../../assets/images/ic_winddirection.png"),
      ),
    ];
  }, [currentWeatherLocation, t]);

  const advisoryRows = useMemo(() => {
    if (!currentLocation) return [];
    const current: any = currentLocation;
    return (
      (activeTab === "district"
        ? current?.districtCrops || current?.DistrictCrops
        : current?.blockCrops || current?.BlockCrops) || []
    );
  }, [activeTab, currentLocation]);

  const hasDistrictAdvisories = useMemo(() => {
    if (!currentLocation) return false;
    const current: any = currentLocation;
    const districtRows =
      current?.districtCrops || current?.DistrictCrops || [];
    return districtRows.length > 0;
  }, [currentLocation]);

  const shouldShowDistrictFallback = useMemo(() => {
    if (activeTab !== "block" || !currentLocation) return false;
    const current: any = currentLocation;
    return !!(
      current?.isDistrictDataAvailable ||
      current?.IsDistrictDataAvailable ||
      hasDistrictAdvisories
    );
  }, [activeTab, currentLocation, hasDistrictAdvisories]);

  const recentCropHeaderSource = useMemo(() => {
    if (!currentLocation) return currentWeatherLocation;
    if (activeTab === "district") {
      return (currentLocation as any)?.districtWiseWeatherData || currentWeatherLocation;
    }
    return currentWeatherLocation;
  }, [activeTab, currentLocation, currentWeatherLocation]);

  const cardWidth = Math.max(width, 280);

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
                style={[
                  styles.topTab,
                  activeTab === "block" && styles.topTabActive,
                  !canUseBlockTab && styles.topTabDisabled,
                ]}
                onPress={() => {
                  if (canUseBlockTab) setActiveTab("block");
                }}
                disabled={!canUseBlockTab}
              >
                <Text
                  style={
                    activeTab === "block"
                      ? styles.topTabTextActive
                      : styles.topTabText
                  }
                >
                  {blockTabLabel}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.topTab,
                  activeTab === "district" && styles.topTabActive,
                ]}
                onPress={() => setActiveTab("district")}
              >
                <Text
                  style={
                    activeTab === "district"
                      ? styles.topTabTextActive
                      : styles.topTabText
                  }
                >
                  {t("home.district")}
                </Text>
              </Pressable>
            </View>

            {carouselLocations.length ? (
              <RNFlatList
                ref={carouselRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                data={carouselLocations}
                initialScrollIndex={0}
                keyExtractor={(item: any, index) =>
                  `${toNum(item.stateID, item.StateID)}-${toNum(item.districtID, item.DistrictID)}-${toNum(item.blockID, item.BlockID)}-${toNum(item.asdID, item.AsdID)}-${index}`
                }
                getItemLayout={(_, index) => ({
                  length: cardWidth,
                  offset: cardWidth * index,
                  index,
                })}
                onScrollBeginDrag={() => {
                  userDraggingCarouselRef.current = true;
                }}
                renderItem={({ item }) => {
                const itemBlockId = toNum((item as any)?.blockID, (item as any)?.BlockID);
                const itemAsdId = toNum((item as any)?.asdID, (item as any)?.AsdID);
                const hasBlockLevelForCard = itemBlockId > 0 || itemAsdId > 0;
                const weatherItem =
                  activeTab === "district"
                    ? (item as any)?.districtWiseWeatherData || item
                    : hasBlockLevelForCard
                      ? item
                      : null;

                if (!weatherItem) {
                  return (
                    <View style={[styles.weatherCardPress, { width: cardWidth }]}>
                      <View style={styles.noWeatherCard}>
                        <Text style={styles.noWeatherText}>
                          {t("home.noBlockWeather")}
                        </Text>
                      </View>
                    </View>
                  );
                }
                const cloudCover = toNum(
                  (weatherItem as any).cloudCover,
                  (weatherItem as any).CloudCover,
                );
                const whiteTheme = cloudCover === 3 || cloudCover === 4;
                const metricColor = whiteTheme ? "#FFFFFF" : "#223C67";
                const rainImage =
                  iconImageMap[
                    normalizeImageKey(
                      (weatherItem as any).rainFallImage ||
                        (weatherItem as any).RainFallImage,
                    )
                  ] ||
                  (whiteTheme
                    ? require("../../../assets/images/ic_rainfall.png")
                    : require("../../../assets/images/ic_pastRainfall.png"));
                const humidityImage =
                  iconImageMap[
                    normalizeImageKey(
                      (weatherItem as any).humidityImage ||
                        (weatherItem as any).HumidityImage,
                    )
                  ] ||
                  (whiteTheme
                    ? require("../../../assets/images/ic_humidity.png")
                    : require("../../../assets/images/ic_pastHumidity.png"));
                const windSpeedImage =
                  iconImageMap[
                    normalizeImageKey(
                      (weatherItem as any).windSpeedImage ||
                        (weatherItem as any).WindSpeedImage,
                    )
                  ] ||
                  (whiteTheme
                    ? require("../../../assets/images/ic_windspeed.png")
                    : require("../../../assets/images/ic_pastWindSpeed.png"));
                const windDirectionImage =
                  iconImageMap[
                    normalizeImageKey(
                      (weatherItem as any).windDirectionImage ||
                        (weatherItem as any).WindDirectionImage,
                    )
                  ] ||
                  (whiteTheme
                    ? require("../../../assets/images/wind_direction_wh.png")
                    : require("../../../assets/images/east.png"));
                const windDirectionAngle = toNum(
                  (weatherItem as any).windDirectionAngle,
                  (weatherItem as any).WindDirectionAngle,
                );

                const itemMetrics = [
                  metric(
                    t("home.rainfall"),
                    pickText(
                      (weatherItem as any).rainFall,
                      (weatherItem as any).RainFall,
                      "-",
                    ),
                    rainImage,
                  ),
                  metric(
                    t("home.windSpeed"),
                    pickText(
                      (weatherItem as any).windSpeed,
                      (weatherItem as any).WindSpeed,
                      "-",
                    ),
                    windSpeedImage,
                  ),
                  metric(
                    t("home.humidity"),
                    pickText(
                      (weatherItem as any).humidity,
                      (weatherItem as any).Humidity,
                      "-",
                    ),
                    humidityImage,
                  ),
                  metric(
                    t("home.windDirection"),
                    pickText(
                      (weatherItem as any).windDirection,
                      (weatherItem as any).WindDirection,
                      "-",
                    ),
                    windDirectionImage,
                  ),
                ];
                const cloudUri = pickUri(
                  (weatherItem as any)?.cloudImage,
                  (weatherItem as any)?.CloudImage,
                );
                const cloudImageName = pickXamarinCloudImageName(weatherItem);
                const cardBackground = cloudUri
                  ? { uri: cloudUri }
                  : weatherBgImageMap[cloudImageName] ||
                    require("../../../assets/images/Clearsky_new.png");
                const titleText =
                  activeTab === "district"
                    ? pickText(
                        (item as any)?.districtWiseWeatherData?.placeName,
                        (item as any)?.districtWiseWeatherData?.PlaceName,
                        pickDistrictName(
                          (item as any)?.districtWiseWeatherData || weatherItem,
                        ),
                        t("home.location"),
                      )
                    : pickText(
                        (weatherItem as any)?.placeName,
                        (weatherItem as any)?.PlaceName,
                        pickBlockOrAsdName(weatherItem),
                        pickDistrictName(
                          (item as any)?.districtWiseWeatherData || weatherItem,
                        ),
                        t("home.location"),
                      );

                return (
                  <View style={[styles.weatherCardPress, { width: cardWidth }]}>
                    {weatherItem ? (
                      <Pressable
                        style={styles.weatherCardTap}
                        onPress={() => {
                          const selectedSource: any =
                            activeTab === "district"
                              ? (item as any)?.districtWiseWeatherData || weatherItem
                              : item;
                          setSelectedLocation({
                            districtID: toNum(
                              selectedSource?.districtID,
                              selectedSource?.DistrictID,
                            ),
                            blockID: toNum(
                              selectedSource?.blockID,
                              selectedSource?.BlockID,
                            ),
                            asdID: toNum(
                              selectedSource?.asdID,
                              selectedSource?.AsdID,
                            ),
                          });
                          navigation.navigate("Forecast");
                        }}
                      >
                        <ImageBackground
                          source={cardBackground}
                          style={styles.weatherCard}
                          imageStyle={styles.weatherCardBg}
                        >
                        <View style={styles.weatherCardTop}>
                          <Text
                            style={[styles.placeName, { color: metricColor }]}
                          >
                            {titleText}
                          </Text>
                          <Text style={[styles.dateText, { color: metricColor }]}>
                            {pickText(
                              (weatherItem as any)?.date,
                              (weatherItem as any)?.Date,
                              "-",
                            )}
                          </Text>
                          <Text
                            style={[styles.minMaxText, { color: metricColor }]}
                          >
                            {t("home.min")}{" "}
                            {pickText(
                              (weatherItem as any)?.minTemp,
                              (weatherItem as any)?.MinTemp,
                              "-",
                            )}{" "}
                            C | {t("home.max")}{" "}
                            {pickText(
                              (weatherItem as any)?.maxTemp,
                              (weatherItem as any)?.MaxTemp,
                              "-",
                            )}{" "}
                            C
                          </Text>
                          <Text
                            style={[styles.weatherType, { color: metricColor }]}
                          >
                            {pickText(
                              (weatherItem as any)?.weatherType,
                              (weatherItem as any)?.WeatherType,
                              "-",
                            )}
                          </Text>
                        </View>

                        <View style={styles.metricsGrid}>
                          {itemMetrics.map((m, metricIndex) => (
                            <View key={m.label} style={styles.metricRow}>
                              <Image
                                source={m.icon}
                                style={[
                                  styles.metricIcon,
                                  metricIndex === 3
                                    ? {
                                        transform: [
                                          { rotate: `${windDirectionAngle}deg` },
                                        ],
                                      }
                                    : null,
                                ]}
                                resizeMode="contain"
                              />
                              <View>
                                <Text
                                  style={[
                                    styles.metricLabel,
                                    { color: metricColor },
                                  ]}
                                >
                                  {m.label}
                                </Text>
                                <Text
                                  style={[
                                    styles.metricValue,
                                    { color: metricColor },
                                  ]}
                                >
                                  {m.value}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                        </ImageBackground>
                      </Pressable>
                    ) : (
                      <View style={styles.noWeatherCard}>
                        <Text style={styles.noWeatherText}>
                          {t("home.noBlockWeather")}
                        </Text>
                      </View>
                    )}
                  </View>
                );
                }}
                onMomentumScrollEnd={(e) => {
                  if (!userDraggingCarouselRef.current) {
                    return;
                  }
                  userDraggingCarouselRef.current = false;
                  const x = e.nativeEvent.contentOffset.x;
                  const index = Math.round(x / cardWidth);
                  const item: any = carouselLocations[index];
                  if (!item) return;
                  const selectedSource: any =
                    activeTab === "district"
                      ? item?.districtWiseWeatherData || item
                      : item;
                  setSelectedLocation({
                    districtID: toNum(
                      selectedSource?.districtID,
                      selectedSource?.DistrictID,
                    ),
                    blockID: toNum(selectedSource?.blockID, selectedSource?.BlockID),
                    asdID: toNum(selectedSource?.asdID, selectedSource?.AsdID),
                  });
                  setPromotedLocation(null);
                }}
              />
            ) : (
              <View style={[styles.weatherCardPress, { width: cardWidth }]}>
                <View style={styles.noWeatherCard}>
                  <Text style={styles.noWeatherText}>
                    {activeTab === "block"
                      ? t("home.noBlockWeather")
                      : t("home.noDistrictWeather")}
                  </Text>
                </View>
              </View>
            )}

            {carouselLocations.length > 1 && currentWeatherLocation ? (
              <View style={styles.dotsRow}>
                {carouselLocations.map((_, idx) => (
                  <View
                    key={`dot-${idx}`}
                    style={[
                      styles.dot,
                      idx === indicatorIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            ) : null}

            {pickText(
              (currentWeatherLocation as any)?.warningMessage,
              (currentWeatherLocation as any)?.WarningMessage,
            ) ? (
              <View
                style={[
                  styles.warningWrap,
                  {
                    backgroundColor:
                      pickText(
                        (currentWeatherLocation as any)?.colorCode,
                        (currentWeatherLocation as any)?.ColorCode,
                      ) || "#F7CE52",
                  },
                ]}
              >
                <Text style={styles.warningText}>
                  {pickText(
                    (currentWeatherLocation as any)?.warningMessage,
                    (currentWeatherLocation as any)?.WarningMessage,
                  )}
                </Text>
              </View>
            ) : null}

            <Text style={styles.recentTitle}>
              {`${t("home.recentCropAdvisories")}${pickText(
                (recentCropHeaderSource as any)?.recCropName,
                (recentCropHeaderSource as any)?.RecCropName,
                "",
              )}`}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const row: any = item;
          const rowIndex = advisoryRows.findIndex(
            (candidate: any) =>
              toNum(candidate?.cropAdvisoryID, candidate?.CropAdvisoryID) ===
              toNum(row?.cropAdvisoryID, row?.CropAdvisoryID),
          );
          const title = pickText(
            row.title,
            row.Title,
            row.cropName,
            row.CropName,
            t("home.cropAdvisory"),
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
            row.cropImageURL,
            row.CropImageURL,
            row.localFilePath,
            row.LocalFilePath,
            row.imagePath,
            row.ImagePath,
          );
          const categoryImage = pickUri(row.ccImg, row.CCImg);

          return (
            <Pressable
              style={styles.advisoryCard}
              onPress={() => {
                const advisoryParams = {
                  advisoryId: toNum(row.cropAdvisoryID, row.CropAdvisoryID),
                  cropId: toNum(row.cropID, row.CropID),
                  cropCategoryId: toNum(row.cropCategoryID, row.CropCategoryID),
                  cropName: pickText(
                    row.cropName,
                    row.CropName,
                    row.title,
                    row.Title,
                    t("home.cropAdvisory"),
                  ),
                  stateID: toNum(row.stateID, row.StateID),
                  districtID: toNum(row.districtID, row.DistrictID),
                  blockID: toNum(row.blockID, row.BlockID),
                  asdID: toNum(row.asdID, row.AsdID),
                  items: advisoryRows,
                  initialIndex: rowIndex >= 0 ? rowIndex : index,
                };
                openCropAdvisory(advisoryParams);
              }}
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
                  <Text style={styles.advisoryDate}>
                    {formatAdvisoryDate(created, t)}
                  </Text>
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
          <Text style={styles.noData}>
            {shouldShowDistrictFallback
              ? t("home.districtAdvisoriesAvailable")
              : pickText(
                    (currentLocation as any)?.isNoCropVisible ? t("home.noAdvisoryData") : "",
                    (currentLocation as any)?.IsNoCropVisible ? t("home.noAdvisoryData") : "",
                    t("home.noAdvisoryData"),
                  )}
          </Text>
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
  topTabDisabled: {
    opacity: 0.5,
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
    paddingHorizontal: 0,
    marginBottom: 16,
  },
  weatherCardTap: {
    width: "100%",
  },
  weatherCard: {
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    minHeight: 240,
  },
  weatherCardTop: {
    alignSelf: "stretch",
  },
  weatherCardBg: {
    borderRadius: 8,
  },
  noWeatherCard: {
    marginHorizontal: 16,
    borderRadius: 8,
    minHeight: 240,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
  },
  noWeatherText: {
    color: colors.muted,
    fontFamily: "RobotoRegular",
    fontSize: 14,
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
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    maxWidth: "90%",
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
