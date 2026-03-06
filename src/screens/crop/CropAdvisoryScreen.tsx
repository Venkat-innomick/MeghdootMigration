import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import Constants from 'expo-constants';
import { Screen } from '../../components/Screen';
import { colors } from '../../theme/colors';
import { cropService } from '../../api/services';
import { useAppStore } from '../../store/appStore';
import { getLanguageLabel, getUserProfileId } from '../../utils/locationApi';
import { API_REFRESH_DATES } from '../../utils/apiDates';
import { API_BASE_URL } from '../../constants/api';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
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
    if (typeof value !== 'string' || !value.trim()) continue;
    const raw = value.trim();
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://')) {
      return raw;
    }
    if (!raw.includes('://')) {
      const base = (
        (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ||
        API_BASE_URL
      ).replace(/\/+$/, '');
      return `${base}/${raw.replace(/^\/+/, '')}`;
    }
  }
  return '';
};

const pickList = (payload: any, keys: string[]) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

type AdvisorySectionProps = {
  title: string;
  open: boolean;
  onToggle: () => void;
  content: string;
};

const AdvisorySection = ({ title, open, onToggle, content }: AdvisorySectionProps) => {
  return (
    <View style={styles.sectionWrap}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Image
          source={require('../../../assets/images/ic_uparrow.png')}
          style={[styles.sectionArrow, { transform: [{ rotate: open ? '180deg' : '0deg' }] }]}
          resizeMode="contain"
        />
      </Pressable>
      {open ? <Text style={styles.sectionBody}>{content || '--'}</Text> : null}
    </View>
  );
};

export const CropAdvisoryScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const user = useAppStore((s) => s.user);
  const language = useAppStore((s) => s.language);
  const languageLabel = useMemo(() => getLanguageLabel(language), [language]);
  const requestedAdvisoryId = pickNum(route?.params?.advisoryId, route?.params?.CropAdvisoryID);
  const requestedCropId = pickNum(route?.params?.cropId, route?.params?.CropID);
  const requestedCropCategoryId = pickNum(route?.params?.cropCategoryId, route?.params?.CropCategoryID);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [images, setImages] = useState<any[]>([]);
  const [audios, setAudios] = useState<any[]>([]);
  const [isEnglish, setIsEnglish] = useState(true);
  const [favouriteBusy, setFavouriteBusy] = useState(false);

  const [weatherOpen, setWeatherOpen] = useState(true);
  const [agroOpen, setAgroOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [recommendationOpen, setRecommendationOpen] = useState(true);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);

  const current = items[index] || {};

  const advisoryId = useMemo(
    () => pickNum(current.cropAdvisoryID, current.CropAdvisoryID),
    [current]
  );

  const userProfileId = useMemo(
    () => getUserProfileId(user),
    [user]
  );

  const isFavourite = useMemo(
    () => pickNum(current.favouriteID, current.FavouriteID) > 0,
    [current]
  );
  const feedbackId = useMemo(
    () => pickNum(current.feedbackID, current.FeedbackID),
    [current]
  );
  const avgFeedback = useMemo(
    () => pickNum(current.avgFeedback, current.AvgFeedback),
    [current]
  );

  const weatherText = isEnglish
    ? pickText(current.weatherCondition, current.WeatherCondition, '--')
    : pickText(current.weatherConditionRegional, current.WeatherConditionRegional, current.weatherCondition, current.WeatherCondition, '--');

  const agroText = isEnglish
    ? pickText(current.agroAdvisoryDetails, current.AgroAdvisoryDetails, '--')
    : pickText(current.agroAdvisoryDetailsRegional, current.AgroAdvisoryDetailsRegional, current.agroAdvisoryDetails, current.AgroAdvisoryDetails, '--');

  const briefText = isEnglish
    ? pickText(current.briefText, current.BriefText, '--')
    : pickText(current.briefTextRegional, current.BriefTextRegional, current.briefText, current.BriefText, '--');

  const recommendationText = isEnglish
    ? pickText(current.recommendations, current.Recommendations, '--')
    : pickText(current.recommendationsRegional, current.RecommendationsRegional, current.recommendations, current.Recommendations, '--');

  const hasWeatherSection = !!pickText(current.weatherCondition, current.WeatherCondition);
  const hasRecommendationSection = !!pickText(current.recommendations, current.Recommendations);
  // Old Xamarin screen keeps agro section hidden in Crop Advisory view.
  const hasAgroSection = false;
  const recommendationTitle = pickText(current.title, current.Title)
    ? `Advisory - ${pickText(current.title, current.Title)}`
    : 'Advisory';

  const loadAdvisories = async () => {
    if (!userProfileId) return;
    const activeId = advisoryId;
    setLoading(true);
    try {
      const response = requestedCropId
        ? await cropService.getAdvisoryFavouriteRatingList({
            Id: userProfileId,
            LanguageType: languageLabel,
            Type: 'Farmer',
            CropID: requestedCropId,
            RefreshDateTime: API_REFRESH_DATES.current(),
          })
        : await cropService.getAdvisoryTop({
            Id: userProfileId,
            LanguageType: languageLabel,
            Type: 'Farmer',
            RefreshDateTime: API_REFRESH_DATES.current(),
          });
      const base = response?.result || response?.data || response;
      const list = pickList(base, [
        'objCropAdvisoryDetailsList',
        'ObjCropAdvisoryDetailsList',
        'objCropAdvisoryTopList',
        'ObjCropAdvisoryTopList',
        'objCropAdvisoryFavouriteRatingList',
        'ObjCropAdvisoryFavouriteRatingList',
      ]) as any[];
      setItems(list);
      if (list.length) {
        const matchedByAdvisory = requestedAdvisoryId
          ? list.findIndex(
              (item) => pickNum(item.cropAdvisoryID, item.CropAdvisoryID) === requestedAdvisoryId
            )
          : -1;
        const matchedByCrop = matchedByAdvisory >= 0
          ? -1
          : requestedCropId
          ? list.findIndex(
              (item) => pickNum(item.cropID, item.CropID) === requestedCropId
            )
          : requestedCropCategoryId
            ? list.findIndex(
                (item) =>
                  pickNum(item.cropCategoryID, item.CropCategoryID) ===
                  requestedCropCategoryId
              )
            : -1;
        const matchedIndex = matchedByAdvisory >= 0
          ? matchedByAdvisory
          : matchedByCrop >= 0
            ? matchedByCrop
          : activeId
            ? list.findIndex((item) => pickNum(item.cropAdvisoryID, item.CropAdvisoryID) === activeId)
            : -1;
        setIndex(matchedIndex >= 0 ? matchedIndex : 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAttachments = async (cropId: number) => {
    if (!cropId) {
      setImages([]);
      setAudios([]);
      return;
    }

    const commonPayload = {
      CropAdvisoryID: cropId,
      LanguageType: languageLabel,
      RefreshDateTime: API_REFRESH_DATES.attachments,
    };

    const [imgRes, audRes] = await Promise.all([
      cropService.getAdvisoryAttachments({ ...commonPayload, Type: 'Image' }),
      cropService.getAdvisoryAttachments({ ...commonPayload, Type: 'Audio' }),
    ]);

    const imageList = pickList(imgRes.result || imgRes.data || imgRes, ['objCropAdvisoryImageList', 'ObjCropAdvisoryImageList']);
    const audioList = pickList(audRes.result || audRes.data || audRes, ['objCropAdvisoryImageList', 'ObjCropAdvisoryImageList']);

    setImages(imageList);
    setAudios(audioList);
  };

  useFocusEffect(
    useCallback(() => {
      loadAdvisories();
    }, [userProfileId, languageLabel, requestedAdvisoryId, requestedCropCategoryId, requestedCropId])
  );

  useEffect(() => {
    if (advisoryId) {
      loadAttachments(advisoryId).catch(() => {
        setImages([]);
        setAudios([]);
      });
    }
  }, [advisoryId, languageLabel]);

  const toggleFavourite = async () => {
    if (!advisoryId || !userProfileId || isFavourite || favouriteBusy) return;
    Alert.alert('', 'Add to favourites?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          const payload = {
            CAFLID: 0,
            CropAdvisoryID: advisoryId,
            UserProfileID: userProfileId,
            Createdby: userProfileId,
            Updatedby: userProfileId,
          };

          try {
            setFavouriteBusy(true);
            const response: any = await cropService.toggleFavourite(payload);
            const success =
              response?.isSuccessful ??
              response?.IsSuccessful ??
              response?.result?.isSuccessful ??
              response?.result?.IsSuccessful;
            if (success !== true) return;

            setItems((prev) =>
              prev.map((item, i) => {
                if (i !== index) return item;
                return {
                  ...item,
                  favouriteID: 1,
                  FavouriteID: 1,
                };
              })
            );
            if (Platform.OS === 'android') {
              ToastAndroid.show('Added to favourites', ToastAndroid.SHORT);
            }
          } catch {
            // no-op: keep UX identical to old app (silent on some failures)
          } finally {
            setFavouriteBusy(false);
          }
        },
      },
    ]);
  };

  const shareCurrent = async () => {
    const stateID = pickNum(current.stateID, current.StateID);
    const districtID = pickNum(current.districtID, current.DistrictID);
    const blockID = pickNum(current.blockID, current.BlockID);
    const asdID = pickNum(current.asdID, current.AsdID);
    if (!stateID || !districtID) return;
    const isAsdState = stateID === 28 || stateID === 36;
    const levelPart = isAsdState ? `ASDID=${asdID}` : `BlockID=${blockID}`;
    const shareUrl = `https://www.tropmet.res.in/StateID=${stateID}/DistrictID=${districtID}/${levelPart}`;

    await Share.share({
      title: 'MEGHDOOT',
      message: `Checkout Meghdoot Crop Advisory\n${shareUrl}`,
      url: shareUrl,
    });
  };

  const openUrl = async (url: string) => {
    if (!url) return;
    const can = await Linking.canOpenURL(url);
    if (can) {
      await Linking.openURL(url);
    }
  };

  const openFeedback = () => {
    if (!advisoryId || !userProfileId) return;
    navigation.navigate('CropFeedback', {
      advisoryId,
      userProfileId,
      feedbackId,
      avgFeedback,
    });
  };

  const openAudioPopup = (audioUrl: string) => {
    navigation.navigate('CropAudioPlayer', {
      audioUrl,
      title: pickText(current.title, current.Title, 'Audio'),
      imageUrl: pickUri(current.cropImageURL, current.CropImageURL),
    });
  };

  const openImagePreview = (imageUrl: string) => {
    navigation.navigate('CropImagePreview', { imageUrl });
  };

  const prevEnabled = index > 0;
  const nextEnabled = index < items.length - 1;
  const hasAttachments = images.length > 0 || audios.length > 0;
  const categoryIcon = pickUri(current.cCropImg, current.CCropImg);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!items.length) {
    return (
      <Screen>
        <View style={styles.loaderWrap}>
          <Text style={styles.emptyText}>No data currently available.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.heroWrap}>
          <Image
            source={
              pickUri(current.cropImageURL, current.CropImageURL)
                ? { uri: pickUri(current.cropImageURL, current.CropImageURL) }
                : require('../../../assets/images/defult_crop_plane.png')
            }
            style={styles.heroImage}
            resizeMode="cover"
          />

          <View style={styles.heroActions}>
            {pickText(current.youTubeLink, current.YouTubeLink) ? (
              <Pressable style={styles.actionItem} onPress={() => openUrl(pickText(current.youTubeLink, current.YouTubeLink))}>
                <Image source={require('../../../assets/images/ic_video.png')} style={styles.actionIcon} resizeMode="contain" />
                <Text style={styles.actionText}>Video</Text>
              </Pressable>
            ) : null}

            {audios.length ? (
              <Pressable
                style={styles.actionItem}
                onPress={() =>
                  openAudioPopup(
                    pickUri(
                      audios[0]?.imagePath,
                      audios[0]?.ImagePath,
                      audios[0]?.audioPath,
                      audios[0]?.AudioPath
                    ) ||
                      pickText(
                        audios[0]?.imagePath,
                        audios[0]?.ImagePath,
                        audios[0]?.audioPath,
                        audios[0]?.AudioPath
                      )
                  )
                }
              >
                <Image source={require('../../../assets/images/ic_audio.png')} style={styles.actionIcon} resizeMode="contain" />
                <Text style={styles.actionText}>Audio</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.actionItem} onPress={toggleFavourite}>
              <Image
                source={isFavourite ? require('../../../assets/images/ic_save.png') : require('../../../assets/images/ic_favSaveCrop.png')}
                style={styles.actionIcon}
                resizeMode="contain"
              />
              <Text style={styles.actionText}>{favouriteBusy ? 'Saving...' : isFavourite ? 'Added Fav' : 'Add Fav'}</Text>
            </Pressable>

            <Pressable style={styles.actionItem} onPress={shareCurrent}>
              <View style={styles.shareIconWrap}>
                <Image source={require('../../../assets/images/share_wh.png')} style={styles.shareIconGlyph} resizeMode="contain" />
              </View>
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.detailWrap}>
          <Text style={styles.title}>{pickText(current.title, current.Title, 'Advisory')}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Image source={require('../../../assets/images/ic_map.png')} style={styles.metaIcon} resizeMode="contain" />
              <Text style={styles.metaText}>{pickText(current.location, current.Location, '-')}</Text>
            </View>
            <View style={styles.metaItem}>
              <Image
                source={categoryIcon ? { uri: categoryIcon } : require('../../../assets/images/ic_crop.png')}
                style={styles.metaIcon}
                resizeMode="contain"
              />
              <Text style={styles.metaText}>{pickText(current.category, current.Category, current.cropCategoryName, current.CropCategoryName, '-')}</Text>
            </View>
            <Text style={styles.metaDate}>{pickText(current.createdDate, current.CreatedDate, '-')}</Text>
          </View>

          <Text style={styles.periodText}>
            Period: {pickText(current.periodStartDate, current.PeriodStartDate, '-')} to {pickText(current.periodEndDate, current.PeriodEndDate, '-')}
          </Text>
          <Text style={styles.periodText}>Variety: {pickText(current.varietyName, current.VarietyName, '--')}</Text>
          <Pressable onPress={openFeedback}>
            <Text style={styles.feedbackLink}>Feedback Rating</Text>
          </Pressable>

          <View style={styles.langToggleRow}>
            <Pressable style={[styles.langBtn, isEnglish && styles.langBtnActive]} onPress={() => setIsEnglish(true)}>
              <Text style={[styles.langBtnText, isEnglish && styles.langBtnTextActive]}>English</Text>
            </Pressable>
            <Pressable style={[styles.langBtn, !isEnglish && styles.langBtnActive]} onPress={() => setIsEnglish(false)}>
              <Text style={[styles.langBtnText, !isEnglish && styles.langBtnTextActive]}>Regional</Text>
            </Pressable>
          </View>
        </View>

        {hasWeatherSection ? (
          <AdvisorySection title="Weather Condition" open={weatherOpen} onToggle={() => setWeatherOpen((v) => !v)} content={weatherText} />
        ) : null}
        {hasAgroSection ? (
          <AdvisorySection title="Agro Advisory" open={agroOpen} onToggle={() => setAgroOpen((v) => !v)} content={agroText} />
        ) : null}
        <AdvisorySection title="SMS Text" open={smsOpen} onToggle={() => setSmsOpen((v) => !v)} content={briefText} />
        {hasRecommendationSection ? (
          <AdvisorySection title={recommendationTitle} open={recommendationOpen} onToggle={() => setRecommendationOpen((v) => !v)} content={recommendationText} />
        ) : null}

        {hasAttachments ? (
          <View style={styles.sectionWrap}>
            <Pressable style={styles.sectionHeader} onPress={() => setAttachmentsOpen((v) => !v)}>
              <Text style={styles.sectionTitle}>Attachments</Text>
              <Image
                source={require('../../../assets/images/ic_uparrow.png')}
                style={[styles.sectionArrow, { transform: [{ rotate: attachmentsOpen ? '180deg' : '0deg' }] }]}
                resizeMode="contain"
              />
            </Pressable>
            {attachmentsOpen ? (
              <>
                {images.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachRow}>
                    {images.map((item, i) => (
                      <Pressable
                        key={`img-${i}`}
                        onPress={() => openImagePreview(pickUri(item.imagePath, item.ImagePath, item.localFilePath, item.LocalFilePath))}
                      >
                        <Image
                          source={
                            pickUri(item.imagePath, item.ImagePath, item.localFilePath, item.LocalFilePath)
                              ? { uri: pickUri(item.imagePath, item.ImagePath, item.localFilePath, item.LocalFilePath) }
                              : require('../../../assets/images/defult_crop_plane.png')
                          }
                          style={styles.attachImage}
                          resizeMode="cover"
                        />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}

                {audios.length ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.attachRow}>
                    {audios.map((item, i) => (
                      <Pressable
                        key={`aud-${i}`}
                        style={styles.audioTile}
                        onPress={() =>
                          openAudioPopup(
                            pickUri(item.imagePath, item.ImagePath, item.audioPath, item.AudioPath) ||
                              pickText(item.imagePath, item.ImagePath, item.audioPath, item.AudioPath)
                          )
                        }
                      >
                        <Image source={require('../../../assets/images/speaker.png')} style={styles.audioIcon} resizeMode="contain" />
                      </Pressable>
                    ))}
                  </ScrollView>
                ) : null}
              </>
            ) : null}
          </View>
        ) : null}

        {items.length > 1 ? (
          <View style={styles.navArrowsRow}>
            {prevEnabled ? (
              <Pressable onPress={() => setIndex((v) => Math.max(0, v - 1))}>
                <Image
                  source={require('../../../assets/images/next_arrow.png')}
                  style={[styles.navArrow, { transform: [{ rotate: '180deg' }] }]}
                  resizeMode="contain"
                />
              </Pressable>
            ) : (
              <View />
            )}
            {nextEnabled ? (
              <Pressable onPress={() => setIndex((v) => Math.min(items.length - 1, v + 1))}>
                <Image
                  source={require('../../../assets/images/next_arrow.png')}
                  style={styles.navArrow}
                  resizeMode="contain"
                />
              </Pressable>
            ) : (
              <View />
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 24,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#999',
    fontFamily: 'RobotoRegular',
    fontSize: 16,
  },
  heroWrap: {
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: 150,
  },
  heroActions: {
    position: 'absolute',
    right: 10,
    bottom: -26,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  actionItem: {
    alignItems: 'center',
    marginLeft: 6,
    width: 62,
  },
  actionIcon: {
    width: 50,
    height: 50,
  },
  shareIconWrap: {
    width: 45,
    height: 45,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  shareIconGlyph: {
    width: 35,
    height: 35,
    tintColor: colors.darkGreen,
  },
  actionText: {
    marginTop: 2,
    color: '#6F6F6F',
    fontFamily: 'RobotoRegular',
    fontSize: 12,
    textAlign: 'center',
  },
  detailWrap: {
    marginTop: 32,
    paddingHorizontal: 15,
  },
  title: {
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
    fontSize: 18,
  },
  metaRow: {
    marginTop: 6,
    marginRight: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '35%',
  },
  metaIcon: {
    width: 15,
    height: 15,
    marginRight: 2,
  },
  metaText: {
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  metaDate: {
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  periodText: {
    marginTop: 6,
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  feedbackLink: {
    marginTop: 8,
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 12,
    textDecorationLine: 'underline',
    alignSelf: 'flex-start',
  },
  langToggleRow: {
    marginTop: 10,
    flexDirection: 'row',
    height: 40,
  },
  langBtn: {
    borderWidth: 0.5,
    borderColor: colors.darkGreen,
    borderRadius: 20,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#fff',
  },
  langBtnActive: {
    backgroundColor: colors.darkGreen,
  },
  langBtnText: {
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
  },
  langBtnTextActive: {
    color: '#fff',
  },
  sectionWrap: {
    marginTop: 15,
  },
  sectionHeader: {
    backgroundColor: '#E5E5E5',
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#024764',
    fontFamily: 'RobotoRegular',
    fontSize: 16,
  },
  sectionArrow: {
    width: 30,
    height: 30,
  },
  sectionBody: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    lineHeight: 24,
  },
  attachRow: {
    paddingHorizontal: 15,
    paddingTop: 8,
    paddingBottom: 4,
  },
  attachImage: {
    width: 120,
    height: 80,
    marginRight: 8,
    borderRadius: 4,
  },
  audioTile: {
    width: 80,
    height: 60,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  audioIcon: {
    width: 38,
    height: 38,
  },
  navArrowsRow: {
    marginTop: 12,
    marginHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navArrow: {
    width: 45,
    height: 46,
  },
});
