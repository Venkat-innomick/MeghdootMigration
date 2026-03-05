import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { cropService } from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { getLanguageLabel, getUserProfileId } from "../../utils/locationApi";
import { API_REFRESH_DATES } from "../../utils/apiDates";

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
        RefreshDateTime: API_REFRESH_DATES.favourites,
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
    const cropAdvisoryId = pickNum(item.cropAdvisoryID, item.CropAdvisoryID);
    if (!cropAdvisoryId || !userId) return;

    Alert.alert("Remove", "Remove this item from favourites?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        onPress: async () => {
          try {
            const payload = {
              CropAdvisoryID: cropAdvisoryId,
              UserProfileID: userId,
            };
            const response: any = await cropService.removeFavourite(payload);
            const ok = Boolean(
              response?.IsSuccessful ??
                response?.isSuccessful ??
                response?.result?.IsSuccessful ??
                response?.result?.isSuccessful ??
                true,
            );
            if (!ok) {
              Alert.alert(
                "Delete failed",
                response?.ErrorMessage ||
                  response?.errorMessage ||
                  "Unable to remove favourite",
              );
              return;
            }
            setItems((prev) =>
              prev.filter(
                (x) =>
                  pickNum(x.cropAdvisoryID, x.CropAdvisoryID) !== cropAdvisoryId,
              ),
            );
            if (Platform.OS === "android") {
              ToastAndroid.show("Deleted successfully", ToastAndroid.SHORT);
            }
          } catch (error: any) {
            Alert.alert("Delete failed", error?.message || "Unable to remove favourite");
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
          const categoryIcon = pickUri(item.cCropImg, item.CCropImg);

          return (
            <View style={styles.cardWrap}>
              <Swipeable
                overshootRight={false}
                renderRightActions={() => (
                  <Pressable
                    style={styles.swipeDelete}
                    onPress={() => removeFavourite(item)}
                  >
                    <Image
                      source={require("../../../assets/images/ic_delete.png")}
                      style={styles.swipeDeleteIcon}
                      resizeMode="contain"
                    />
                    <Text style={styles.swipeDeleteText}>Remove</Text>
                  </Pressable>
                )}
              >
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
                      <Text style={styles.title}>
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
                      <Text style={styles.infoText}>
                        {location}
                      </Text>
                    </View>

                    <View style={styles.infoRow}>
                      <Image
                        source={
                          categoryIcon
                            ? { uri: categoryIcon }
                            : require("../../../assets/images/ic_crop.png")
                        }
                        style={styles.infoIcon}
                        resizeMode="contain"
                      />
                      <Text style={styles.infoText}>
                        {category}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              </Swipeable>
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
  swipeDelete: {
    width: 110,
    marginVertical: 1,
    borderRadius: 6,
    backgroundColor: "#E56B6B",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  swipeDeleteIcon: {
    width: 28,
    height: 28,
  },
  swipeDeleteText: {
    color: "#fff",
    fontFamily: "RobotoRegular",
    fontSize: 12,
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
    alignItems: "center",
    flexWrap: "wrap",
  },
  title: {
    flex: 1,
    color: colors.darkGreen,
    fontFamily: "RobotoRegular",
    fontSize: 16,
    marginRight: 8,
    lineHeight: 22,
  },
  date: {
    color: "#8A8A8A",
    fontFamily: "RobotoRegular",
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
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
    lineHeight: 20,
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
