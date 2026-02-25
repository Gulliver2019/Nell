import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const HABIT_ICONS = ['💪', '📚', '🏃', '🧘', '💧', '🎨', '🎵', '✍️', '🥗', '😴', '🧹', '💊', '🚭', '📱', '🌿', '🙏'];

export default function HabitTrackerScreen() {
  const { colors } = useTheme();
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
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[colors.accentGreen + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Habits</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Consistency is everything</Text>
            </View>
            <TouchableOpacity onPress={() => setShowAdd(!showAdd)} style={styles.addBtn}>
              <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.addGradient}>
                <Text style={[styles.addIcon, { color: colors.text }]}>+</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Add new habit */}
        {showAdd && (
          <View style={styles.addSection}>
            <View style={styles.addInputRow}>
              <TextInput
                style={[styles.addInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Habit name"
                placeholderTextColor={colors.textMuted}
                value={newName}
                onChangeText={setNewName}
                onSubmitEditing={handleAdd}
                autoFocus
                selectionColor={colors.accent}
              />
              <TouchableOpacity onPress={handleAdd} style={[styles.submitBtn, { backgroundColor: colors.accent }]}>
                <Text style={[styles.submitText, { color: colors.text }]}>Add</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.iconScroll}>
              {HABIT_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setNewIcon(icon)}
                  style={[styles.iconOption, { backgroundColor: colors.bgInput }, newIcon === icon && [styles.iconOptionActive, { borderColor: colors.accent }]]}
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
          <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
            <View style={styles.habitLabel} />
            {days.map(d => (
              <View key={d.key} style={[styles.dayHeader, d.isToday && { backgroundColor: colors.accent + '20', borderRadius: 8 }]}>
                <Text style={[styles.dayLabel, { color: colors.textMuted }, d.isToday && { color: colors.accent }]}>{d.label}</Text>
                <Text style={[styles.dayNum, { color: colors.textSecondary }, d.isToday && { color: colors.accent }]}>{d.day}</Text>
              </View>
            ))}
          </View>

          {habits.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No habits yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap + to start tracking</Text>
            </View>
          ) : (
            habits.map(habit => {
              const streak = getStreak(habit);
              return (
                <TouchableOpacity
                  key={habit.id}
                  style={[styles.habitRow, { borderBottomColor: colors.border }]}
                  onLongPress={() => handleDelete(habit)}
                >
                  <View style={styles.habitLabel}>
                    <Text style={styles.habitIcon}>{habit.icon}</Text>
                    <View style={styles.habitInfo}>
                      <Text style={[styles.habitName, { color: colors.text }]} numberOfLines={1}>{habit.name}</Text>
                      {streak > 0 && (
                        <Text style={[styles.streakText, { color: colors.accentOrange }]}>🔥 {streak}d</Text>
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
                          { backgroundColor: colors.bgInput },
                          done && { backgroundColor: colors.accentGreen + '30' },
                          d.isToday && { borderWidth: 1, borderColor: colors.accent + '40' },
                        ]}
                        onPress={() => handleToggle(habit.id, d.key)}
                      >
                        {done && <Text style={[styles.cellCheck, { color: colors.accentGreen }]}>✓</Text>}
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
          <View style={[styles.statsSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Streaks</Text>
            {habits.map(habit => {
              const streak = getStreak(habit);
              const totalDone = Object.values(habit.completions || {}).filter(Boolean).length;
              return (
                <View key={habit.id} style={styles.statRow}>
                  <Text style={styles.statIcon}>{habit.icon}</Text>
                  <Text style={[styles.statName, { color: colors.text }]}>{habit.name}</Text>
                  <View style={[styles.statBadge, { backgroundColor: colors.bgElevated }]}>
                    <Text style={[styles.statBadgeText, { color: colors.textSecondary }]}>
                      {streak > 0 ? `🔥 ${streak}` : `${totalDone} total`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
      <KnowledgeBaseButton sectionId="habit-tracker" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6, position: 'relative' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.md, marginTop: 2 },
  addBtn: { borderRadius: 20, overflow: 'hidden' },
  addGradient: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addIcon: { fontSize: 24, fontWeight: '300' },
  addSection: {
    paddingHorizontal: 16, paddingBottom: 16,
  },
  addInputRow: { flexDirection: 'row', gap: 8 },
  addInput: {
    flex: 1, borderRadius: SIZES.radius,
    padding: 12, fontSize: SIZES.base,
  },
  submitBtn: {
    borderRadius: SIZES.radius,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  submitText: { fontSize: SIZES.md, fontWeight: '600' },
  iconScroll: { marginTop: 8 },
  iconOption: {
    width: 40, height: 40, borderRadius: SIZES.radius,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 6,
  },
  iconOptionActive: { borderWidth: 2 },
  iconOptionText: { fontSize: 20 },
  grid: { paddingHorizontal: 8 },
  gridHeader: {
    flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitLabel: {
    width: 100, flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 4,
  },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: SIZES.xs, fontWeight: '500' },
  dayNum: { fontSize: SIZES.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '600' },
  emptyText: { fontSize: SIZES.md, marginTop: 4 },
  habitRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitIcon: { fontSize: 18 },
  habitInfo: { flex: 1 },
  habitName: { fontSize: SIZES.sm, fontWeight: '500' },
  streakText: { fontSize: SIZES.xs },
  cell: {
    flex: 1, aspectRatio: 1, maxHeight: 36,
    borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', margin: 2,
  },
  cellCheck: { fontSize: SIZES.md, fontWeight: '700' },
  statsSection: {
    margin: 16, padding: 16,
    borderRadius: SIZES.radiusLg, borderWidth: 1,
  },
  statsTitle: {
    fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8,
  },
  statIcon: { fontSize: 18 },
  statName: { flex: 1, fontSize: SIZES.md },
  statBadge: {
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3,
  },
  statBadgeText: { fontSize: SIZES.xs, fontWeight: '600' },
});
