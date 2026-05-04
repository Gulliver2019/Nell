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
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

export default function GoalsScreen() {
  const { colors } = useTheme();
  const {
    goals, addGoal, updateGoal, deleteGoal,
    addGoalDiscipline, updateGoalDiscipline, deleteGoalDiscipline,
    addGoalWeeklyTask, updateGoalWeeklyTask, deleteGoalWeeklyTask,
    addGoalStandard, updateGoalStandard, deleteGoalStandard,
    addRoutine, deleteRoutine,
  } = useApp();

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Add item state
  const [addingSection, setAddingSection] = useState(null); // 'discipline' | 'weeklyTask' | 'standard'
  const [newItemText, setNewItemText] = useState('');
  const [editingItem, setEditingItem] = useState(null); // { section, id, text }
  const [editItemText, setEditItemText] = useState('');

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
  };

  // ─── Goal CRUD ────────────────────────────────────
  const handleCreateGoal = async () => {
    if (!formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addGoal({ title: formTitle.trim(), description: formDescription.trim() });
    resetForm();
    setShowNewModal(false);
  };

  const openEditModal = (goal) => {
    setFormTitle(goal.title);
    setFormDescription(goal.description || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateGoal(selectedGoal.id, {
      title: formTitle.trim(),
      description: formDescription.trim(),
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
    Alert.alert('Delete', `Remove "${item.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        if (section === 'discipline') await deleteGoalDiscipline(goalId, item.id);
        else if (section === 'weeklyTask') await deleteGoalWeeklyTask(goalId, item.id);
        else if (section === 'standard') await deleteGoalStandard(goalId, item.id);
      }},
    ]);
  };

  // ─── Add discipline to daily (creates routine) ────
  const handleAddToDaily = async (goalId, discipline) => {
    if (discipline.routineId) {
      Alert.alert('Already Active', 'This discipline is already repeating on your daily.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const routine = await addRoutine({ text: discipline.text, enabled: true });
    await updateGoalDiscipline(goalId, discipline.id, { routineId: routine.id });
    Alert.alert('Added ✓', 'This discipline will now repeat on your daily log each day.');
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
          <TouchableOpacity onPress={() => openEditModal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 12 }}>
            <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteGoal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">

          {/* ──── Daily Disciplines ──── */}
          <View style={styles.sectionHeader}>
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
                  <Text style={[styles.itemText, { color: colors.text }]}>{d.text}</Text>
                  <View style={styles.itemActions}>
                    {d.routineId ? (
                      <TouchableOpacity onPress={() => handleRemoveFromDaily(goal.id, d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <View style={[styles.activeBadge, { backgroundColor: colors.accentGreen + '20' }]}>
                          <Text style={[styles.activeBadgeText, { color: colors.accentGreen }]}>Active</Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity onPress={() => handleAddToDaily(goal.id, d)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <View style={[styles.addDailyBtn, { backgroundColor: colors.accent + '15' }]}>
                          <Text style={[styles.addDailyText, { color: colors.accent }]}>→ Daily</Text>
                        </View>
                      </TouchableOpacity>
                    )}
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
        </ScrollView>

        {/* Edit Goal Modal */}
        {renderGoalModal(true)}
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
  const renderGoal = ({ item }) => {
    const disciplineCount = (item.dailyDisciplines || []).length;
    const weeklyCount = (item.weeklyTasks || []).length;
    const standardCount = (item.standards || []).length;

    return (
      <TouchableOpacity
        style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => setSelectedGoal(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.goalCardTitle, { color: colors.text }]}>{item.title}</Text>
        {item.description ? (
          <Text style={[styles.goalCardDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.description}</Text>
        ) : null}
        <View style={styles.goalCardFooter}>
          <Text style={[styles.goalCardStat, { color: colors.textMuted }]}>
            {disciplineCount} discipline{disciplineCount !== 1 ? 's' : ''} · {weeklyCount} weekly · {standardCount} standard{standardCount !== 1 ? 's' : ''}
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
      </View>
      <FlatList
        data={goals}
        keyExtractor={item => item.id}
        renderItem={renderGoal}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyLabel, { color: colors.textMuted }]}>Set your first goal</Text>
            <Text style={[styles.emptySubLabel, { color: colors.textMuted }]}>Define disciplines, weekly tasks & standards</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.newGoalBtn, { borderColor: colors.accent + '40' }]}
            onPress={() => { resetForm(); setShowNewModal(true); }}
          >
            <Ionicons name="add" size={24} color={colors.accent} />
            <Text style={[styles.newGoalBtnText, { color: colors.accent }]}>New Goal</Text>
          </TouchableOpacity>
        }
      />
      {renderGoalModal(false)}
      <KnowledgeBaseButton sectionId="goals" />
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative' },
  headerTitle: { fontSize: SIZES.xxxl, fontWeight: '800', letterSpacing: -1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  // Goal card
  goalCard: { borderRadius: 16, padding: 16, borderWidth: 1 },
  goalCardTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  goalCardDesc: { fontSize: SIZES.sm, marginTop: 4 },
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
  emptySubLabel: { fontSize: SIZES.sm },

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

  // Active badge (discipline added to daily)
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  activeBadgeText: { fontSize: SIZES.xs, fontWeight: '700' },
  addDailyBtn: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  addDailyText: { fontSize: SIZES.xs, fontWeight: '700' },

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
});
