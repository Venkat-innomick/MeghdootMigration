import React, { useMemo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import { Screen } from "../../components/Screen";
import { colors } from "../../theme/colors";
import { RootStackParamList } from "../../navigation/types";
import { DistrictWarningItem } from "../../types/domain";

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
};

const pickColor = (...values: any[]) => {
  const value = pickText(...values);
  return value || "#D9D9D9";
};

const warningKeyFor = (item: DistrictWarningItem, index: number) => {
  const district = pickText(item?.district, item?.District, "district");
  const date = pickText(item?.date, item?.Date, item?.refreshDateTime, item?.RefreshDateTime, "");
  return `warning-${district}-${date}-${index}`;
};

export const WarningAlertsScreen = () => {
  const { t } = useTranslation();
  const route =
    useRoute<RouteProp<RootStackParamList, "WarningAlerts">>();
  const items = useMemo(() => {
    const allItems = route.params?.items || [];
    const location = route.params?.location;

    if (!location) return allItems;

    return allItems.filter(
      (item) => pickText(item?.district, item?.District, "") === location,
    );
  }, [route.params?.items, route.params?.location]);

  return (
    <Screen>
      {!items.length ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {t("notification.noWarningAlerts", {
              defaultValue: "No warning alerts available.",
            })}
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => warningKeyFor(item, index)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const district = pickText(item?.district, item?.District, "-");
            const date = pickText(item?.date, item?.Date, "-");
            const days = [
              {
                label: pickText(item?.day_1, item?.Day_1, "D1"),
                color: pickColor(item?.day1_Color, item?.Day1_Color),
              },
              {
                label: pickText(item?.day_2, item?.Day_2, "D2"),
                color: pickColor(item?.day2_Color, item?.Day2_Color),
              },
              {
                label: pickText(item?.day_3, item?.Day_3, "D3"),
                color: pickColor(item?.day3_Color, item?.Day3_Color),
              },
              {
                label: pickText(item?.day_4, item?.Day_4, "D4"),
                color: pickColor(item?.day4_Color, item?.Day4_Color),
              },
              {
                label: pickText(item?.day_5, item?.Day_5, "D5"),
                color: pickColor(item?.day5_Color, item?.Day5_Color),
              },
            ];

            return (
              <View style={styles.card}>
                <Text style={styles.title}>{district}</Text>
                <Text style={styles.date}>
                  {t("notification.dateLabel", { defaultValue: "Date" })}: {date}
                </Text>
                <View style={styles.dayRow}>
                  {days.map((day, index) => (
                    <View key={`${day.label}-${index}`} style={styles.dayItem}>
                      <View style={[styles.dayDot, { backgroundColor: day.color }]} />
                      <Text style={styles.dayLabel}>{day.label || `D${index + 1}`}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          }}
        />
      )}
    </Screen>
  );
};

const styles = StyleSheet.create({
  listContent: {
    padding: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E1E1E1",
    padding: 12,
    marginBottom: 10,
  },
  title: {
    color: colors.primary,
    fontFamily: "RobotoMedium",
    fontSize: 16,
  },
  date: {
    color: "#5B7952",
    fontFamily: "RobotoRegular",
    fontSize: 13,
    marginTop: 4,
  },
  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  dayItem: {
    width: "33%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  dayDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  dayLabel: {
    color: "#363636",
    fontFamily: "RobotoRegular",
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#999",
    fontFamily: "RobotoRegular",
    fontSize: 16,
  },
});
