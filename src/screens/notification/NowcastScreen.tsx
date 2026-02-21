import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../../components/Screen';
import { notificationService } from '../../api/services';
import { useAppStore } from '../../store/appStore';
import { colors } from '../../theme/colors';

const pickText = (...values: any[]) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
};

export const NowcastScreen = () => {
  const user = useAppStore((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const response = await notificationService.getNowcast(user.userProfileId);
        setItems(Array.isArray(response) ? response : []);
      } finally {
        setLoading(false);
      }
    };

    load().catch(() => setItems([]));
  }, [user]);

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
      <FlatList
        data={items}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const title = pickText(item.notificationTitle, item.NotificationTitle, item.title, item.Title, 'Nowcast');
          const issueDate = pickText(item.issueDate, item.IssueDate, item.date, item.Date, '-');
          const message = pickText(item.notificationMessage, item.NotificationMessage, item.message, item.Message, '-');
          const toi = pickText(item.timeOfIssueMessage, item.TimeOfIssueMessage, item.toi, item.TOI, '');
          const validity = pickText(item.validityMessage, item.ValidityMessage, item.vUpTo, item.VUpTo, '');

          return (
            <View style={styles.card}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.issueDate}>{issueDate}</Text>
              <Text style={styles.message}>{message}</Text>
              {toi ? <Text style={styles.metaText}>{toi}</Text> : null}
              {validity ? <Text style={styles.metaText}>Validity: {validity}</Text> : null}
            </View>
          );
        }}
      />
    );
  }, [items, loading]);

  return <Screen>{content}</Screen>;
};

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderColor: '#E3E3E3',
    borderRadius: 5,
    backgroundColor: '#fff',
  },
  title: {
    color: colors.darkGreen,
    fontFamily: 'RobotoMedium',
    fontSize: 18,
  },
  issueDate: {
    marginTop: 4,
    color: colors.darkGreen,
    fontFamily: 'RobotoRegular',
    fontSize: 12,
  },
  message: {
    marginTop: 10,
    color: '#363636',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    lineHeight: 20,
  },
  metaText: {
    marginTop: 6,
    color: '#363636',
    fontFamily: 'RobotoRegular',
    fontSize: 14,
    lineHeight: 20,
  },
  empty: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#999',
    fontFamily: 'RobotoRegular',
    fontSize: 16,
  },
});
