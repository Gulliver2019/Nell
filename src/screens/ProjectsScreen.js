import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet,
  Modal, Alert, Dimensions, StatusBar, KeyboardAvoidingView, Platform,
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
function ProjectIndexBoard({ projects, onSelect, onAdd, colors }) {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.indexContent}>
      {/* Header */}
      <View style={styles.indexHeader}>
        <LinearGradient
          colors={[colors.accent + '20', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.indexTitle, { color: colors.text }]}>Projects</Text>
        <Text style={[styles.indexSub, { color: colors.textMuted }]}>Your Kanban boards</Text>
      </View>

      {/* Project cards */}
      <View style={styles.projectGrid}>
        {projects.map(project => {
          const total = project.tasks.length;
          const done = project.tasks.filter(t => t.column === 'done').length;
          const inProgress = project.tasks.filter(t => t.column === 'progress').length;
          const progress = total > 0 ? (done / total) * 100 : 0;
          const daysLeft = project.endDate
            ? Math.max(0, Math.ceil((new Date(project.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
            : null;

          return (
            <TouchableOpacity
              key={project.id}
              style={[styles.projectCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => onSelect(project)}
              onLongPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert('Delete Project', `Remove "${project.title}"?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => {
                    const { deleteProject } = require('../context/AppContext');
                  }},
                ]);
              }}
              activeOpacity={0.7}
            >
              {/* Colour accent bar */}
              <View style={[styles.projectAccent, { backgroundColor: project.color }]} />

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
          );
        })}

        {/* Add project card */}
        <TouchableOpacity
          style={[styles.projectCard, styles.addProjectCard, { borderColor: colors.border }]}
          onPress={onAdd}
          activeOpacity={0.7}
        >
          <Text style={[styles.addProjectIcon, { color: colors.accent }]}>+</Text>
          <Text style={[styles.addProjectText, { color: colors.accent }]}>New Project</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// Kanban task card with arrow buttons
function TaskCard({ task, colors, onMove, onDelete, drag, isActive }) {
  const colIdx = COLUMNS.findIndex(c => c.key === task.column);
  const canGoLeft = colIdx > 0;
  const canGoRight = colIdx < COLUMNS.length - 1;

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
        {/* Left arrow */}
        <TouchableOpacity
          onPress={() => { if (canGoLeft) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMove(task.id, COLUMNS[colIdx - 1].key); } }}
          style={[styles.arrowBtn, !canGoLeft && { opacity: 0.2 }]}
          disabled={!canGoLeft}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.arrowText, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>

        {/* Task text */}
        <Text
          style={[
            styles.taskText,
            { color: colors.text },
            task.column === 'done' && { textDecorationLine: 'line-through', color: colors.textMuted },
          ]}
          numberOfLines={3}
        >
          {task.text}
        </Text>

        {/* Right arrow */}
        <TouchableOpacity
          onPress={() => { if (canGoRight) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onMove(task.id, COLUMNS[colIdx + 1].key); } }}
          style={[styles.arrowBtn, !canGoRight && { opacity: 0.2 }]}
          disabled={!canGoRight}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.arrowText, { color: colors.accent }]}>›</Text>
        </TouchableOpacity>

        {/* Delete */}
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onDelete(task.id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.taskDelete, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </ScaleDecorator>
  );
}

// Kanban board detail view
function ProjectKanbanView({ project, colors, onBack, onAddTask, onMoveTask, onDeleteTask, onReorderTasks }) {
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [addingToColumn, setAddingToColumn] = useState('todo');
  const scrollRef = useRef(null);

  const total = project.tasks.length;
  const done = project.tasks.filter(t => t.column === 'done').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  const handleAddTask = (data) => {
    if (!data.text?.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAddTask({ text: data.text.trim(), column: addingToColumn });
  };

  const renderTask = useCallback(({ item, drag, isActive }) => (
    <TaskCard
      task={item}
      colors={colors}
      onMove={onMoveTask}
      onDelete={onDeleteTask}
      drag={drag}
      isActive={isActive}
    />
  ), [colors, onMoveTask, onDeleteTask]);

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
    </View>
  );
}

// Format a Date object as YYYY-MM-DD
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

export default function ProjectsScreen() {
  const { colors } = useTheme();
  const { projects, addProject, updateProject, deleteProject, addProjectTask, moveProjectTask, deleteProjectTask, reorderProjectTasks } = useApp();
  const [selectedProject, setSelectedProject] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // Keep selected project in sync with state
  const activeProject = useMemo(() => {
    if (!selectedProject) return null;
    return projects.find(p => p.id === selectedProject.id) || null;
  }, [projects, selectedProject]);

  const handleCreateProject = async (data) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await addProject(data);
    setShowNewModal(false);
  };

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
        />
      ) : (
        <ProjectIndexBoard
          projects={projects}
          colors={colors}
          onSelect={setSelectedProject}
          onAdd={() => setShowNewModal(true)}
        />
      )}

      <NewProjectModal
        visible={showNewModal}
        onClose={() => setShowNewModal(false)}
        onSave={handleCreateProject}
        colors={colors}
      />
      <KnowledgeBaseButton sectionId="projects" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Index board
  indexContent: { paddingBottom: 40 },
  indexHeader: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  indexTitle: { fontSize: SIZES.xxxl, fontWeight: '800', letterSpacing: -1 },
  indexSub: { fontSize: SIZES.md, marginTop: 2 },

  projectGrid: {
    paddingHorizontal: 16, gap: 12,
  },
  projectCard: {
    borderRadius: 16, borderWidth: 1, overflow: 'hidden',
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  arrowBtn: {
    width: 28, height: 28, alignItems: 'center', justifyContent: 'center',
  },
  arrowText: {
    fontSize: 22, fontWeight: '300',
  },
  taskText: { fontSize: SIZES.sm, flex: 1, lineHeight: 20 },
  taskDelete: { fontSize: 12, marginLeft: 4 },

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
});
