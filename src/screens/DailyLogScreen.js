import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Alert, Modal,
  Platform, TextInput, Animated, LayoutAnimation, UIManager,
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
import { getDateKey, formatDate, getWellnessDay, getWellnessTemplates, saveWellnessDay, getDailyWellnessSelection, saveDailyWellnessSelection } from '../utils/storage';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import EntryItem from '../components/EntryItem';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import TimeBlockView from '../components/TimeBlockView';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function DailyLogScreen() {
  const { colors } = useTheme();
  const {
    entries, selectedDate, setSelectedDate, addEntry, updateEntry,
    deleteEntry, migrateEntry, scheduleEntry, reorderEntries, migratePastEntries,
    generateRoutineEntries, wellnessTemplates, routines,
  } = useApp();

  const today = getDateKey();
  const isToday = selectedDate === today;
  const [scheduleEntryId, setScheduleEntryId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'timeblock'
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [wellnessPickerVisible, setWellnessPickerVisible] = useState(false);
  const [dailyWellnessIds, setDailyWellnessIds] = useState([]);
  const listRef = useRef(null);
  const shouldScrollRef = useRef(false);

  // Daily intention
  const [intention, setIntention] = useState('');
  const [intentionDraft, setIntentionDraft] = useState('');
  const [intentionExpanded, setIntentionExpanded] = useState(false);
  const intentionKey = `crushedit_intention_${selectedDate}`;
  const glowAnim = useRef(new Animated.Value(0)).current;

  // Auto-generate routine entries for selected date
  useEffect(() => {
    if (selectedDate) generateRoutineEntries(selectedDate);
  }, [selectedDate, generateRoutineEntries, routines]);

  // Wellness day data for daily log integration
  const [wellnessDayData, setWellnessDayData] = useState(null);
  useEffect(() => {
    (async () => {
      const data = await getWellnessDay(selectedDate);
      setWellnessDayData(data);
    })();
  }, [selectedDate, wellnessTemplates]);

  const toggleWellnessItem = useCallback(async (category, itemId) => {
    if (!wellnessDayData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...wellnessDayData, [category]: { ...wellnessDayData[category] } };
    if (category === 'meditation') {
      updated.meditation[itemId] = !updated.meditation[itemId];
    } else {
      const current = updated[category][itemId] || { done: false, value: '' };
      updated[category][itemId] = { ...current, done: !current.done };
    }
    setWellnessDayData(updated);
    await saveWellnessDay(selectedDate, updated);
  }, [wellnessDayData, selectedDate]);

  // Load which wellness items user chose to show on this day
  useEffect(() => {
    (async () => {
      const ids = await getDailyWellnessSelection(selectedDate);
      setDailyWellnessIds(ids);
    })();
  }, [selectedDate]);

  const toggleWellnessPick = useCallback(async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = dailyWellnessIds.includes(id)
      ? dailyWellnessIds.filter(x => x !== id)
      : [...dailyWellnessIds, id];
    setDailyWellnessIds(next);
    await saveDailyWellnessSelection(selectedDate, next);
  }, [dailyWellnessIds, selectedDate]);

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

  // Build wellness pseudo-entries for the daily list
  const wellnessEntries = useMemo(() => {
    if (!wellnessDayData || !wellnessTemplates) return [];
    const items = [];
    (wellnessTemplates.nutrition || []).forEach(t => {
      const state = wellnessDayData.nutrition?.[t.id] || { done: false, value: '' };
      items.push({
        id: `wellness_nut_${t.id}`,
        text: `🍽️ ${t.name}${state.value ? ` — ${state.value}` : ''}`,
        type: 'wellness', source: 'wellness', wellnessCategory: 'nutrition', wellnessItemId: t.id,
        state: state.done ? 'complete' : 'open',
      });
    });
    (wellnessTemplates.exercise || []).forEach(t => {
      const icons = { walking: '🚶', gym: '🏋️', cardio: '🏃', custom: '💪' };
      const state = wellnessDayData.exercise?.[t.id] || { done: false, value: '' };
      items.push({
        id: `wellness_ex_${t.id}`,
        text: `${icons[t.type] || '💪'} ${t.name}${state.value ? ` — ${state.value}` : ''}`,
        type: 'wellness', source: 'wellness', wellnessCategory: 'exercise', wellnessItemId: t.id,
        state: state.done ? 'complete' : 'open',
      });
    });
    ['am', 'pm', 'eve'].forEach(slot => {
      const icons = { am: '🌅', pm: '☀️', eve: '🌙' };
      const labels = { am: 'AM Meditation', pm: 'PM Meditation', eve: 'Evening Meditation' };
      items.push({
        id: `wellness_med_${slot}`,
        text: `${icons[slot]} ${labels[slot]}`,
        type: 'wellness', source: 'wellness', wellnessCategory: 'meditation', wellnessItemId: slot,
        state: wellnessDayData.meditation?.[slot] ? 'complete' : 'open',
      });
    });
    return items;
  }, [wellnessDayData, wellnessTemplates]);

  const allDayEntries = useMemo(() => {
    const selectedWellness = wellnessEntries.filter(e => dailyWellnessIds.includes(e.id));
    return [...dayEntries, ...selectedWellness];
  }, [dayEntries, wellnessEntries, dailyWellnessIds]);

  const stats = useMemo(() => {
    const tasks = dayEntries.filter(e => e.type === 'task');
    return {
      total: tasks.length,
      done: tasks.filter(t => t.state === 'complete').length,
      open: tasks.filter(t => t.state === 'open').length,
    };
  }, [dayEntries]);

  // Tick every minute so nextUpId stays current as time passes
  const [timeTick, setTimeTick] = useState(0);
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setTimeTick(t => t + 1), 60000);
    return () => clearInterval(id);
  }, [isToday]);

  // Find the "next up" entry: the first time-blocked entry whose slot is current or upcoming and not complete
  const nextUpId = useMemo(() => {
    if (!isToday) return null;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const timeBlocked = dayEntries
      .filter(e => e.timeBlock && e.state !== 'complete' && e.state !== 'cancelled')
      .sort((a, b) => {
        const [ah, am] = a.timeBlock.split(':').map(Number);
        const [bh, bm] = b.timeBlock.split(':').map(Number);
        return (ah * 60 + am) - (bh * 60 + bm);
      });
    // Find first entry whose time block is current or in the future
    for (const e of timeBlocked) {
      const [h, m] = e.timeBlock.split(':').map(Number);
      const slotEnd = h * 60 + m + Math.max(1, e.pomodoros || 1) * 30;
      if (slotEnd > nowMinutes) return e.id;
    }
    // If all slots have passed, highlight the first incomplete time-blocked entry
    if (timeBlocked.length > 0) return timeBlocked[0].id;
    return null;
  }, [dayEntries, isToday, timeTick]);

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
    // Wellness pseudo-entries get a simplified render
    if (item.source === 'wellness') {
      const isDone = item.state === 'complete';
      return (
        <TouchableOpacity
          onPress={() => toggleWellnessItem(item.wellnessCategory, item.wellnessItemId)}
          style={[
            styles.wellnessRow,
            { backgroundColor: isDone ? colors.accentGreen + '10' : colors.bg },
            isDone && { borderLeftColor: colors.accentGreen, borderLeftWidth: 3 },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isDone ? colors.accentGreen : colors.textMuted}
          />
          <Text style={[
            styles.wellnessText,
            { color: colors.text },
            isDone && { color: colors.textSecondary, textDecorationLine: 'line-through' },
          ]}>
            {item.text}
          </Text>
          <View style={[styles.wellnessBadge, { backgroundColor: colors.accentGreen + '20' }]}>
            <Text style={[styles.wellnessBadgeText, { color: colors.accentGreen }]}>
              {item.wellnessCategory === 'nutrition' ? 'FOOD' : item.wellnessCategory === 'exercise' ? 'FIT' : 'MED'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }
    // Routine entries get a subtle badge
    const isRoutine = item.source === 'routine';
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
          isRoutine={isRoutine}
        />
      </ScaleDecorator>
    );
  }, [updateEntry, deleteEntry, handleMigrate, handleSchedule, handleEdit, nextUpId, toggleWellnessItem, colors]);

  const handleDragEnd = useCallback(({ data }) => {
    const realEntryIds = data.filter(e => e.source !== 'wellness').map(e => e.id);
    reorderEntries(realEntryIds);
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
                <Ionicons name="pencil-outline" size={16} color={colors.textMuted} />
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
          data={allDayEntries}
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
        />
      )}

      {/* FAB + Flyout (only show standalone FAB in list mode) */}
      {viewMode === 'list' && (
        <>
          {wellnessEntries.length > 0 && (
            <TouchableOpacity
              style={[styles.wellnessFab, { backgroundColor: colors.accentGreen }]}
              onPress={() => setWellnessPickerVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 20 }}>🍃</Text>
            </TouchableOpacity>
          )}
          <FAB onPress={() => { setEditingEntry(null); setFlyoutVisible(true); }} />
        </>
      )}
      <EntryFormFlyout
        visible={flyoutVisible}
        onClose={() => { setFlyoutVisible(false); setEditingEntry(null); }}
        onSubmit={handleAdd}
        entry={editingEntry}
        visibleFields={['text', 'type', 'signifier', 'admin', 'pomodoros', 'timeBlock', 'date']}
      />

      {/* Wellness Picker Modal */}
      <Modal visible={wellnessPickerVisible} transparent animationType="slide">
        <View style={styles.datePickerOverlay}>
          <View style={[styles.wellnessPickerContainer, { backgroundColor: colors.bgCard }]}>
            <View style={styles.datePickerHeader}>
              <Text style={[styles.datePickerTitle, { color: colors.text }]}>Add Wellness to Daily</Text>
              <TouchableOpacity onPress={() => setWellnessPickerVisible(false)}>
                <Text style={[styles.datePickerCancel, { color: colors.accentGreen }]}>Done</Text>
              </TouchableOpacity>
            </View>
            {wellnessEntries.map(item => {
              const selected = dailyWellnessIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.wellnessPickRow, selected && { backgroundColor: colors.accentGreen + '15' }]}
                  onPress={() => toggleWellnessPick(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? colors.accentGreen : colors.textMuted}
                  />
                  <Text style={[styles.wellnessPickText, { color: colors.text }]}>{item.text}</Text>
                  <View style={[styles.wellnessBadge, { backgroundColor: colors.accentGreen + '20' }]}>
                    <Text style={[styles.wellnessBadgeText, { color: colors.accentGreen }]}>
                      {item.wellnessCategory === 'nutrition' ? 'FOOD' : item.wellnessCategory === 'exercise' ? 'FIT' : 'MED'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

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
  wellnessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 6,
  },
  wellnessText: {
    flex: 1,
    fontSize: SIZES.base,
    lineHeight: 22,
  },
  wellnessBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wellnessBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  wellnessFab: {
    position: 'absolute',
    right: 76,
    bottom: 98,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  wellnessPickerContainer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  wellnessPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  wellnessPickText: {
    flex: 1,
    fontSize: SIZES.base,
  },
});
