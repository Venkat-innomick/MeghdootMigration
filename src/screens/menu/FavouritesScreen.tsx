import React, { useCallback, useEffect, useMemo, useState } from "react";
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
    if (typeof value === "number") return String(value);
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

const normalizeDate = (raw: string) => {
  if (!raw) return "-";
  const now = new Date();
  const y = new Date(now);
  y.setDate(now.getDate() - 1);

  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const today = `${dd}-${mm}-${yyyy}`;

  const ydd = String(y.getDate()).padStart(2, "0");
  const ymm = String(y.getMonth() + 1).padStart(2, "0");
  const yyy = y.getFullYear();
  const yesterday = `${ydd}-${ymm}-${yyy}`;

  if (raw === today) return "Today";
  if (raw === yesterday) return "Yesterday";
  return raw;
};

export const FavouritesScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  const load = useCallback(async () => {
    if (!userId) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const response = await cropService.getFavourites({
        Id: userId,
        LanguageType: languageLabel,
        RefreshDateTime: "2019-01-01",
      });
      const base = response?.result || response?.data || response;
      const list = pickList(base, [
        "objCropAdvisoryFavList",
        "ObjCropAdvisoryFavList",
        "objCropAdvisoryFavouriteList",
        "ObjCropAdvisoryFavouriteList",
      ]) as any[];
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [languageLabel, userId]);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setItems([]));
    }, [load]),
  );

  const removeFavourite = async (item: any) => {
    const caflId = pickNum(
      item.caFLID,
      item.CAFLID,
      item.favouriteID,
      item.FavouriteID,
    );
    if (!caflId) return;

    Alert.alert("Remove", "Remove this item from favourites?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          try {
            const payload = {
              CAFLID: caflId,
              CropAdvisoryID: pickNum(item.cropAdvisoryID, item.CropAdvisoryID),
              UserProfileID: user?.typeOfRole || user?.userProfileId || 0,
              Updatedby: user?.typeOfRole || user?.userProfileId || 0,
            };
            await cropService.removeFavourite(payload);
            setItems((prev) =>
              prev.filter(
                (x) =>
                  pickNum(x.caFLID, x.CAFLID, x.favouriteID, x.FavouriteID) !==
                  caflId,
              ),
            );
          } catch {
            // silent to match old app behavior
          }
        },
      },
    ]);
  };

  const content = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!items.length) {
      return <Text style={styles.empty}>No favourites found.</Text>;
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item, index) =>
          String(pickNum(item.cropAdvisoryID, item.CropAdvisoryID, index))
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const title = pickText(item.title, item.Title, "--");
          const location = pickText(item.location, item.Location, "-");
          const category = pickText(item.category, item.Category, "-");
          const date = normalizeDate(
            pickText(item.createdDate, item.CreatedDate, "-"),
          );
          const image = pickUri(
            item.cropImageURL,
            item.CropImageURL,
            item.imagePath,
            item.ImagePath,
          );

          return (
            <View style={styles.cardWrap}>
              <Pressable
                style={styles.removeBtn}
                onPress={() => removeFavourite(item)}
              >
                <Image
                  source={require("../../../assets/images/ic_delete.png")}
                  style={styles.removeIcon}
                  resizeMode="contain"
                />
              </Pressable>

              <Pressable
                style={styles.card}
                onPress={() =>
                  navigation.push("CropAdvisory", {
                    advisoryId: pickNum(
                      item.cropAdvisoryID,
                      item.CropAdvisoryID,
                      0,
                    ),
                    cropId: pickNum(item.cropID, item.CropID, 0),
                    cropCategoryId: pickNum(
                      item.cropCategoryID,
                      item.CropCategoryID,
                      0,
                    ),
                    cropName: pickText(item.cropName, item.CropName, ""),
                  })
                }
              >
                <Image
                  source={
                    image
                      ? { uri: image }
                      : require("../../../assets/images/defult_crop_plane.png")
                  }
                  style={styles.thumb}
                  resizeMode="cover"
                />

                <View style={styles.cardRight}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={2}>
                      {title}
                    </Text>
                    <Text style={styles.date}>{date}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Image
                      source={require("../../../assets/images/ic_map.png")}
                      style={styles.infoIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {location}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Image
                      source={require("../../../assets/images/ic_crop.png")}
                      style={styles.infoIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {category}
                    </Text>
                  </View>
                </View>
              </Pressable>
            </View>
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
  listContent: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cardWrap: {
    marginBottom: 10,
  },
  removeBtn: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  removeIcon: {
    width: 18,
    height: 18,
  },
  card: {
    borderWidth: 1,
    borderColor: "#E3E3E3",
    borderRadius: 6,
    backgroundColor: "#fff",
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
  },
  thumb: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    marginRight: 10,
  },
  cardRight: {
    flex: 1,
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    color: colors.darkGreen,
    fontFamily: "RobotoRegular",
    fontSize: 16,
    marginRight: 8,
  },
  date: {
    color: "#8A8A8A",
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  infoRow: {
    marginTop: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  infoIcon: {
    width: 18,
    height: 18,
    marginRight: 3,
  },
  infoText: {
    flex: 1,
    color: "#4E4E4E",
    fontFamily: "RobotoRegular",
    fontSize: 14,
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
