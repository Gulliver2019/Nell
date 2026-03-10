import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Modal, Alert, Dimensions, StatusBar, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import { Ionicons } from '@expo/vector-icons';
import { projectTaskText, addedToDailyMessage } from '../utils/personality';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.75;

const EMOJIS = ['🎯', '🚀', '💡', '🔥', '⭐', '💎', '🏆', '📱', '🎨', '📊', '🛠️', '🌟', '📝', '🎬', '🏠', '💪'];
const PROJECT_COLORS = ['#6C5CE7', '#00B894', '#E17055', '#0984E3', '#FDCB6E', '#E84393', '#00CEC9', '#D63031'];

const COLUMNS = [
  { key: 'todo', label: 'To Do', icon: '○' },
  { key: 'progress', label: 'In Progress', icon: '◐' },
  { key: 'done', label: 'Done', icon: '●' },
];

// Project index board — shows all projects
function ProjectIndexBoard({ projects, onSelect, onAdd, onDelete, onReorder, onMakeSomeTime, colors }) {
  const totalIncomplete = useMemo(() =>
    projects.reduce((sum, p) => sum + p.tasks.filter(t => t.column !== 'done').length, 0),
    [projects]
  );

  const renderProject = useCallback(({ item: project, drag, isActive }) => {
    const total = project.tasks.length;
    const done = project.tasks.filter(t => t.column === 'done').length;
    const progress = total > 0 ? (done / total) * 100 : 0;
    const daysLeft = project.endDate
      ? Math.max(0, Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
      : null;

    return (
      <ScaleDecorator>
        <TouchableOpacity
          style={[styles.projectCard, { backgroundColor: colors.bgCard, borderColor: colors.border }, isActive && { shadowOpacity: 0.3, elevation: 8 }]}
          onPress={() => onSelect(project)}
          onLongPress={drag}
          delayLongPress={200}
          activeOpacity={0.7}
        >
          {/* Colour accent bar */}
          <View style={[styles.projectAccent, { backgroundColor: project.color }]} />

          {/* Delete X button */}
          <TouchableOpacity
            style={styles.projectDeleteBtn}
            onPress={() => onDelete(project)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={22} color={colors.textMuted + '80'} />
          </TouchableOpacity>

          <View style={styles.projectCardBody}>
            <View style={styles.projectCardHeader}>
              <Text style={styles.projectEmoji}>{project.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.projectName, { color: colors.text }]} numberOfLines={1}>
                  {project.title}
                </Text>
                {project.endDate && (
                  <Text style={[styles.projectDates, { color: colors.textMuted }]}>
                    {daysLeft === 0 ? 'Due today' : daysLeft === 1 ? '1 day left' : `${daysLeft} days left`}
                  </Text>
                )}
              </View>
            </View>

            {/* Mini stats */}
            <View style={styles.projectStats}>
              {COLUMNS.map(col => {
                const count = project.tasks.filter(t => t.column === col.key).length;
                return (
                  <View key={col.key} style={styles.miniStat}>
                    <Text style={[styles.miniStatIcon, {
                      color: col.key === 'done' ? colors.accentGreen
                        : col.key === 'progress' ? colors.accentOrange
                        : colors.textMuted
                    }]}>{col.icon}</Text>
                    <Text style={[styles.miniStatVal, { color: colors.text }]}>{count}</Text>
                  </View>
                );
              })}
            </View>

            {/* Progress bar */}
            {total > 0 && (
              <View style={[styles.projectProgress, { backgroundColor: colors.border }]}>
                <View style={[styles.projectProgressFill, {
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? colors.accentGreen : project.color,
                }]} />
              </View>
            )}

            <Text style={[styles.projectTaskCount, { color: colors.textMuted }]}>
              {total === 0 ? 'No tasks yet' : `${done}/${total} complete`}
            </Text>
          </View>
        </TouchableOpacity>
      </ScaleDecorator>
    );
  }, [colors, onSelect, onDelete]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={styles.indexHeader}>
        <LinearGradient
          colors={[colors.accent + '20', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.indexTitle, { color: colors.text }]}>Projects</Text>
        <Text style={[styles.indexSub, { color: colors.textMuted }]}>Your Kanban boards · hold to reorder</Text>
      </View>

      {/* Make Some Time banner */}
      {totalIncomplete > 0 && (
        <TouchableOpacity
          style={[styles.makeTimeBanner, { backgroundColor: colors.bgCard, borderColor: colors.accent + '30' }]}
          onPress={onMakeSomeTime}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.accent + '10', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          />
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={[styles.makeTimeBannerText, { color: colors.accent }]}>Make Some Time</Text>
          <Text style={[styles.makeTimeBannerCount, { color: colors.textMuted }]}>{totalIncomplete} tasks to schedule</Text>
        </TouchableOpacity>
      )}

      <DraggableFlatList
        data={projects}
        renderItem={renderProject}
        keyExtractor={item => item.id}
        onDragEnd={({ data }) => onReorder(data.map(p => p.id))}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.indexContent}
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.projectCard, styles.addProjectCard, { borderColor: colors.border }]}
            onPress={onAdd}
            activeOpacity={0.7}
          >
            <Text style={[styles.addProjectIcon, { color: colors.accent }]}>+</Text>
            <Text style={[styles.addProjectText, { color: colors.accent }]}>New Project</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

// Kanban task card with arrow buttons
function TaskCard({ task, colors, onMove, onDelete, onEdit, drag, isActive }) {
  const colIdx = COLUMNS.findIndex(c => c.key === task.column);
  const canGoLeft = colIdx > 0;
  const canGoRight = colIdx < COLUMNS.length - 1;
  const [expanded, setExpanded] = useState(false);

  return (
    <ScaleDecorator>
      <TouchableOpacity
        style={[styles.taskCard, {
          backgroundColor: colors.bg,
          borderColor: isActive ? colors.accent : colors.border,
        }]}
        onLongPress={drag}
        activeOpacity={0.8}
        delayLongPress={150}
      >
        {/* Task text — tap to expand, long-press to edit */}
        <TouchableOpacity
          onPress={() => setExpanded(e => !e)}
          onLongPress={() => onEdit?.(task)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.taskText,
              { color: colors.text },
              task.column === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted },
            ]}
            numberOfLines={expanded ? undefined : 3}
          >
            {task.text}
          </Text>
        </TouchableOpacity>

        {/* Action row: arrows, daily, delete */}
        <View style={styles.taskActions}>
          {/* Left arrow */}
          <TouchableOpacity
            onPress={() => { if (canGoLeft) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMove(task.id, COLUMNS[colIdx - 1].key); } }}
            style={[styles.arrowBtn, !canGoLeft && { opacity: 0.2 }]}
            disabled={!canGoLeft}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.arrowText, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>

          {/* Right arrow */}
          <TouchableOpacity
            onPress={() => { if (canGoRight) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMove(task.id, COLUMNS[colIdx + 1].key); } }}
            style={[styles.arrowBtn, !canGoRight && { opacity: 0.2 }]}
            disabled={!canGoRight}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.arrowText, { color: colors.accent }]}>›</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }} />

          {/* Delete */}
          <TouchableOpacity
            onPress={() => {
              Haptics.selectionAsync();
              Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => onDelete(task.id) },
              ]);
            }}
            style={styles.taskDeleteBtn}
          >
            <Text style={[styles.taskDelete, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

// Kanban board detail view
function ProjectKanbanView({ project, colors, onBack, onAddTask, onMoveTask, onDeleteTask, onReorderTasks, onOpenMakeTime, onEditTask, personalityEnabled }) {
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState('todo');
  const [editingTask, setEditingTask] = useState(null);
  const [editText, setEditText] = useState('');
  const scrollRef = useRef(null);

  const total = project.tasks.length;
  const done = project.tasks.filter(t => t.column === 'done').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const incompleteTasks = useMemo(() =>
    project.tasks.filter(t => t.column !== 'done'),
    [project.tasks]
  );

  const handleAddTask = (data) => {
    if (!data.text?.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddTask({ text: data.text.trim(), column: addingToColumn });
  };

  const handleEditTask = useCallback((task) => {
    setEditingTask(task);
    setEditText(task.text);
  }, []);

  const confirmEditTask = useCallback(() => {
    if (!editingTask || !editText.trim()) return;
    onEditTask(editingTask.id, { text: editText.trim() });
    setEditingTask(null);
    setEditText('');
  }, [editingTask, editText, onEditTask]);

  const renderTask = useCallback(({ item, drag, isActive }) => (
    <TaskCard
      task={item}
      colors={colors}
      onMove={onMoveTask}
      onDelete={onDeleteTask}
      onEdit={handleEditTask}
      drag={drag}
      isActive={isActive}
    />
  ), [colors, onMoveTask, onDeleteTask, handleEditTask]);

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={[styles.kanbanHeader, { borderBottomColor: colors.border }]}>
        <LinearGradient
          colors={[project.color + '20', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kanbanTitle, { color: colors.text }]}>
            {project.emoji} {project.title}
          </Text>
          <View style={styles.kanbanMeta}>
            {project.endDate && (
              <Text style={[styles.kanbanDates, { color: colors.textMuted }]}>
                {project.startDate} → {project.endDate}
              </Text>
            )}
            <Text style={[styles.kanbanProgress, { color: project.color }]}>
              {progress}% complete
            </Text>
          </View>
        </View>
      </View>

      {/* Progress bar */}
      {total > 0 && (
        <View style={[styles.kanbanProgressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.kanbanProgressFill, {
            width: `${progress}%`,
            backgroundColor: progress === 100 ? colors.accentGreen : project.color,
          }]} />
        </View>
      )}

      {/* Make Some Time banner — top of page like Complete Day */}
      {incompleteTasks.length > 0 && (
        <TouchableOpacity
          style={[styles.makeTimeBanner, { backgroundColor: colors.bgCard, borderColor: colors.accent + '30' }]}
          onPress={() => onOpenMakeTime(project.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={[colors.accent + '10', 'transparent']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 14 }]}
          />
          <Ionicons name="time-outline" size={18} color={colors.accent} />
          <Text style={[styles.makeTimeBannerText, { color: colors.accent }]}>Make Some Time</Text>
          <Text style={[styles.makeTimeBannerCount, { color: colors.textMuted }]}>{incompleteTasks.length} tasks to schedule</Text>
        </TouchableOpacity>
      )}

      {/* Kanban columns — horizontal scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        snapToInterval={COLUMN_WIDTH + 12}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsContainer}
      >
        {COLUMNS.map(col => {
          const columnTasks = project.tasks.filter(t => t.column === col.key);
          const colColor = col.key === 'done' ? colors.accentGreen
            : col.key === 'progress' ? colors.accentOrange
            : colors.textMuted;

          return (
            <View key={col.key} style={[styles.column, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              {/* Column header */}
              <View style={styles.columnHeader}>
                <View style={styles.columnTitleRow}>
                  <Text style={[styles.columnIcon, { color: colColor }]}>{col.icon}</Text>
                  <Text style={[styles.columnLabel, { color: colors.text }]}>{col.label}</Text>
                  <View style={[styles.columnCount, { backgroundColor: colColor + '20' }]}>
                    <Text style={[styles.columnCountText, { color: colColor }]}>{columnTasks.length}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => { setAddingToColumn(col.key); setFlyoutVisible(true); }}
                  style={[styles.addTaskBtn, { backgroundColor: colColor + '15' }]}
                >
                  <Text style={[styles.addTaskBtnText, { color: colColor }]}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Tasks — draggable for reorder */}
              <View style={styles.columnScroll}>
                <DraggableFlatList
                  data={columnTasks}
                  renderItem={renderTask}
                  keyExtractor={item => item.id}
                  onDragEnd={({ data }) => {
                    onReorderTasks(col.key, data.map(t => t.id));
                  }}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <View style={styles.emptyColumn}>
                      <Text style={[styles.emptyColumnText, { color: colors.textMuted }]}>
                        {col.key === 'todo' ? 'Add tasks to get started' : 'Move tasks here with ‹ ›'}
                      </Text>
                    </View>
                  }
                  contentContainerStyle={{ paddingBottom: 8 }}
                />
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Hint */}
      <View style={[styles.swipeHint, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
        <Text style={[styles.swipeHintText, { color: colors.textMuted }]}>
          ‹ › move between columns · hold to reorder
        </Text>
      </View>

      <FAB onPress={() => { setAddingToColumn('todo'); setFlyoutVisible(true); }} />
      <EntryFormFlyout
        visible={flyoutVisible}
        onClose={() => setFlyoutVisible(false)}
        onSubmit={handleAddTask}
        visibleFields={['text']}
      />

      {/* Edit task modal */}
      <Modal visible={!!editingTask} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.convertOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.convertModal, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.convertTitle, { color: colors.text }]}>Edit Task</Text>
            <TextInput
              style={[styles.editTaskInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              value={editText}
              onChangeText={setEditText}
              multiline
              autoFocus
              selectionColor={colors.accent}
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.convertActions}>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.bgInput || colors.border }]}
                onPress={() => setEditingTask(null)}
              >
                <Text style={[styles.convertBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.accent }]}
                onPress={confirmEditTask}
              >
                <Text style={[styles.convertBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function formatDate(date) {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// New project modal
function NewProjectModal({ visible, onClose, onSave, colors }) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [color, setColor] = useState('#6C5CE7');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      emoji,
      color,
      startDate: formatDate(startDate),
      endDate: formatDate(endDate),
    });
    setTitle('');
    setEmoji('🎯');
    setColor('#6C5CE7');
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={[styles.modal, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Project</Text>

            {/* Project name */}
            <TextInput
              style={[styles.modalInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
              placeholder="Project name"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              selectionColor={colors.accent}
              autoFocus
            />

            {/* Emoji picker */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Icon</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emojiRow}>
              {EMOJIS.map(e => (
                <TouchableOpacity
                  key={e}
                  style={[styles.emojiBtn, emoji === e && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                  onPress={() => setEmoji(e)}
                >
                  <Text style={styles.emojiBtnText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Colour picker */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Colour</Text>
            <View style={styles.colorRow}>
              {PROJECT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c }, color === c && styles.colorBtnActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {/* Timeline */}
            <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Timeline (optional)</Text>
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => setShowStartPicker(true)}
              >
                <Text style={{ color: startDate ? colors.text : colors.textMuted, fontSize: SIZES.sm }}>
                  {startDate ? formatDate(startDate) : 'Start date'}
                </Text>
              </TouchableOpacity>
              <Text style={[styles.dateSep, { color: colors.textMuted }]}>→</Text>
              <TouchableOpacity
                style={[styles.dateInput, { borderColor: colors.border, backgroundColor: colors.bg }]}
                onPress={() => setShowEndPicker(true)}
              >
                <Text style={{ color: endDate ? colors.text : colors.textMuted, fontSize: SIZES.sm }}>
                  {endDate ? formatDate(endDate) : 'End date'}
                </Text>
              </TouchableOpacity>
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="dark"
                accentColor={colors.accent}
                onChange={(event, selected) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (selected) setStartDate(selected);
                }}
              />
            )}

            {showEndPicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                themeVariant="dark"
                accentColor={colors.accent}
                minimumDate={startDate || undefined}
                onChange={(event, selected) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (selected) setEndDate(selected);
                }}
              />
            )}

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={[styles.modalBtn, { backgroundColor: colors.border }]}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.modalBtn, { backgroundColor: color }]}
              >
                <Text style={[styles.modalBtnText, { color: '#FFF' }]}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProjectsScreen({ route }) {
  const { colors } = useTheme();
  const { projects, addProject, updateProject, deleteProject, addProjectTask, moveProjectTask, deleteProjectTask, updateProjectTask, reorderProjectTasks, reorderProjects, addEntry, updateEntry, personalityEnabled } = useApp();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Make Some Time state
  const [makeTimeVisible, setMakeTimeVisible] = useState(false);
  const [makeTimeSelectedProjects, setMakeTimeSelectedProjects] = useState(new Set());
  const [makeTimeDate, setMakeTimeDate] = useState(new Date());
  const [makeTimePomodoros, setMakeTimePomodoros] = useState(2);
  const [makeTimeProjectFilter, setMakeTimeProjectFilter] = useState(null);

  // Deep-link: auto-select project from route params
  React.useEffect(() => {
    if (route?.params?.projectId && projects.length > 0) {
      const target = projects.find(p => p.id === route.params.projectId);
      if (target) setSelectedProject(target);
    }
  }, [route?.params?.projectId, projects]);

  // Keep selected project in sync with state
  const activeProject = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find(p => p.id === selectedProject.id) || null;
  }, [projects, selectedProject]);

  // All incomplete tasks across projects, tagged with project info
  const allIncompleteTasks = useMemo(() =>
    projects.flatMap(p =>
      p.tasks
        .filter(t => t.column !== 'done')
        .map(t => ({ ...t, projectId: p.id, projectTitle: p.title, projectEmoji: p.emoji, projectColor: p.color }))
    ),
    [projects]
  );

  // Tasks filtered for the Make Some Time modal
  const filteredMakeTimeTasks = useMemo(() => {
    if (makeTimeProjectFilter) return allIncompleteTasks.filter(t => t.projectId === makeTimeProjectFilter);
    return allIncompleteTasks;
  }, [allIncompleteTasks, makeTimeProjectFilter]);

  // Group filtered tasks by project for display
  const makeTimeGroups = useMemo(() => {
    const groups = {};
    filteredMakeTimeTasks.forEach(t => {
      if (!groups[t.projectId]) groups[t.projectId] = { title: t.projectTitle, emoji: t.projectEmoji, color: t.projectColor, tasks: [] };
      groups[t.projectId].tasks.push(t);
    });
    return Object.entries(groups);
  }, [filteredMakeTimeTasks]);

  const handleCreateProject = async (data) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addProject(data);
    setShowNewModal(false);
  };

  const handleDeleteProjectFromIndex = useCallback((project) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Project',
      `Delete "${project.title}" and all its tasks?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteProject(project.id) },
      ]
    );
  }, [deleteProject]);

  const handleDeleteProject = (id) => {
    Alert.alert('Delete Project', 'This will remove the project and all its tasks.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteProject(id);
          setSelectedProject(null);
        },
      },
    ]);
  };

  // Make Some Time handlers
  const openMakeTime = useCallback((projectId = null) => {
    setMakeTimeProjectFilter(projectId);
    setMakeTimeSelectedProjects(projectId ? new Set([projectId]) : new Set());
    setMakeTimeDate(new Date());
    setMakeTimePomodoros(2);
    setMakeTimeVisible(true);
  }, []);

  const toggleMakeTimeProject = useCallback((projectId) => {
    setMakeTimeSelectedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }, []);

  const confirmMakeTime = useCallback(async () => {
    if (makeTimeSelectedProjects.size === 0) return;
    const y = makeTimeDate.getFullYear();
    const m = String(makeTimeDate.getMonth() + 1).padStart(2, '0');
    const d = String(makeTimeDate.getDate()).padStart(2, '0');
    const targetDate = `${y}-${m}-${d}`;

    for (const projectId of makeTimeSelectedProjects) {
      const project = projects.find(p => p.id === projectId);
      if (!project) continue;
      const text = personalityEnabled
        ? `Smash ${project.emoji} ${project.title}`
        : `Work on ${project.emoji} ${project.title}`;
      await addEntry({ text, type: 'task', date: targetDate, source: 'daily', fromProject: true, projectId: project.id, pomodoros: makeTimePomodoros });
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMakeTimeVisible(false);
    const count = makeTimeSelectedProjects.size;
    Alert.alert(
      addedToDailyMessage(personalityEnabled),
      `${count} project${count > 1 ? 's' : ''} scheduled with ${makeTimePomodoros} pomodoro${makeTimePomodoros > 1 ? 's' : ''} for ${targetDate}`
    );
  }, [makeTimeSelectedProjects, makeTimeDate, makeTimePomodoros, projects, addEntry, personalityEnabled]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <StatusBar barStyle="light-content" />

      {activeProject ? (
        <ProjectKanbanView
          project={activeProject}
          colors={colors}
          onBack={() => setSelectedProject(null)}
          onAddTask={(task) => addProjectTask(activeProject.id, task)}
          onMoveTask={(taskId, toCol) => moveProjectTask(activeProject.id, taskId, toCol)}
          onDeleteTask={(taskId) => deleteProjectTask(activeProject.id, taskId)}
          onReorderTasks={(column, orderedIds) => reorderProjectTasks(activeProject.id, column, orderedIds)}
          onOpenMakeTime={openMakeTime}
          onEditTask={(taskId, updates) => updateProjectTask(activeProject.id, taskId, updates)}
          personalityEnabled={personalityEnabled}
        />
      ) : (
        <ProjectIndexBoard
          projects={projects}
          colors={colors}
          onSelect={setSelectedProject}
          onAdd={() => setShowNewModal(true)}
          onDelete={handleDeleteProjectFromIndex}
          onReorder={reorderProjects}
          onMakeSomeTime={() => openMakeTime()}
        />
      )}

      <NewProjectModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSave={handleCreateProject}
        colors={colors}
      />

      {/* Make Some Time modal — select projects to schedule */}
      <Modal visible={makeTimeVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.convertOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[styles.convertModal, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.convertTitle, { color: colors.text }]}>Make Some Time ⏰</Text>

            {/* Project picker — select which projects to work on */}
            <Text style={[styles.convertLabel, { color: colors.textSecondary }]}>Which projects?</Text>
            <ScrollView style={styles.taskPickerScroll} nestedScrollEnabled>
              {projects.filter(p => p.tasks.some(t => t.column !== 'done')).map(project => {
                const isSelected = makeTimeSelectedProjects.has(project.id);
                const incomplete = project.tasks.filter(t => t.column !== 'done').length;
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.taskPickerItem,
                      { borderColor: colors.border, backgroundColor: colors.bg },
                      isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + '15' },
                    ]}
                    onPress={() => toggleMakeTimeProject(project.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.makeTimeCheckbox, { borderColor: isSelected ? colors.accent : colors.border }, isSelected && { backgroundColor: colors.accent }]}>
                      {isSelected && <Text style={styles.makeTimeCheckIcon}>✓</Text>}
                    </View>
                    <Text style={styles.makeTimeGroupEmoji}>{project.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.taskPickerText, { color: colors.text }, isSelected && { color: colors.accent }]}
                        numberOfLines={1}
                      >{project.title}</Text>
                      <Text style={[{ fontSize: SIZES.xs, color: colors.textMuted }]}>{incomplete} task{incomplete !== 1 ? 's' : ''} remaining</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Date picker */}
            <Text style={[styles.convertLabel, { color: colors.textSecondary, marginTop: 14 }]}>What day?</Text>
            <DateTimePicker
              value={makeTimeDate}
              mode="date"
              display="inline"
              themeVariant="dark"
              accentColor={colors.accent}
              onChange={(event, selected) => {
                if (selected) setMakeTimeDate(selected);
              }}
            />

            {/* Pomodoro picker */}
            <Text style={[styles.convertLabel, { color: colors.textSecondary, marginTop: 14 }]}>How many pomodoros? (25 min blocks)</Text>
            <View style={styles.pomodoroRow}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <TouchableOpacity
                  key={n}
                  style={[
                    styles.pomodoroChip,
                    { borderColor: colors.border, backgroundColor: colors.bg },
                    makeTimePomodoros === n && { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
                  ]}
                  onPress={() => { setMakeTimePomodoros(n); Haptics.selectionAsync(); }}
                >
                  <Text style={[
                    styles.pomodoroChipText,
                    { color: colors.textMuted },
                    makeTimePomodoros === n && { color: colors.accent, fontWeight: '700' },
                  ]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.pomodoroTime, { color: colors.textMuted }]}>
              {makeTimeSelectedProjects.size > 0
                ? `= ${makeTimeSelectedProjects.size} project${makeTimeSelectedProjects.size > 1 ? 's' : ''} × ${makeTimePomodoros * 25} min = ${makeTimeSelectedProjects.size * makeTimePomodoros * 25} minutes`
                : `= ${makeTimePomodoros * 25} minutes per project`}
            </Text>

            {/* Actions */}
            <View style={styles.convertActions}>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.bgInput || colors.border }]}
                onPress={() => setMakeTimeVisible(false)}
              >
                <Text style={[styles.convertBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.accent }, makeTimeSelectedProjects.size === 0 && { opacity: 0.4 }]}
                onPress={confirmMakeTime}
                disabled={makeTimeSelectedProjects.size === 0}
              >
                <Text style={[styles.convertBtnText, { color: '#fff' }]}>Let's Go! 🚀</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <KnowledgeBaseButton sectionId="projects" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Index board
  indexContent: { paddingHorizontal: 16, paddingBottom: 100, gap: 12 },
  indexHeader: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  indexTitle: { fontSize: SIZES.xxxl, fontWeight: '800', letterSpacing: -1 },
  indexSub: { fontSize: SIZES.md, marginTop: 2 },

  projectGrid: {
    paddingHorizontal: 16, gap: 12,
  },
  projectCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden', position: 'relative',
  },
  projectDeleteBtn: {
    position: 'absolute', top: 10, right: 10, zIndex: 10,
  },
  projectAccent: { height: 4 },
  projectCardBody: { padding: 16 },
  projectCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  projectEmoji: { fontSize: 32 },
  projectName: { fontSize: SIZES.lg, fontWeight: '700' },
  projectDates: { fontSize: SIZES.xs, marginTop: 2 },
  projectStats: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniStatIcon: { fontSize: 14 },
  miniStatVal: { fontSize: SIZES.sm, fontWeight: '600' },
  projectProgress: { height: 4, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  projectProgressFill: { height: '100%', borderRadius: 2 },
  projectTaskCount: { fontSize: SIZES.xs },

  addProjectCard: {
    borderStyle: 'dashed', borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32,
  },
  addProjectIcon: { fontSize: 32, fontWeight: '300' },
  addProjectText: { fontSize: SIZES.md, fontWeight: '600', marginTop: 4 },

  // Kanban view
  kanbanHeader: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center',
    borderBottomWidth: 0.5, position: 'relative',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  backArrow: { fontSize: 32, fontWeight: '300' },
  kanbanTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  kanbanMeta: { flexDirection: 'row', gap: 12, marginTop: 2 },
  kanbanDates: { fontSize: SIZES.xs },
  kanbanProgress: { fontSize: SIZES.xs, fontWeight: '700' },
  kanbanProgressBar: { height: 3, marginHorizontal: 16, borderRadius: 2, marginTop: 8 },
  kanbanProgressFill: { height: '100%', borderRadius: 2 },

  columnsContainer: { paddingHorizontal: 12, paddingTop: 16, gap: 12 },
  column: {
    width: COLUMN_WIDTH, borderRadius: 16, borderWidth: 1,
    padding: 12, maxHeight: '100%',
  },
  columnHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  columnTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  columnIcon: { fontSize: 16 },
  columnLabel: { fontSize: SIZES.md, fontWeight: '700' },
  columnCount: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
  },
  columnCountText: { fontSize: SIZES.xs, fontWeight: '700' },
  addTaskBtn: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  addTaskBtnText: { fontSize: 18, fontWeight: '600' },

  addTaskRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10,
  },
  addTaskInput: { flex: 1, fontSize: SIZES.sm, padding: 0 },
  addTaskSend: { fontSize: 18, fontWeight: '700', marginLeft: 8 },

  columnScroll: { flex: 1 },

  taskCard: {
    borderRadius: 12, borderWidth: 1,
    padding: 10, marginBottom: 8,
    gap: 6,
  },
  taskActions: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  arrowBtn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  arrowText: {
    fontSize: 22, fontWeight: '300',
  },
  taskText: { fontSize: SIZES.sm, lineHeight: 20 },
  taskDelete: { fontSize: 16, fontWeight: '600' },
  taskDeleteBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  emptyColumn: { paddingVertical: 24, alignItems: 'center' },
  emptyColumnText: { fontSize: SIZES.sm, textAlign: 'center' },

  swipeHint: {
    paddingVertical: 8, alignItems: 'center', borderTopWidth: 0.5,
  },
  swipeHintText: { fontSize: SIZES.xs },

  // New project modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalScrollContent: {
    flexGrow: 1, justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderBottomWidth: 0,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  modalInput: {
    fontSize: SIZES.base, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16,
  },
  modalLabel: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  emojiRow: { marginBottom: 16 },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 8, borderWidth: 1, borderColor: 'transparent',
  },
  emojiBtnText: { fontSize: 24 },
  colorRow: { flexDirection: 'row', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  colorBtn: {
    width: 32, height: 32, borderRadius: 16,
  },
  colorBtnActive: {
    borderWidth: 3, borderColor: '#FFF',
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20 },
  dateInput: {
    flex: 1, borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center',
  },
  dateSep: { fontSize: SIZES.md },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  modalBtnText: { fontSize: SIZES.md, fontWeight: '700' },

  // Make Some Time button
  makeTimeBtn: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  makeTimeBtnText: {
    color: '#fff',
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  taskPickerScroll: {
    maxHeight: 120,
    marginBottom: 4,
  },
  taskPickerItem: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskPickerText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
  },
  pomodoroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  pomodoroChip: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomodoroChipText: {
    fontSize: SIZES.base,
    fontWeight: '500',
  },
  pomodoroTime: {
    fontSize: SIZES.xs,
    marginTop: 6,
    textAlign: 'center',
  },

  // Convert modal (Make Some Time)
  convertOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  convertModal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%',
  },
  convertTitle: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  convertSubtitle: { fontSize: SIZES.sm, textAlign: 'center', marginBottom: 16 },
  convertLabel: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  convertActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  convertBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  convertBtnText: { fontSize: SIZES.md, fontWeight: '700' },

  // Edit task modal
  editTaskInput: {
    fontSize: SIZES.base, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, minHeight: 80,
    textAlignVertical: 'top',
  },

  // Make Some Time banner (index page)
  makeTimeBanner: {
    marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 12, overflow: 'hidden', position: 'relative',
  },
  makeTimeBannerText: { fontSize: SIZES.sm, fontWeight: '700' },
  makeTimeBannerCount: { fontSize: SIZES.xs, marginLeft: 'auto' },

  // Multi-select task picker
  makeTimeGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, marginBottom: 4 },
  makeTimeGroupEmoji: { fontSize: 14 },
  makeTimeGroupTitle: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  makeTimeCheckbox: {
    width: 20, height: 20, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  makeTimeCheckIcon: { color: '#fff', fontSize: 12, fontWeight: '800' },
});
