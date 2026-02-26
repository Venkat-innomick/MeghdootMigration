import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { cropService } from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { getLanguageLabel, getUserProfileId } from "../../utils/locationApi";

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
    if (
      typeof value === "string" &&
      (value.startsWith("http://") ||
        value.startsWith("https://") ||
        value.startsWith("file://"))
    ) {
      return value;
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
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const openCropAdvisory = (params: Record<string, unknown>) => {
    const parent = navigation.getParent?.();
    const root = parent?.getParent?.() || parent || navigation;
    root.navigate("CropAdvisory", params);
  };

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
        RefreshDateTime: "2019-07-05",
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
        const id = pickNum(
          item.cropID,
          item.CropID,
          item.cropCategoryID,
          item.CropCategoryID,
          index,
        );
        return (
          arr.findIndex(
            (x) =>
              pickNum(
                x.cropID,
                x.CropID,
                x.cropCategoryID,
                x.CropCategoryID,
                index,
              ) === id,
          ) === index
        );
      });

      setItems(unique);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [languageLabel, userId]);

  useEffect(() => {
    load();
  }, [load]);

  useFocusEffect(
    React.useCallback(() => {
      load();
      return undefined;
    }, [load])
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
      return <Text style={styles.empty}>No data currently available.</Text>;
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
          const advisoryId = pickNum(
            item.cropAdvisoryID,
            item.CropAdvisoryID,
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
                  advisoryId: advisoryId || undefined,
                  cropName: name || "--",
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
              <Text style={styles.cropName} numberOfLines={2}>
                {name}
              </Text>
            </Pressable>
          );
        }}
      />
    );
  }, [items, loading, navigation]);

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
    minHeight: 38,
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
