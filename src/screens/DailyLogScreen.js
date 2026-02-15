import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS, TASK_STATES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDate } from '../utils/storage';
import EntryItem from '../components/EntryItem';
import QuickAdd from '../components/QuickAdd';

export default function DailyLogScreen() {
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
    // Schedule to tomorrow by default
    const tomorrow = new Date(selectedDate + 'T00:00:00');
    tomorrow.setDate(tomorrow.getDate() + 1);
    Alert.alert(
      'Schedule Entry',
      'Move this task to tomorrow?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Tomorrow', onPress: () => scheduleEntry(id, getDateKey(tomorrow)) },
        {
          text: 'Next Week',
          onPress: () => {
            const nextWeek = new Date(selectedDate + 'T00:00:00');
            nextWeek.setDate(nextWeek.getDate() + 7);
            scheduleEntry(id, getDateKey(nextWeek));
          },
        },
      ]
    );
  }, [scheduleEntry, selectedDate]);

  const handleMigrate = useCallback((id) => {
    Alert.alert(
      'Migrate Entry',
      'Move this task to today?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Migrate', onPress: () => migrateEntry(id) },
      ]
    );
  }, [migrateEntry]);

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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[COLORS.accent + '20', 'transparent']}
          style={styles.headerGlow}
        />
        <View style={styles.dateNav}>
          <TouchableOpacity onPress={() => goDay(-1)} style={styles.navButton}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setSelectedDate(today)} style={styles.dateCenter}>
            <Text style={styles.dateLabel}>
              {isToday ? 'Today' : formatDate(selectedDate)}
            </Text>
            {isToday && <Text style={styles.dateSubLabel}>{formatDate(selectedDate)}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => goDay(1)} style={styles.navButton}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats bar */}
        {stats.total > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(stats.done / stats.total) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.statsText}>
              {stats.done}/{stats.total} crushed
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
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>
              {isToday ? 'Fresh day, fresh start' : 'Nothing logged'}
            </Text>
            <Text style={styles.emptySub}>
              {isToday ? 'Add your first entry below' : 'Navigate to today to add entries'}
            </Text>
          </View>
        }
      />

      {/* Quick Add */}
      <QuickAdd onAdd={handleAdd} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
    color: COLORS.accent,
    fontSize: 32,
    fontWeight: '300',
  },
  dateCenter: {
    alignItems: 'center',
  },
  dateLabel: {
    color: COLORS.text,
    fontSize: SIZES.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  dateSubLabel: {
    color: COLORS.textSecondary,
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
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.accentGreen,
    borderRadius: 2,
  },
  statsText: {
    color: COLORS.textSecondary,
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
    color: COLORS.accent,
    marginBottom: 16,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: SIZES.lg,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySub: {
    color: COLORS.textMuted,
    fontSize: SIZES.md,
  },
});
