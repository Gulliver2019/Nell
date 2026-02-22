import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  FlatList, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function RoutinesScreen() {
  const { colors } = useTheme();
  const { routines, addRoutine, updateRoutine, deleteRoutine } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [text, setText] = useState('');
  const [timeBlock, setTimeBlock] = useState('');

  const sorted = [...routines].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const enabledCount = routines.filter(r => r.enabled).length;

  const resetForm = () => {
    setText('');
    setTimeBlock('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (editingId) {
      await updateRoutine(editingId, {
        text: trimmed,
        timeBlock: timeBlock.trim() || null,
      });
    } else {
      await addRoutine({
        text: trimmed,
        timeBlock: timeBlock.trim() || null,
      });
    }
    resetForm();
  }, [text, timeBlock, editingId, addRoutine, updateRoutine]);

  const handleEdit = (routine) => {
    setText(routine.text);
    setTimeBlock(routine.timeBlock || '');
    setEditingId(routine.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Routine', 'This routine will no longer auto-populate your daily log.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          await deleteRoutine(id);
        }
      },
    ]);
  };

  const handleToggle = async (routine) => {
    Haptics.selectionAsync();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await updateRoutine(routine.id, { enabled: !routine.enabled });
  };

  const renderRoutine = ({ item }) => (
    <View style={[styles.routineCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <TouchableOpacity onPress={() => handleToggle(item)} style={styles.toggleArea}>
        <Ionicons
          name={item.enabled ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.enabled ? colors.accentGreen : colors.textMuted}
        />
      </TouchableOpacity>
      <View style={styles.routineInfo}>
        <Text style={[styles.routineText, { color: colors.text }, !item.enabled && { color: colors.textMuted }]}>
          {item.text}
        </Text>
        {item.timeBlock && (
          <Text style={[styles.routineTime, { color: colors.accent }]}>
            🕐 {item.timeBlock}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleEdit(item)} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="pencil-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.actionBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={18} color={colors.accentRed} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient colors={[colors.accent + '20', 'transparent']} style={StyleSheet.absoluteFillObject} />
        <Text style={[styles.title, { color: colors.text }]}>Routines</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {enabledCount} active routine{enabledCount !== 1 ? 's' : ''} · auto-added to dailys
        </Text>
      </View>

      {/* List */}
      <FlatList
        data={sorted}
        renderItem={renderRoutine}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyIcon, { color: colors.accent }]}>🔁</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No routines yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Add recurring tasks that auto-populate your daily log
            </Text>
          </View>
        }
      />

      {/* Form */}
      {showForm && (
        <View style={[styles.formOverlay, { backgroundColor: colors.bg + 'F5' }]}>
          <View style={[styles.formCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {editingId ? 'Edit Routine' : 'New Routine'}
            </Text>
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={text}
              onChangeText={setText}
              placeholder="What do you do every day?"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              autoFocus
            />
            <TextInput
              style={[styles.input, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={timeBlock}
              onChangeText={setTimeBlock}
              placeholder="Time slot (optional, e.g. 07:00)"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: colors.textMuted + '15' }]}
                onPress={resetForm}
              >
                <Text style={[styles.formBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.formBtn, { backgroundColor: colors.accent }, !text.trim() && { opacity: 0.4 }]}
                onPress={handleSave}
                disabled={!text.trim()}
              >
                <Text style={[styles.formBtnText, { color: colors.textInverse || '#fff' }]}>
                  {editingId ? 'Save' : 'Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* FAB */}
      {!showForm && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.accent }]}
          onPress={() => { resetForm(); setShowForm(true); }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.textInverse || '#fff'} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  toggleArea: {
    marginRight: 12,
  },
  routineInfo: {
    flex: 1,
  },
  routineText: {
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  routineTime: {
    fontSize: SIZES.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  actionBtn: {
    padding: 6,
    marginLeft: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '600', marginBottom: 4 },
  emptySub: { fontSize: SIZES.md, textAlign: 'center', paddingHorizontal: 32 },
  formOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  formTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    fontSize: SIZES.base,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
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
