import React, { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  Alert, Modal, ScrollView, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Svg, { Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, getWeekKey, getMonthKey, formatDate } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const EMOJIS = ['🎯', '🚀', '💡', '⭐', '🏆', '💎', '🔥', '🌟', '💪', '📈', '🏔️', '🌍', '❤️', '🧠', '💰', '🎓'];
const GOAL_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9', '#D63031'];

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

export default function GoalsScreen() {
  const { colors } = useTheme();
  const {
    goals, projects, addGoal, updateGoal, deleteGoal,
    addWeeklyArea, addWeeklyTask, weeklyIntentions,
    addFutureLogEntry,
  } = useApp();
  const navigation = useNavigation();

  const [selectedGoal, setSelectedGoal] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form state (shared for new + edit)
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎯');
  const [newColor, setNewColor] = useState(GOAL_COLORS[0]);
  const [newDeadline, setNewDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newProjectIds, setNewProjectIds] = useState([]);

  const resetForm = () => {
    setNewTitle('');
    setNewEmoji('🎯');
    setNewColor(GOAL_COLORS[0]);
    setNewDeadline(null);
    setNewProjectIds([]);
  };

  const openEditModal = (goal) => {
    setNewTitle(goal.title);
    setNewEmoji(goal.emoji);
    setNewColor(goal.color);
    setNewDeadline(goal.deadline);
    setNewProjectIds([...goal.projectIds]);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedGoal || !newTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateGoal(selectedGoal.id, {
      title: newTitle.trim(),
      emoji: newEmoji,
      color: newColor,
      deadline: newDeadline,
      projectIds: newProjectIds,
    });
    setShowEditModal(false);
  };
    setNewColor(GOAL_COLORS[0]);
    setNewDeadline(null);
    setNewProjectIds([]);
  };

  const handleCreateGoal = async () => {
    if (!newTitle.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addGoal({
      title: newTitle.trim(),
      emoji: newEmoji,
      color: newColor,
      deadline: newDeadline,
      projectIds: newProjectIds,
    });
    resetForm();
    setShowNewModal(false);
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
    setNewProjectIds(prev =>
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

  // Weekly focus
  const [weeklyFocusText, setWeeklyFocusText] = useState('');
  const [showWeeklyInput, setShowWeeklyInput] = useState(false);
  const [monthlyNoteText, setMonthlyNoteText] = useState('');
  const [showMonthlyInput, setShowMonthlyInput] = useState(false);

  const handleSendToWeekly = async (goal) => {
    const text = weeklyFocusText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const weekKey = getWeekKey();
    const areaName = `${goal.emoji} ${goal.title}`;
    // Check if an area for this goal already exists this week
    const week = weeklyIntentions[weekKey] || { areas: [] };
    let area = week.areas.find(a => a.name === areaName);
    if (!area) {
      area = await addWeeklyArea(weekKey, areaName);
    }
    if (area) {
      await addWeeklyTask(weekKey, area.id, text);
    }
    setWeeklyFocusText('');
    setShowWeeklyInput(false);
    Alert.alert('Sent ✓', `Added to this week's intentions`);
  };

  const handleSendToMonthly = async (goal) => {
    const text = monthlyNoteText.trim();
    if (!text) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const monthKey = getMonthKey();
    await addFutureLogEntry(monthKey, {
      text: `${goal.emoji} ${text}`,
      type: 'task',
    });
    setMonthlyNoteText('');
    setShowMonthlyInput(false);
    Alert.alert('Added ✓', `Added to this month's future log`);
  };

  // Detail view for a selected goal
  if (selectedGoal) {
    const goal = goals.find(g => g.id === selectedGoal.id) || selectedGoal;
    const { percent, done, total } = getGoalProgress(goal, projects);
    const linkedProjects = projects.filter(p => goal.projectIds.includes(p.id));
    const unlinkedProjects = projects.filter(p => !goal.projectIds.includes(p.id));

    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
          <LinearGradient colors={[goal.color + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
          <TouchableOpacity onPress={() => {
            setSelectedGoal(null);
            setShowWeeklyInput(false); setWeeklyFocusText('');
            setShowMonthlyInput(false); setMonthlyNoteText('');
          }} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.detailTitle, { color: colors.text }]}>
              {goal.emoji} {goal.title}
            </Text>
            <View style={styles.detailMeta}>
              {goal.deadline && (
                <Text style={[styles.detailDeadline, { color: colors.textMuted }]}>
                  Due {formatDate(goal.deadline)}
                </Text>
              )}
              <Text style={[styles.detailPercent, { color: goal.color }]}>
                {percent}% complete
              </Text>
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
            <View style={[styles.progressFill, {
              width: `${percent}%`,
              backgroundColor: percent === 100 ? colors.accentGreen : goal.color,
            }]} />
          </View>
        )}

        <ScrollView style={styles.detailScroll} contentContainerStyle={{ paddingBottom: 100 }}>
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

          {/* Weekly & Monthly quick actions */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>FOCUS</Text>

          {/* Weekly intention */}
          {!showWeeklyInput ? (
            <TouchableOpacity
              style={[styles.focusAction, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => setShowWeeklyInput(true)}
            >
              <Ionicons name="calendar-clear-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.focusActionTitle, { color: colors.text }]}>This week I will...</Text>
                <Text style={[styles.focusActionSub, { color: colors.textMuted }]}>Send a focus to weekly intentions</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.focusInputCard, { backgroundColor: colors.bgCard, borderColor: goal.color }]}>
              <Text style={[styles.focusInputLabel, { color: goal.color }]}>This week I will...</Text>
              <TextInput
                style={[styles.focusInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="e.g. finish the first three tasks"
                placeholderTextColor={colors.textMuted}
                value={weeklyFocusText}
                onChangeText={setWeeklyFocusText}
                selectionColor={goal.color}
                autoFocus
                multiline
              />
              <View style={styles.focusInputActions}>
                <TouchableOpacity onPress={() => { setShowWeeklyInput(false); setWeeklyFocusText(''); }}>
                  <Text style={[styles.focusCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSendToWeekly(goal)}
                  style={[styles.focusSendBtn, { backgroundColor: goal.color }]}
                >
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={styles.focusSendText}>Send to Weekly</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Monthly note */}
          {!showMonthlyInput ? (
            <TouchableOpacity
              style={[styles.focusAction, { backgroundColor: colors.bgCard, borderColor: colors.border, marginTop: 8 }]}
              onPress={() => setShowMonthlyInput(true)}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.focusActionTitle, { color: colors.text }]}>Add to this month</Text>
                <Text style={[styles.focusActionSub, { color: colors.textMuted }]}>Add a note to the future log</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.focusInputCard, { backgroundColor: colors.bgCard, borderColor: goal.color, marginTop: 8 }]}>
              <Text style={[styles.focusInputLabel, { color: goal.color }]}>Add to monthly</Text>
              <TextInput
                style={[styles.focusInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="e.g. review progress on this goal"
                placeholderTextColor={colors.textMuted}
                value={monthlyNoteText}
                onChangeText={setMonthlyNoteText}
                selectionColor={goal.color}
                autoFocus
                multiline
              />
              <View style={styles.focusInputActions}>
                <TouchableOpacity onPress={() => { setShowMonthlyInput(false); setMonthlyNoteText(''); }}>
                  <Text style={[styles.focusCancel, { color: colors.textMuted }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleSendToMonthly(goal)}
                  style={[styles.focusSendBtn, { backgroundColor: goal.color }]}
                >
                  <Ionicons name="send" size={14} color="#fff" />
                  <Text style={styles.focusSendText}>Add to Monthly</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Linked projects */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LINKED PROJECTS</Text>
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

          {/* Unlink buttons for linked projects */}
          {linkedProjects.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 24 }]}>MANAGE</Text>
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
      </SafeAreaView>
    );
  }

  // Goal cards list
  const renderGoal = ({ item }) => {
    const { percent, done, total } = getGoalProgress(item, projects);
    const daysLeft = item.deadline
      ? Math.ceil((new Date(item.deadline + 'T00:00:00') - new Date()) / 86400000)
      : null;

    return (
      <TouchableOpacity
        style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        onPress={() => setSelectedGoal(item)}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={[item.color + '15', 'transparent']}
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

        {/* Mini progress bar */}
        <View style={[styles.goalProgressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.goalProgressFill, {
            width: `${percent}%`,
            backgroundColor: percent === 100 ? colors.accentGreen : item.color,
          }]} />
        </View>

        {/* Linked project count */}
        <View style={styles.goalCardFooter}>
          <Text style={[styles.goalCardStat, { color: colors.textMuted }]}>
            {done}/{total} tasks · {item.projectIds.length} project{item.projectIds.length !== 1 ? 's' : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
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
            <Text style={[styles.emptySubLabel, { color: colors.textMuted }]}>
              Link projects to track progress
            </Text>
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

      {/* New Goal Modal */}
      <Modal visible={showNewModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalTopContainer} edges={['top']}>
            <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Goal</Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="What do you want to achieve?"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                selectionColor={colors.accent}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.iconBtn, { backgroundColor: colors.bgInput }, newEmoji === e && [styles.iconBtnActive, { borderColor: colors.accent }]]}
                    onPress={() => setNewEmoji(e)}
                  >
                    <Text style={styles.iconText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Colour</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorBtn, { backgroundColor: c }, newColor === c && [styles.colorBtnActive, { borderColor: colors.text }]]}
                    onPress={() => setNewColor(c)}
                  />
                ))}
              </View>

              {/* Deadline */}
              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Deadline (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.bgInput }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.dateButtonText, { color: newDeadline ? colors.text : colors.textMuted }]}>
                  {newDeadline ? formatDate(newDeadline) : 'No deadline'}
                </Text>
                {newDeadline && (
                  <TouchableOpacity onPress={() => setNewDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newDeadline ? new Date(newDeadline + 'T00:00:00') : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="dark"
                  onChange={(e, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setNewDeadline(getDateKey(date));
                  }}
                />
              )}
              {showDatePicker && Platform.OS === 'ios' && (
                <TouchableOpacity onPress={() => setShowDatePicker(false)} style={styles.datePickerDone}>
                  <Text style={[styles.datePickerDoneText, { color: colors.accent }]}>Done</Text>
                </TouchableOpacity>
              )}

              {/* Project picker */}
              {projects.length > 0 && (
                <>
                  <Text style={[styles.modalLabel, { color: colors.textSecondary, marginTop: 8 }]}>Link Projects</Text>
                  <ScrollView style={styles.projectPickerScroll} nestedScrollEnabled>
                    {projects.map(p => {
                      const selected = newProjectIds.includes(p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.projectPickerRow, { backgroundColor: selected ? p.color + '20' : colors.bgInput, borderColor: selected ? p.color : 'transparent' }]}
                          onPress={() => toggleProjectLink(p.id)}
                        >
                          <Text style={styles.projectPickerEmoji}>{p.emoji}</Text>
                          <Text style={[styles.projectPickerTitle, { color: colors.text }]}>{p.title}</Text>
                          {selected && <Ionicons name="checkmark-circle" size={20} color={p.color} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowNewModal(false)} style={[styles.cancelBtn, { backgroundColor: colors.bgInput }]}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateGoal} style={styles.createBtn}>
                  <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.createGradient}>
                    <Text style={[styles.createText, { color: colors.text }]}>Create</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Goal Modal */}
      <Modal visible={showEditModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalTopContainer} edges={['top']}>
            <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Goal</Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="What do you want to achieve?"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                selectionColor={colors.accent}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {EMOJIS.map(e => (
                  <TouchableOpacity
                    key={e}
                    style={[styles.iconBtn, { backgroundColor: colors.bgInput }, newEmoji === e && [styles.iconBtnActive, { borderColor: colors.accent }]]}
                    onPress={() => setNewEmoji(e)}
                  >
                    <Text style={styles.iconText}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Colour</Text>
              <View style={styles.colorGrid}>
                {GOAL_COLORS.map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.colorBtn, { backgroundColor: c }, newColor === c && [styles.colorBtnActive, { borderColor: colors.text }]]}
                    onPress={() => setNewColor(c)}
                  />
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Deadline (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateButton, { backgroundColor: colors.bgInput }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={18} color={colors.textMuted} />
                <Text style={[styles.dateButtonText, { color: newDeadline ? colors.text : colors.textMuted }]}>
                  {newDeadline ? formatDate(newDeadline) : 'No deadline'}
                </Text>
                {newDeadline && (
                  <TouchableOpacity onPress={() => setNewDeadline(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={newDeadline ? new Date(newDeadline + 'T00:00:00') : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="dark"
                  onChange={(e, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setNewDeadline(getDateKey(date));
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
                  <ScrollView style={styles.projectPickerScroll} nestedScrollEnabled>
                    {projects.map(p => {
                      const selected = newProjectIds.includes(p.id);
                      return (
                        <TouchableOpacity
                          key={p.id}
                          style={[styles.projectPickerRow, { backgroundColor: selected ? p.color + '20' : colors.bgInput, borderColor: selected ? p.color : 'transparent' }]}
                          onPress={() => toggleProjectLink(p.id)}
                        >
                          <Text style={styles.projectPickerEmoji}>{p.emoji}</Text>
                          <Text style={[styles.projectPickerTitle, { color: colors.text }]}>{p.title}</Text>
                          {selected && <Ionicons name="checkmark-circle" size={20} color={p.color} />}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowEditModal(false)} style={[styles.cancelBtn, { backgroundColor: colors.bgInput }]}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveEdit} style={styles.createBtn}>
                  <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.createGradient}>
                    <Text style={[styles.createText, { color: colors.text }]}>Save</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

      <KnowledgeBaseButton sectionId="goals" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  headerTitle: { fontSize: SIZES.xxxl, fontWeight: '800', letterSpacing: -1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },

  // Goal card
  goalCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, overflow: 'hidden',
  },
  goalCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  goalCardEmoji: { fontSize: 28 },
  goalCardTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  goalCardDeadline: { fontSize: SIZES.sm, marginTop: 2 },
  goalCardPercent: { fontSize: SIZES.xl, fontWeight: '800' },
  goalProgressBar: { height: 4, borderRadius: 2, marginTop: 12 },
  goalProgressFill: { height: 4, borderRadius: 2 },
  goalCardFooter: { marginTop: 8 },
  goalCardStat: { fontSize: SIZES.sm },

  // New goal button
  newGoalBtn: {
    borderRadius: 16, borderWidth: 2, borderStyle: 'dashed',
    padding: 20, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 8, marginTop: 4,
  },
  newGoalBtnText: { fontSize: SIZES.base, fontWeight: '600' },

  // Empty
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

  // Linked projects
  sectionTitle: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginHorizontal: 16, marginTop: 20, marginBottom: 8,
  },
  emptyText: { fontSize: SIZES.sm, marginHorizontal: 16 },
  linkedProject: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 14,
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
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12,
    borderWidth: 1, padding: 14,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  modalTopContainer: { paddingTop: 8 },
  modalContent: { borderRadius: SIZES.radiusXl, padding: 24, marginHorizontal: 16 },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderRadius: SIZES.radius, padding: 14, fontSize: SIZES.base, marginBottom: 16,
  },
  modalLabel: {
    fontSize: SIZES.xs, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconBtn: {
    width: 44, height: 44, borderRadius: SIZES.radius,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderWidth: 2 },
  iconText: { fontSize: 22 },
  colorGrid: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  colorBtn: { width: 36, height: 36, borderRadius: 18 },
  colorBtnActive: { borderWidth: 3 },

  // Date
  dateButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: SIZES.radius, padding: 12, marginBottom: 12,
  },
  dateButtonText: { flex: 1, fontSize: SIZES.base },
  datePickerDone: { alignSelf: 'flex-end', paddingVertical: 4, marginBottom: 8 },
  datePickerDoneText: { fontSize: SIZES.base, fontWeight: '600' },

  // Project picker
  projectPickerScroll: { maxHeight: 160, marginBottom: 16 },
  projectPickerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: SIZES.radius, borderWidth: 1.5, marginBottom: 6,
  },
  projectPickerEmoji: { fontSize: 18 },
  projectPickerTitle: { flex: 1, fontSize: SIZES.sm, fontWeight: '600' },

  // Actions
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: SIZES.radius, alignItems: 'center' },
  cancelText: { fontSize: SIZES.base, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden' },
  createGradient: { padding: 14, alignItems: 'center' },
  createText: { fontSize: SIZES.base, fontWeight: '700' },

  // Focus actions (weekly / monthly)
  focusAction: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1, padding: 14,
  },
  focusActionTitle: { fontSize: SIZES.base, fontWeight: '600' },
  focusActionSub: { fontSize: SIZES.xs, marginTop: 1 },
  focusInputCard: {
    marginHorizontal: 16, borderRadius: 12, borderWidth: 1.5, padding: 14,
  },
  focusInputLabel: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  focusInput: {
    borderRadius: SIZES.radius, padding: 12, fontSize: SIZES.base,
    minHeight: 44, textAlignVertical: 'top',
  },
  focusInputActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10,
  },
  focusCancel: { fontSize: SIZES.sm, fontWeight: '600' },
  focusSendBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  focusSendText: { color: '#fff', fontSize: SIZES.sm, fontWeight: '700' },
});
