import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Alert, Animated, Keyboard, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getWeekKey } from '../utils/storage';
import { SIZES, FONTS } from '../utils/theme';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const AREA_SUGGESTIONS = [
  'Work & Career',
  'Home & Domestic',
  'Family & Relationships',
  'Health & Fitness',
  'Hobbies & Projects',
  'Learning & Growth',
  'Finance & Admin',
];

export default function WeeklyIntentionScreen() {
  const { colors } = useTheme();
  const {
    weeklyIntentions, futureLog,
    addWeeklyArea, removeWeeklyArea,
    addWeeklyTask, updateWeeklyTask, removeWeeklyTask,
    scheduleEntry, addEntry,
  } = useApp();

  const weekKey = useMemo(() => getWeekKey(), []);
  const currentWeek = weeklyIntentions[weekKey] || { areas: [] };
  const areas = currentWeek.areas || [];

  const [newAreaName, setNewAreaName] = useState('');
  const [showAreaInput, setShowAreaInput] = useState(false);
  const [newTaskTexts, setNewTaskTexts] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState('');

  // Get current month's future log items for the nudge
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const monthlyItems = futureLog[currentMonthKey] || [];

  const weekLabel = useMemo(() => {
    const monday = new Date(weekKey);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }, [weekKey]);

  const handleAddArea = async () => {
    const name = newAreaName.trim();
    if (!name) return;
    await addWeeklyArea(weekKey, name);
    setNewAreaName('');
    setShowAreaInput(false);
  };

  const handleAddSuggestion = async (suggestion) => {
    const exists = areas.some(a => a.name.toLowerCase() === suggestion.toLowerCase());
    if (exists) return;
    await addWeeklyArea(weekKey, suggestion);
  };

  const handleRemoveArea = (areaId, areaName) => {
    Alert.alert('Remove Area', `Delete "${areaName}" and all its tasks?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeWeeklyArea(weekKey, areaId) },
    ]);
  };

  const handleAddTask = async (areaId) => {
    const text = (newTaskTexts[areaId] || '').trim();
    if (!text) return;
    await addWeeklyTask(weekKey, areaId, text);
    setNewTaskTexts(prev => ({ ...prev, [areaId]: '' }));
  };

  const handleDeleteTask = async (areaId, taskId) => {
    await removeWeeklyTask(weekKey, areaId, taskId);
  };

  const handleToggleTask = async (areaId, taskId, currentDone) => {
    await updateWeeklyTask(weekKey, areaId, taskId, { done: !currentDone });
  };

  const handleStartEdit = (areaId, task) => {
    setEditingTask({ areaId, taskId: task.id });
    setEditText(task.text);
  };

  const handleSaveEdit = async () => {
    if (!editingTask || !editText.trim()) return;
    await updateWeeklyTask(weekKey, editingTask.areaId, editingTask.taskId, { text: editText.trim() });
    setEditingTask(null);
    setEditText('');
  };

  const handleScheduleToDaily = async (areaId, task) => {
    await addEntry({
      text: task.text,
      type: 'task',
      state: 'open',
      date: new Date().toISOString().split('T')[0],
    });
    Alert.alert('Added', `"${task.text}" added to today's daily log.`);
  };

  const unusedSuggestions = AREA_SUGGESTIONS.filter(
    s => !areas.some(a => a.name.toLowerCase() === s.toLowerCase())
  );

  const renderSwipeRight = (areaId, taskId) => {
    return (
      <TouchableOpacity
        style={[styles.swipeAction, { backgroundColor: colors.accentRed || '#e53e3e' }]}
        onPress={() => handleDeleteTask(areaId, taskId)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Weekly Intention</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>{weekLabel}</Text>
          </View>
          <KnowledgeBaseButton screenName="Weekly" />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Monthly nudge */}
          {monthlyItems.length > 0 && (
            <View style={[styles.nudgeBanner, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Ionicons name="bulb-outline" size={18} color={colors.accentGold || colors.accent} />
              <Text style={[styles.nudgeText, { color: colors.textSecondary }]}>
                You have {monthlyItems.length} item{monthlyItems.length !== 1 ? 's' : ''} in your monthly log — consider pulling some into this week.
              </Text>
            </View>
          )}

          {/* Areas */}
          {areas.length === 0 && !showAreaInput ? (
            <View style={[styles.emptyState, { backgroundColor: colors.bgCard }]}>
              <Ionicons name="compass-outline" size={40} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Plan your week</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                What areas do you want to focus on? Think about work, home, family, hobbies, personal growth...
              </Text>
              <View style={styles.suggestionChips}>
                {AREA_SUGGESTIONS.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.suggestionChip, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                    onPress={() => handleAddSuggestion(s)}
                  >
                    <Text style={[styles.suggestionChipText, { color: colors.accent }]}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={[styles.addCustomBtn, { borderColor: colors.accent }]}
                onPress={() => setShowAreaInput(true)}
              >
                <Ionicons name="add" size={18} color={colors.accent} />
                <Text style={[styles.addCustomText, { color: colors.accent }]}>Add custom area</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {areas.map(area => {
                const completedCount = area.tasks.filter(t => t.done).length;
                return (
                  <View key={area.id} style={[styles.areaCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <View style={styles.areaHeader}>
                      <View style={styles.areaHeaderLeft}>
                        <Text style={[styles.areaName, { color: colors.text }]}>{area.name}</Text>
                        {area.tasks.length > 0 && (
                          <Text style={[styles.areaCount, { color: colors.textMuted }]}>
                            {completedCount}/{area.tasks.length}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => handleRemoveArea(area.id, area.name)}>
                        <Ionicons name="close-circle-outline" size={20} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Tasks */}
                    {area.tasks.map(task => (
                      <Swipeable
                        key={task.id}
                        renderRightActions={() => renderSwipeRight(area.id, task.id)}
                        overshootRight={false}
                      >
                        {editingTask?.taskId === task.id ? (
                          <View style={[styles.taskRow, { borderBottomColor: colors.borderLight }]}>
                            <TextInput
                              style={[styles.editInput, { color: colors.text, borderColor: colors.accent, backgroundColor: colors.bgInput }]}
                              value={editText}
                              onChangeText={setEditText}
                              onSubmitEditing={handleSaveEdit}
                              onBlur={handleSaveEdit}
                              autoFocus
                              returnKeyType="done"
                            />
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={[styles.taskRow, { borderBottomColor: colors.borderLight }]}
                            onPress={() => handleToggleTask(area.id, task.id, task.done)}
                            onLongPress={() => handleStartEdit(area.id, task)}
                            delayLongPress={500}
                          >
                            <Ionicons
                              name={task.done ? 'checkmark-circle' : 'ellipse-outline'}
                              size={20}
                              color={task.done ? (colors.accentGreen || '#48bb78') : colors.textMuted}
                            />
                            <Text
                              style={[
                                styles.taskText,
                                { color: task.done ? colors.textMuted : colors.text },
                                task.done && styles.taskDone,
                              ]}
                              numberOfLines={2}
                            >
                              {task.text}
                            </Text>
                            <TouchableOpacity
                              style={styles.scheduleBtn}
                              onPress={() => handleScheduleToDaily(area.id, task)}
                            >
                              <Ionicons name="today-outline" size={16} color={colors.accent} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        )}
                      </Swipeable>
                    ))}

                    {/* Add task input */}
                    <View style={styles.addTaskRow}>
                      <TextInput
                        style={[styles.addTaskInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.bgInput }]}
                        placeholder="Add a task..."
                        placeholderTextColor={colors.textMuted}
                        value={newTaskTexts[area.id] || ''}
                        onChangeText={t => setNewTaskTexts(prev => ({ ...prev, [area.id]: t }))}
                        onSubmitEditing={() => handleAddTask(area.id)}
                        returnKeyType="done"
                      />
                      <TouchableOpacity
                        style={[styles.addTaskBtn, { backgroundColor: colors.accent }]}
                        onPress={() => handleAddTask(area.id)}
                      >
                        <Ionicons name="add" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Add more areas */}
              {unusedSuggestions.length > 0 && (
                <View style={styles.moreSuggestions}>
                  <Text style={[styles.moreSuggestionsLabel, { color: colors.textMuted }]}>Add another area:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {unusedSuggestions.map(s => (
                      <TouchableOpacity
                        key={s}
                        style={[styles.miniChip, { backgroundColor: colors.bgElevated, borderColor: colors.border }]}
                        onPress={() => handleAddSuggestion(s)}
                      >
                        <Text style={[styles.miniChipText, { color: colors.accent }]}>{s}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Custom area input */}
              {showAreaInput ? (
                <View style={[styles.areaInputRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.areaInput, { color: colors.text, borderColor: colors.borderLight, backgroundColor: colors.bgInput }]}
                    placeholder="Area name..."
                    placeholderTextColor={colors.textMuted}
                    value={newAreaName}
                    onChangeText={setNewAreaName}
                    onSubmitEditing={handleAddArea}
                    autoFocus
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={[styles.addAreaBtn, { backgroundColor: colors.accent }]} onPress={handleAddArea}>
                    <Text style={styles.addAreaBtnText}>Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setShowAreaInput(false); setNewAreaName(''); }}>
                    <Ionicons name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.addCustomBtn, { borderColor: colors.accent, alignSelf: 'center', marginTop: 12 }]}
                  onPress={() => setShowAreaInput(true)}
                >
                  <Ionicons name="add" size={18} color={colors.accent} />
                  <Text style={[styles.addCustomText, { color: colors.accent }]}>Add custom area</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: SIZES.xl, fontFamily: FONTS.bold },
  headerSubtitle: { fontSize: SIZES.sm, fontFamily: FONTS.regular, marginTop: 2 },
  content: { flex: 1, paddingHorizontal: SIZES.md },
  // Monthly nudge
  nudgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: SIZES.sm,
    marginTop: SIZES.sm,
    borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  nudgeText: { flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.regular },
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: SIZES.lg,
    marginTop: SIZES.lg,
    borderRadius: SIZES.radiusLg,
  },
  emptyTitle: { fontSize: SIZES.lg, fontFamily: FONTS.bold, marginTop: SIZES.sm },
  emptySubtitle: {
    fontSize: SIZES.sm, fontFamily: FONTS.regular, textAlign: 'center',
    marginTop: 4, marginBottom: SIZES.md, lineHeight: 20,
  },
  suggestionChips: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8,
    marginBottom: SIZES.md,
  },
  suggestionChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  suggestionChipText: { fontSize: SIZES.sm, fontFamily: FONTS.medium },
  addCustomBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderStyle: 'dashed',
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  addCustomText: { fontSize: SIZES.sm, fontFamily: FONTS.medium },
  // Area card
  areaCard: {
    marginTop: SIZES.sm, borderRadius: SIZES.radiusLg,
    borderWidth: 1, overflow: 'hidden',
  },
  areaHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
  },
  areaHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  areaName: { fontSize: SIZES.base, fontFamily: FONTS.bold },
  areaCount: { fontSize: SIZES.xs, fontFamily: FONTS.regular },
  // Tasks
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SIZES.md, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskText: { flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.regular },
  taskDone: { textDecorationLine: 'line-through', opacity: 0.6 },
  scheduleBtn: { padding: 4 },
  swipeAction: {
    justifyContent: 'center', alignItems: 'center',
    width: 60, borderRadius: 0,
  },
  editInput: {
    flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.regular,
    borderWidth: 1, borderRadius: SIZES.radius,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  // Add task
  addTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: SIZES.md, paddingVertical: 8,
  },
  addTaskInput: {
    flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.regular,
    borderWidth: 1, borderRadius: SIZES.radius,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  addTaskBtn: {
    width: 32, height: 32, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  // More suggestions
  moreSuggestions: { marginTop: SIZES.sm, gap: 6 },
  moreSuggestionsLabel: { fontSize: SIZES.xs, fontFamily: FONTS.regular, marginLeft: 4 },
  miniChip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, marginRight: 6,
  },
  miniChipText: { fontSize: SIZES.xs, fontFamily: FONTS.medium },
  // Area input
  areaInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: SIZES.sm, marginTop: SIZES.sm,
    borderRadius: SIZES.radiusLg, borderWidth: 1,
  },
  areaInput: {
    flex: 1, fontSize: SIZES.sm, fontFamily: FONTS.regular,
    borderWidth: 1, borderRadius: SIZES.radius,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  addAreaBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: SIZES.radius,
  },
  addAreaBtnText: { color: '#fff', fontSize: SIZES.sm, fontFamily: FONTS.bold },
});
