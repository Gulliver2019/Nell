import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDate } from '../utils/storage';
import EntryItem from '../components/EntryItem';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import TimeBlockView from '../components/TimeBlockView';
import * as Haptics from 'expo-haptics';

export default function DailyLogScreen() {
  const { colors } = useTheme();
  const {
    entries, selectedDate, setSelectedDate, addEntry, updateEntry,
    deleteEntry, migrateEntry, scheduleEntry, reorderEntries,
  } = useApp();

  const today = getDateKey();
  const [scheduleEntryId, setScheduleEntryId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeblock'
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const listRef = useRef(null);
  const shouldScrollRef = useRef(false);

  // Navigate dates
  const goDay = (offset) => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + offset);
    setSelectedDate(getDateKey(d));
  };

  const dayEntries = useMemo(() => {
    return entries
      .filter(e => e.date === selectedDate && !e.collection)
      .sort((a, b) => {
        if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
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
    if (data.id) {
      // Edit mode
      const { id, ...updates } = data;
      await updateEntry(id, updates);
    } else {
      await addEntry({ ...data, date: data.date || selectedDate });
      shouldScrollRef.current = true;
    }
  }, [addEntry, updateEntry, selectedDate]);

  const handleEdit = useCallback((entry) => {
    setEditingEntry(entry);
    setFlyoutVisible(true);
  }, []);

  const handleSchedule = useCallback((id) => {
    setScheduleEntryId(id);
    setShowDatePicker(true);
  }, []);

  const handleDatePicked = useCallback(async (event, selectedDateVal) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selectedDateVal) {
      setShowDatePicker(false);
      setScheduleEntryId(null);
      return;
    }
    const targetDate = getDateKey(selectedDateVal);
    if (scheduleEntryId) {
      await scheduleEntry(scheduleEntryId, targetDate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowDatePicker(false);
    setScheduleEntryId(null);
  }, [scheduleEntryId, scheduleEntry]);

  const handleMigrate = useCallback((id) => {
    // Swipe right → mark as migrated (shows ">"), task moves to today on next app load
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateEntry(id, { state: 'migrated' });
  }, [updateEntry]);

  const isToday = selectedDate === today;

  const renderEntry = useCallback(({ item, drag, isActive }) => (
    <ScaleDecorator>
      <EntryItem
        entry={item}
        onUpdate={updateEntry}
        onDelete={deleteEntry}
        onMigrate={handleMigrate}
        onSchedule={handleSchedule}
        onEdit={handleEdit}
        drag={drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  ), [updateEntry, deleteEntry, handleMigrate, handleSchedule, handleEdit]);

  const handleDragEnd = useCallback(({ data }) => {
    reorderEntries(data.map(e => e.id));
  }, [reorderEntries]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.flex}>
      
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
            {/* View toggle */}
            <TouchableOpacity
              onPress={() => { setViewMode(v => v === 'list' ? 'timeblock' : 'list'); Haptics.selectionAsync(); }}
              style={styles.viewToggle}
            >
              <Ionicons
                name={viewMode === 'list' ? 'time-outline' : 'list-outline'}
                size={20}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>
        )}
        {stats.total === 0 && (
          <View style={styles.toggleOnly}>
            <TouchableOpacity
              onPress={() => { setViewMode(v => v === 'list' ? 'timeblock' : 'list'); Haptics.selectionAsync(); }}
              style={styles.viewToggle}
            >
              <Ionicons
                name={viewMode === 'list' ? 'time-outline' : 'list-outline'}
                size={20}
                color={colors.accent}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Entries */}
      {viewMode === 'list' ? (
        <DraggableFlatList
          ref={listRef}
          data={dayEntries}
          renderItem={renderEntry}
          keyExtractor={item => item.id}
          onDragEnd={handleDragEnd}
          onContentSizeChange={() => {
            if (shouldScrollRef.current) {
              shouldScrollRef.current = false;
              listRef.current?.scrollToEnd({ animated: true });
            }
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyIcon, { color: colors.accent }]}>✦</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {isToday ? 'Fresh day, fresh start' : 'Nothing logged'}
              </Text>
              <Text style={[styles.emptySub, { color: colors.textMuted }]}>
                {isToday ? 'Tap + to add your first entry' : 'Navigate to today to add entries'}
              </Text>
            </View>
          }
        />
      ) : (
        <TimeBlockView
          entries={dayEntries}
          onUpdate={updateEntry}
          colors={colors}
        />
      )}

      {/* FAB + Flyout */}
      <FAB onPress={() => { setEditingEntry(null); setFlyoutVisible(true); }} />
      <EntryFormFlyout
        visible={flyoutVisible}
        onClose={() => { setFlyoutVisible(false); setEditingEntry(null); }}
        onSubmit={handleAdd}
        entry={editingEntry}
        visibleFields={['text', 'type', 'signifier', 'pomodoros', 'timeBlock', 'date']}
      />

      {/* Date Picker for scheduling */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal transparent animationType="slide">
          <View style={styles.datePickerOverlay}>
            <View style={[styles.datePickerContainer, { backgroundColor: colors.bgCard }]}>
              <View style={styles.datePickerHeader}>
                <Text style={[styles.datePickerTitle, { color: colors.text }]}>Schedule to date</Text>
                <TouchableOpacity onPress={() => { setShowDatePicker(false); setScheduleEntryId(null); }}>
                  <Text style={[styles.datePickerCancel, { color: colors.accentRed }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="inline"
                minimumDate={new Date()}
                themeVariant="dark"
                accentColor={colors.accent}
                onChange={handleDatePicked}
              />
            </View>
          </View>
        </Modal>
      )}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          minimumDate={new Date()}
          onChange={handleDatePicked}
        />
      )}
      </View>
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
  viewToggle: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOnly: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 200,
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
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  datePickerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  datePickerCancel: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});
