import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
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

const pickList = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const keys = [
    'objWeatherForecastList',
    'ObjWeatherForecastList',
    'weathercollection',
    'Weathercollection',
    'weatherCollection',
    'WeatherCollection',
    'result',
    'data',
  ];

  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key];
  }
  return [];
};

export const PastWeatherScreen = () => {
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

  const locationLabel = useMemo(() => {
    if (!selectedLocation) return 'Select location';
    const district = pickText(selectedLocation.districtName, selectedLocation.DistrictName, '');
    const block = pickText(selectedLocation.blockName, selectedLocation.BlockName, selectedLocation.asdName, selectedLocation.AsdName, '');
    return block !== '-' ? `${district} - ${block}` : district;
  }, [selectedLocation]);

  const loadLocations = async () => {
    if (!userId) return;
    const payload = buildByLocationPayload(userId, languageLabel);
    const response = await weatherService.getByLocation(payload);
    const list = parseLocationWeatherList(response) as DashboardLocation[];
    setLocations(list);
    setAppLocations(list);
    if (list.length) {
      const selectedIndex = selectedLocationRef
        ? list.findIndex((loc: any) => {
            const districtID = pickNum(loc.districtID, loc.DistrictID);
            const blockID = pickNum(loc.blockID, loc.BlockID);
            const asdID = pickNum(loc.asdID, loc.AsdID);
            return (
              districtID === selectedLocationRef.districtID &&
              blockID === selectedLocationRef.blockID &&
              asdID === selectedLocationRef.asdID
            );
          })
        : -1;
      const indexToUse = selectedIndex >= 0 ? selectedIndex : 0;
      const target = list[indexToUse] as any;
      setSelectedLocationIndex(indexToUse);
      setSelectedLocation({
        districtID: pickNum(target.districtID, target.DistrictID),
        blockID: pickNum(target.blockID, target.BlockID),
        asdID: pickNum(target.asdID, target.AsdID),
      });
      await loadWeatherForLocation(target);
    } else {
      setDays([]);
    }
  };

  const loadWeatherForLocation = async (location: any) => {
    setLoading(true);
    try {
      const stateID = pickNum(location.stateID, location.StateID);
      const districtID = pickNum(location.districtID, location.DistrictID);
      const blockID = pickNum(location.blockID, location.BlockID);
      const asdID = pickNum(location.asdID, location.AsdID);

      const payload: Record<string, unknown> = {
        StateID: stateID,
        DistrictID: districtID,
        LanguageType: languageLabel,
        languageType: languageLabel,
        RefreshDateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      };

      if (stateID === 28 || stateID === 36) payload.AsdID = asdID || blockID;
      else payload.BlockID = blockID || asdID;

      const response = await weatherService.getObserved(payload);
      const list = pickList(response.result || response.data || response);
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
    setSelectedLocationIndex(index);
    setPickerOpen(false);
    setSelectedLocation({
      districtID: pickNum(location?.districtID, location?.DistrictID),
      blockID: pickNum(location?.blockID, location?.BlockID),
      asdID: pickNum(location?.asdID, location?.AsdID),
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
            keyExtractor={(_, index) => `p-day-${index}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysContent}
            renderItem={({ item, index }) => {
              const row: any = item;
              const selected = index === selectedDayIndex;
              return (
                <Pressable
                  style={[styles.dayPill, selected && styles.dayPillSelected]}
                  onPress={() => setSelectedDayIndex(index)}
                >
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]} numberOfLines={1}>{pickText(row.date, row.Date, '-')}</Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.minTemp, row.MinTemp, '-')}</Text>
                  <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{pickText(row.maxTemp, row.MaxTemp, '-')}</Text>
                  <Image source={require('../../../assets/images/ic_tempWeather.png')} style={styles.tempIcon} resizeMode="contain" />
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
              source={
                pickUri(selectedDay.cloudImage, selectedDay.CloudImage)
                  ? { uri: pickUri(selectedDay.cloudImage, selectedDay.CloudImage) }
                  : require('../../../assets/images/ic_profileMenuBG.png')
              }
              style={styles.hero}
              imageStyle={styles.heroImage}
            >
              <Text style={styles.heroDate}>{pickText(selectedDay.date, selectedDay.Date, '-')}</Text>
              <View style={styles.heroDivider} />
              <Text style={styles.heroType}>{pickText(selectedDay.weatherType, selectedDay.WeatherType, '-')}</Text>

              <View style={styles.metricRow}>
                <View style={styles.metricHalf}>
                  <Image source={require('../../../assets/images/ic_tempWeather.png')} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.metricLabel}>Temperature</Text>
                    <Text style={styles.metricValue}>
                      Min {pickText(selectedDay.minTemp, selectedDay.MinTemp, '-')} | Max {pickText(selectedDay.maxTemp, selectedDay.MaxTemp, '-')}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricGridRow}>
                <View style={styles.metricHalf}>
                  <Image source={require('../../../assets/images/ic_rainfall.png')} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.metricLabel}>Rainfall</Text>
                    <Text style={styles.metricValue}>{pickText(selectedDay.rainFall, selectedDay.RainFall, selectedDay.rainfall, selectedDay.Rainfall, '-')}</Text>
                  </View>
                </View>
                <View style={styles.metricHalf}>
                  <Image source={require('../../../assets/images/ic_windspeed.png')} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.metricLabel}>Wind Speed</Text>
                    <Text style={styles.metricValue}>{pickText(selectedDay.windSpeed, selectedDay.WindSpeed, '-')}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metricGridRow}>
                <View style={styles.metricHalf}>
                  <Image source={require('../../../assets/images/ic_humidity.png')} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.metricLabel}>Humidity</Text>
                    <Text style={styles.metricValue}>{pickText(selectedDay.humidity, selectedDay.Humidity, '-')}</Text>
                  </View>
                </View>
                <View style={styles.metricHalf}>
                  <Image source={require('../../../assets/images/ic_winddirection.png')} style={styles.metricIcon} resizeMode="contain" />
                  <View>
                    <Text style={styles.metricLabel}>Wind Direction</Text>
                    <Text style={styles.metricValue}>{pickText(selectedDay.windDirection, selectedDay.WindDirection, '-')}</Text>
                  </View>
                </View>
              </View>
            </ImageBackground>
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
    paddingVertical: 10,
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
    paddingHorizontal: 8,
  },
  dayPill: {
    width: 75,
    borderRadius: 30,
    backgroundColor: '#1B4210',
    marginHorizontal: 8,
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
    marginTop: 6,
  },
  metricGridRow: {
    marginTop: 24,
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
