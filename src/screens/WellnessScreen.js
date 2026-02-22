import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  ScrollView, LayoutAnimation, UIManager, Platform, FlatList,
} from 'react-native';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import * as Storage from '../utils/storage';
import * as Haptics from 'expo-haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SECTIONS = ['Nutrition', 'Exercise', 'Meditation'];
const EXERCISE_ICONS = { walking: '🚶', gym: '🏋️', cardio: '🏃', custom: '💪' };
const MEDITATION_SLOTS = [
  { key: 'am', label: 'AM', icon: '🌅' },
  { key: 'pm', label: 'PM', icon: '☀️' },
  { key: 'eve', label: 'Eve', icon: '🌙' },
];

export default function WellnessScreen() {
  const { colors } = useTheme();
  const { wellnessTemplates, saveWellnessTemplates, selectedDate } = useApp();
  const [activeSection, setActiveSection] = useState(0);
  const [dayData, setDayData] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState('');
  const [addValue, setAddValue] = useState('');

  const today = Storage.getDateKey();
  const dateKey = selectedDate || today;

  // Load today's wellness data
  useEffect(() => {
    (async () => {
      const data = await Storage.getWellnessDay(dateKey);
      setDayData(data);
    })();
  }, [dateKey, wellnessTemplates]);

  const saveDayData = useCallback(async (updated) => {
    setDayData(updated);
    await Storage.saveWellnessDay(dateKey, updated);
  }, [dateKey]);

  // ─── Nutrition ───
  const toggleNutrition = useCallback(async (itemId) => {
    if (!dayData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...dayData, nutrition: { ...dayData.nutrition } };
    const current = updated.nutrition[itemId] || { done: false, value: '' };
    updated.nutrition[itemId] = { ...current, done: !current.done };
    await saveDayData(updated);
  }, [dayData, saveDayData]);

  const updateNutritionValue = useCallback(async (itemId, value) => {
    if (!dayData) return;
    const updated = { ...dayData, nutrition: { ...dayData.nutrition } };
    const current = updated.nutrition[itemId] || { done: false, value: '' };
    updated.nutrition[itemId] = { ...current, value };
    await saveDayData(updated);
  }, [dayData, saveDayData]);

  const addNutritionItem = useCallback(async () => {
    const trimmed = addName.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = Storage.generateId();
    const templates = { ...wellnessTemplates };
    templates.nutrition = [...(templates.nutrition || []), {
      id, name: trimmed, value: addValue.trim(), sortOrder: templates.nutrition.length,
    }];
    await saveWellnessTemplates(templates);
    // Also add to current day
    if (dayData) {
      const updated = { ...dayData, nutrition: { ...dayData.nutrition, [id]: { done: false, value: addValue.trim() } } };
      await saveDayData(updated);
    }
    setAddName('');
    setAddValue('');
    setShowAddForm(false);
  }, [addName, addValue, wellnessTemplates, saveWellnessTemplates, dayData, saveDayData]);

  const deleteNutritionItem = useCallback(async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const templates = { ...wellnessTemplates };
    templates.nutrition = templates.nutrition.filter(n => n.id !== id);
    await saveWellnessTemplates(templates);
  }, [wellnessTemplates, saveWellnessTemplates]);

  // ─── Exercise ───
  const toggleExercise = useCallback(async (itemId) => {
    if (!dayData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = { ...dayData, exercise: { ...dayData.exercise } };
    const current = updated.exercise[itemId] || { done: false, value: '' };
    updated.exercise[itemId] = { ...current, done: !current.done };
    await saveDayData(updated);
  }, [dayData, saveDayData]);

  const updateExerciseValue = useCallback(async (itemId, value) => {
    if (!dayData) return;
    const updated = { ...dayData, exercise: { ...dayData.exercise } };
    const current = updated.exercise[itemId] || { done: false, value: '' };
    updated.exercise[itemId] = { ...current, value };
    await saveDayData(updated);
  }, [dayData, saveDayData]);

  const addExerciseItem = useCallback(async () => {
    const trimmed = addName.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const id = Storage.generateId();
    const templates = { ...wellnessTemplates };
    templates.exercise = [...(templates.exercise || []), {
      id, name: trimmed, type: 'custom', value: addValue.trim(), sortOrder: templates.exercise.length,
    }];
    await saveWellnessTemplates(templates);
    if (dayData) {
      const updated = { ...dayData, exercise: { ...dayData.exercise, [id]: { done: false, value: addValue.trim() } } };
      await saveDayData(updated);
    }
    setAddName('');
    setAddValue('');
    setShowAddForm(false);
  }, [addName, addValue, wellnessTemplates, saveWellnessTemplates, dayData, saveDayData]);

  const deleteExerciseItem = useCallback(async (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const templates = { ...wellnessTemplates };
    templates.exercise = templates.exercise.filter(e => e.id !== id);
    await saveWellnessTemplates(templates);
  }, [wellnessTemplates, saveWellnessTemplates]);

  // ─── Meditation ───
  const toggleMeditation = useCallback(async (slot) => {
    if (!dayData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = dayData.meditation?.[slot];
    const isDone = typeof current === 'object' ? !!current.done : !!current;
    const updated = { ...dayData, meditation: { ...dayData.meditation, [slot]: !isDone } };
    await saveDayData(updated);
  }, [dayData, saveDayData]);

  // ─── Progress ───
  const getProgress = () => {
    if (!dayData) return { done: 0, total: 0 };
    const nutDone = Object.values(dayData.nutrition || {}).filter(n => n.done).length;
    const nutTotal = (wellnessTemplates.nutrition || []).length;
    const exDone = Object.values(dayData.exercise || {}).filter(e => e.done).length;
    const exTotal = (wellnessTemplates.exercise || []).length;
    const medDone = ['am', 'pm', 'eve'].filter(s => {
      const d = dayData.meditation?.[s];
      return typeof d === 'object' ? !!d?.done : !!d;
    }).length;
    return { done: nutDone + exDone + medDone, total: nutTotal + exTotal + 3 };
  };
  const progress = getProgress();

  // ─── Render helpers ───
  const renderCheckItem = (item, isDone, value, onToggle, onValueChange, onDelete) => (
    <View key={item.id} style={[styles.checkRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <TouchableOpacity onPress={onToggle} style={styles.checkBtn}>
        <Ionicons
          name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
          size={26}
          color={isDone ? colors.accentGreen : colors.textMuted}
        />
      </TouchableOpacity>
      <View style={styles.checkInfo}>
        <Text style={[styles.checkName, { color: colors.text }, isDone && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}>
          {item.icon || ''} {item.name}
        </Text>
        <TextInput
          style={[styles.valueInput, { color: colors.text, borderColor: colors.border }]}
          value={value}
          onChangeText={onValueChange}
          placeholder="Value (e.g. 30 min)"
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
        />
      </View>
      <TouchableOpacity onPress={() => {
        Alert.alert('Remove', `Remove "${item.name}" from templates?`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: onDelete },
        ]);
      }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
      </TouchableOpacity>
    </View>
  );

  const sectionName = SECTIONS[activeSection];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={[colors.accentGreen + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <Text style={[styles.title, { color: colors.text }]}>Wellness</Text>
        {progress.total > 0 && (
          <View style={styles.progressRow}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View style={[styles.progressFill, { width: `${(progress.done / progress.total) * 100}%`, backgroundColor: colors.accentGreen }]} />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {progress.done}/{progress.total}
            </Text>
          </View>
        )}
      </View>

      {/* Section tabs */}
      <View style={styles.tabs}>
        {SECTIONS.map((s, i) => (
          <TouchableOpacity
            key={s}
            style={[styles.tab, activeSection === i && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
            onPress={() => { setActiveSection(i); setShowAddForm(false); Haptics.selectionAsync(); }}
          >
            <Text style={[styles.tabText, { color: activeSection === i ? colors.accent : colors.textMuted }]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── Nutrition ─── */}
        {activeSection === 0 && (
          <>
            {(wellnessTemplates.nutrition || []).map(item => {
              const state = dayData?.nutrition?.[item.id] || { done: false, value: item.value || '' };
              return renderCheckItem(
                { ...item, icon: '🍽️' },
                state.done,
                state.value,
                () => toggleNutrition(item.id),
                (v) => updateNutritionValue(item.id, v),
                () => deleteNutritionItem(item.id),
              );
            })}
            {(wellnessTemplates.nutrition || []).length === 0 && !showAddForm && (
              <View style={styles.emptySection}>
                <Text style={[styles.emptySectionText, { color: colors.textMuted }]}>
                  No nutrition items yet — tap + to add what you eat daily
                </Text>
              </View>
            )}
          </>
        )}

        {/* ─── Exercise ─── */}
        {activeSection === 1 && (
          <>
            {(wellnessTemplates.exercise || []).map(item => {
              const state = dayData?.exercise?.[item.id] || { done: false, value: item.value || '' };
              return renderCheckItem(
                { ...item, icon: EXERCISE_ICONS[item.type] || '💪' },
                state.done,
                state.value,
                () => toggleExercise(item.id),
                (v) => updateExerciseValue(item.id, v),
                () => deleteExerciseItem(item.id),
              );
            })}
          </>
        )}

        {/* ─── Meditation ─── */}
        {activeSection === 2 && (
          <View style={styles.meditationGrid}>
            {MEDITATION_SLOTS.map(slot => {
              const slotData = dayData?.meditation?.[slot.key];
              const isDone = typeof slotData === 'object' ? !!slotData?.done : !!slotData;
              return (
                <TouchableOpacity
                  key={slot.key}
                  style={[
                    styles.meditationCard,
                    { backgroundColor: colors.bgCard, borderColor: isDone ? colors.accentGreen : colors.border },
                    isDone && { backgroundColor: colors.accentGreen + '15' },
                  ]}
                  onPress={() => toggleMeditation(slot.key)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.meditationIcon}>{slot.icon}</Text>
                  <Text style={[styles.meditationLabel, { color: isDone ? colors.accentGreen : colors.text }]}>
                    {slot.label}
                  </Text>
                  <Ionicons
                    name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={28}
                    color={isDone ? colors.accentGreen : colors.textMuted}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Add form (nutrition & exercise) */}
        {showAddForm && activeSection < 2 && (
          <View style={[styles.addForm, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={addName}
              onChangeText={setAddName}
              placeholder={activeSection === 0 ? 'Food item name' : 'Exercise name'}
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              autoFocus
            />
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={addValue}
              onChangeText={setAddValue}
              placeholder="Default value (optional, e.g. 200g)"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
            />
            <View style={styles.addFormActions}>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: colors.textMuted + '15' }]}
                onPress={() => setShowAddForm(false)}
              >
                <Text style={[styles.formBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: colors.accent }, !addName.trim() && { opacity: 0.4 }]}
                onPress={activeSection === 0 ? addNutritionItem : addExerciseItem}
                disabled={!addName.trim()}
              >
                <Text style={[styles.formBtnText, { color: colors.textInverse || '#fff' }]}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB (nutrition & exercise only) */}
      {!showAddForm && activeSection < 2 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => { setAddName(''); setAddValue(''); setShowAddForm(true); }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.textInverse || '#fff'} />
        </TouchableOpacity>
      )}
      <KnowledgeBaseButton sectionId="wellness" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
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
  progressText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  checkBtn: {
    marginRight: 10,
  },
  checkInfo: {
    flex: 1,
  },
  checkName: {
    fontSize: SIZES.base,
    fontWeight: '600',
    marginBottom: 4,
  },
  valueInput: {
    fontSize: SIZES.sm,
    borderBottomWidth: 1,
    paddingVertical: 2,
  },
  emptySection: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: SIZES.md,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  meditationGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  meditationCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  meditationIcon: {
    fontSize: 32,
  },
  meditationLabel: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  addForm: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 8,
  },
  input: {
    fontSize: SIZES.base,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  addFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  formBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  formBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
