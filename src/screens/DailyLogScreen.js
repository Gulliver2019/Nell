import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal,
  Platform, TextInput, Animated, LayoutAnimation, UIManager, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDate } from '../utils/storage';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import EntryItem from '../components/EntryItem';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import TimeBlockView from '../components/TimeBlockView';
import CompleteDayModal from '../components/CompleteDayModal';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DailyLogScreen() {
  const { colors } = useTheme();
  const {
    entries, selectedDate, setSelectedDate, addEntry, updateEntry,
    deleteEntry, migrateEntry, scheduleEntry, reorderEntries, migratePastEntries,
    completeDayAndMigrate, saveReflection,
  } = useApp();

  const today = getDateKey();
  const isToday = selectedDate === today;
  const [scheduleEntryId, setScheduleEntryId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeblock'
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [completeDayVisible, setCompleteDayVisible] = useState(false);
  const [dayCompleted, setDayCompleted] = useState(false);
  const listRef = useRef(null);
  const shouldScrollRef = useRef(false);

  const completedDayKey = `nell_day_completed_${today}`;

  // Daily intention
  const [intention, setIntention] = useState('');
  const [intentionDraft, setIntentionDraft] = useState('');
  const [intentionExpanded, setIntentionExpanded] = useState(false);
  const intentionKey = `nell_intention_${selectedDate}`;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(intentionKey);
        setIntention(saved || '');
        setIntentionDraft(saved || '');
      } catch (e) { setIntention(''); setIntentionDraft(''); }
    })();
  }, [intentionKey]);

  useEffect(() => {
    if (intention) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 2500, useNativeDriver: false }),
          Animated.timing(glowAnim, { toValue: 0, duration: 2500, useNativeDriver: false }),
        ])
      ).start();
    } else {
      glowAnim.setValue(0);
    }
  }, [intention]);

  const saveIntention = useCallback(async () => {
    const trimmed = intentionDraft.trim();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIntention(trimmed);
    setIntentionExpanded(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try { await AsyncStorage.setItem(intentionKey, trimmed); } catch (e) {}
  }, [intentionDraft, intentionKey]);

  const clearIntention = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIntention('');
    setIntentionDraft('');
    setIntentionExpanded(false);
    Haptics.selectionAsync();
    try { await AsyncStorage.removeItem(intentionKey); } catch (e) {}
  }, [intentionKey]);

  // Load day-completed status for today
  useEffect(() => {
    (async () => {
      try {
        const done = await AsyncStorage.getItem(completedDayKey);
        setDayCompleted(done === 'true');
      } catch (e) { setDayCompleted(false); }
    })();
  }, [completedDayKey]);

  const handleCompleteDay = useCallback(async (reflection) => {
    const count = await completeDayAndMigrate(reflection);
    await AsyncStorage.setItem(completedDayKey, 'true').catch(() => {});
    setDayCompleted(true);
    setCompleteDayVisible(false);
    if (count > 0) {
      Alert.alert('Day Complete', `${count} open task${count > 1 ? 's' : ''} migrated to tomorrow.`);
    }
  }, [completeDayAndMigrate, completedDayKey]);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0.9],
  });

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

  // Find the "next up" entry: the first incomplete time-blocked entry in time order
  // Stays on the current item until it is completed or removed from the time block
  const nextUpId = useMemo(() => {
    if (!isToday) return null;
    const timeBlocked = dayEntries
      .filter(e => e.timeBlock && e.state !== 'complete' && e.state !== 'cancelled' && e.state !== 'migrated')
      .sort((a, b) => {
        const [ah, am] = a.timeBlock.split(':').map(Number);
        const [bh, bm] = b.timeBlock.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
      });
    if (timeBlocked.length > 0) return timeBlocked[0].id;
    return null;
  }, [dayEntries, isToday]);

  // Count open tasks on past days that can be migrated to today
  const migrateableCount = useMemo(() => {
    if (isToday) return 0;
    return dayEntries.filter(
      e => e.type === 'task' && (e.state === 'open' || (e.state === 'migrated' && !e._migratedToToday))
    ).length;
  }, [dayEntries, isToday]);

  const handleMigrateAll = useCallback(async () => {
    const count = await migratePastEntries();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (count > 0) {
      Alert.alert('Migrated', `${count} task${count > 1 ? 's' : ''} moved to today`);
    }
  }, [migratePastEntries]);

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

  const renderEntry = useCallback(({ item, drag, isActive }) => {
    return (
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
          isNextUp={item.id === nextUpId}
        />
      </ScaleDecorator>
    );
  }, [updateEntry, deleteEntry, handleMigrate, handleSchedule, handleEdit, nextUpId, colors]);

  const handleDragEnd = useCallback(({ data }) => {
    const realEntryIds = data.map(e => e.id);
    reorderEntries(realEntryIds);
  }, [reorderEntries]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      
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
      </View>

      {/* Intention panel */}
      {intention ? (
        <View style={[styles.intentionDisplay, { borderColor: colors.accent + '30' }]}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: glowOpacity }]}>
            <LinearGradient
              colors={[colors.accent + '12', colors.accentSecondary + '08', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
          <View style={styles.intentionHeader}>
            <Text style={[styles.intentionLabel, { color: colors.accent }]}>TODAY'S INTENTION</Text>
            <View style={styles.intentionHeaderActions}>
              <TouchableOpacity onPress={() => { setIntentionExpanded(!intentionExpanded); setIntentionDraft(intention); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={clearIntention} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="trash-outline" size={16} color={colors.accentRed} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={[styles.intentionText, { color: colors.text }]}>{intention}</Text>
          {intentionExpanded && (
            <View style={styles.intentionEditArea}>
              <TextInput
                style={[styles.intentionInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={intentionDraft}
                onChangeText={setIntentionDraft}
                placeholder="What's your focus today?"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                multiline
                maxLength={200}
                autoFocus
              />
              <View style={styles.intentionActions}>
                <TouchableOpacity style={[styles.intentionBtn, { backgroundColor: colors.textMuted + '15' }]} onPress={() => setIntentionExpanded(false)}>
                  <Text style={[styles.intentionBtnText, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.intentionBtn, { backgroundColor: colors.accent }, !intentionDraft.trim() && { opacity: 0.4 }]}
                  onPress={saveIntention}
                  disabled={!intentionDraft.trim()}
                >
                  <Text style={[styles.intentionBtnText, { color: colors.textInverse }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.intentionPromptWrap}>
          <TouchableOpacity
            style={[styles.intentionPrompt, { backgroundColor: colors.bgCard, borderColor: colors.accent + '25' }]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setIntentionExpanded(!intentionExpanded);
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.accent + '08', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={[styles.intentionPromptText, { color: colors.textSecondary }]}>Set your intention for today</Text>
            <Ionicons name={intentionExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
          </TouchableOpacity>
          {intentionExpanded && (
            <View style={[styles.intentionInputWrap, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <TextInput
                style={[styles.intentionInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                value={intentionDraft}
                onChangeText={setIntentionDraft}
                placeholder="What's your focus today?"
                placeholderTextColor={colors.textMuted}
                selectionColor={colors.accent}
                multiline
                maxLength={200}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.intentionSaveBtn, { backgroundColor: colors.accent }, !intentionDraft.trim() && { opacity: 0.4 }]}
                onPress={saveIntention}
                disabled={!intentionDraft.trim()}
              >
                <Text style={[styles.intentionSaveBtnText, { color: colors.textInverse }]}>Set Intention</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Complete Day button — only for today */}
      {isToday && (
        dayCompleted ? (
          <View style={[styles.completeDayDone, { backgroundColor: colors.accentGreen + '12' }]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.accentGreen} />
            <Text style={[styles.completeDayDoneText, { color: colors.accentGreen }]}>Day completed</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.completeDayBtn, { backgroundColor: colors.bgCard, borderColor: colors.accent + '30' }]}
            onPress={() => setCompleteDayVisible(true)}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={[colors.accent + '10', 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Ionicons name="checkmark-done-outline" size={18} color={colors.accent} />
            <Text style={[styles.completeDayBtnText, { color: colors.accent }]}>Complete Day</Text>
          </TouchableOpacity>
        )
      )}

      {/* Stats bar */}
      <View style={styles.statsBar}>
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

      {/* Migrate to Today button for past days */}
      {!isToday && migrateableCount > 0 && (
        <TouchableOpacity
          style={[styles.migrateBar, { backgroundColor: colors.accent + '20', borderColor: colors.accent + '40' }]}
          onPress={handleMigrateAll}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-forward-circle-outline" size={18} color={colors.accent} />
          <Text style={[styles.migrateBarText, { color: colors.accent }]}>
            Migrate {migrateableCount} task{migrateableCount > 1 ? 's' : ''} to today
          </Text>
        </TouchableOpacity>
      )}

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
          dateKey={selectedDate}
          onAddPress={() => { setEditingEntry(null); setFlyoutVisible(true); }}
          onAddEntry={({ text, timeBlock, pomodoros }) => addEntry({ text, date: selectedDate, timeBlock, pomodoros })}
        />
      )}

      {/* FAB + Flyout (only show standalone FAB in list mode) */}
      {viewMode === 'list' && (
        <FAB onPress={() => { setEditingEntry(null); setFlyoutVisible(true); }} />
      )}
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
      <CompleteDayModal
        visible={completeDayVisible}
        onClose={() => setCompleteDayVisible(false)}
        onComplete={handleCompleteDay}
        stats={stats}
        colors={colors}
      />
      </KeyboardAvoidingView>
      <KnowledgeBaseButton sectionId="daily-log" />
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
  statsBar: {
    paddingHorizontal: 16,
    paddingBottom: 4,
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
  migrateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  migrateBarText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 300,
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

  // Complete Day
  completeDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  completeDayBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completeDayDone: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    borderRadius: 14,
  },
  completeDayDoneText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Intention panel
  intentionDisplay: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: 'hidden',
  },
  intentionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  intentionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  intentionHeaderActions: {
    flexDirection: 'row',
    gap: 14,
  },
  intentionText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    lineHeight: 24,
  },
  intentionEditArea: {
    marginTop: 12,
  },
  intentionInput: {
    fontSize: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    padding: 14,
    minHeight: 48,
    maxHeight: 100,
  },
  intentionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  intentionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  intentionBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  intentionPromptWrap: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  intentionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  intentionPromptText: {
    flex: 1,
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  intentionInputWrap: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  intentionSaveBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  intentionSaveBtnText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});
