import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../../components/Screen";
import { notificationService } from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";
import { getUserProfileId } from "../../utils/locationApi";
import { RouteProp, useFocusEffect, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { RootStackParamList } from "../../navigation/types";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const pickNotificationId = (item: any) =>
  Number(item?.notificationId ?? item?.NotificationId ?? item?.id ?? item?.Id ?? 0);

const extractNowcastItems = (payload: any) => {
  const root = payload?.result || payload?.data || payload;
  if (Array.isArray(root)) return root;

  const list =
    root?.objNotificationsDetailsList ||
    root?.ObjNotificationsDetailsList ||
    [];

  return Array.isArray(list) ? list : [];
};

const filterPopupNowcastItems = (items: any[], location?: string) => {
  if (!location) return items;
  return items.filter(
    (item) =>
      pickText(
        item?.state_District,
        item?.State_District,
        item?.districtName,
        item?.DistrictName,
      ) === location,
  );
};

const buildPopupNowcastCards = (items: any[]) => {
  if (!items.length) return [];

  const lastItem = items[items.length - 1];
  const combinedMessage = items
    .map((item) =>
      pickText(
        item?.warningsDetails,
        item?.WarningsDetails,
        item?.message,
        item?.Message,
        item?.notificationMessage,
        item?.NotificationMessage,
      ),
    )
    .filter(Boolean)
    .join("\n\n");

  return [
    {
      notificationTitle: pickText(
        lastItem?.notifyType,
        lastItem?.NotifyType,
        lastItem?.notificationTitle,
        lastItem?.NotificationTitle,
      ),
      issueDate: pickText(
        lastItem?.date,
        lastItem?.Date,
        lastItem?.full_date,
        lastItem?.full_Date,
        "-",
      ),
      notificationMessage: combinedMessage || "-",
      timeOfIssueMessage: pickText(lastItem?.toi, lastItem?.TOI, ""),
      validUpToMessage: pickText(lastItem?.vUpTo, lastItem?.VUpTo, ""),
    },
  ];
};

const nowcastKeyFor = (item: any, index: number) => {
  const notificationId = pickNotificationId(item);
  if (notificationId > 0) return `nowcast-${notificationId}`;

  const title = pickText(
    item?.notificationTitle,
    item?.NotificationTitle,
    item?.title,
    item?.Title,
    "",
  );
  const issue = pickText(
    item?.issueDate,
    item?.IssueDate,
    item?.date,
    item?.Date,
    "",
  );

  return `nowcast-${title}-${issue}-${index}`;
};

export const NowcastScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, "Nowcast">>();
  const user = useAppStore((s) => s.user);
  const nowcastRefreshTick = useAppStore((s) => s.nowcastRefreshTick);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const userId = useMemo(() => getUserProfileId(user), [user]);

  useFocusEffect(
    React.useCallback(() => {
      const load = async () => {
        const popupItems = route.params?.items || [];
        const popupLocation = route.params?.location;

        if (popupItems.length) {
          const filtered = filterPopupNowcastItems(popupItems, popupLocation);
          setItems(buildPopupNowcastCards(filtered));
          return;
        }

        if (!userId) return;
        setLoading(true);
        try {
          const response: any = await notificationService.getNowcast(userId);
          setItems(extractNowcastItems(response));
        } finally {
          setLoading(false);
        }
      };

      load().catch((error: any) => {
        setItems([]);
        setTimeout(() => {
          Alert.alert("", error?.message || t("common.error"), [
            { text: t("common.ok") },
          ]);
        }, 50);
      });
      return undefined;
    }, [nowcastRefreshTick, route.params?.items, route.params?.location, t, userId])
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
      return <Text style={styles.empty}>{t("home.noDataCurrentlyAvailable")}</Text>;
    }

    return (
      <FlatList
        data={items}
        keyExtractor={(item, index) => nowcastKeyFor(item, index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          void index;
          const title = pickText(
            item.notificationTitle,
            item.NotificationTitle,
            item.title,
            item.Title,
            t("notification.nowcastDefaultTitle"),
          );
          const issueDate = pickText(
            item.issueDate,
            item.IssueDate,
            item.date,
            item.Date,
            "-",
          );
          const message = pickText(
            item.notificationMessage,
            item.NotificationMessage,
            item.message,
            item.Message,
            "-",
          );
          const toi = pickText(
            item.timeOfIssueMessage,
            item.TimeOfIssueMessage,
            item.toi,
            item.TOI,
            "",
          );
          const validity = pickText(
            item.validUpToMessage,
            item.ValidUpToMessage,
            item.validityMessage,
            item.ValidityMessage,
            item.vUpTo,
            item.VUpTo,
            "",
          );
          const validityLine =
            validity ||
            t("notification.validityLabel", {
              defaultValue: "Validity",
            });
          return (
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.issueDate}>{issueDate}</Text>
              <Text style={styles.message}>{message}</Text>
              {toi ? <Text style={styles.metaText}>{toi}</Text> : null}
              <Text style={styles.metaText}>{validityLine}</Text>
            </View>
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
  listContent: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  card: {
    marginHorizontal: 4,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  title: {
    color: colors.darkGreen,
    fontFamily: "RobotoMedium",
    fontSize: 18,
  },
  issueDate: {
    marginTop: 4,
    color: colors.darkGreen,
    fontFamily: "RobotoRegular",
    fontSize: 12,
  },
  message: {
    marginTop: 10,
    color: "#363636",
    fontFamily: "RobotoRegular",
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    marginTop: 6,
    color: "#363636",
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
