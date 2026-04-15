import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { cropService } from '../../api/services';
import { useTranslation } from 'react-i18next';

const pickNum = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) return Number(value);
  }
  return 0;
};

type Props = NativeStackScreenProps<RootStackParamList, 'CropFeedback'>;

type RatingKey = 1 | 3 | 4 | 5;

const RATING_OPTIONS: Array<{
  key: RatingKey;
  labelKey: string;
  blank: any;
  selected: any;
}> = [
  {
    key: 1,
    labelKey: 'crop.ratingPoor',
    blank: require('../../../assets/images/ic_poor.png'),
    selected: require('../../../assets/images/ic_selectpoor.png'),
  },
  {
    key: 3,
    labelKey: 'crop.ratingGood',
    blank: require('../../../assets/images/ic_good.png'),
    selected: require('../../../assets/images/ic_selectgood.png'),
  },
  {
    key: 4,
    labelKey: 'crop.ratingVeryGood',
    blank: require('../../../assets/images/ic_verygood.png'),
    selected: require('../../../assets/images/ic_selectverygood.png'),
  },
  {
    key: 5,
    labelKey: 'crop.ratingExcellent',
    blank: require('../../../assets/images/ic_excellent.png'),
    selected: require('../../../assets/images/ic_selectExcellent.png'),
  },
];

export const CropFeedbackScreen = ({ navigation, route }: Props) => {
  const { t } = useTranslation();
  const {
    advisoryId,
    userProfileId,
    feedbackId = 0,
    userRating = 0,
    onSubmitted,
  } = route.params;

  const alreadySubmitted = feedbackId > 0;
  const initialRating = pickNum(userRating);

  const [rating, setRating] = useState<number>(initialRating);
  const [comments, setComments] = useState('');
  const [weather, setWeather] = useState('');
  const [advisory, setAdvisory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedValue = useMemo(() => {
    if (!rating) return 0;
    if (rating <= 1) return 1;
    if (rating <= 2) return 2;
    if (rating <= 3) return 3;
    if (rating <= 4) return 4;
    return 5;
  }, [rating]);

  const submit = () => {
    if (!selectedValue) {
      Alert.alert('', t('crop.selectRatingPrompt'), [
        { text: t('common.ok') },
      ]);
      return;
    }

    Alert.alert('', t('crop.submitFeedbackPrompt'), [
      { text: t('crop.no'), style: 'cancel' },
      {
        text: t('crop.yes'),
        onPress: async () => {
          try {
            setSubmitting(true);
            const payload: Record<string, unknown> = {
              FeedbackID: 0,
              CropAdvisoryID: advisoryId,
              UserProfileID: userProfileId,
              Rating: selectedValue,
              Createdby: userProfileId,
              Updatedby: userProfileId,
            };

            if (selectedValue <= 3) {
              payload.Q1 = weather.trim();
              payload.Q2 = advisory.trim();
              payload.Comments = comments.trim();
            }

            const response = await cropService.saveFeedback(payload);
            if (response?.isSuccessful === false) {
              Alert.alert('', String(response?.errorMessage || t('crop.failedToSaveFeedback')), [
                { text: t('common.ok') },
              ]);
              return;
            }

            const responseAny = response as any;
            const savedFeedbackId = pickNum(
              responseAny?.NewID,
              responseAny?.newID,
              responseAny?.result?.NewID,
              responseAny?.result?.newID,
            );
            onSubmitted?.({
              feedbackId: savedFeedbackId || feedbackId || 1,
              userRating: selectedValue,
            });

            Alert.alert('', t('crop.feedbackSubmittedSuccessfully'), [
              {
                text: t('common.ok'),
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch {
            Alert.alert('', t('crop.failedToSaveFeedback'), [
              { text: t('common.ok') },
            ]);
          } finally {
            setSubmitting(false);
          }
        },
      },
    ]);
  };

  const renderRating = (readOnly: boolean) => (
    <View style={styles.ratingRow}>
      {RATING_OPTIONS.map((option) => {
        const selected = selectedValue === option.key;
        return (
          <Pressable
            key={option.key}
            style={styles.ratingItem}
            disabled={readOnly}
            onPress={() => setRating(option.key)}
          >
            <Image source={selected ? option.selected : option.blank} style={styles.ratingIcon} resizeMode="contain" />
            <Text style={[styles.ratingLabel, selected && styles.ratingLabelActive]}>{t(option.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('crop.rateYourExperience')}</Text>
        <Text style={styles.subtitle}>{t('crop.satisfiedWithAdvisory')}</Text>

        {alreadySubmitted ? (
          <View style={styles.readOnlyBox}>{renderRating(true)}</View>
        ) : (
          <>
            {renderRating(false)}

            {selectedValue ? (
              <View style={styles.formWrap}>
                <Text style={styles.groupTitle}>{t('crop.whatCanBeImproved')}</Text>

                <Text style={styles.fieldLabel}>{t('crop.overall')}</Text>
                <TextInput
                  value={comments}
                  onChangeText={setComments}
                  placeholder={t('crop.writeYourFeedback')}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>{t('crop.weather')}</Text>
                <TextInput
                  value={weather}
                  onChangeText={setWeather}
                  placeholder={t('crop.weatherSummary')}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>{t('crop.advisor')}</Text>
                <TextInput
                  value={advisory}
                  onChangeText={setAdvisory}
                  placeholder={t('crop.feedbackForCropAdvisory')}
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />
              </View>
            ) : null}

            <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{t('crop.submit')}</Text>}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'RobotoMedium',
  },
  subtitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 14,
    fontFamily: 'RobotoRegular',
  },
  ratingRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingItem: {
    width: '24%',
    alignItems: 'center',
  },
  ratingIcon: {
    width: 24,
    height: 24,
  },
  ratingLabel: {
    marginTop: 6,
    color: colors.text,
    fontSize: 13,
    fontFamily: 'RobotoRegular',
  },
  ratingLabelActive: {
    color: colors.primary,
  },
  readOnlyBox: {
    marginTop: 4,
  },
  formWrap: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 14,
    fontFamily: 'RobotoRegular',
  },
  fieldLabel: {
    marginTop: 14,
    marginBottom: 6,
    color: colors.darkGreen,
    fontSize: 14,
    fontFamily: 'RobotoRegular',
  },
  input: {
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    backgroundColor: '#fff',
  },
  submitBtn: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: colors.primary,
    borderRadius: 15,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontFamily: 'RobotoRegular',
    fontSize: 16,
  },
});
