import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { getDateKey } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const HABIT_ICONS = ['💪', '📚', '🏃', '🧘', '💧', '🎨', '🎵', '✍️', '🥗', '😴', '🧹', '💊', '🚭', '📱', '🌿', '🙏'];

export default function HabitTrackerScreen() {
  const { habits, addHabit, toggleHabitDay, deleteHabit } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💪');

  // Generate last 7 days
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      result.push({
        key: getDateKey(d),
        label: dayNames[d.getDay()],
        day: d.getDate(),
        isToday: i === 0,
      });
    }
    return result;
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addHabit({ name: newName.trim(), icon: newIcon });
    setNewName('');
    setShowAdd(false);
  };

  const handleToggle = (habitId, dateKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleHabitDay(habitId, dateKey);
  };

  const handleDelete = (habit) => {
    Alert.alert('Delete Habit', `Remove "${habit.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(habit.id) },
    ]);
  };

  // Calculate streaks
  const getStreak = (habit) => {
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      if (habit.completions?.[key]) streak++;
      else break;
    }
    return streak;
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[COLORS.accentGreen + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Habits</Text>
              <Text style={styles.subtitle}>Consistency is everything</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
              <LinearGradient colors={[COLORS.accent, COLORS.accentLight]} style={styles.addGradient}>
                <Text style={styles.addIcon}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add new habit */}
        {showAdd && (
          <View style={styles.addSection}>
            <View style={styles.addInputRow}>
              <TextInput
                style={styles.addInput}
                placeholder="Habit name"
                placeholderTextColor={COLORS.textMuted}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleAdd}
                autoFocus
                selectionColor={COLORS.accent}
              />
              <TouchableOpacity onPress={handleAdd} style={styles.submitBtn}>
                <Text style={styles.submitText}>Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {HABIT_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setNewIcon(icon)}
                  style={[styles.iconOption, newIcon === icon && styles.iconOptionActive]}
                >
                  <Text style={styles.iconOptionText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Habit grid */}
        <View style={styles.grid}>
          {/* Day headers */}
          <View style={styles.gridHeader}>
            <View style={styles.habitLabel} />
            {days.map(d => (
              <View key={d.key} style={[styles.dayHeader, d.isToday && styles.dayHeaderToday]}>
                <Text style={[styles.dayLabel, d.isToday && styles.dayLabelToday]}>{d.label}</Text>
                <Text style={[styles.dayNum, d.isToday && styles.dayNumToday]}>{d.day}</Text>
              </View>
            ))}
          </View>

          {habits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={styles.emptyTitle}>No habits yet</Text>
              <Text style={styles.emptyText}>Tap + to start tracking</Text>
            </View>
          ) : (
            habits.map(habit => {
              const streak = getStreak(habit);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={styles.habitRow}
                  onLongPress={() => handleDelete(habit)}
                >
                  <View style={styles.habitLabel}>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                    <View style={styles.habitInfo}>
                      <Text style={styles.habitName} numberOfLines={1}>{habit.name}</Text>
                      {streak > 0 && (
                        <Text style={styles.streakText}>🔥 {streak}d</Text>
                      )}
                    </View>
                  </View>

                  {days.map(d => {
                    const done = habit.completions?.[d.key];
                    return (
                      <TouchableOpacity
                        key={d.key}
                        style={[
                          styles.cell,
                          done && styles.cellDone,
                          d.isToday && styles.cellToday,
                        ]}
                        onPress={() => handleToggle(habit.id, d.key)}
                      >
                        {done && <Text style={styles.cellCheck}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Stats summary */}
        {habits.length > 0 && (
          <View style={styles.statsSection}>
            <Text style={styles.statsTitle}>Streaks</Text>
            {habits.map(habit => {
              const streak = getStreak(habit);
              const totalDone = Object.values(habit.completions || {}).filter(Boolean).length;
              return (
                <View key={habit.id} style={styles.statRow}>
                  <Text style={styles.statIcon}>{habit.icon}</Text>
                  <Text style={styles.statName}>{habit.name}</Text>
                  <View style={styles.statBadge}>
                    <Text style={styles.statBadgeText}>
                      {streak > 0 ? `🔥 ${streak}` : `${totalDone} total`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: COLORS.text, fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: SIZES.md, marginTop: 2 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addIcon: { color: COLORS.text, fontSize: 24, fontWeight: '300' },
  addSection: {
    paddingHorizontal: 16, paddingBottom: 16,
  },
  addInputRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    padding: 12, color: COLORS.text, fontSize: SIZES.base,
  },
  submitBtn: {
    backgroundColor: COLORS.accent, borderRadius: SIZES.radius,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  submitText: { color: COLORS.text, fontSize: SIZES.md, fontWeight: '600' },
  iconScroll: { marginTop: 8 },
  iconOption: {
    width: 40, height: 40, borderRadius: SIZES.radius,
    backgroundColor: COLORS.bgInput, alignItems: 'center', justifyContent: 'center',
    marginRight: 6,
  },
  iconOptionActive: { borderWidth: 2, borderColor: COLORS.accent },
  iconOptionText: { fontSize: 20 },
  grid: { paddingHorizontal: 8 },
  gridHeader: {
    flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  habitLabel: {
    width: 100, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4,
  },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderToday: {
    backgroundColor: COLORS.accent + '20', borderRadius: 8,
  },
  dayLabel: { color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '500' },
  dayLabelToday: { color: COLORS.accent },
  dayNum: { color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600' },
  dayNumToday: { color: COLORS.accent },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '600' },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.md, marginTop: 4 },
  habitRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  habitIcon: { fontSize: 18 },
  habitInfo: { flex: 1 },
  habitName: { color: COLORS.text, fontSize: SIZES.sm, fontWeight: '500' },
  streakText: { color: COLORS.accentOrange, fontSize: SIZES.xs },
  cell: {
    flex: 1, aspectRatio: 1, maxHeight: 36,
    borderRadius: 8, backgroundColor: COLORS.bgInput,
    alignItems: 'center', justifyContent: 'center', margin: 2,
  },
  cellDone: { backgroundColor: COLORS.accentGreen + '30' },
  cellToday: { borderWidth: 1, borderColor: COLORS.accent + '40' },
  cellCheck: { color: COLORS.accentGreen, fontSize: SIZES.md, fontWeight: '700' },
  statsSection: {
    margin: 16, padding: 16, backgroundColor: COLORS.bgCard,
    borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.border,
  },
  statsTitle: {
    color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8,
  },
  statIcon: { fontSize: 18 },
  statName: { flex: 1, color: COLORS.text, fontSize: SIZES.md },
  statBadge: {
    backgroundColor: COLORS.bgElevated, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  statBadgeText: { color: COLORS.textSecondary, fontSize: SIZES.xs, fontWeight: '600' },
});
