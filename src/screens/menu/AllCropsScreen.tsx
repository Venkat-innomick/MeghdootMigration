import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
} from "@react-navigation/native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { cropService } from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { getLanguageLabel, getUserProfileId } from "../../utils/locationApi";
import { API_REFRESH_DATES } from "../../utils/apiDates";
import { API_BASE_URL } from "../../constants/api";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const pickNum = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "number") return value;
    if (
      typeof value === "string" &&
      value.trim() &&
      !Number.isNaN(Number(value))
    )
      return Number(value);
  }
  return 0;
};

const pickUri = (...values: any[]) => {
  for (const value of values) {
    if (typeof value !== "string" || !value.trim()) continue;
    const raw = value.trim();
    if (
      raw.startsWith("http://") ||
      raw.startsWith("https://") ||
      raw.startsWith("file://")
    ) {
      return raw;
    }
    // Old Xamarin used server-provided CropImageURL values directly.
    // Resolve relative URL against API base in RN.
    if (raw.startsWith("/")) {
      const base = (
        (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
        API_BASE_URL
      ).replace(/\/+$/, "");
      return `${base}${raw}`;
    }
    // Some API rows return relative path without leading slash.
    if (!raw.includes("://")) {
      const base = (
        (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
        API_BASE_URL
      ).replace(/\/+$/, "");
      return `${base}/${raw.replace(/^\/+/, "")}`;
    }
  }
  return "";
};

const pickList = (payload: any, keys: string[]) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

export const AllCropsScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const selectedLocation = useAppStore((s) => s.selectedLocation);
  const locations = useAppStore((s) => s.locations);
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const hasLoadedRef = useRef(false);
  const lastLanguageRef = useRef(languageLabel);

  const openCropAdvisory = (params: Record<string, unknown>) => {
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() || parent || navigation;
    root.navigate("CropAdvisory", params);
  };

  const advisoryLocation = useMemo(() => {
    if (selectedLocation) {
      return selectedLocation;
    }
    const firstLocation = locations[0];
    if (!firstLocation) return null;
    return {
      districtID: pickNum(firstLocation.districtID),
      blockID: pickNum(firstLocation.blockID),
      asdID: pickNum(firstLocation.asdID),
      stateID: pickNum(firstLocation.stateID),
    };
  }, [locations, selectedLocation]);

  const load = React.useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      // Match Xamarin payload contract for GetCrops.
      const response = await cropService.getCategories({
        CropCategoryID: 0,
        ID: userId,
        RefreshDateTime: API_REFRESH_DATES.current(),
        LanguageType: languageLabel,
      });

      const base = response?.result || response?.data || response;
      const list = pickList(base, [
        "objCropAdvisoryCropMappList",
        "ObjCropAdvisoryCropMappList",
        "objPopListByCropCategoryId",
        "ObjPopListByCropCategoryId",
      ]);

      const unique = list.filter((item: any, index: number, arr: any[]) => {
        const id = pickNum(item.cropID, item.CropID, 0);
        return (
          arr.findIndex(
            (x) =>
              pickNum(x.cropID, x.CropID, 0) === id,
          ) === index
        );
      });

      setItems(unique);
      hasLoadedRef.current = true;
    } catch (error: any) {
      setTimeout(() => {
        Alert.alert("", error?.message || t("common.error"), [
          { text: t("common.ok") },
        ]);
      }, 50);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [languageLabel, t, userId]);

  useEffect(() => {
    if (lastLanguageRef.current !== languageLabel) {
      lastLanguageRef.current = languageLabel;
      hasLoadedRef.current = false;
    }
  }, [languageLabel]);

  useFocusEffect(
    React.useCallback(() => {
      // Match Xamarin behavior: load on first open (or if list is empty).
      if (!hasLoadedRef.current || items.length === 0) {
        load();
      }
      return undefined;
    }, [items.length, load])
  );

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!items.length) {
      return <Text style={styles.empty}>{t("crop.noDataCurrentlyAvailable")}</Text>;
    }

    return (
      <FlatList
        data={items}
        numColumns={2}
        keyExtractor={(item, index) =>
          String(
            pickNum(
              item.cropID,
              item.CropID,
              item.cropCategoryID,
              item.CropCategoryID,
              index,
            ),
          )
        }
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => {
          const cropId = pickNum(item.cropID, item.CropID, 0);
          const cropCategoryId = pickNum(
            item.cropCategoryID,
            item.CropCategoryID,
            0,
          );
          const name = pickText(
            item.cropName,
            item.CropName,
            item.varietyName,
            item.VarietyName,
            "--",
          );
          const image = pickUri(
            item.cropImageURL,
            item.CropImageURL,
            item.imagePath,
            item.ImagePath,
          );

          return (
            <Pressable
              style={styles.card}
              onPress={() =>
                openCropAdvisory({
                  cropId,
                  cropCategoryId,
                  cropName: name || "--",
                  stateID: pickNum(
                    item.stateID,
                    item.StateID,
                    item.stateId,
                    (advisoryLocation as any)?.stateID,
                  ),
                  districtID: pickNum(
                    item.districtID,
                    item.DistrictID,
                    item.districtId,
                    (advisoryLocation as any)?.districtID,
                  ),
                  blockID: pickNum(
                    item.blockID,
                    item.BlockID,
                    item.blockId,
                    (advisoryLocation as any)?.blockID,
                  ),
                  asdID: pickNum(
                    item.asdID,
                    item.AsdID,
                    item.asdId,
                    (advisoryLocation as any)?.asdID,
                  ),
                })
              }
            >
              <Image
                source={
                  image
                    ? { uri: image }
                    : require("../../../assets/images/defult_crop_plane.png")
                }
                style={styles.cropImage}
                resizeMode="cover"
              />
              <Text style={styles.cropName}>{name || "--"}</Text>
            </Pressable>
          );
        }}
      />
    );
  }, [items, loading, t]);

  return <Screen>{content}</Screen>;
};

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  card: {
    width: "47%",
    marginHorizontal: "1.5%",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    backgroundColor: "#F8FAF5",
    borderRadius: 15,
    paddingVertical: 10,
    alignItems: "center",
  },
  cropImage: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#fff",
  },
  cropName: {
    marginTop: 8,
    color: "#363636",
    fontFamily: "RobotoRegular",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 6,
  },
  empty: {
    flex: 1,
    textAlign: "center",
    textAlignVertical: "center",
    color: "#999",
    fontFamily: "RobotoRegular",
    fontSize: 16,
  },
});
