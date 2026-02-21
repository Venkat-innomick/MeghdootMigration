import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { cropService, weatherService } from '../../api/services';
import { CropAdvisoryItem, DashboardLocation } from '../../types/domain';
import { useAppStore } from '../../store/appStore';
import {
  buildByLocationPayload,
  getLanguageLabel,
  getUserProfileId,
  parseLocationWeatherList,
} from '../../utils/locationApi';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
};

const pickUri = (...values: any[]) => {
  const value = pickText(...values);
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://')) return value;
  return '';
};

const metric = (label: string, value: string, icon: any) => ({ label, value, icon });

export const DashboardScreen = () => {
  const navigation = useNavigation<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const userId = useMemo(() => getUserProfileId(user), [user]);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [advisories, setAdvisories] = useState<CropAdvisoryItem[]>([]);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const weather = await weatherService.getByLocation(buildByLocationPayload(userId, languageLabel));
      const crop = await cropService.getAdvisoryTop({
        Id: userId,
        UserProfileID: userId,
        userProfileID: userId,
        LanguageType: languageLabel,
        languageType: languageLabel,
        RefreshDateTime: new Date().toISOString().slice(0, 10),
      });

      setLocations(parseLocationWeatherList(weather) as DashboardLocation[]);
      setAdvisories((crop.result || crop.data || []) as CropAdvisoryItem[]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [languageLabel, userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentLocation = useMemo(() => (locations.length ? (locations[0] as any) : null), [locations]);

  const weatherMetrics = useMemo(() => {
    if (!currentLocation) return [];
    return [
      metric('Rainfall', pickText(currentLocation.rainFall, currentLocation.RainFall, '-'), require('../../../assets/images/ic_rainfall.png')),
      metric('Wind Speed', pickText(currentLocation.windSpeed, currentLocation.WindSpeed, '-'), require('../../../assets/images/ic_windspeed.png')),
      metric('Humidity', pickText(currentLocation.humidity, currentLocation.Humidity, '-'), require('../../../assets/images/ic_humidity.png')),
      metric('Direction', pickText(currentLocation.windDirection, currentLocation.WindDirection, '-'), require('../../../assets/images/ic_winddirection.png')),
    ];
  }, [currentLocation]);

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
        data={advisories}
        keyExtractor={(item, index) => `${(item as any).cropAdvisoryID || (item as any).CropAdvisoryID || index}`}
        ListHeaderComponent={
          <View>
            <View style={styles.topTabs}>
              <View style={[styles.topTab, styles.topTabActive]}>
                <Text style={styles.topTabTextActive}>Block/ASD</Text>
              </View>
              <View style={styles.topTab}>
                <Text style={styles.topTabText}>District</Text>
              </View>
            </View>

            <Pressable style={styles.weatherCardPress} onPress={() => navigation.navigate('Forecast')}>
              <ImageBackground
                source={
                  pickUri(currentLocation?.cloudImage, currentLocation?.CloudImage)
                    ? { uri: pickUri(currentLocation?.cloudImage, currentLocation?.CloudImage) }
                    : require('../../../assets/images/ic_profileMenuBG.png')
                }
                style={styles.weatherCard}
                imageStyle={styles.weatherCardBg}
              >
                <Text style={styles.placeName}>
                  {pickText(currentLocation?.placeName, currentLocation?.PlaceName, currentLocation?.districtName, currentLocation?.DistrictName, 'Location')}
                </Text>
                <Text style={styles.dateText}>{pickText(currentLocation?.date, currentLocation?.Date, '-')}</Text>
                <Text style={styles.minMaxText}>
                  Min {pickText(currentLocation?.minTemp, currentLocation?.MinTemp, '-')} C | Max {pickText(currentLocation?.maxTemp, currentLocation?.MaxTemp, '-')} C
                </Text>
                <Text style={styles.weatherType}>{pickText(currentLocation?.weatherType, currentLocation?.WeatherType, '-')}</Text>

                <View style={styles.metricsGrid}>
                  {weatherMetrics.map((item) => (
                    <View key={item.label} style={styles.metricRow}>
                      <Image source={item.icon} style={styles.metricIcon} resizeMode="contain" />
                      <View>
                        <Text style={styles.metricLabel}>{item.label}</Text>
                        <Text style={styles.metricValue}>{item.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ImageBackground>
            </Pressable>

            <Text style={styles.recentTitle}>Recent crop advisories</Text>
          </View>
        }
        renderItem={({ item }) => {
          const row: any = item;
          const title = pickText(row.title, row.Title, row.cropName, row.CropName, 'Crop Advisory');
          const created = pickText(row.createdDate, row.CreatedDate, '');
          const category = pickText(row.category, row.Category, row.cropCategoryName, row.CropCategoryName, '-');
          const imageUri = pickUri(row.localFilePath, row.LocalFilePath, row.imagePath, row.ImagePath);
          const categoryImage = pickUri(row.ccImg, row.CCImg);

          return (
            <Pressable style={styles.advisoryCard} onPress={() => navigation.navigate('CropAdvisory')}>
              <Image
                source={imageUri ? { uri: imageUri } : require('../../../assets/images/defult_crop_plane.png')}
                style={styles.advisoryImage}
                resizeMode="cover"
              />

              <View style={styles.advisoryBody}>
                <View style={styles.advisoryTopRow}>
                  <Text style={styles.advisoryTitle} numberOfLines={2}>{title}</Text>
                  <Text style={styles.advisoryDate}>{created}</Text>
                </View>

                <View style={styles.categoryRow}>
                  <Image
                    source={categoryImage ? { uri: categoryImage } : require('../../../assets/images/ic_crop.png')}
                    style={styles.categoryIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.categoryText}>{category}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.noData}>No advisory data.</Text>}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { paddingBottom: 20 },
  topTabs: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
  },
  topTab: {
    flex: 1,
    height: 35,
    backgroundColor: colors.darkGreenGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTabActive: {
    backgroundColor: colors.primary,
  },
  topTabText: {
    color: colors.primary,
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
  topTabTextActive: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 14,
  },
  weatherCardPress: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  weatherCard: {
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    minHeight: 240,
  },
  weatherCardBg: {
    borderRadius: 8,
  },
  placeName: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 24,
  },
  dateText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    marginTop: 2,
  },
  minMaxText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    marginTop: 4,
  },
  weatherType: {
    color: '#fff',
    fontFamily: 'RobotoMedium',
    fontSize: 14,
    marginTop: 2,
  },
  metricsGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  metricRow: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricIcon: {
    width: 25,
    height: 25,
    marginRight: 8,
  },
  metricLabel: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  metricValue: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  recentTitle: {
    marginHorizontal: 16,
    marginBottom: 5,
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  advisoryCard: {
    marginHorizontal: 16,
    marginTop: 15,
    marginBottom: 3,
    padding: 7,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#fff',
    flexDirection: 'row',
  },
  advisoryImage: {
    width: 65,
    height: 65,
    borderRadius: 32,
  },
  advisoryBody: {
    flex: 1,
    marginLeft: 8,
    justifyContent: 'center',
  },
  advisoryTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  advisoryTitle: {
    flex: 1,
    marginRight: 8,
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 16,
  },
  advisoryDate: {
    color: colors.muted,
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  categoryRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 20,
    height: 20,
  },
  categoryText: {
    marginLeft: 4,
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  noData: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontFamily: 'RobotoRegular',
    color: colors.muted,
  },
});
