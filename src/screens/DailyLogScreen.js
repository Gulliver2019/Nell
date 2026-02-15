import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDate } from '../utils/storage';
import EntryItem from '../components/EntryItem';
import QuickAdd from '../components/QuickAdd';
import * as Haptics from 'expo-haptics';

export default function DailyLogScreen() {
  const { colors } = useTheme();
  const {
    entries, selectedDate, setSelectedDate, addEntry, updateEntry,
    deleteEntry, migrateEntry, scheduleEntry,
  } = useApp();

  const today = getDateKey();

  // Navigate dates
  const goDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(getDateKey(d));
  };

  const dayEntries = useMemo(() => {
    return entries
      .filter(e => e.date === selectedDate && !e.collection)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [entries, selectedDate]);

  const stats = useMemo(() => {
    const tasks = dayEntries.filter(e => e.type === 'task');
    return {
      total: tasks.length,
      done: tasks.filter(t => t.state === 'complete').length,
      open: tasks.filter(t => t.state === 'open').length,
    };
  }, [dayEntries]);

  const handleAdd = useCallback(async (data) => {
    await addEntry({ ...data, date: selectedDate });
  }, [addEntry, selectedDate]);

  const handleSchedule = useCallback((id) => {
    // Swipe left → move to monthly intentions for month-end review
    const entry = entries.find(e => e.id === id);
    const monthKey = selectedDate.substring(0, 7); // e.g. "2026-02"
    Alert.alert(
      'Monthly Review',
      'Move this task to your monthly intentions list for review?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Move to Monthly',
          onPress: async () => {
            const { addFutureLogEntry } = await import('../utils/storage').then(m => m);
            // Add to future log for this month as an intention
            await addFutureLogEntry(monthKey, {
              id: entry.id + '_monthly',
              text: entry.text,
              type: 'task',
            });
            // Mark original as scheduled
            updateEntry(id, { state: 'scheduled' });
          },
        },
      ]
    );
  }, [entries, selectedDate, updateEntry]);

  const handleMigrate = useCallback((id) => {
    // Swipe right → migrate to next day
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const tomorrow = new Date(selectedDate + 'T00:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    scheduleEntry(id, getDateKey(tomorrow));
  }, [scheduleEntry, selectedDate]);

  const isToday = selectedDate === today;

  const renderEntry = ({ item }) => (
    <EntryItem
      entry={item}
      onUpdate={updateEntry}
      onDelete={deleteEntry}
      onMigrate={handleMigrate}
      onSchedule={handleSchedule}
    />
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.accent + '20', 'transparent']}
          style={styles.headerGlow}
        />
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => goDay(-1)} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setSelectedDate(today)} style={styles.dateCenter}>
            <Text style={[styles.dateLabel, { color: colors.text }]}>
              {isToday ? 'Today' : formatDate(selectedDate)}
            </Text>
            {isToday && <Text style={[styles.dateSubLabel, { color: colors.textSecondary }]}>{formatDate(selectedDate)}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goDay(1)} style={styles.navButton}>
            <Text style={[styles.navArrow, { color: colors.accent }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        {stats.total > 0 && (
          <View style={styles.statsRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(stats.done / stats.total) * 100}%`, backgroundColor: colors.accentGreen },
                ]}
              />
            </View>
            <Text style={[styles.statsText, { color: colors.textSecondary }]}>
              {stats.done}/{stats.total} done
            </Text>
          </View>
        )}
      </View>

      {/* Entries */}
      <FlatList
        data={dayEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon, { color: colors.accent }]}>✦</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {isToday ? 'Fresh day, fresh start' : 'Nothing logged'}
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              {isToday ? 'Add your first entry below' : 'Navigate to today to add entries'}
            </Text>
          </View>
        }
      />

      {/* Quick Add */}
      <QuickAdd onAdd={handleAdd} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    position: 'relative',
  },
  headerGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  navButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: {
    fontSize: 32,
    fontWeight: '300',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateSubLabel: {
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  statsText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    fontSize: SIZES.md,
  },
});
