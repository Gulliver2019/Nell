import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import CATEGORIES, { CATEGORY_MAP, UNCATEGORISED } from '../utils/categories';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function GoalsScreen() {
  const { colors } = useTheme();
  const {
    goals, projects,
    addGoal, updateGoal, deleteGoal, toggleGoalPriority,
    linkProjectToGoal, unlinkProjectFromGoal,
    addGoalDiscipline, updateGoalDiscipline, deleteGoalDiscipline,
    addGoalWeeklyTask, updateGoalWeeklyTask, deleteGoalWeeklyTask,
    addGoalStandard, updateGoalStandard, deleteGoalStandard,
    addGoalHabit, deleteGoalHabit,
    addHabit, deleteHabit, habits: allHabits,
    addRoutine, updateRoutine, deleteRoutine, routines,
    addEntry, selectedDate,
  } = useApp();

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [showDayPicker, setShowDayPicker] = useState(null); // holds discipline object when picking days
  const [showCategoryPicker, setShowCategoryPicker] = useState(null); // holds { goalId, section, item }

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formNinetyDayTarget, setFormNinetyDayTarget] = useState('');

  // Add item state
  const [addingSection, setAddingSection] = useState(null);
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editItemText, setEditItemText] = useState('');
  const [newHabitTimeOfDay, setNewHabitTimeOfDay] = useState('morning');
  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormNinetyDayTarget('');
  };

  // ─── Goal CRUD ────────────────────────────────────
  const handleCreateGoal = async () => {
    if (!formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addGoal({
      title: formTitle.trim(),
      description: formDescription.trim(),
      ninetyDayTarget: formNinetyDayTarget.trim(),
    });
    resetForm();
    setShowNewModal(false);
  };

  const openEditModal = (goal) => {
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setFormNinetyDayTarget(goal.ninetyDayTarget || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateGoal(selectedGoal.id, {
      title: formTitle.trim(),
      description: formDescription.trim(),
      ninetyDayTarget: formNinetyDayTarget.trim(),
    });
    setShowEditModal(false);
  };

  const handleDeleteGoal = (goal) => {
    Alert.alert('Delete Goal', `Remove "${goal.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (selectedGoal?.id === goal.id) setSelectedGoal(null);
        await deleteGoal(goal.id);
      }},
    ]);
  };

  const handleTogglePriority = async (goal) => {
    // Soft cap: if making priority and already at max, prompt to deprioritise one
    if (goal.isPriority === false) {
      const currentPriority = goals.filter(g => g.isPriority !== false && g.id !== goal.id);
      if (currentPriority.length >= MAX_PRIORITY) {
        Alert.alert(
          'Focus Limit',
          `You already have ${MAX_PRIORITY} priority goals. Deprioritise one first to keep your focus sharp.`,
          [{ text: 'OK', style: 'default' }]
        );
        return;
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await toggleGoalPriority(goal.id);
  };

  // ─── Linked Projects ──────────────────────────────
  const handleLinkProject = async (projectId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await linkProjectToGoal(selectedGoal.id, projectId);
    setShowProjectPicker(false);
  };

  const handleUnlinkProject = (projectId) => {
    const proj = projects.find(p => p.id === projectId);
    Alert.alert('Unlink Project', `Remove "${proj?.title || 'project'}" from this goal?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        await unlinkProjectFromGoal(selectedGoal.id, projectId);
      }},
    ]);
  };

  // ─── Sub-item actions ─────────────────────────────
  const handleAddItem = async (goalId) => {
    if (!newItemText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (addingSection === 'discipline') {
      await addGoalDiscipline(goalId, newItemText.trim());
    } else if (addingSection === 'weeklyTask') {
      await addGoalWeeklyTask(goalId, newItemText.trim());
    } else if (addingSection === 'standard') {
      await addGoalStandard(goalId, newItemText.trim());
    } else if (addingSection === 'habit') {
      const newHabit = await addHabit({
        name: newItemText.trim(),
        icon: '🔄',
        timeOfDay: newHabitTimeOfDay,
        twoMinVersion: '',
      });
      if (newHabit?.id) await addGoalHabit(goalId, newHabit.id);
      setNewHabitTimeOfDay('morning');
    }
    setNewItemText('');
    setAddingSection(null);
  };

  const handleEditItem = async (goalId) => {
    if (!editingItem || !editItemText.trim()) return;
    if (editingItem.section === 'discipline') {
      await updateGoalDiscipline(goalId, editingItem.id, { text: editItemText.trim() });
    } else if (editingItem.section === 'weeklyTask') {
      await updateGoalWeeklyTask(goalId, editingItem.id, { text: editItemText.trim() });
    } else if (editingItem.section === 'standard') {
      await updateGoalStandard(goalId, editingItem.id, { text: editItemText.trim() });
    }
    setEditingItem(null);
    setEditItemText('');
  };

  const handleDeleteItem = (goalId, section, item) => {
    const label = item.text || item.name || 'this item';
    Alert.alert('Delete', `Remove "${label}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (section === 'discipline') {
          if (item.routineId) await deleteRoutine(item.routineId);
          await deleteGoalDiscipline(goalId, item.id);
        }
        else if (section === 'weeklyTask') await deleteGoalWeeklyTask(goalId, item.id);
        else if (section === 'standard') await deleteGoalStandard(goalId, item.id);
        else if (section === 'habit') {
          await deleteHabit(item.id);
          await deleteGoalHabit(goalId, item.id);
        }
      }},
    ]);
  };

  // ─── Send weekly task to today's daily ────
  const handleSendToToday = async (task) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addEntry({
      text: task.text,
      type: 'task',
      state: 'open',
      date: selectedDate,
      category: task.category || null,
    });
    Alert.alert('Added ✓', `"${task.text}" added to today's daily.`);
  };

  // ─── Send item to daily as a quick win ────
  const handleSendAsQuickWin = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addEntry({
      text: item.text,
      type: 'task',
      state: 'open',
      date: selectedDate,
      isQuickWin: true,
      routineId: item.routineId || null,
      category: item.category || null,
    });
    Alert.alert('Quick Win ⚡', `"${item.text}" added to today's quick wins.`);
  };

  // ─── Add discipline to daily (creates routine) ────
  const handleAddToDaily = async (goalId, discipline) => {
    if (discipline.routineId) {
      Alert.alert('Already Active', 'This discipline is already repeating on your daily.');
      return;
    }
    // Show day picker - user chooses every day or specific days
    setShowDayPicker({ goalId, discipline });
  };

  const handleConfirmDays = async (repeatDays) => {
    if (!showDayPicker) return;
    const { goalId, discipline } = showDayPicker;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const routine = await addRoutine({ text: discipline.text, enabled: true, repeatDays, category: discipline.category || null });
    await updateGoalDiscipline(goalId, discipline.id, { routineId: routine.id });
    setShowDayPicker(null);
    const label = repeatDays ? DAY_LABELS.filter((_, i) => repeatDays.includes(i)).join(', ') : 'every day';
    Alert.alert('Added ✓', `This discipline will repeat on your daily (${label}).`);
  };

  const handleEditRoutineDays = (discipline) => {
    if (!discipline.routineId) return;
    const routine = routines.find(r => r.id === discipline.routineId);
    if (!routine) return;
    setShowDayPicker({ goalId: selectedGoal.id, discipline, existingRoutineId: routine.id, currentDays: routine.repeatDays });
  };

  const handleUpdateRoutineDays = async (repeatDays) => {
    if (!showDayPicker?.existingRoutineId) return;
    await updateRoutine(showDayPicker.existingRoutineId, { repeatDays });
    setShowDayPicker(null);
  };

  const handleRemoveFromDaily = (goalId, discipline) => {
    Alert.alert('Remove from Daily', 'Stop this discipline from repeating on your daily?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        if (discipline.routineId) {
          await deleteRoutine(discipline.routineId);
        }
        await updateGoalDiscipline(goalId, discipline.id, { routineId: null });
      }},
    ]);
  };

  // ═══════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════
  if (selectedGoal) {
    const goal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    const disciplines = goal.dailyDisciplines || [];
    const weeklyTasks = goal.weeklyTasks || [];
    const standards = goal.standards || [];
    const habits = (goal.habitIds || [])
      .map(id => allHabits.find(h => h.id === id))
      .filter(Boolean);
    const linkedProjects = (goal.linkedProjectIds || [])
      .map(id => projects.find(p => p.id === id))
      .filter(Boolean);
    const availableProjects = projects.filter(
      p => !(goal.linkedProjectIds || []).includes(p.id)
    );

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setSelectedGoal(null); setAddingSection(null); setEditingItem(null); }} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{goal.title}</Text>
            {goal.description ? (
              <Text style={[styles.detailDescription, { color: colors.textSecondary }]}>{goal.description}</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => handleTogglePriority(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 12 }}>
            <Ionicons name={goal.isPriority !== false ? 'star' : 'star-outline'} size={20} color={goal.isPriority !== false ? '#F59E0B' : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openEditModal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 12 }}>
            <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteGoal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

          {/* ──── 90-Day Target ──── */}
          {goal.ninetyDayTarget ? (
            <View style={[styles.targetCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
              <View style={styles.targetHeader}>
                <Ionicons name="flag" size={16} color={colors.accent} />
                <Text style={[styles.targetLabel, { color: colors.accent }]}>90-DAY TARGET</Text>
              </View>
              <Text style={[styles.targetText, { color: colors.text }]}>{goal.ninetyDayTarget}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.targetCardEmpty, { borderColor: colors.accent + '30' }]}
              onPress={() => openEditModal(goal)}
            >
              <Ionicons name="flag-outline" size={16} color={colors.accent} />
              <Text style={[styles.targetEmptyText, { color: colors.accent }]}>Set a 90-day target...</Text>
            </TouchableOpacity>
          )}

          {/* ──── Linked Projects ──── */}
          <View style={[styles.sectionHeader, { marginTop: 20 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LINKED PROJECTS</Text>
            {availableProjects.length > 0 && (
              <TouchableOpacity
                onPress={() => setShowProjectPicker(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
              </TouchableOpacity>
            )}
          </View>

          {linkedProjects.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {availableProjects.length > 0 ? 'Link a project to track progress' : 'No projects created yet'}
            </Text>
          )}

          {linkedProjects.map(proj => (
            <View key={proj.id} style={[styles.projectRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={styles.projectEmoji}>{proj.emoji || '🎯'}</Text>
              <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>{proj.title}</Text>
              <TouchableOpacity onPress={() => handleUnlinkProject(proj.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}

          {/* ──── Daily Disciplines ──── */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>DAILY DISCIPLINES</Text>
            <TouchableOpacity
              onPress={() => { setAddingSection(addingSection === 'discipline' ? null : 'discipline'); setNewItemText(''); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name={addingSection === 'discipline' ? 'close-circle' : 'add-circle-outline'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {disciplines.length === 0 && addingSection !== 'discipline' && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No daily disciplines yet</Text>
          )}

          {disciplines.map(d => (
            <View key={d.id} style={[styles.itemRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {editingItem?.id === d.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, backgroundColor: colors.bgInput }]}
                    value={editItemText}
                    onChangeText={setEditItemText}
                    autoFocus
                    selectionColor={colors.accent}
                  />
                  <TouchableOpacity onPress={() => handleEditItem(goal.id)}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.accentGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemContent}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
                    <TouchableOpacity
                      onPress={() => setShowCategoryPicker({ goalId: goal.id, section: 'discipline', item: d })}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <View style={[styles.categoryBadge, { backgroundColor: (CATEGORY_MAP[d.category]?.color || UNCATEGORISED.color) + '20' }]}>
                        <Text style={styles.categoryBadgeText}>{CATEGORY_MAP[d.category]?.emoji || UNCATEGORISED.emoji}</Text>
                      </View>
                    </TouchableOpacity>
                    <Text style={[styles.itemText, { color: colors.text, flex: 1 }]}>{d.text}</Text>
                  </View>
                  <View style={styles.itemActions}>
                    {d.routineId ? (
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        <TouchableOpacity onPress={() => handleEditRoutineDays(d)} onLongPress={() => handleRemoveFromDaily(goal.id, d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <View style={[styles.activeBadge, { backgroundColor: colors.accentGreen + '20' }]}>
                            <Text style={[styles.activeBadgeText, { color: colors.accentGreen }]}>
                              {(() => {
                                const routine = routines.find(r => r.id === d.routineId);
                                if (!routine?.repeatDays || routine.repeatDays.length === 0) return 'Daily';
                                if (routine.repeatDays.length === 7) return 'Daily';
                                return routine.repeatDays.map(i => DAY_LABELS[i]).join(', ');
                              })()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleRemoveFromDaily(goal.id, d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                          <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => handleAddToDaily(goal.id, d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <View style={[styles.addDailyBtn, { backgroundColor: colors.accent + '15' }]}>
                          <Text style={[styles.addDailyText, { color: colors.accent }]}>→ Daily</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleSendAsQuickWin(d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <View style={[styles.addDailyBtn, { backgroundColor: colors.accentGreen + '15' }]}>
                        <Text style={[styles.addDailyText, { color: colors.accentGreen }]}>⚡</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingItem({ section: 'discipline', id: d.id }); setEditItemText(d.text); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(goal.id, 'discipline', d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {addingSection === 'discipline' && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Add a daily discipline..."
                placeholderTextColor={colors.textMuted}
                value={newItemText}
                onChangeText={setNewItemText}
                selectionColor={colors.accent}
                autoFocus
              />
              <TouchableOpacity onPress={() => handleAddItem(goal.id)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ──── Weekly Tasks ──── */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WEEKLY TASKS</Text>
            <TouchableOpacity
              onPress={() => { setAddingSection(addingSection === 'weeklyTask' ? null : 'weeklyTask'); setNewItemText(''); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name={addingSection === 'weeklyTask' ? 'close-circle' : 'add-circle-outline'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {weeklyTasks.length === 0 && addingSection !== 'weeklyTask' && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No weekly tasks yet</Text>
          )}

          {weeklyTasks.map(t => (
            <View key={t.id} style={[styles.itemRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {editingItem?.id === t.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, backgroundColor: colors.bgInput }]}
                    value={editItemText}
                    onChangeText={setEditItemText}
                    autoFocus
                    selectionColor={colors.accent}
                  />
                  <TouchableOpacity onPress={() => handleEditItem(goal.id)}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.accentGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemContent}>
                  <Text style={[styles.itemText, { color: colors.text }]}>{t.text}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => handleSendToToday(t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <View style={[styles.addDailyBtn, { backgroundColor: colors.accent + '15' }]}>
                        <Text style={[styles.addDailyText, { color: colors.accent }]}>→ Today</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSendAsQuickWin(t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <View style={[styles.addDailyBtn, { backgroundColor: colors.accentGreen + '15' }]}>
                        <Text style={[styles.addDailyText, { color: colors.accentGreen }]}>⚡</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingItem({ section: 'weeklyTask', id: t.id }); setEditItemText(t.text); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(goal.id, 'weeklyTask', t)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {addingSection === 'weeklyTask' && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Add a weekly task..."
                placeholderTextColor={colors.textMuted}
                value={newItemText}
                onChangeText={setNewItemText}
                selectionColor={colors.accent}
                autoFocus
              />
              <TouchableOpacity onPress={() => handleAddItem(goal.id)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ──── Standards ──── */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>STANDARDS</Text>
            <TouchableOpacity
              onPress={() => { setAddingSection(addingSection === 'standard' ? null : 'standard'); setNewItemText(''); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name={addingSection === 'standard' ? 'close-circle' : 'add-circle-outline'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {standards.length === 0 && addingSection !== 'standard' && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No standards set yet</Text>
          )}

          {standards.map(s => (
            <View key={s.id} style={[styles.itemRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {editingItem?.id === s.id ? (
                <View style={styles.editRow}>
                  <TextInput
                    style={[styles.editInput, { color: colors.text, backgroundColor: colors.bgInput }]}
                    value={editItemText}
                    onChangeText={setEditItemText}
                    autoFocus
                    selectionColor={colors.accent}
                  />
                  <TouchableOpacity onPress={() => handleEditItem(goal.id)}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.accentGreen} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingItem(null)}>
                    <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.itemContent}>
                  <Text style={[styles.itemText, { color: colors.text }]}>{s.text}</Text>
                  <View style={styles.itemActions}>
                    <TouchableOpacity onPress={() => handleSendAsQuickWin(s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <View style={[styles.addDailyBtn, { backgroundColor: colors.accentGreen + '15' }]}>
                        <Text style={[styles.addDailyText, { color: colors.accentGreen }]}>⚡</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingItem({ section: 'standard', id: s.id }); setEditItemText(s.text); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(goal.id, 'standard', s)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}

          {addingSection === 'standard' && (
            <View style={styles.addRow}>
              <TextInput
                style={[styles.addInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Add a standard..."
                placeholderTextColor={colors.textMuted}
                value={newItemText}
                onChangeText={setNewItemText}
                selectionColor={colors.accent}
                autoFocus
              />
              <TouchableOpacity onPress={() => handleAddItem(goal.id)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                <Ionicons name="add" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ──── Habits ──── */}
          <View style={[styles.sectionHeader, { marginTop: 24 }]}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>🔄 HABITS</Text>
            <TouchableOpacity
              onPress={() => { setAddingSection(addingSection === 'habit' ? null : 'habit'); setNewItemText(''); setNewHabitTimeOfDay('morning'); }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name={addingSection === 'habit' ? 'close-circle' : 'add-circle-outline'} size={22} color={colors.accent} />
            </TouchableOpacity>
          </View>

          {habits.length === 0 && addingSection !== 'habit' && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No habits linked yet — add behavioural habits here</Text>
          )}

          {habits.map(h => (
            <View key={h.id} style={[styles.itemRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.itemContent}>
                <Text style={[styles.itemText, { color: colors.text }]}>
                  {h.icon || '🔄'} {h.name}
                </Text>
                <View style={styles.itemActions}>
                  <View style={[styles.habitTimeBadge, { backgroundColor: colors.accent + '20' }]}>
                    <Text style={{ fontSize: 11, color: colors.accent }}>
                      {h.timeOfDay === 'morning' ? '☀️' : h.timeOfDay === 'afternoon' ? '🌤️' : '🌙'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteItem(goal.id, 'habit', h)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}

          {addingSection === 'habit' && (
            <View>
              <View style={styles.addRow}>
                <TextInput
                  style={[styles.addInput, { backgroundColor: colors.bgInput, color: colors.text, flex: 1 }]}
                  placeholder="New habit name..."
                  placeholderTextColor={colors.textMuted}
                  value={newItemText}
                  onChangeText={setNewItemText}
                  selectionColor={colors.accent}
                  autoFocus
                />
                <TouchableOpacity onPress={() => handleAddItem(goal.id)} style={[styles.addBtn, { backgroundColor: colors.accent }]}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              <View style={styles.habitTimeRow}>
                {[
                  { key: 'morning', label: '☀️ AM' },
                  { key: 'afternoon', label: '🌤️ PM' },
                  { key: 'evening', label: '🌙 Eve' },
                ].map(t => (
                  <TouchableOpacity
                    key={t.key}
                    onPress={() => setNewHabitTimeOfDay(t.key)}
                    style={[
                      styles.habitTimeChip,
                      { borderColor: colors.border },
                      newHabitTimeOfDay === t.key && { backgroundColor: colors.accent + '30', borderColor: colors.accent },
                    ]}
                  >
                    <Text style={{ fontSize: 13, color: newHabitTimeOfDay === t.key ? colors.accent : colors.textSecondary }}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Edit Goal Modal */}
        {renderGoalModal(true)}

        {/* Project Picker Modal */}
        <Modal visible={showProjectPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowProjectPicker(false)}>
            <View style={[styles.pickerContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Link a Project</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {availableProjects.map(proj => (
                  <TouchableOpacity
                    key={proj.id}
                    style={[styles.pickerItem, { borderColor: colors.border }]}
                    onPress={() => handleLinkProject(proj.id)}
                  >
                    <Text style={styles.pickerEmoji}>{proj.emoji || '🎯'}</Text>
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{proj.title}</Text>
                  </TouchableOpacity>
                ))}
                {availableProjects.length === 0 && (
                  <Text style={[styles.emptyText, { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 }]}>All projects already linked</Text>
                )}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Day Picker Modal */}
        <DayPickerModal
          visible={!!showDayPicker}
          colors={colors}
          initialDays={showDayPicker?.currentDays || null}
          isEditing={!!showDayPicker?.existingRoutineId}
          onConfirm={(days) => {
            if (showDayPicker?.existingRoutineId) {
              handleUpdateRoutineDays(days);
            } else {
              handleConfirmDays(days);
            }
          }}
          onClose={() => setShowDayPicker(null)}
        />

        {/* Category Picker Modal */}
        <Modal visible={!!showCategoryPicker} transparent animationType="fade">
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCategoryPicker(null)}>
            <View style={[styles.pickerContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>Set Category</Text>
              <TouchableOpacity
                style={[styles.pickerItem, { borderColor: colors.border }]}
                onPress={async () => {
                  const { goalId, section, item } = showCategoryPicker;
                  if (section === 'discipline') await updateGoalDiscipline(goalId, item.id, { category: null });
                  else if (section === 'weeklyTask') await updateGoalWeeklyTask(goalId, item.id, { category: null });
                  else if (section === 'standard') await updateGoalStandard(goalId, item.id, { category: null });
                  if (item.routineId) await updateRoutine(item.routineId, { category: null });
                  setShowCategoryPicker(null);
                }}
              >
                <Text style={styles.pickerEmoji}>{UNCATEGORISED.emoji}</Text>
                <Text style={[styles.pickerItemText, { color: colors.text }]}>None</Text>
              </TouchableOpacity>
              {CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.pickerItem, { borderColor: colors.border },
                    showCategoryPicker?.item?.category === c.key && { backgroundColor: c.color + '15' }]}
                  onPress={async () => {
                    const { goalId, section, item } = showCategoryPicker;
                    if (section === 'discipline') await updateGoalDiscipline(goalId, item.id, { category: c.key });
                    else if (section === 'weeklyTask') await updateGoalWeeklyTask(goalId, item.id, { category: c.key });
                    else if (section === 'standard') await updateGoalStandard(goalId, item.id, { category: c.key });
                    if (item.routineId) await updateRoutine(item.routineId, { category: c.key });
                    setShowCategoryPicker(null);
                  }}
                >
                  <Text style={styles.pickerEmoji}>{c.emoji}</Text>
                  <Text style={[styles.pickerItemText, { color: colors.text }]}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════
  // GOAL FORM MODAL (shared for create + edit)
  // ═══════════════════════════════════════════════════
  function renderGoalModal(isEdit) {
    const visible = isEdit ? showEditModal : showNewModal;
    const onClose = () => isEdit ? setShowEditModal(false) : setShowNewModal(false);
    const onSubmit = isEdit ? handleSaveEdit : handleCreateGoal;
    const submitLabel = isEdit ? 'Save' : 'Create';
    const title = isEdit ? 'Edit Goal' : 'New Goal';

    return (
      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalTopContainer} edges={['top']}>
            <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Goal title"
                placeholderTextColor={colors.textMuted}
                value={formTitle}
                onChangeText={setFormTitle}
                selectionColor={colors.accent}
                autoFocus
              />

              <TextInput
                style={[styles.modalInput, styles.modalTextarea, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Description (optional)"
                placeholderTextColor={colors.textMuted}
                value={formDescription}
                onChangeText={setFormDescription}
                selectionColor={colors.accent}
                multiline
                numberOfLines={3}
              />

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="90-day target — what does success look like?"
                placeholderTextColor={colors.textMuted}
                value={formNinetyDayTarget}
                onChangeText={setFormNinetyDayTarget}
                selectionColor={colors.accent}
                multiline
                numberOfLines={2}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: colors.bgInput }]}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onSubmit} style={styles.createBtn}>
                  <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.createGradient}>
                    <Text style={[styles.createText, { color: colors.text }]}>{submitLabel}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════
  // GOAL CARDS LIST
  // ═══════════════════════════════════════════════════
  // Sort: priority goals first
  const sortedGoals = [...goals].sort((a, b) => {
    const aPri = a.isPriority !== false ? 1 : 0;
    const bPri = b.isPriority !== false ? 1 : 0;
    return bPri - aPri;
  });

  const priorityGoals = sortedGoals.filter(g => g.isPriority !== false);
  const parkedGoals = sortedGoals.filter(g => g.isPriority === false);
  const MAX_PRIORITY = 3;

  const renderGoal = ({ item }) => {
    const disciplineCount = (item.dailyDisciplines || []).length;
    const weeklyCount = (item.weeklyTasks || []).length;
    const linkedCount = (item.linkedProjectIds || []).length;
    const habitCount = (item.habitIds || []).length;
    const isPriority = item.isPriority !== false;
    const dimmed = !isPriority;
    const firstStandard = (item.standards || [])[0];

    return (
      <TouchableOpacity
        style={[
          styles.goalCard,
          { backgroundColor: colors.bgCard, borderColor: dimmed ? colors.border + '60' : colors.border },
          dimmed && { opacity: 0.5 },
        ]}
        onPress={() => setSelectedGoal(item)}
        onLongPress={() => handleTogglePriority(item)}
        activeOpacity={0.7}
      >
        <View style={styles.goalCardHeader}>
          <Text style={[styles.goalCardTitle, { color: colors.text }]}>{item.title}</Text>
          {isPriority && <Ionicons name="star" size={14} color="#F59E0B" />}
        </View>
        {item.description ? (
          <Text style={[styles.goalCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        {item.ninetyDayTarget ? (
          <View style={[styles.goalCardTarget, { backgroundColor: colors.accent + '10' }]}>
            <Ionicons name="flag" size={12} color={colors.accent} />
            <Text style={[styles.goalCardTargetText, { color: colors.accent }]} numberOfLines={1}>{item.ninetyDayTarget}</Text>
          </View>
        ) : null}
        {firstStandard ? (
          <View style={[styles.goalCardStandard, { backgroundColor: colors.accentOrange + '12', borderColor: colors.accentOrange + '30' }]}>
            <Text style={[styles.goalCardStandardLabel, { color: colors.accentOrange }]}>⚡ STANDARD</Text>
            <Text style={[styles.goalCardStandardText, { color: colors.text }]}>{firstStandard.text}</Text>
          </View>
        ) : null}
        <View style={styles.goalCardFooter}>
          <Text style={[styles.goalCardStat, { color: colors.textMuted }]}>
            {disciplineCount} discipline{disciplineCount !== 1 ? 's' : ''} · {weeklyCount} weekly{habitCount > 0 ? ` · 🔄 ${habitCount}` : ''}{linkedCount > 0 ? ` · ${linkedCount} project${linkedCount !== 1 ? 's' : ''}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.header}>
        <LinearGradient colors={[colors.accent + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Goals</Text>
        <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
          {priorityGoals.length}/{MAX_PRIORITY} priority · Long press to toggle
        </Text>
      </View>
      <FlatList
        data={priorityGoals}
        keyExtractor={item => item.id}
        renderItem={renderGoal}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyLabel, { color: colors.textMuted }]}>Set your first goal</Text>
            <Text style={[styles.emptySubLabel, { color: colors.textMuted }]}>Define a 90-day target, link projects & add disciplines</Text>
          </View>
        }
        ListFooterComponent={
          <>
            <TouchableOpacity
              style={[styles.newGoalBtn, { borderColor: colors.accent + '40' }]}
              onPress={() => { resetForm(); setShowNewModal(true); }}
            >
              <Ionicons name="add" size={24} color={colors.accent} />
              <Text style={[styles.newGoalBtnText, { color: colors.accent }]}>New Goal</Text>
            </TouchableOpacity>

            {/* Parked goals section */}
            {parkedGoals.length > 0 && (
              <View style={{ marginTop: 24 }}>
                <View style={styles.parkedHeader}>
                  <View style={[styles.parkedLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.parkedLabel, { color: colors.textMuted }]}>PARKED</Text>
                  <View style={[styles.parkedLine, { backgroundColor: colors.border }]} />
                </View>
                {parkedGoals.map(item => (
                  <View key={item.id}>{renderGoal({ item })}</View>
                ))}
              </View>
            )}
          </>
        }
      />
      {renderGoalModal(false)}
      <KnowledgeBaseButton sectionId="goals" />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════
// DAY PICKER MODAL COMPONENT
// ═══════════════════════════════════════════════════
function DayPickerModal({ visible, colors, initialDays, isEditing, onConfirm, onClose }) {
  const [selectedDays, setSelectedDays] = React.useState([]);
  const [everyDay, setEveryDay] = React.useState(true);

  React.useEffect(() => {
    if (visible) {
      if (initialDays && initialDays.length > 0 && initialDays.length < 7) {
        setSelectedDays(initialDays);
        setEveryDay(false);
      } else {
        setSelectedDays([]);
        setEveryDay(true);
      }
    }
  }, [visible, initialDays]);

  const toggleDay = (dayIdx) => {
    setSelectedDays(prev =>
      prev.includes(dayIdx) ? prev.filter(d => d !== dayIdx) : [...prev, dayIdx].sort()
    );
  };

  const handleConfirm = () => {
    if (everyDay) {
      onConfirm(null);
    } else {
      if (selectedDays.length === 0) return;
      onConfirm(selectedDays);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity style={dpStyles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={[dpStyles.content, { backgroundColor: colors.bgCard }]} onStartShouldSetResponder={() => true}>
          <Text style={[dpStyles.title, { color: colors.text }]}>{isEditing ? 'Edit Schedule' : 'Repeat Schedule'}</Text>

          <TouchableOpacity
            style={[dpStyles.option, everyDay && { backgroundColor: colors.accent + '15' }]}
            onPress={() => setEveryDay(true)}
          >
            <Ionicons name={everyDay ? 'radio-button-on' : 'radio-button-off'} size={20} color={everyDay ? colors.accent : colors.textMuted} />
            <Text style={[dpStyles.optionText, { color: colors.text }]}>Every day</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[dpStyles.option, !everyDay && { backgroundColor: colors.accent + '15' }]}
            onPress={() => setEveryDay(false)}
          >
            <Ionicons name={!everyDay ? 'radio-button-on' : 'radio-button-off'} size={20} color={!everyDay ? colors.accent : colors.textMuted} />
            <Text style={[dpStyles.optionText, { color: colors.text }]}>Specific days</Text>
          </TouchableOpacity>

          {!everyDay && (
            <View style={dpStyles.daysRow}>
              {DAY_LABELS.map((label, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    dpStyles.dayChip,
                    { borderColor: colors.border },
                    selectedDays.includes(idx) && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => toggleDay(idx)}
                >
                  <Text style={[
                    dpStyles.dayChipText,
                    { color: selectedDays.includes(idx) ? '#fff' : colors.text },
                  ]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={dpStyles.actions}>
            <TouchableOpacity onPress={onClose} style={[dpStyles.cancelBtn, { backgroundColor: colors.bgInput }]}>
              <Text style={[dpStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[dpStyles.confirmBtn, { backgroundColor: colors.accent }]}
              disabled={!everyDay && selectedDays.length === 0}
            >
              <Text style={dpStyles.confirmText}>{isEditing ? 'Update' : 'Add to Daily'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  content: { borderRadius: 20, padding: 24, marginHorizontal: 16 },
  title: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 16 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, marginBottom: 8 },
  optionText: { fontSize: SIZES.base, fontWeight: '600' },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, marginBottom: 16, gap: 4 },
  dayChip: {
    width: 40, height: 40, borderRadius: 20, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { fontSize: SIZES.xs, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  cancelText: { fontSize: SIZES.base, fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 12, alignItems: 'center' },
  confirmText: { fontSize: SIZES.base, fontWeight: '700', color: '#fff' },
});

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative' },
  headerTitle: { fontSize: SIZES.xxxl, fontWeight: '800', letterSpacing: -1 },
  headerSubtitle: { fontSize: SIZES.xs, marginTop: 2 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  parkedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  parkedLine: { flex: 1, height: 1 },
  parkedLabel: { fontSize: SIZES.xs, fontWeight: '700', letterSpacing: 1 },

  // Goal card
  goalCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  goalCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalCardTitle: { fontSize: SIZES.lg, fontWeight: '700', flex: 1 },
  goalCardDesc: { fontSize: SIZES.sm, marginTop: 4 },
  goalCardTarget: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  goalCardTargetText: { fontSize: SIZES.xs, fontWeight: '600', flex: 1 },
  goalCardStandard: { marginTop: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  goalCardStandardLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginBottom: 3 },
  goalCardStandardText: { fontSize: SIZES.sm, fontWeight: '600', fontStyle: 'italic' },
  goalCardFooter: { marginTop: 10 },
  goalCardStat: { fontSize: SIZES.sm },

  newGoalBtn: {
    borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    padding: 20, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  newGoalBtnText: { fontSize: SIZES.base, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyLabel: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 4 },
  emptySubLabel: { fontSize: SIZES.sm, textAlign: 'center', paddingHorizontal: 40 },

  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300' },
  detailTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  detailDescription: { fontSize: SIZES.sm, marginTop: 2 },
  detailScroll: { flex: 1 },

  // 90-day target card
  targetCard: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12, borderWidth: 1,
  },
  targetHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  targetLabel: { fontSize: SIZES.xs, fontWeight: '700', letterSpacing: 0.5 },
  targetText: { fontSize: SIZES.base, fontWeight: '600', lineHeight: 22 },
  targetCardEmpty: {
    marginHorizontal: 16, marginTop: 16, padding: 14, borderRadius: 12,
    borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  targetEmptyText: { fontSize: SIZES.sm, fontWeight: '600' },

  // Linked projects
  projectRow: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  projectEmoji: { fontSize: 20 },
  projectName: { fontSize: SIZES.base, fontWeight: '600', flex: 1 },

  // Section header
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  sectionTitle: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  emptyText: { fontSize: SIZES.sm, marginHorizontal: 16 },

  // Items
  itemRow: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 12,
  },
  itemContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  itemText: { fontSize: SIZES.base, fontWeight: '600', flex: 1 },
  itemActions: { flexDirection: 'row', gap: 12, marginLeft: 8, alignItems: 'center' },

  // Active badge
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  activeBadgeText: { fontSize: SIZES.xs, fontWeight: '700' },
  addDailyBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  addDailyText: { fontSize: SIZES.xs, fontWeight: '700' },

  // Category badge
  categoryBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryBadgeText: { fontSize: 14 },

  // Edit inline
  editRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editInput: { flex: 1, borderRadius: 8, padding: 8, fontSize: SIZES.base },

  // Add row
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 8,
  },
  addInput: { flex: 1, borderRadius: 8, padding: 10, fontSize: SIZES.base },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center' },
  modalTopContainer: { paddingTop: 8 },
  modalContent: { borderRadius: SIZES.radiusXl, padding: 24, marginHorizontal: 16 },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 16 },
  modalInput: { borderRadius: SIZES.radius, padding: 14, fontSize: SIZES.base, marginBottom: 16 },
  modalTextarea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: SIZES.radius, alignItems: 'center' },
  cancelText: { fontSize: SIZES.base, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden' },
  createGradient: { padding: 14, alignItems: 'center' },
  createText: { fontSize: SIZES.base, fontWeight: '700' },

  // Project picker modal
  pickerContent: { borderRadius: SIZES.radiusXl, padding: 24, marginHorizontal: 16 },
  pickerTitle: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 16 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1,
  },
  pickerEmoji: { fontSize: 24 },
  pickerItemText: { fontSize: SIZES.base, fontWeight: '600' },

  // Habit section
  habitTimeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginRight: 4 },
  habitTimeRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginTop: 6, marginBottom: 8 },
  habitTimeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
});
