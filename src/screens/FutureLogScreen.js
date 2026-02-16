import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, getBulletTypes } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getMonthKey, getMonthName } from '../utils/storage';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';

export default function FutureLogScreen() {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const { futureLog, addFutureLogEntry, removeFutureLogEntry } = useApp();
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Generate next 6 months
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push(getMonthKey(d));
    }
    return result;
  }, []);

  const handleAdd = async (data) => {
    if (!selectedMonth) return;
    await addFutureLogEntry(selectedMonth, {
      text: data.text,
      type: data.type || 'task',
    });
  };

  const handleRemove = (monthKey, entryId) => {
    Alert.alert('Remove', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeFutureLogEntry(monthKey, entryId) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[colors.accentGold + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.title, { color: colors.text }]}>Future Log</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Plan ahead, dream big</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {months.map(monthKey => {
          const monthEntries = futureLog[monthKey] || [];

          return (
            <View key={monthKey} style={styles.monthCard}>
              <LinearGradient
                colors={[colors.bgElevated, colors.bgCard]}
                style={[styles.cardGradient, { borderColor: colors.border }]}
              >
                <View style={styles.monthHeader}>
                  <Text style={[styles.monthTitle, { color: colors.accentGold }]}>{getMonthName(monthKey)}</Text>
                  <TouchableOpacity
                    onPress={() => { setSelectedMonth(monthKey); setFlyoutVisible(true); }}
                    style={[styles.monthAddBtn, { backgroundColor: colors.accent + '15' }]}
                  >
                    <Text style={[styles.monthAddBtnText, { color: colors.accent }]}>+</Text>
                  </TouchableOpacity>
                </View>

                {monthEntries.map(entry => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.entryRow}
                    onLongPress={() => handleRemove(monthKey, entry.id)}
                  >
                    <Text style={[styles.entryBullet, { color: BULLET_TYPES[entry.type]?.color || colors.text }]}>
                      {BULLET_TYPES[entry.type]?.symbol || '•'}
                    </Text>
                    <Text style={[styles.entryText, { color: colors.text }]}>{entry.text}</Text>
                  </TouchableOpacity>
                ))}

                {monthEntries.length === 0 && (
                  <Text style={[styles.emptyMonth, { color: colors.textMuted }]}>No entries yet</Text>
                )}
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>

      <FAB onPress={() => { setSelectedMonth(months[0]); setFlyoutVisible(true); }} />
      <EntryFormFlyout
        visible={flyoutVisible}
        onClose={() => { setFlyoutVisible(false); setSelectedMonth(null); }}
        onSubmit={handleAdd}
        visibleFields={['text', 'type']}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.md, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  monthCard: {
    marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden',
  },
  cardGradient: {
    padding: 16, borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  monthTitle: {
    fontSize: SIZES.lg, fontWeight: '700',
    letterSpacing: 0.5, flex: 1,
  },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthAddBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  monthAddBtnText: { fontSize: 18, fontWeight: '600' },
  emptyMonth: { fontSize: SIZES.sm, paddingVertical: 4 },
  entryRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8,
  },
  entryBullet: { fontSize: SIZES.base, fontWeight: '700', width: 20, textAlign: 'center', lineHeight: 22 },
  entryText: { flex: 1, fontSize: SIZES.md, lineHeight: 22 },
});
