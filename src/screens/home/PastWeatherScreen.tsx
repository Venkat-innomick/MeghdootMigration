import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { userService, weatherService } from '../../api/services';
import { DashboardLocation, WeatherForecastItem } from '../../types/domain';
import { useAppStore } from '../../store/appStore';
import {
  getLanguageLabel,
  getUserProfileId,
  mergeUserProfileLocation,
  parseUserLocationsList,
  toText as normalizeText,
} from '../../utils/locationApi';
import { API_REFRESH_DATES } from '../../utils/apiDates';
import { useAndroidNavigationBar } from '../../hooks/useAndroidNavigationBar';
import { useTranslation } from 'react-i18next';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '-';
};

const pickNum = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
};

const pickUri = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('file://'))) {
      return value;
    }
  }
  return '';
};

const pickColor = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) {
      return value.trim();
    }
  }
  return '#024764';
};

const getHomeLikeMetricColor = (cloudCover: number) => {
  const whiteTheme = cloudCover === 3 || cloudCover === 4;
  return whiteTheme ? '#FFFFFF' : '#223C67';
};

const isHomeWhiteTheme = (cloudCover: number) =>
  cloudCover === 3 || cloudCover === 4;

const localImageMap: Record<string, ImageSourcePropType> = {
  ic_tempweather: require('../../../assets/images/ic_tempWeather.png'),
  temp_blue: require('../../../assets/images/temp_blue.png'),
  temp_wh: require('../../../assets/images/ic_tempWeather.png'),
  ic_rainfall: require('../../../assets/images/ic_rainfall.png'),
  ic_pastrainfall: require('../../../assets/images/ic_pastRainfall.png'),
  ic_humidity: require('../../../assets/images/ic_humidity.png'),
  ic_pasthumidity: require('../../../assets/images/ic_pastHumidity.png'),
  ic_windspeed: require('../../../assets/images/ic_windspeed.png'),
  ic_pastwindspeed: require('../../../assets/images/ic_pastWindSpeed.png'),
  ic_winddirection: require('../../../assets/images/ic_winddirection.png'),
  wind_direction_wh: require('../../../assets/images/wind_direction_wh.png'),
  east: require('../../../assets/images/east.png'),
};

const weatherBgImageMap: Record<string, ImageSourcePropType> = {
  Clearsky_new: require('../../../assets/images/Clearsky_new.png'),
  Mainly_Clear: require('../../../assets/images/Mainly_Clear.png'),
  Partly_Cloudy: require('../../../assets/images/Partly_Cloudy.png'),
  generally_cloudy: require('../../../assets/images/generally_cloudy.png'),
  Cloudy: require('../../../assets/images/Cloudy.png'),
};

const cloudImageNameByCover = (cloudCover: number) => {
  if (cloudCover < 0) return '';
  if (cloudCover === 0) return 'Clearsky_new';
  if (cloudCover === 1 || cloudCover === 2) return 'Mainly_Clear';
  if (cloudCover === 3 || cloudCover === 4) return 'Partly_Cloudy';
  if (cloudCover === 5 || cloudCover === 6 || cloudCover === 7) return 'generally_cloudy';
  return 'Cloudy';
};

const pickXamarinCloudImageName = (item: any) => {
  const direct = pickText(item?.cloudImage, item?.CloudImage, '');
  if (direct && weatherBgImageMap[direct]) return direct;
  return cloudImageNameByCover(
    pickNum(item?.cloudCover, item?.CloudCover, -1),
  );
};

const normalizeImageKey = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const file = value.split('/').pop() || value;
  const noExt = file.replace(/\.[a-z0-9]+$/i, '');
  return noExt.trim().toLowerCase();
};

const resolveWeatherDate = (item: any) =>
  pickText(
    item?.KisanDate_Lang,
    item?.ForeCastDate_Lang,
    item?.Date,
    item?.date,
    item?.KisanDate,
    item?.ForeCastDate,
    item?.ForeCastDate_format,
    item?.ForeCastDate_Web,
    '-',
  );

const parseDateMs = (value: any) => {
  if (typeof value !== 'string' || !value.trim()) return 0;
  const direct = Date.parse(value);
  if (!Number.isNaN(direct)) return direct;
  const normalized = value.replace(/\//g, '-');
  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeWeatherItem = (item: any) => {
  const minTempRaw = pickText(item.minTemp, item.MinTemp, item.tempMin, item.TempMin, '--');
  const maxTempRaw = pickText(item.maxTemp, item.MaxTemp, item.tempMax, item.TempMax, '--');
  const minTempDegree = pickText(item.MinTempDegree, item.minTempDegree, item.TempMin, item.tempMin, '--');
  const maxTempDegree = pickText(item.MaxTempDegree, item.maxTempDegree, item.TempMax, item.tempMax, '--');
  const humidityI = pickText(item.humidityI, item.HumidityI, '');
  const humidityII = pickText(item.humidityII, item.HumidityII, '');

  return {
    ...item,
    Date: resolveWeatherDate(item),
    MinTemp: typeof minTempRaw === 'string' ? minTempRaw.replace(/\s*C\s*$/i, '') : minTempRaw,
    MaxTemp: typeof maxTempRaw === 'string' ? maxTempRaw.replace(/\s*C\s*$/i, '') : maxTempRaw,
    MinTempDegree: minTempDegree,
    MaxTempDegree: maxTempDegree,
    Rainfall: pickText(item.Rainfall, item.rainfall, item.RainFall, item.rainFall, '--'),
    WindSpeed: pickText(item.WindSpeed, item.windSpeed, '--'),
    WeatherType: pickText(item.WeatherType, item.weatherType, item.Cloud, item.cloud, '--'),
    WindDirection: pickText(item.WindDirection, item.windDirection, '--'),
    WindDirectionAngle: pickNum(item.WindDirectionAngle, item.windDirectionAngle, 0),
    Humidity: humidityII || humidityI ? `${humidityII || '--'} / ${humidityI || '--'}` : pickText(item.Humidity, item.humidity, '--'),
    TextColor: item.TextColor || item.textColor,
  };
};

const getMetricIconsForItem = (item: any) => {
  const whiteTheme = isHomeWhiteTheme(
    pickNum(item?.cloudCover, item?.CloudCover, -1),
  );
  const getIcon = (nameValue: any, fallback: ImageSourcePropType) => {
    const key = normalizeImageKey(nameValue);
    return localImageMap[key] || fallback;
  };

  return {
    temp: getIcon(
      item.tempImage || item.TempImage,
      whiteTheme
        ? require('../../../assets/images/ic_tempWeather.png')
        : require('../../../assets/images/temp_blue.png'),
    ),
    rainfall: getIcon(
      item.rainFallImage || item.rainfallImage || item.RainFallImage,
      whiteTheme
        ? require('../../../assets/images/ic_rainfall.png')
        : require('../../../assets/images/ic_pastRainfall.png'),
    ),
    humidity: getIcon(
      item.humidityImage || item.HumidityImage,
      whiteTheme
        ? require('../../../assets/images/ic_humidity.png')
        : require('../../../assets/images/ic_pastHumidity.png'),
    ),
    windSpeed: getIcon(
      item.windSpeedImage || item.WindSpeedImage,
      whiteTheme
        ? require('../../../assets/images/ic_windspeed.png')
        : require('../../../assets/images/ic_pastWindSpeed.png'),
    ),
    windDirection: getIcon(
      item.windDirectionImage || item.WindDirectionImage,
      whiteTheme
        ? require('../../../assets/images/wind_direction_wh.png')
        : require('../../../assets/images/east.png'),
    ),
  };
};

const pickList = (payload: any, keys: string[]): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const getPastWeatherRows = (rawPayload: any) => {
  const observed = pickList(rawPayload, [
    'ObjObservedWeatherList',
    'objObservedWeatherList',
    'ObjWeatherForecastPrevList',
    'objWeatherForecastPrevList',
  ]);

  if (observed.length) {
    return [...observed].sort((a, b) => {
      const aTime = parseDateMs(a?.KisanDate ?? a?.Date ?? a?.date);
      const bTime = parseDateMs(b?.KisanDate ?? b?.Date ?? b?.date);
      return bTime - aTime;
    });
  }

  return pickList(rawPayload, [
    'ObjWeatherForecastList',
    'objWeatherForecastList',
    'ObjWeatherForecastNextList',
    'objWeatherForecastNextList',
    'Weathercollection',
    'weathercollection',
    'WeatherCollection',
    'weatherCollection',
  ]);
};

const getLocationIds = (location: any) => ({
  // Xamarin ForecastView builds weather payload location object with Temp* IDs.
  stateID: pickNum(location?.tempStateID, location?.TempStateID, location?.stateID, location?.StateID),
  districtID: pickNum(location?.tempDistrictID, location?.TempDistrictID, location?.districtID, location?.DistrictID),
  blockID: pickNum(location?.tempBlockID, location?.TempBlockID, location?.blockID, location?.BlockID),
  asdID: pickNum(location?.tempAsdID, location?.TempAsdID, location?.asdID, location?.AsdID),
});

const buildWeatherPayload = (location: any, languageLabel: string) => {
  const ids = getLocationIds(location);
  const payload: Record<string, unknown> = {
    StateID: ids.stateID,
    DistrictID: ids.districtID,
    LanguageType: languageLabel,
    RefreshDateTime: API_REFRESH_DATES.current(),
  };

  if (ids.stateID === 28 || ids.stateID === 36) {
    payload.AsdID = ids.asdID;
  } else {
    payload.BlockID = ids.blockID;
  }

  return payload;
};

const dedupePastWeatherLocations = (items: any[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const ids = getLocationIds(item);
    const key = `${ids.stateID}-${ids.districtID}-${ids.blockID}-${ids.asdID}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const findPastWeatherLocationIndex = (
  list: any[],
  selectedLocationRef:
    | {
        districtID: number;
        blockID: number;
        asdID: number;
      }
    | null
    | undefined,
) => {
  if (!selectedLocationRef) return -1;

  const exactIndex = list.findIndex((loc: any) => {
    const ids = getLocationIds(loc);
    return (
      ids.districtID === selectedLocationRef.districtID &&
      ids.blockID === selectedLocationRef.blockID &&
      ids.asdID === selectedLocationRef.asdID
    );
  });
  if (exactIndex >= 0) return exactIndex;

  return list.findIndex((loc: any) => {
    const ids = getLocationIds(loc);
    return ids.districtID === selectedLocationRef.districtID;
  });
};

export const PastWeatherScreen = () => {
  useAndroidNavigationBar(colors.darkGreen, 'light');
  const { t } = useTranslation();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const appLocations = useAppStore((s) => s.locations);
  const selectedLocationRef = useAppStore((s) => s.selectedLocation);
  const currentLocationOverride = useAppStore((s) => s.currentLocationOverride);
  const userId = getUserProfileId(user);
  const languageLabel = getLanguageLabel(language);

  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [days, setDays] = useState<WeatherForecastItem[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const lastLanguageRef = useRef(languageLabel);

  const selectedLocation = locations[selectedLocationIndex] as any;
  const selectedDay = (days[selectedDayIndex] || {}) as any;
  const heroTextColor = useMemo(
    () =>
      pickColor(
        getHomeLikeMetricColor(
          pickNum(selectedDay.cloudCover, selectedDay.CloudCover, -1),
        ),
        selectedDay.textColor,
        selectedDay.TextColor,
        selectedLocation?.colorCode,
        selectedLocation?.ColorCode,
      ),
    [selectedDay, selectedLocation],
  );

  const locationLabel = useMemo(() => {
    if (!selectedLocation) return t('home.selectLocation');
    const ids = getLocationIds(selectedLocation);
    const stateID = ids.stateID;
    const district = pickText(selectedLocation.districtName, selectedLocation.DistrictName, selectedLocation.tempDistrictName, selectedLocation.TempDistrictName, '');
    const block = pickText(selectedLocation.blockName, selectedLocation.BlockName, selectedLocation.tempBlockName, selectedLocation.TempBlockName, '');
    const asd = pickText(selectedLocation.asdName, selectedLocation.AsdName, selectedLocation.tempAsdName, selectedLocation.TempAsdName, '');
    const location = stateID === 28 || stateID === 36 ? asd : block;
    if (location && location !== '-') return `${location} (${stateID === 28 || stateID === 36 ? t('home.asd') : t('home.block')})`;
    return `${district} (${t('home.district')})`;
  }, [selectedLocation, t]);

  const metricIcons = useMemo(() => getMetricIconsForItem(selectedDay), [selectedDay]);

  const heroBackgroundSource = useMemo(() => {
    const cloudUri = pickUri(selectedDay.cloudImage, selectedDay.CloudImage);
    if (cloudUri) return { uri: cloudUri };
    const imageName = pickXamarinCloudImageName(selectedDay);
    return weatherBgImageMap[imageName] || require('../../../assets/images/Clearsky_new.png');
  }, [selectedDay]);

  const loadLocations = async () => {
    if (!userId) return;
    try {
      let list: DashboardLocation[] = [];
      if (currentLocationOverride) {
        const response = await weatherService.getByLocation({
          Id: userId,
          LanguageType: languageLabel,
          RefreshDateTime: API_REFRESH_DATES.current(),
          Latitude: currentLocationOverride.latitude,
          Longitude: currentLocationOverride.longitude,
        });
        const rawList =
          (((response as any)?.result || (response as any)?.data || response)
            ?.ObjWeatherForecastNextList ||
            ((response as any)?.result || (response as any)?.data || response)
              ?.objWeatherForecastNextList ||
            []) as DashboardLocation[];
        list = dedupePastWeatherLocations(rawList as any[]) as DashboardLocation[];
      } else if (appLocations?.length) {
        list = dedupePastWeatherLocations(appLocations as any[]) as DashboardLocation[];
      } else {
        const response = await userService.getUserLocations({
          UserProfileID: userId,
          LanguageType: languageLabel,
          RefreshDateTime: API_REFRESH_DATES.current(),
        });
        const rawList = mergeUserProfileLocation(
          parseUserLocationsList(response) as DashboardLocation[],
          user,
        );
        list = dedupePastWeatherLocations(rawList as any[]) as DashboardLocation[];
        useAppStore.getState().setLocations(list);
      }
      setLocations(list);
      if (list.length) {
        const currentIndex = currentLocationOverride
          ? list.findIndex((loc: any) => Boolean(loc?.isCurrentLocation || loc?.IsCurrentLocation))
          : -1;
        const selectedIndex =
          currentIndex >= 0
            ? currentIndex
            : findPastWeatherLocationIndex(list as any[], selectedLocationRef);
        const indexToUse = selectedIndex >= 0 ? selectedIndex : 0;
        const target = list[indexToUse] as any;
        setSelectedLocationIndex(indexToUse);
        await loadWeatherForLocation(target);
      } else {
        setDays([]);
      }
    } catch (error: any) {
      setTimeout(() => {
        Alert.alert("", error?.message || t("common.error"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    }
  };

  const loadWeatherForLocation = async (location: any) => {
    setLoading(true);
    try {
      const payload = buildWeatherPayload(location, languageLabel);

      const response = await weatherService.getObserved(payload);
      const rawPayload = response.result || response.data || response;
      const list = getPastWeatherRows(rawPayload).map(normalizeWeatherItem);
      setDays(list as WeatherForecastItem[]);
      setSelectedDayIndex(0);
    } catch (error: any) {
      setTimeout(() => {
        Alert.alert("", error?.message || t("common.error"), [
          { text: t("common.ok") },
        ]);
      }, 50);
    } finally {
      setLoading(false);
    }
  };

  const refreshScreenData = useCallback((forceLocationReload = false) => {
      if (forceLocationReload) {
        loadLocations();
        return;
      }

      if (currentLocationOverride) {
        loadLocations();
        return;
      }

      const cachedLocations = useAppStore.getState().locations;
      if (cachedLocations?.length) {
        const list = dedupePastWeatherLocations(cachedLocations as any[]) as DashboardLocation[];
        setLocations(list);
        if (list.length) {
          const selectedIndex = findPastWeatherLocationIndex(
            list as any[],
            selectedLocationRef,
          );
          const indexToUse = selectedIndex >= 0 ? selectedIndex : 0;
          const target = list[indexToUse] as any;
          setSelectedLocationIndex(indexToUse);
          loadWeatherForLocation(target);
        } else {
          setDays([]);
        }
        return;
      }
      loadLocations();
    }, [appLocations, currentLocationOverride, languageLabel, selectedLocationRef, t, userId]);

  useFocusEffect(
    useCallback(() => {
      refreshScreenData();
    }, [refreshScreenData]),
  );

  useEffect(() => {
    if (lastLanguageRef.current !== languageLabel) {
      lastLanguageRef.current = languageLabel;
      refreshScreenData(true);
    }
  }, [languageLabel, refreshScreenData]);

  const selectLocation = async (index: number) => {
    const location = locations[index] as any;
    setSelectedLocationIndex(index);
    setPickerOpen(false);
    await loadWeatherForLocation(location);
  };

  return (
    <Screen edges={['left', 'right']}>
      <View style={styles.container}>
        <Pressable style={styles.locationBar} onPress={() => setPickerOpen(true)}>
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
          <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropDownIcon} resizeMode="contain" />
        </Pressable>

        <View style={styles.daysStrip}>
          <FlatList
            data={days}
            horizontal
            keyExtractor={(item: any, index) =>
              `p-day-${normalizeText(item.WeatherForecastID, item.weatherForecastID, item.Date, 'na')}-${index}`
            }
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysContent}
            renderItem={({ item, index }) => {
              const row: any = item;
              const selected = index === selectedDayIndex;
              const rowIcons = getMetricIconsForItem(row);
              const dayDate = pickText(row.Date, row.date, '-');
              return (
                <Pressable
                  style={[styles.dayPill, selected && styles.dayPillSelected]}
                  onPress={() => setSelectedDayIndex(index)}
                >
                  <Text style={[styles.dayDateText, selected && styles.dayTextSelected]} numberOfLines={2}>
                    {dayDate}
                  </Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.MinTemp, row.minTemp, '-')}</Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.MaxTemp, row.maxTemp, '-')}</Text>
                  <Image source={rowIcons.temp} style={styles.tempIcon} resizeMode="contain" />
                </Pressable>
              );
            }}
          />
        </View>

        {loading ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.detailsScroll} contentContainerStyle={styles.detailsContainer}>
            {days.length ? (
              <ImageBackground
                source={heroBackgroundSource}
                style={styles.hero}
                imageStyle={styles.heroImage}
              >
                <Text style={[styles.heroDate, { color: heroTextColor }]}>{pickText(selectedDay.Date, selectedDay.date, '-')}</Text>
                <View style={[styles.heroDivider, { backgroundColor: heroTextColor }]} />
                <Text style={[styles.heroType, { color: heroTextColor }]}>{pickText(selectedDay.WeatherType, selectedDay.weatherType, '-')}</Text>

                <View style={styles.metricRow}>
                  <View style={styles.metricHalf}>
                    <Image source={metricIcons.temp} style={styles.metricIcon} resizeMode="contain" />
                    <View>
                      <Text style={[styles.metricLabel, { color: heroTextColor }]}>{t('home.temperature')}</Text>
                      <Text style={[styles.metricValue, { color: heroTextColor }]}>
                        {t('home.min')} {pickText(selectedDay.MinTempDegree, selectedDay.minTempDegree, selectedDay.MinTemp, '-')} | {t('home.max')} {pickText(selectedDay.MaxTempDegree, selectedDay.maxTempDegree, selectedDay.MaxTemp, '-')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metricGridRow}>
                  <View style={styles.metricHalf}>
                    <Image source={metricIcons.rainfall} style={styles.metricIcon} resizeMode="contain" />
                    <View>
                      <Text style={[styles.metricLabel, { color: heroTextColor }]}>{t('home.rainfall')}</Text>
                      <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.Rainfall, selectedDay.rainfall, selectedDay.RainFall, selectedDay.rainFall, '-')}</Text>
                    </View>
                  </View>
                  <View style={styles.metricHalf}>
                    <Image source={metricIcons.windSpeed} style={styles.metricIcon} resizeMode="contain" />
                    <View>
                      <Text style={[styles.metricLabel, { color: heroTextColor }]}>{t('home.windSpeed')}</Text>
                      <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.WindSpeed, selectedDay.windSpeed, '-')}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.metricGridRow}>
                  <View style={styles.metricHalf}>
                    <Image source={metricIcons.humidity} style={styles.metricIcon} resizeMode="contain" />
                    <View>
                      <Text style={[styles.metricLabel, { color: heroTextColor }]}>{t('home.humidity')}</Text>
                      <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.Humidity, selectedDay.humidity, '-')}</Text>
                    </View>
                  </View>
                  <View style={styles.metricHalf}>
                    <Image
                      source={metricIcons.windDirection}
                      style={[styles.metricIcon, { transform: [{ rotate: `${pickNum(selectedDay.WindDirectionAngle, selectedDay.windDirectionAngle)}deg` }] }]}
                      resizeMode="contain"
                    />
                    <View>
                      <Text style={[styles.metricLabel, { color: heroTextColor }]}>{t('home.windDirection')}</Text>
                      <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.WindDirection, selectedDay.windDirection, '-')}</Text>
                    </View>
                  </View>
                </View>
              </ImageBackground>
            ) : (
              <View style={styles.noDataWrap}>
                <Text style={styles.emptyText}>{t('home.noDataCurrentlyAvailable')}</Text>
              </View>
            )}
          </ScrollView>
        )}

        <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerOpen(false)}>
            <View style={styles.modalCard}>
              <ScrollView>
                {locations.map((loc: any, index) => {
                  const district = pickText(loc.districtName, loc.DistrictName, '');
                  const block = pickText(loc.blockName, loc.BlockName, loc.asdName, loc.AsdName, '');
                  const label = block !== '-' ? `${district} - ${block}` : district;
                  return (
                    <Pressable
                      key={`loc-${normalizeText(loc.stateID, loc.StateID, index)}-${normalizeText(loc.districtID, loc.DistrictID)}-${normalizeText(loc.blockID, loc.BlockID, loc.asdID, loc.AsdID)}`}
                      style={styles.modalItem}
                      onPress={() => selectLocation(index)}
                    >
                      <Text style={styles.modalItemText}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  locationBar: {
    backgroundColor: colors.darkGreenGray,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  locationText: {
    color: colors.primary,
    fontFamily: 'RobotoRegular',
    fontSize: 15,
    maxWidth: '85%',
  },
  dropDownIcon: { width: 21, height: 11 },
  daysStrip: {
    backgroundColor: '#1B4210',
    minHeight: 120,
  },
  daysContent: {
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  dayPill: {
    width: 70,
    minHeight: 116,
    borderRadius: 30,
    backgroundColor: '#1B4210',
    marginHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillSelected: {
    backgroundColor: colors.lightYellow,
  },
  dayText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  dayDateText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
    lineHeight: 14,
    textAlign: 'center',
    minHeight: 30,
  },
  dayTextSelected: {
    color: colors.darkGreen,
  },
  tempIcon: {
    width: 20,
    height: 20,
    marginTop: 2,
  },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  detailsScroll: { flex: 1 },
  detailsContainer: { flexGrow: 1, paddingBottom: 0 },
  hero: {
    flexGrow: 1,
    minHeight: 460,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heroImage: { resizeMode: 'cover' },
  noDataWrap: {
    flexGrow: 1,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#1B4210',
  },
  heroDate: {
    color: '#024764',
    fontFamily: 'RobotoRegular',
    fontSize: 17,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#024764',
    marginTop: 6,
    marginBottom: 10,
  },
  heroType: {
    color: '#024764',
    fontFamily: 'RobotoMedium',
    fontSize: 19,
    marginLeft: 10,
    marginBottom: 10,
  },
  metricRow: {
    marginTop: 20,
  },
  metricGridRow: {
    marginTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricHalf: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  metricIcon: {
    width: 25,
    height: 25,
    marginRight: 8,
  },
  metricLabel: {
    color: '#024764',
    fontFamily: 'RobotoRegular',
    fontSize: 17,
  },
  metricValue: {
    color: '#024764',
    fontFamily: 'RobotoMedium',
    fontSize: 17,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 13,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000055',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    maxHeight: '70%',
  },
  modalItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalItemText: {
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 15,
  },
});
