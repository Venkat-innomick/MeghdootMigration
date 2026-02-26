import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { weatherService } from '../../api/services';
import { DashboardLocation, WeatherForecastItem } from '../../types/domain';
import { useAppStore } from '../../store/appStore';
import {
  buildByLocationPayload,
  getLanguageLabel,
  getUserProfileId,
  parseLocationWeatherList,
  toText as normalizeText,
} from '../../utils/locationApi';
import { useAndroidNavigationBar } from '../../hooks/useAndroidNavigationBar';

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
  clearsky_new: require('../../../assets/images/Clearsky_new.png'),
  mainly_clear: require('../../../assets/images/Mainly_Clear.png'),
  partly_cloudy: require('../../../assets/images/Partly_Cloudy.png'),
  generally_cloudy: require('../../../assets/images/generally_cloudy.png'),
  cloudy: require('../../../assets/images/Cloudy.png'),
};

const normalizeImageKey = (value: unknown) => {
  if (typeof value !== 'string' || !value.trim()) return '';
  const file = value.split('/').pop() || value;
  const noExt = file.replace(/\.[a-z0-9]+$/i, '');
  return noExt.trim().toLowerCase();
};

const resolveWeatherDate = (item: any) =>
  pickText(
    item?.Date,
    item?.date,
    item?.KisanDate_Lang,
    item?.ForeCastDate_Lang,
    item?.KisanDate,
    item?.ForeCastDate,
    item?.ForeCastDate_format,
    item?.ForeCastDate_Web,
    '-',
  );

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

const pickList = (payload: any, keys: string[]): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

const getForecastRows = (rawPayload: any) =>
  pickList(rawPayload, [
    'ObjWeatherForecastNextList',
    'objWeatherForecastNextList',
    'ObjWeatherForecastList',
    'objWeatherForecastList',
    'Weathercollection',
    'weathercollection',
    'WeatherCollection',
    'weatherCollection',
  ]);

const getLocationIds = (location: any) => ({
  // Forecast tab in old Xamarin uses Temp* ids as primary source.
  stateID: pickNum(location?.tempStateID, location?.TempStateID, location?.stateID, location?.StateID),
  districtID: pickNum(location?.tempDistrictID, location?.TempDistrictID, location?.districtID, location?.DistrictID),
  blockID: pickNum(location?.tempBlockID, location?.TempBlockID, location?.blockID, location?.BlockID),
  asdID: pickNum(location?.tempAsdID, location?.TempAsdID, location?.asdID, location?.AsdID),
});

const dedupeForecastLocations = (items: any[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const ids = getLocationIds(item);
    const key = `${ids.stateID}-${ids.districtID}-${ids.blockID}-${ids.asdID}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const ForecastScreen = () => {
  useAndroidNavigationBar(colors.darkGreen, 'light');
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const appLocations = useAppStore((s) => s.locations);
  const setAppLocations = useAppStore((s) => s.setLocations);
  const selectedLocationRef = useAppStore((s) => s.selectedLocation);
  const setSelectedLocation = useAppStore((s) => s.setSelectedLocation);
  const userId = getUserProfileId(user);
  const languageLabel = getLanguageLabel(language);

  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locations, setLocations] = useState<DashboardLocation[]>([]);
  const [selectedLocationIndex, setSelectedLocationIndex] = useState(0);
  const [days, setDays] = useState<WeatherForecastItem[]>([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);

  const selectedLocation = locations[selectedLocationIndex] as any;
  const selectedDay = (days[selectedDayIndex] || {}) as any;
  const heroTextColor = useMemo(
    () => pickColor(selectedDay.textColor, selectedDay.TextColor),
    [selectedDay],
  );

  const locationLabel = useMemo(() => {
    if (!selectedLocation) return 'Select location';
    const ids = getLocationIds(selectedLocation);
    const stateID = ids.stateID;
    const district = pickText(selectedLocation.districtName, selectedLocation.DistrictName, selectedLocation.tempDistrictName, selectedLocation.TempDistrictName, '');
    const block = pickText(selectedLocation.blockName, selectedLocation.BlockName, selectedLocation.tempBlockName, selectedLocation.TempBlockName, '');
    const asd = pickText(selectedLocation.asdName, selectedLocation.AsdName, selectedLocation.tempAsdName, selectedLocation.TempAsdName, '');
    const location = block !== '-' ? block : asd;
    if (location && location !== '-') return `${location} (${stateID === 28 || stateID === 36 ? 'ASD' : 'Block'})`;
    return `${district} (District)`;
  }, [selectedLocation]);

  const metricIcons = useMemo(() => {
    const getIcon = (nameValue: any, fallback: ImageSourcePropType) => {
      const key = normalizeImageKey(nameValue);
      return localImageMap[key] || fallback;
    };
    return {
      temp: getIcon(selectedDay.tempImage || selectedDay.TempImage, require('../../../assets/images/ic_tempWeather.png')),
      rainfall: getIcon(selectedDay.rainFallImage || selectedDay.rainfallImage || selectedDay.RainFallImage, require('../../../assets/images/ic_rainfall.png')),
      humidity: getIcon(selectedDay.humidityImage || selectedDay.HumidityImage, require('../../../assets/images/ic_humidity.png')),
      windSpeed: getIcon(selectedDay.windSpeedImage || selectedDay.WindSpeedImage, require('../../../assets/images/ic_windspeed.png')),
      windDirection: getIcon(selectedDay.windDirectionImage || selectedDay.WindDirectionImage, require('../../../assets/images/ic_winddirection.png')),
    };
  }, [selectedDay]);

  const heroBackgroundSource = useMemo(() => {
    const cloudUri = pickUri(selectedDay.cloudImage, selectedDay.CloudImage);
    if (cloudUri) return { uri: cloudUri };
    const key = normalizeImageKey(selectedDay.cloudImage || selectedDay.CloudImage);
    return weatherBgImageMap[key] || require('../../../assets/images/Clearsky_new.png');
  }, [selectedDay]);

  const loadLocations = async () => {
    if (!userId) return;
    const payload = buildByLocationPayload(userId, languageLabel);
    const response = await weatherService.getByLocation(payload);
    const rawList = parseLocationWeatherList(response) as DashboardLocation[];
    const list = dedupeForecastLocations(rawList as any[]) as DashboardLocation[];
    setLocations(list);
    setAppLocations(list);
    if (list.length) {
      const selectedIndex = selectedLocationRef
        ? list.findIndex((loc: any) => {
            const ids = getLocationIds(loc);
            const districtID = ids.districtID;
            const blockID = ids.blockID;
            const asdID = ids.asdID;
            return (
              districtID === selectedLocationRef.districtID &&
              blockID === selectedLocationRef.blockID &&
              asdID === selectedLocationRef.asdID
            );
          })
        : -1;
      const indexToUse = selectedIndex >= 0 ? selectedIndex : 0;
      const target = list[indexToUse] as any;
      const ids = getLocationIds(target);
      setSelectedLocationIndex(indexToUse);
      setSelectedLocation({
        districtID: ids.districtID,
        blockID: ids.blockID,
        asdID: ids.asdID,
      });
      await loadWeatherForLocation(target);
    } else {
      setDays([]);
    }
  };

  const loadWeatherForLocation = async (location: any) => {
    setLoading(true);
    try {
      const ids = getLocationIds(location);
      const stateID = ids.stateID;
      const districtID = ids.districtID;
      const blockID = ids.blockID;
      const asdID = ids.asdID;

      const payload: Record<string, unknown> = {
        StateID: stateID,
        DistrictID: districtID,
        LanguageType: languageLabel,
        languageType: languageLabel,
        RefreshDateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      if (stateID === 28 || stateID === 36) payload.AsdID = asdID || blockID;
      else payload.BlockID = blockID || asdID;

      const response = await weatherService.getForecast(payload);
      const rawPayload = response.result || response.data || response;
      const list = getForecastRows(rawPayload).map(normalizeWeatherItem);
      setDays(list as WeatherForecastItem[]);
      setSelectedDayIndex(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (appLocations?.length) {
      setLocations(appLocations as DashboardLocation[]);
    }
    loadLocations();
  }, [languageLabel, userId]);

  useFocusEffect(
    React.useCallback(() => {
      loadLocations();
    }, [languageLabel, userId]),
  );

  const selectLocation = async (index: number) => {
    const location = locations[index] as any;
    const ids = getLocationIds(location);
    setSelectedLocationIndex(index);
    setPickerOpen(false);
    setSelectedLocation({
      districtID: ids.districtID,
      blockID: ids.blockID,
      asdID: ids.asdID,
    });
    await loadWeatherForLocation(location);
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Pressable style={styles.locationBar} onPress={() => setPickerOpen(true)}>
          <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
          <Image source={require('../../../assets/images/dropdown.png')} style={styles.dropDownIcon} resizeMode="contain" />
        </Pressable>

        <View style={styles.daysStrip}>
          <FlatList
            data={days}
            horizontal
            keyExtractor={(item: any, index) => `f-day-${pickText(item.WeatherForecastID, item.weatherForecastID, item.Date, index)}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysContent}
            renderItem={({ item, index }) => {
              const row: any = item;
              const selected = index === selectedDayIndex;
              const dayDate = resolveWeatherDate(row);
              return (
                <Pressable
                  style={[styles.dayPill, selected && styles.dayPillSelected]}
                  onPress={() => setSelectedDayIndex(index)}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]} numberOfLines={1}>{dayDate}</Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.minTemp, row.MinTemp, '-')}</Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.maxTemp, row.MaxTemp, '-')}</Text>
                  <Image source={metricIcons.temp} style={styles.tempIcon} resizeMode="contain" />
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
          <ScrollView contentContainerStyle={styles.detailsContainer}>
            <ImageBackground
              source={heroBackgroundSource}
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <Text style={[styles.heroDate, { color: heroTextColor }]}>{pickText(selectedDay.date, selectedDay.Date, '-')}</Text>
              <View style={[styles.heroDivider, { backgroundColor: heroTextColor }]} />
              <Text style={[styles.heroType, { color: heroTextColor }]}>{pickText(selectedDay.weatherType, selectedDay.WeatherType, '-')}</Text>

              <View style={styles.metricRow}>
                <View style={styles.metricHalf}>
                  <Image source={metricIcons.temp} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={[styles.metricLabel, { color: heroTextColor }]}>Temperature</Text>
                    <Text style={[styles.metricValue, { color: heroTextColor }]}>
                      Min {pickText(selectedDay.minTempDegree, selectedDay.MinTempDegree, selectedDay.MinTemp, '-')} | Max {pickText(selectedDay.maxTempDegree, selectedDay.MaxTempDegree, selectedDay.MaxTemp, '-')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricGridRow}>
                <View style={styles.metricHalf}>
                  <Image source={metricIcons.rainfall} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={[styles.metricLabel, { color: heroTextColor }]}>Rainfall</Text>
                    <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.rainFall, selectedDay.RainFall, selectedDay.rainfall, selectedDay.Rainfall, '-')}</Text>
                  </View>
                </View>
                <View style={styles.metricHalf}>
                  <Image source={metricIcons.windSpeed} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={[styles.metricLabel, { color: heroTextColor }]}>Wind Speed</Text>
                    <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.windSpeed, selectedDay.WindSpeed, '-')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricGridRow}>
                <View style={styles.metricHalf}>
                  <Image source={metricIcons.humidity} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={[styles.metricLabel, { color: heroTextColor }]}>Humidity</Text>
                    <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.humidity, selectedDay.Humidity, '-')}</Text>
                  </View>
                </View>
                <View style={styles.metricHalf}>
                  <Image
                    source={metricIcons.windDirection}
                    style={[styles.metricIcon, { transform: [{ rotate: `${pickNum(selectedDay.windDirectionAngle, selectedDay.WindDirectionAngle)}deg` }] }]}
                    resizeMode="contain"
                  />
                  <View>
                    <Text style={[styles.metricLabel, { color: heroTextColor }]}>Wind Direction</Text>
                    <Text style={[styles.metricValue, { color: heroTextColor }]}>{pickText(selectedDay.windDirection, selectedDay.WindDirection, '-')}</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
            {!days.length ? (
              <Text style={styles.emptyText}>No data currently available.</Text>
            ) : null}
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
    fontSize: 14,
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
    width: 55,
    minHeight: 110,
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
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
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
  detailsContainer: { paddingBottom: 20 },
  hero: {
    minHeight: 460,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  heroImage: { resizeMode: 'cover' },
  heroDate: {
    color: '#024764',
    fontFamily: 'RobotoRegular',
    fontSize: 16,
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
    fontSize: 18,
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
    fontSize: 16,
  },
  metricValue: {
    color: '#024764',
    fontFamily: 'RobotoMedium',
    fontSize: 16,
    marginTop: 2,
  },
  emptyText: {
    marginTop: 14,
    textAlign: 'center',
    color: colors.muted,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
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
    fontSize: 14,
  },
});
