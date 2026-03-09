import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import EndOfDayReflection, { YesterdayNudge } from '../components/EndOfDayReflection';

const HABIT_ICONS = ['💪', '📚', '🏃', '🧘', '💧', '🎨', '🎵', '✍️', '🥗', '😴', '🧹', '💊', '🚭', '📱', '🌿', '🙏'];

const TIME_OPTIONS = [
  { key: 'morning', label: '☀️ Morning' },
  { key: 'afternoon', label: '🌤️ Afternoon' },
  { key: 'evening', label: '🌙 Evening' },
];

const MILESTONES = [
  { days: 7, emoji: '⭐', label: '1 Week' },
  { days: 21, emoji: '🏅', label: '21 Days' },
  { days: 30, emoji: '🏆', label: '30 Days' },
  { days: 66, emoji: '💎', label: '66 Days' },
];

export default function HabitTrackerScreen() {
  const { colors } = useTheme();
  const { habits, addHabit, toggleHabitDay, deleteHabit, habitReflections } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [showEndOfDay, setShowEndOfDay] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💪');
  const [newTimeOfDay, setNewTimeOfDay] = useState('morning');
  const [newTwoMin, setNewTwoMin] = useState('');

  const todayKey = getDateKey();
  const alreadyReflected = useMemo(() => {
    return habitReflections.some(r => r.date === todayKey);
  }, [habitReflections, todayKey]);

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
    await addHabit({
      name: newName.trim(),
      icon: newIcon,
      timeOfDay: newTimeOfDay,
      twoMinVersion: newTwoMin.trim(),
    });
    setNewName('');
    setNewTwoMin('');
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

  // Calculate current streak
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

  // "Never Miss Twice" — how many consecutive days missed from today
  const getMissedDays = (habit) => {
    let missed = 0;
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = getDateKey(d);
      if (!habit.completions?.[key]) missed++;
      else break;
    }
    return missed;
  };

  // Completion rate over last 30 days
  const getCompletionRate = (habit) => {
    let done = 0;
    const today = new Date();
    const created = habit.createdAt ? new Date(habit.createdAt) : null;
    let totalDays = 30;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (created && d < created) { totalDays = i; break; }
      const key = getDateKey(d);
      if (habit.completions?.[key]) done++;
    }
    return totalDays > 0 ? Math.round((done / totalDays) * 100) : 0;
  };

  // Get next milestone
  const getNextMilestone = (streak) => {
    return MILESTONES.find(m => streak < m.days);
  };

  // Get achieved milestones based on best streak
  const getAchievedMilestones = (habit) => {
    const best = Math.max(getStreak(habit), habit.bestStreak || 0);
    return MILESTONES.filter(m => best >= m.days);
  };

  // Group habits by time of day
  const groupedHabits = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    habits.forEach(h => {
      const tod = h.timeOfDay || 'morning';
      if (groups[tod]) groups[tod].push(h);
      else groups.morning.push(h);
    });
    return groups;
  }, [habits]);

  const hasHabits = habits.length > 0;

  const renderHabitRow = (habit) => {
    const streak = getStreak(habit);
    const missed = getMissedDays(habit);
    const achieved = getAchievedMilestones(habit);
    const bestStreak = Math.max(streak, habit.bestStreak || 0);

    const hasMeta = streak > 0 || (bestStreak > streak && bestStreak > 0) ||
      (missed === 1 && streak === 0) || (missed >= 2 && streak === 0) ||
      (habit.twoMinVersion && missed >= 1);

    return (
      <TouchableOpacity
        key={habit.id}
        style={[styles.habitRow, { borderBottomColor: colors.border }]}
        onLongPress={() => handleDelete(habit)}
        activeOpacity={0.7}
      >
        {/* Row 1: Emoji + Name */}
        <View style={styles.habitTitleRow}>
          <Text style={styles.habitIcon}>{habit.icon}</Text>
          <Text style={[styles.habitName, { color: colors.text }]} numberOfLines={1}>{habit.name}</Text>
          {achieved.length > 0 && (
            <Text style={styles.milestoneBadges}>{achieved[achieved.length - 1].emoji}</Text>
          )}
        </View>

        {/* Row 2: Checkboxes — full width */}
        <View style={styles.checksRow}>
          {days.map(d => {
            const done = habit.completions?.[d.key];
            const isPast = !d.isToday && d.key < getDateKey();
            const failed = isPast && !done && d.key >= (habit.createdAt ? getDateKey(new Date(habit.createdAt)) : '');
            return (
              <TouchableOpacity
                key={d.key}
                style={[
                  styles.cell,
                  { backgroundColor: colors.bgInput },
                  done && { backgroundColor: colors.accentGreen + '30' },
                  failed && { backgroundColor: colors.accentRed + '15' },
                  d.isToday && { borderWidth: 1, borderColor: colors.accent + '40' },
                ]}
                onPress={() => handleToggle(habit.id, d.key)}
              >
                {done && <Text style={[styles.cellCheck, { color: colors.accentGreen }]}>✓</Text>}
                {failed && <Text style={[styles.cellCheck, { color: colors.accentRed }]}>✕</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Row 3: Streak / missed / nudge — full width under checkboxes */}
        {hasMeta && (
          <View style={styles.habitMeta}>
            {streak > 0 && (
              <Text style={[styles.streakText, { color: colors.accentOrange }]}>🔥 {streak}d</Text>
            )}
            {bestStreak > streak && bestStreak > 0 && (
              <Text style={[styles.bestStreakText, { color: colors.textMuted }]}>Best: {bestStreak}d</Text>
            )}
            {missed === 1 && streak === 0 && (
              <Text style={[styles.missedWarning, { color: '#F0A500' }]}>⚠️ Don't miss two days running!</Text>
            )}
            {missed >= 2 && streak === 0 && (
              <Text style={[styles.missedWarning, { color: colors.accentRed }]}>🔴 {missed}d missed</Text>
            )}
            {habit.twoMinVersion && missed >= 1 && (
              <Text style={[styles.twoMinNudge, { color: colors.accent }]}>
                💡 Just do: {habit.twoMinVersion}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTimeGroup = (key, label, groupHabits) => {
    if (groupHabits.length === 0) return null;
    return (
      <View key={key} style={styles.timeGroup}>
        <Text style={[styles.timeGroupLabel, { color: colors.textMuted }]}>{label}</Text>
        {groupHabits.map(renderHabitRow)}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[colors.accentGreen + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Habits</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Never miss twice</Text>
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
                autoFocus
                selectionColor={colors.accent}
              />
              <TouchableOpacity onPress={handleAdd} style={[styles.submitBtn, { backgroundColor: colors.accent }]}>
                <Text style={[styles.submitText, { color: colors.text }]}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Two-minute version */}
            <TextInput
              style={[styles.twoMinInput, { backgroundColor: colors.bgInput, color: colors.text }]}
              placeholder='2-min version (e.g. "Read 1 page")'
              placeholderTextColor={colors.textMuted}
              value={newTwoMin}
              onChangeText={setNewTwoMin}
              selectionColor={colors.accent}
            />

            {/* Time of day */}
            <View style={styles.timeRow}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setNewTimeOfDay(t.key)}
                  style={[
                    styles.timeOption,
                    { backgroundColor: colors.bgInput },
                    newTimeOfDay === t.key && { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accent + '15' },
                  ]}
                >
                  <Text style={[styles.timeOptionText, { color: newTimeOfDay === t.key ? colors.accent : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon picker */}
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

        {/* Yesterday's gaps nudge */}
        <YesterdayNudge colors={colors} />

        {/* Habit grid */}
        <View style={styles.grid}>
          {/* Day headers */}
          <View style={[styles.gridHeader, { borderBottomColor: colors.border }]}>
            {days.map(d => (
              <View key={d.key} style={[styles.dayHeader, d.isToday && { backgroundColor: colors.accent + '20', borderRadius: 8 }]}>
                <Text style={[styles.dayLabel, { color: colors.textMuted }, d.isToday && { color: colors.accent }]}>{d.label}</Text>
                <Text style={[styles.dayNum, { color: colors.textSecondary }, d.isToday && { color: colors.accent }]}>{d.day}</Text>
              </View>
            ))}
          </View>

          {!hasHabits ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🌱</Text>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No habits yet</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Tap + to start tracking</Text>
            </View>
          ) : (
            <>
              {renderTimeGroup('morning', '☀️ Morning', groupedHabits.morning)}
              {renderTimeGroup('afternoon', '🌤️ Afternoon', groupedHabits.afternoon)}
              {renderTimeGroup('evening', '🌙 Evening', groupedHabits.evening)}
            </>
          )}
        </View>

        {/* Stats & Insights */}
        {hasHabits && (
          <View style={[styles.statsSection, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Insights</Text>
            {habits.map(habit => {
              const streak = getStreak(habit);
              const bestStreak = Math.max(streak, habit.bestStreak || 0);
              const rate = getCompletionRate(habit);
              const nextMilestone = getNextMilestone(bestStreak);
              const achieved = getAchievedMilestones(habit);

              return (
                <View key={habit.id} style={[styles.statCard, { borderBottomColor: colors.border }]}>
                  <View style={styles.statHeaderRow}>
                    <Text style={styles.statIcon}>{habit.icon}</Text>
                    <Text style={[styles.statName, { color: colors.text }]}>{habit.name}</Text>
                  </View>

                  <View style={styles.statMetrics}>
                    {/* Completion rate */}
                    <View style={[styles.metricBox, { backgroundColor: colors.bgElevated }]}>
                      <Text style={[styles.metricValue, { color: rate >= 80 ? colors.accentGreen : rate >= 50 ? '#F0A500' : colors.accentRed }]}>
                        {rate}%
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>30d rate</Text>
                    </View>

                    {/* Current streak */}
                    <View style={[styles.metricBox, { backgroundColor: colors.bgElevated }]}>
                      <Text style={[styles.metricValue, { color: streak > 0 ? colors.accentOrange : colors.textMuted }]}>
                        {streak > 0 ? `🔥 ${streak}` : '0'}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Streak</Text>
                    </View>

                    {/* Best streak */}
                    <View style={[styles.metricBox, { backgroundColor: colors.bgElevated }]}>
                      <Text style={[styles.metricValue, { color: colors.accent }]}>
                        {bestStreak > 0 ? `⭐ ${bestStreak}` : '—'}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Best</Text>
                    </View>
                  </View>

                  {/* Milestone progress */}
                  {nextMilestone && (
                    <View style={styles.milestoneRow}>
                      <View style={[styles.milestoneBar, { backgroundColor: colors.bgElevated }]}>
                        <View style={[styles.milestoneFill, {
                          backgroundColor: colors.accent + '40',
                          width: `${Math.min(100, (bestStreak / nextMilestone.days) * 100)}%`,
                        }]} />
                      </View>
                      <Text style={[styles.milestoneLabel, { color: colors.textMuted }]}>
                        {nextMilestone.emoji} {nextMilestone.label} ({nextMilestone.days - bestStreak}d to go)
                      </Text>
                    </View>
                  )}

                  {/* Achieved milestones */}
                  {achieved.length > 0 && (
                    <View style={styles.achievedRow}>
                      {achieved.map(m => (
                        <View key={m.days} style={[styles.achievedBadge, { backgroundColor: colors.accent + '15' }]}>
                          <Text style={styles.achievedEmoji}>{m.emoji}</Text>
                          <Text style={[styles.achievedLabel, { color: colors.accent }]}>{m.label}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
        {/* End of Day button */}
        {hasHabits && (
          <TouchableOpacity
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowEndOfDay(true); }}
            style={[styles.eodBtn, alreadyReflected && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={alreadyReflected ? [colors.bgInput, colors.bgInput] : [colors.accent + '20', colors.accentWarm + '20']}
              style={styles.eodGradient}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.eodText, { color: alreadyReflected ? colors.textMuted : colors.accent }]}>
                {alreadyReflected ? '✅ Day reflected' : '🌙 End of Day Check-in'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
      <EndOfDayReflection visible={showEndOfDay} onClose={() => setShowEndOfDay(false)} />
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
  twoMinInput: {
    borderRadius: SIZES.radius,
    padding: 12, fontSize: SIZES.base, marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row', gap: 8, marginTop: 8,
  },
  timeOption: {
    flex: 1, borderRadius: SIZES.radius,
    paddingVertical: 8, alignItems: 'center',
    borderWidth: 1, borderColor: 'transparent',
  },
  timeOptionText: { fontSize: SIZES.sm, fontWeight: '600' },
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
  grid: { paddingHorizontal: 12 },
  gridHeader: {
    flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayHeader: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: SIZES.xs, fontWeight: '500' },
  dayNum: { fontSize: SIZES.sm, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '600' },
  emptyText: { fontSize: SIZES.md, marginTop: 4 },
  timeGroup: { marginTop: 8 },
  timeGroupLabel: { fontSize: SIZES.xs, fontWeight: '700', letterSpacing: 0.5, paddingHorizontal: 4, paddingVertical: 4, textTransform: 'uppercase' },
  habitRow: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  habitTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
  },
  habitIcon: { fontSize: 18 },
  habitName: { fontSize: SIZES.sm, fontWeight: '600', flex: 1 },
  milestoneBadges: { fontSize: 12 },
  checksRow: {
    flexDirection: 'row',
  },
  habitMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  streakText: { fontSize: SIZES.xs },
  bestStreakText: { fontSize: SIZES.xs },
  missedWarning: { fontSize: SIZES.xs, fontWeight: '600' },
  twoMinNudge: { fontSize: SIZES.xs, fontStyle: 'italic', marginTop: 2 },
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
  statCard: {
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statHeaderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8,
  },
  statIcon: { fontSize: 18 },
  statName: { flex: 1, fontSize: SIZES.md, fontWeight: '600' },
  statMetrics: { flexDirection: 'row', gap: 8 },
  metricBox: {
    flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center',
  },
  metricValue: { fontSize: SIZES.base, fontWeight: '700' },
  metricLabel: { fontSize: SIZES.xs, marginTop: 2 },
  milestoneRow: { marginTop: 8 },
  milestoneBar: {
    height: 6, borderRadius: 3, overflow: 'hidden',
  },
  milestoneFill: { height: '100%', borderRadius: 3 },
  milestoneLabel: { fontSize: SIZES.xs, marginTop: 4 },
  achievedRow: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  achievedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  achievedEmoji: { fontSize: 12 },
  achievedLabel: { fontSize: SIZES.xs, fontWeight: '600' },
  eodBtn: { marginHorizontal: 16, marginTop: 16, borderRadius: SIZES.radius, overflow: 'hidden' },
  eodGradient: { padding: 16, alignItems: 'center', borderRadius: SIZES.radius },
  eodText: { fontSize: SIZES.base, fontWeight: '700' },
});
