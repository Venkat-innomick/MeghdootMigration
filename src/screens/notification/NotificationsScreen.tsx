import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Screen } from "../../components/Screen";
import { notificationService } from "../../api/services";
import { useAppStore } from "../../store/appStore";
import { colors } from "../../theme/colors";
import { useAndroidNavigationBar } from "../../hooks/useAndroidNavigationBar";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const SHORT_LIMIT = 140;

export const NotificationsScreen = () => {
  useAndroidNavigationBar(colors.background, "dark");
  const user = useAppStore((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await notificationService.getUserNotifications(
        user.userProfileId,
      );
      setItems(Array.isArray(response) ? response : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [user]);

  const clearAll = async () => {
    if (!user) return;
    try {
      await notificationService.clearNotifications(user.userProfileId);
      setItems([]);
    } catch {
      // no-op
    }
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
      return <Text style={styles.empty}>No data currently available.</Text>;
    }

    return (
      <>
        <View style={styles.countBar}>
          <Text style={styles.countText}>{items.length} notifications</Text>
          <Pressable onPress={clearAll}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        </View>

        <FlatList
          data={items}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const title = pickText(
              item.notificationTitle,
              item.NotificationTitle,
              item.title,
              item.Title,
              "Notification",
            );
            const issue = pickText(
              item.timeOfIssueMessage,
              item.TimeOfIssueMessage,
              item.issueDate,
              item.IssueDate,
              item.date,
              item.Date,
              "",
            );
            const message = pickText(
              item.notificationMessage,
              item.NotificationMessage,
              item.message,
              item.Message,
              "-",
            );
            const isExpanded = !!expanded[index];
            const shouldTrim = message.length > SHORT_LIMIT;
            const shownMessage =
              shouldTrim && !isExpanded
                ? `${message.slice(0, SHORT_LIMIT)}...`
                : message;

            return (
              <View style={styles.card}>
                <Text style={styles.title}>{title}</Text>
                {issue ? <Text style={styles.issueText}>{issue}</Text> : null}
                <Text style={styles.message}>{shownMessage}</Text>

                {shouldTrim ? (
                  <Pressable
                    style={styles.seeMoreWrap}
                    onPress={() =>
                      setExpanded((prev) => ({ ...prev, [index]: !isExpanded }))
                    }
                  >
                    <Text style={styles.seeMoreText}>
                      {isExpanded ? "See Less" : "See More"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          }}
        />
      </>
    );
  }, [clearAll, expanded, items, loading]);

  return <Screen>{content}</Screen>;
};

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countBar: {
    marginHorizontal: 5,
    marginTop: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 5,
  },
  countText: {
    color: "#363636",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  clearText: {
    color: "#D24747",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 5,
    paddingBottom: 12,
  },
  card: {
    marginHorizontal: 5,
    marginBottom: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    borderRadius: 5,
    backgroundColor: "#F8FAF5",
  },
  title: {
    color: colors.primary,
    fontFamily: "RobotoRegular",
    fontSize: 16,
  },
  issueText: {
    marginTop: 4,
    color: "#5B7952",
    fontFamily: "RobotoRegular",
    fontSize: 14,
  },
  message: {
    marginTop: 4,
    color: "#024764",
    fontFamily: "RobotoRegular",
    fontSize: 16,
    lineHeight: 22,
  },
  seeMoreWrap: {
    marginTop: 2,
    alignSelf: "flex-end",
  },
  seeMoreText: {
    color: colors.primary,
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
