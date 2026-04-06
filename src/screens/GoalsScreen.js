import React, { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, getWeekKey, getMonthKey, formatDate } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const EMOJIS = ['🎯', '��', '💡', '⭐', '🏆', '💎', '🔥', '🌟', '💪', '📈', '🏔️', '🌍', '❤️', '🧠', '💰', '🎓'];
const GOAL_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9', '#D63031'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getGoalProgress(goal, projects) {
  const linked = projects.filter(p => goal.projectIds.includes(p.id));
  if (linked.length === 0) return { percent: 0, done: 0, total: 0 };
  let done = 0, total = 0;
  linked.forEach(p => {
    total += p.tasks.length;
    done += p.tasks.filter(t => t.column === 'done').length;
  });
  return { percent: total > 0 ? Math.round((done / total) * 100) : 0, done, total };
}

function rolling12Months() {
  const result = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = getMonthKey(d);
    const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
    result.push({ key, label });
  }
  return result;
}

export default function GoalsScreen() {
  const { colors } = useTheme();
  const {
    goals, projects, addGoal, updateGoal, deleteGoal,
    addMonthlyFocus, updateMonthlyFocus, deleteMonthlyFocus,
    addWeeklyArea, addWeeklyTask, weeklyIntentions,
  } = useApp();
  const navigation = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state (shared for new + edit)
  const [formTitle, setFormTitle] = useState('');
  const [formEmoji, setFormEmoji] = useState('🎯');
  const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
  const [formDeadline, setFormDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [formProjectIds, setFormProjectIds] = useState([]);

  // Monthly focus state
  const [addingFocusMonth, setAddingFocusMonth] = useState(null);
  const [focusText, setFocusText] = useState('');
  const [editingFocus, setEditingFocus] = useState(null);
  const [editFocusText, setEditFocusText] = useState('');

  // Weekly send state
  const [sendingFocus, setSendingFocus] = useState(null);
  const [weeklyText, setWeeklyText] = useState('');

  const months = useMemo(() => rolling12Months(), []);

  const resetForm = () => {
    setFormTitle(''); setFormEmoji('🎯'); setFormColor(GOAL_COLORS[0]);
    setFormDeadline(null); setFormProjectIds([]);
  };

  // ─── Goal CRUD ────────────────────────────────────
  const handleCreateGoal = async () => {
    if (!formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addGoal({
      title: formTitle.trim(), emoji: formEmoji, color: formColor,
      deadline: formDeadline, projectIds: formProjectIds,
    });
    resetForm(); setShowNewModal(false);
  };

  const openEditModal = (goal) => {
    setFormTitle(goal.title); setFormEmoji(goal.emoji); setFormColor(goal.color);
    setFormDeadline(goal.deadline); setFormProjectIds([...goal.projectIds]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !formTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateGoal(selectedGoal.id, {
      title: formTitle.trim(), emoji: formEmoji, color: formColor,
      deadline: formDeadline, projectIds: formProjectIds,
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

  const toggleProjectLink = (projectId) => {
    setFormProjectIds(prev =>
      prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
    );
  };

  const handleToggleProjectOnGoal = async (goal, projectId) => {
    const updated = goal.projectIds.includes(projectId)
      ? goal.projectIds.filter(id => id !== projectId)
      : [...goal.projectIds, projectId];
    await updateGoal(goal.id, { projectIds: updated });
  };

  const navigateToProject = (projectId) => {
    setSelectedGoal(null);
    navigation.navigate('Projects', { projectId });
  };

  // ─── Monthly Focus CRUD ───────────────────────────
  const handleAddFocus = async (goalId) => {
    if (!focusText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addMonthlyFocus(goalId, addingFocusMonth, focusText.trim());
    setFocusText(''); setAddingFocusMonth(null);
  };

  const handleEditFocus = async (goalId) => {
    if (!editingFocus || !editFocusText.trim()) return;
    await updateMonthlyFocus(goalId, editingFocus.id, { text: editFocusText.trim() });
    setEditingFocus(null); setEditFocusText('');
  };

  const handleDeleteFocus = (goalId, focus) => {
    Alert.alert('Delete Focus', `Remove "${focus.text}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMonthlyFocus(goalId, focus.id) },
    ]);
  };

  // ─── Send focus to Weekly ─────────────────────────
  const handleSendToWeekly = async (goal, focus) => {
    const text = weeklyText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const weekKey = getWeekKey();
    const areaName = `${goal.emoji} ${focus.text}`;
    const week = weeklyIntentions[weekKey] || { areas: [] };
    let area = week.areas.find(a => a.name === areaName);
    if (!area) {
      area = await addWeeklyArea(weekKey, areaName);
    }
    if (area) {
      await addWeeklyTask(weekKey, area.id, text);
    }
    setWeeklyText(''); setSendingFocus(null);
    Alert.alert('Sent ✓', `Added to this week's intentions`);
  };

  // ═══════════════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════════════
  if (selectedGoal) {
    const goal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    const { percent, done, total } = getGoalProgress(goal, projects);
    const linkedProjects = projects.filter(p => goal.projectIds.includes(p.id));
    const unlinkedProjects = projects.filter(p => !goal.projectIds.includes(p.id));
    const focuses = goal.monthlyFocuses || [];

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        {/* Header */}
        <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
          <LinearGradient colors={[goal.color + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity onPress={() => { setSelectedGoal(null); setAddingFocusMonth(null); setSendingFocus(null); setEditingFocus(null); }} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{goal.emoji} {goal.title}</Text>
            <View style={styles.detailMeta}>
              {goal.deadline && <Text style={[styles.detailDeadline, { color: colors.textMuted }]}>Due {formatDate(goal.deadline)}</Text>}
              <Text style={[styles.detailPercent, { color: goal.color }]}>{percent}% complete</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => openEditModal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 12 }}>
            <Ionicons name="pencil-outline" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeleteGoal(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={20} color={colors.accentRed} />
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        {total > 0 && (
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: percent === 100 ? colors.accentGreen : goal.color }]} />
          </View>
        )}

        <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          {/* Stats */}
          <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: goal.color }]}>{done}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Done</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{total - done}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Remaining</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.text }]}>{linkedProjects.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Projects</Text>
            </View>
          </View>

          {/* ──── 12-Month Timeline ──── */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>12-MONTH ROADMAP</Text>
          {months.map(month => {
            const monthFocuses = focuses.filter(f => f.monthKey === month.key);
            const isCurrent = month.key === getMonthKey();
            return (
              <View key={month.key} style={[styles.monthRow, { backgroundColor: colors.bgCard, borderColor: isCurrent ? goal.color + '50' : colors.border }]}>
                <View style={styles.monthRowHeader}>
                  <Text style={[styles.monthRowLabel, { color: isCurrent ? goal.color : colors.text }]}>
                    {isCurrent ? '● ' : ''}{month.label}
                  </Text>
                  <TouchableOpacity
                    onPress={() => { setAddingFocusMonth(addingFocusMonth === month.key ? null : month.key); setFocusText(''); }}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name={addingFocusMonth === month.key ? 'close-circle' : 'add-circle-outline'} size={22} color={colors.accent} />
                  </TouchableOpacity>
                </View>

                {/* Existing focuses for this month */}
                {monthFocuses.map(f => (
                  <View key={f.id}>
                    {editingFocus?.id === f.id ? (
                      <View style={[styles.focusEditRow, { backgroundColor: colors.bgInput }]}>
                        <TextInput
                          style={[styles.focusEditInput, { color: colors.text }]}
                          value={editFocusText}
                          onChangeText={setEditFocusText}
                          autoFocus
                          selectionColor={goal.color}
                        />
                        <TouchableOpacity onPress={() => handleEditFocus(goal.id)}>
                          <Ionicons name="checkmark-circle" size={24} color={colors.accentGreen} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setEditingFocus(null)}>
                          <Ionicons name="close-circle" size={24} color={colors.textMuted} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.focusItem}>
                        <Text style={[styles.focusItemText, { color: colors.text }]}>{f.text}</Text>
                        <View style={styles.focusItemActions}>
                          <TouchableOpacity onPress={() => { setSendingFocus(sendingFocus?.id === f.id ? null : f); setWeeklyText(''); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.accent} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => { setEditingFocus(f); setEditFocusText(f.text); }} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteFocus(goal.id, f)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                            <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Send to weekly inline */}
                    {sendingFocus?.id === f.id && (
                      <View style={[styles.weeklyInline, { backgroundColor: colors.accent + '10', borderColor: colors.accent + '30' }]}>
                        <Text style={[styles.weeklyInlineLabel, { color: colors.accent }]}>What will you do this week?</Text>
                        <TextInput
                          style={[styles.weeklyInlineInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                          placeholder="e.g. research productivity apps"
                          placeholderTextColor={colors.textMuted}
                          value={weeklyText}
                          onChangeText={setWeeklyText}
                          selectionColor={colors.accent}
                          autoFocus
                        />
                        <View style={styles.weeklyInlineActions}>
                          <TouchableOpacity onPress={() => setSendingFocus(null)}>
                            <Text style={[styles.focusCancel, { color: colors.textMuted }]}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleSendToWeekly(goal, f)} style={[styles.focusSendBtn, { backgroundColor: goal.color }]}>
                            <Ionicons name="send" size={14} color="#fff" />
                            <Text style={styles.focusSendText}>Send to Weekly</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                {monthFocuses.length === 0 && addingFocusMonth !== month.key && (
                  <Text style={[styles.monthEmpty, { color: colors.textMuted }]}>No focus set</Text>
                )}

                {/* Add focus input */}
                {addingFocusMonth === month.key && (
                  <View style={styles.addFocusRow}>
                    <TextInput
                      style={[styles.addFocusInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                      placeholder="Add a focus for this month..."
                      placeholderTextColor={colors.textMuted}
                      value={focusText}
                      onChangeText={setFocusText}
                      selectionColor={goal.color}
                      autoFocus
                    />
                    <TouchableOpacity onPress={() => handleAddFocus(goal.id)} style={[styles.addFocusBtn, { backgroundColor: goal.color }]}>
                      <Ionicons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {/* ──── Linked Projects ──── */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>LINKED PROJECTS</Text>
          {linkedProjects.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No projects linked yet</Text>
          )}
          {linkedProjects.map(p => {
            const pDone = p.tasks.filter(t => t.column === 'done').length;
            const pTotal = p.tasks.length;
            const pPercent = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.linkedProject, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                onPress={() => navigateToProject(p.id)}
                activeOpacity={0.7}
              >
                <View style={styles.linkedProjectLeft}>
                  <Text style={styles.linkedProjectEmoji}>{p.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.linkedProjectTitle, { color: colors.text }]}>{p.title}</Text>
                    <View style={[styles.miniProgress, { backgroundColor: colors.border }]}>
                      <View style={[styles.miniProgressFill, { width: `${pPercent}%`, backgroundColor: p.color }]} />
                    </View>
                  </View>
                </View>
                <View style={styles.linkedProjectRight}>
                  <Text style={[styles.linkedProjectPercent, { color: p.color }]}>{pPercent}%</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add / remove projects */}
          {unlinkedProjects.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>ADD PROJECTS</Text>
              {unlinkedProjects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.addProjectRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => handleToggleProjectOnGoal(goal, p.id)}
                >
                  <Text style={styles.linkedProjectEmoji}>{p.emoji}</Text>
                  <Text style={[styles.linkedProjectTitle, { color: colors.text, flex: 1 }]}>{p.title}</Text>
                  <Ionicons name="add-circle-outline" size={22} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </>
          )}
          {linkedProjects.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>MANAGE PROJECTS</Text>
              {linkedProjects.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.addProjectRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
                  onPress={() => handleToggleProjectOnGoal(goal, p.id)}
                >
                  <Text style={styles.linkedProjectEmoji}>{p.emoji}</Text>
                  <Text style={[styles.linkedProjectTitle, { color: colors.text, flex: 1 }]}>{p.title}</Text>
                  <Ionicons name="remove-circle-outline" size={22} color={colors.accentRed} />
                </TouchableOpacity>
              ))}
            </>
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
            <ScrollView style={[styles.modalContent, { backgroundColor: colors.bgCard }]} keyboardShouldPersistTaps="handled">
              <Text style={[styles.modalTitle, { color: colors.text }]}>{title}</Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="What do you want to achieve?"
                placeholderTextColor={colors.textMuted}
                value={formTitle} onChangeText={setFormTitle}
                selectionColor={colors.accent} autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity key={e}
                    style={[styles.iconBtn, { backgroundColor: colors.bgInput }, formEmoji === e && [styles.iconBtnActive, { borderColor: colors.accent }]]}
                    onPress={() => setFormEmoji(e)}
                  ><Text style={styles.iconText}>{e}</Text></TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Colour</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLORS.map(c => (
                  <TouchableOpacity key={c}
                    style={[styles.colorBtn, { backgroundColor: c }, formColor === c && [styles.colorBtnActive, { borderColor: colors.text }]]}
                    onPress={() => setFormColor(c)}
                  />
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Deadline (Optional)</Text>
              <TouchableOpacity style={[styles.dateButton, { backgroundColor: colors.bgInput }]} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.dateButtonText, { color: formDeadline ? colors.text : colors.textMuted }]}>
                  {formDeadline ? formatDate(formDeadline) : 'No deadline'}
                </Text>
                {formDeadline && (
                  <TouchableOpacity onPress={() => setFormDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={formDeadline ? new Date(formDeadline + 'T00:00:00') : new Date()}
                  mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} themeVariant="dark"
                  onChange={(e, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setFormDeadline(getDateKey(date));
                  }}
                />
              )}
              {showDatePicker && Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
                  <Text style={[styles.datePickerDoneText, { color: colors.accent }]}>Done</Text>
                </TouchableOpacity>
              )}

              {projects.length > 0 && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 8 }]}>Link Projects</Text>
                  <View style={styles.projectPickerScroll}>
                    {projects.map(p => {
                      const selected = formProjectIds.includes(p.id);
                      return (
                        <TouchableOpacity key={p.id}
                          style={[styles.projectPickerRow, { backgroundColor: selected ? p.color + '20' : colors.bgInput, borderColor: selected ? p.color : 'transparent' }]}
                          onPress={() => toggleProjectLink(p.id)}
                        >
                          <Text style={styles.projectPickerEmoji}>{p.emoji}</Text>
                          <Text style={[styles.projectPickerTitle, { color: colors.text }]}>{p.title}</Text>
                          {selected && <Ionicons name="checkmark-circle" size={20} color={p.color} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

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
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  // ═══════════════════════════════════════════════════
  // GOAL CARDS LIST
  // ═══════════════════════════════════════════════════
  const renderGoal = ({ item }) => {
    const { percent, done, total } = getGoalProgress(item, projects);
    const focusCount = (item.monthlyFocuses || []).length;
    const daysLeft = item.deadline
      ? Math.ceil((new Date(item.deadline + 'T00:00:00') - new Date()) / 86400000) : null;

    return (
      <TouchableOpacity
        style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => setSelectedGoal(item)} activeOpacity={0.7}
      >
        <LinearGradient colors={[item.color + '15', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 16 }]}
        />
        <View style={styles.goalCardHeader}>
          <Text style={styles.goalCardEmoji}>{item.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.goalCardTitle, { color: colors.text }]}>{item.title}</Text>
            {daysLeft !== null && (
              <Text style={[styles.goalCardDeadline, { color: daysLeft < 0 ? colors.accentRed : colors.textMuted }]}>
                {daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
              </Text>
            )}
          </View>
          <Text style={[styles.goalCardPercent, { color: item.color }]}>{percent}%</Text>
        </View>
        <View style={[styles.goalProgressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.goalProgressFill, { width: `${percent}%`, backgroundColor: percent === 100 ? colors.accentGreen : item.color }]} />
        </View>
        <View style={styles.goalCardFooter}>
          <Text style={[styles.goalCardStat, { color: colors.textMuted }]}>
            {done}/{total} tasks · {item.projectIds.length} project{item.projectIds.length !== 1 ? 's' : ''} · {focusCount} focus{focusCount !== 1 ? 'es' : ''}
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
        data={goals} keyExtractor={item => item.id} renderItem={renderGoal}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyLabel, { color: colors.textMuted }]}>Set your first goal</Text>
            <Text style={[styles.emptySubLabel, { color: colors.textMuted }]}>Plan monthly focuses, link projects</Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity style={[styles.newGoalBtn, { borderColor: colors.accent + '40' }]}
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
  goalCard: { borderRadius: 16, padding: 16, borderWidth: 1, overflow: 'hidden' },
  goalCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalCardEmoji: { fontSize: 28 },
  goalCardTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  goalCardDeadline: { fontSize: SIZES.sm, marginTop: 2 },
  goalCardPercent: { fontSize: SIZES.xl, fontWeight: '800' },
  goalProgressBar: { height: 4, borderRadius: 2, marginTop: 12 },
  goalProgressFill: { height: 4, borderRadius: 2 },
  goalCardFooter: { marginTop: 8 },
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
    paddingVertical: 12, borderBottomWidth: 1, position: 'relative', overflow: 'hidden',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300' },
  detailTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  detailMeta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  detailDeadline: { fontSize: SIZES.sm },
  detailPercent: { fontSize: SIZES.sm, fontWeight: '700' },
  progressBar: { height: 4, marginHorizontal: 16, marginTop: 8, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  detailScroll: { flex: 1 },

  // Stats
  statsCard: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    borderRadius: 12, borderWidth: 1, padding: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: SIZES.xxl, fontWeight: '800' },
  statLabel: { fontSize: SIZES.xs, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },

  // Section
  sectionTitle: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  emptyText: { fontSize: SIZES.sm, marginHorizontal: 16 },

  // Month rows (12-month timeline)
  monthRow: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 12,
  },
  monthRowHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  monthRowLabel: { fontSize: SIZES.base, fontWeight: '700' },
  monthEmpty: { fontSize: SIZES.sm, marginTop: 6, fontStyle: 'italic' },

  // Focus items
  focusItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, paddingVertical: 4,
  },
  focusItemText: { fontSize: SIZES.base, fontWeight: '600', flex: 1 },
  focusItemActions: { flexDirection: 'row', gap: 12, marginLeft: 8 },

  // Focus edit
  focusEditRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 8, borderRadius: 8, padding: 8,
  },
  focusEditInput: { flex: 1, fontSize: SIZES.base },

  // Add focus
  addFocusRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8,
  },
  addFocusInput: {
    flex: 1, borderRadius: 8, padding: 10, fontSize: SIZES.base,
  },
  addFocusBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  // Weekly inline send
  weeklyInline: {
    marginTop: 8, borderRadius: 10, borderWidth: 1, padding: 12,
  },
  weeklyInlineLabel: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  weeklyInlineInput: {
    borderRadius: 8, padding: 10, fontSize: SIZES.base, marginBottom: 8,
  },
  weeklyInlineActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  focusCancel: { fontSize: SIZES.sm, fontWeight: '600' },
  focusSendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  focusSendText: { color: '#fff', fontSize: SIZES.sm, fontWeight: '700' },

  // Linked projects
  linkedProject: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 14,
  },
  linkedProjectLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  linkedProjectEmoji: { fontSize: 22 },
  linkedProjectTitle: { fontSize: SIZES.base, fontWeight: '600' },
  miniProgress: { height: 3, borderRadius: 1.5, marginTop: 6 },
  miniProgressFill: { height: 3, borderRadius: 1.5 },
  linkedProjectRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkedProjectPercent: { fontSize: SIZES.base, fontWeight: '700' },
  addProjectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, padding: 14,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalTopContainer: { paddingTop: 8 },
  modalContent: { borderRadius: SIZES.radiusXl, padding: 24, marginHorizontal: 16, maxHeight: '90%' },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 16 },
  modalInput: { borderRadius: SIZES.radius, padding: 14, fontSize: SIZES.base, marginBottom: 16 },
  modalLabel: {
    fontSize: SIZES.xs, fontWeight: '600', marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconBtn: { width: 44, height: 44, borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { borderWidth: 2 },
  iconText: { fontSize: 22 },
  colorGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  colorBtn: { width: 36, height: 36, borderRadius: 18 },
  colorBtnActive: { borderWidth: 3 },
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: SIZES.radius, padding: 12, marginBottom: 12,
  },
  dateButtonText: { flex: 1, fontSize: SIZES.base },
  datePickerDone: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 8 },
  datePickerDoneText: { fontSize: SIZES.base, fontWeight: '600' },
  projectPickerScroll: { maxHeight: 160, marginBottom: 16 },
  projectPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: SIZES.radius, borderWidth: 1.5, marginBottom: 6,
  },
  projectPickerEmoji: { fontSize: 18 },
  projectPickerTitle: { flex: 1, fontSize: SIZES.sm, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: SIZES.radius, alignItems: 'center' },
  cancelText: { fontSize: SIZES.base, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden' },
  createGradient: { padding: 14, alignItems: 'center' },
  createText: { fontSize: SIZES.base, fontWeight: '700' },
});
