import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { cropService } from '../../api/services';

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
  label: string;
  blank: any;
  selected: any;
}> = [
  {
    key: 1,
    label: 'Poor',
    blank: require('../../../assets/images/ic_poor.png'),
    selected: require('../../../assets/images/ic_selectpoor.png'),
  },
  {
    key: 3,
    label: 'Good',
    blank: require('../../../assets/images/ic_good.png'),
    selected: require('../../../assets/images/ic_selectgood.png'),
  },
  {
    key: 4,
    label: 'Very Good',
    blank: require('../../../assets/images/ic_verygood.png'),
    selected: require('../../../assets/images/ic_selectverygood.png'),
  },
  {
    key: 5,
    label: 'Excellent',
    blank: require('../../../assets/images/ic_excellent.png'),
    selected: require('../../../assets/images/ic_selectExcellent.png'),
  },
];

export const CropFeedbackScreen = ({ navigation, route }: Props) => {
  const { advisoryId, userProfileId, feedbackId = 0, avgFeedback = 0 } = route.params;

  const alreadySubmitted = feedbackId > 0;
  const initialRating = pickNum(avgFeedback);

  const [rating, setRating] = useState<number>(initialRating);
  const [comments, setComments] = useState('');
  const [weather, setWeather] = useState('');
  const [advisory, setAdvisory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedValue = useMemo(() => {
    if (!rating) return 0;
    if (rating <= 1) return 1;
    if (rating <= 3) return 3;
    if (rating <= 4) return 4;
    return 5;
  }, [rating]);

  const submit = () => {
    if (!selectedValue) {
      Alert.alert('Alert', 'Please select a rating.');
      return;
    }

    Alert.alert('Feedback', 'Do you want to submit feedback?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
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
              Alert.alert('Fail', String(response?.errorMessage || 'Failed to save feedback.'));
              return;
            }

            Alert.alert('Success', 'Feedback submitted successfully.', [
              {
                text: 'OK',
                onPress: () => navigation.goBack(),
              },
            ]);
          } catch {
            Alert.alert('Fail', 'Failed to save feedback.');
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
            <Text style={[styles.ratingLabel, selected && styles.ratingLabelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Rate your experience</Text>
        <Text style={styles.subtitle}>Are you satisfied with this advisory?</Text>

        {alreadySubmitted ? (
          <View style={styles.readOnlyBox}>{renderRating(true)}</View>
        ) : (
          <>
            {renderRating(false)}

            {selectedValue ? (
              <View style={styles.formWrap}>
                <Text style={styles.groupTitle}>What can be improved?</Text>

                <Text style={styles.fieldLabel}>Overall</Text>
                <TextInput
                  value={comments}
                  onChangeText={setComments}
                  placeholder="Write your feedback"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Weather</Text>
                <TextInput
                  value={weather}
                  onChangeText={setWeather}
                  placeholder="Weather summary"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />

                <Text style={styles.fieldLabel}>Advisor</Text>
                <TextInput
                  value={advisory}
                  onChangeText={setAdvisory}
                  placeholder="Feedback for crop advisory"
                  placeholderTextColor={colors.muted}
                  multiline
                  style={styles.input}
                  textAlignVertical="top"
                />
              </View>
            ) : null}

            <Pressable style={styles.submitBtn} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit</Text>}
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
