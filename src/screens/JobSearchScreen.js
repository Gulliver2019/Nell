import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, FlatList,
  Alert, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { JOB_STAGES } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const STAGE_CONFIG = {
  identified: { label: 'Identified', emoji: '🔍', color: '#8E8E93' },
  applied:    { label: 'Applied',    emoji: '📨', color: '#5AC8FA' },
  interviewing: { label: 'Interviewing', emoji: '🎤', color: '#FF9500' },
  offered:    { label: 'Offered',    emoji: '🎉', color: '#34C759' },
};

export default function JobSearchScreen() {
  const { colors } = useTheme();
  const {
    jobApplications,
    addJobApplication, updateJobApplication, deleteJobApplication, moveJobApplication,
  } = useApp();

  const [selectedStage, setSelectedStage] = useState('identified');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editApp, setEditApp] = useState(null);

  // Form state
  const [formCompany, setFormCompany] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formDayRate, setFormDayRate] = useState('');
  const [formRecruiter, setFormRecruiter] = useState('');
  const [formNextAction, setFormNextAction] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const resetForm = () => {
    setFormCompany(''); setFormRole(''); setFormDayRate('');
    setFormRecruiter(''); setFormNextAction(''); setFormNotes('');
  };

  const stageApps = useMemo(() => {
    return jobApplications
      .filter(a => a.stage === selectedStage)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [jobApplications, selectedStage]);

  const stageCounts = useMemo(() => {
    const counts = {};
    JOB_STAGES.forEach(s => { counts[s] = 0; });
    jobApplications.forEach(a => { counts[a.stage] = (counts[a.stage] || 0) + 1; });
    return counts;
  }, [jobApplications]);

  // Today's application count
  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return jobApplications.filter(a => a.createdAt && a.createdAt.startsWith(today)).length;
  }, [jobApplications]);

  const handleAdd = async () => {
    if (!formCompany.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await addJobApplication({
      company: formCompany.trim(),
      role: formRole.trim(),
      dayRate: formDayRate.trim(),
      recruiter: formRecruiter.trim(),
      nextAction: formNextAction.trim(),
      notes: formNotes.trim(),
      stage: selectedStage,
    });
    resetForm();
    setShowAddModal(false);
  };

  const openEdit = (app) => {
    setEditApp(app);
    setFormCompany(app.company);
    setFormRole(app.role);
    setFormDayRate(app.dayRate || '');
    setFormRecruiter(app.recruiter || '');
    setFormNextAction(app.nextAction || '');
    setFormNotes(app.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editApp) return;
    await updateJobApplication(editApp.id, {
      company: formCompany.trim(),
      role: formRole.trim(),
      dayRate: formDayRate.trim(),
      recruiter: formRecruiter.trim(),
      nextAction: formNextAction.trim(),
      notes: formNotes.trim(),
    });
    resetForm();
    setShowEditModal(false);
    setEditApp(null);
  };

  const handleDelete = (app) => {
    Alert.alert('Delete', `Remove "${app.company} — ${app.role}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteJobApplication(app.id) },
    ]);
  };

  const handleMove = (app, direction) => {
    const currentIdx = JOB_STAGES.indexOf(app.stage);
    const newIdx = currentIdx + direction;
    if (newIdx < 0 || newIdx >= JOB_STAGES.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    moveJobApplication(app.id, JOB_STAGES[newIdx]);
  };

  const renderAppCard = ({ item }) => {
    const stageIdx = JOB_STAGES.indexOf(item.stage);
    const stageInfo = STAGE_CONFIG[item.stage];

    return (
      <View style={[styles.appCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <View style={styles.appCardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.appCompany, { color: colors.text }]}>{item.company}</Text>
            {item.role ? <Text style={[styles.appRole, { color: colors.textSecondary }]}>{item.role}</Text> : null}
          </View>
          <View style={styles.appCardActions}>
            <TouchableOpacity onPress={() => openEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
            </TouchableOpacity>
          </View>
        </View>

        {item.dayRate ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>💷</Text>
            <Text style={[styles.detailText, { color: colors.text }]}>{item.dayRate}/day</Text>
          </View>
        ) : null}
        {item.recruiter ? (
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textMuted }]}>👤</Text>
            <Text style={[styles.detailText, { color: colors.text }]}>{item.recruiter}</Text>
          </View>
        ) : null}
        {item.nextAction ? (
          <View style={[styles.nextActionCard, { backgroundColor: colors.accent + '10' }]}>
            <Text style={[styles.nextActionLabel, { color: colors.accent }]}>NEXT:</Text>
            <Text style={[styles.nextActionText, { color: colors.text }]}>{item.nextAction}</Text>
          </View>
        ) : null}

        {/* Stage move buttons */}
        <View style={styles.moveRow}>
          {stageIdx > 0 && (
            <TouchableOpacity
              style={[styles.moveBtn, { backgroundColor: colors.bgInput }]}
              onPress={() => handleMove(item, -1)}
            >
              <Ionicons name="arrow-back" size={14} color={colors.textSecondary} />
              <Text style={[styles.moveBtnText, { color: colors.textSecondary }]}>
                {STAGE_CONFIG[JOB_STAGES[stageIdx - 1]].label}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {stageIdx < JOB_STAGES.length - 1 && (
            <TouchableOpacity
              style={[styles.moveBtn, { backgroundColor: colors.accent + '15' }]}
              onPress={() => handleMove(item, 1)}
            >
              <Text style={[styles.moveBtnText, { color: colors.accent }]}>
                {STAGE_CONFIG[JOB_STAGES[stageIdx + 1]].label}
              </Text>
              <Ionicons name="arrow-forward" size={14} color={colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderFormModal = (isEdit) => {
    const visible = isEdit ? showEditModal : showAddModal;
    const onClose = () => { isEdit ? setShowEditModal(false) : setShowAddModal(false); resetForm(); };
    const onSubmit = isEdit ? handleSaveEdit : handleAdd;

    return (
      <Modal visible={visible} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {isEdit ? 'Edit Application' : 'New Application'}
            </Text>

            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Company *" placeholderTextColor={colors.textMuted}
              value={formCompany} onChangeText={setFormCompany} autoFocus selectionColor={colors.accent} />

            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Role / Title" placeholderTextColor={colors.textMuted}
              value={formRole} onChangeText={setFormRole} selectionColor={colors.accent} />

            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Day rate (e.g. £550)" placeholderTextColor={colors.textMuted}
              value={formDayRate} onChangeText={setFormDayRate} selectionColor={colors.accent} />

            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Recruiter / Contact" placeholderTextColor={colors.textMuted}
              value={formRecruiter} onChangeText={setFormRecruiter} selectionColor={colors.accent} />

            <TextInput style={[styles.input, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Next action" placeholderTextColor={colors.textMuted}
              value={formNextAction} onChangeText={setFormNextAction} selectionColor={colors.accent} />

            <TextInput style={[styles.input, styles.textArea, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder="Notes" placeholderTextColor={colors.textMuted}
              value={formNotes} onChangeText={setFormNotes} multiline selectionColor={colors.accent} />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={[styles.cancelBtn, { backgroundColor: colors.bgInput }]}>
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={onSubmit} style={styles.submitBtn}>
                <LinearGradient colors={[colors.accent, colors.accentLight || colors.accent]} style={styles.submitGradient}>
                  <Text style={[styles.submitText, { color: colors.text }]}>{isEdit ? 'Save' : 'Add'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={[colors.accent + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Job Search</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {todayCount}/3 applications today · {jobApplications.length} total
          </Text>
        </View>
      </View>

      {/* Stage tabs */}
      <View style={styles.stageTabs}>
        {JOB_STAGES.map(stage => {
          const conf = STAGE_CONFIG[stage];
          const isActive = stage === selectedStage;
          return (
            <TouchableOpacity
              key={stage}
              style={[styles.stageTab, isActive && { borderBottomColor: conf.color, borderBottomWidth: 2 }]}
              onPress={() => setSelectedStage(stage)}
            >
              <Text style={[styles.stageTabEmoji]}>{conf.emoji}</Text>
              <Text style={[styles.stageTabLabel, { color: isActive ? colors.text : colors.textMuted }]}>
                {conf.label}
              </Text>
              <View style={[styles.stageCount, { backgroundColor: isActive ? conf.color + '30' : colors.bgInput }]}>
                <Text style={[styles.stageCountText, { color: isActive ? conf.color : colors.textMuted }]}>
                  {stageCounts[stage]}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* List */}
      <FlatList
        data={stageApps}
        keyExtractor={item => item.id}
        renderItem={renderAppCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>{STAGE_CONFIG[selectedStage].emoji}</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No {STAGE_CONFIG[selectedStage].label.toLowerCase()} applications
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => { resetForm(); setShowAddModal(true); }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {renderFormModal(false)}
      {renderFormModal(true)}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  headerSubtitle: { fontSize: SIZES.sm, marginTop: 4 },
  stageTabs: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  stageTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    gap: 2,
  },
  stageTabEmoji: { fontSize: 18 },
  stageTabLabel: { fontSize: 10, fontWeight: '600' },
  stageCount: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  stageCountText: { fontSize: 11, fontWeight: '700' },
  list: { padding: 16, paddingBottom: 100 },
  appCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  appCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  appCompany: { fontSize: SIZES.base, fontWeight: '700' },
  appRole: { fontSize: SIZES.sm, marginTop: 2 },
  appCardActions: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  detailLabel: { fontSize: 14 },
  detailText: { fontSize: SIZES.sm },
  nextActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
  },
  nextActionLabel: { fontSize: SIZES.xs, fontWeight: '700' },
  nextActionText: { fontSize: SIZES.sm, flex: 1 },
  moveRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  moveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  moveBtnText: { fontSize: SIZES.xs, fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyText: { fontSize: SIZES.base },
  fab: {
    position: 'absolute',
    bottom: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 16 },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: SIZES.base,
    marginBottom: 10,
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontWeight: '600' },
  submitBtn: { flex: 1 },
  submitGradient: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitText: { fontWeight: '700' },
});
