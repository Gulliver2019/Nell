import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getWeekKey } from '../utils/storage';
import * as Haptics from 'expo-haptics';

export default function WeeklyReviewModal({ visible, onClose }) {
  const { colors } = useTheme();
  const { weeklyIntentions, habits, goals, addWeeklyArea, addWeeklyTask } = useApp();

  const [step, setStep] = useState(0); // 0=review, 1=wins, 2=dropped, 3=next week
  const [winsText, setWinsText] = useState('');
  const [droppedText, setDroppedText] = useState('');
  const [nextWeekFocus, setNextWeekFocus] = useState('');

  const currentWeekKey = useMemo(() => getWeekKey(), []);
  const lastWeekDate = useMemo(() => {
    const d = new Date(currentWeekKey + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    return getWeekKey(d);
  }, [currentWeekKey]);

  const lastWeek = weeklyIntentions[lastWeekDate] || { areas: [] };
  const lastWeekAreas = lastWeek.areas || [];

  const lastWeekStats = useMemo(() => {
    let total = 0, done = 0;
    lastWeekAreas.forEach(a => {
      a.tasks.forEach(t => {
        total++;
        if (t.done) done++;
      });
    });
    return { total, done, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [lastWeekAreas]);

  // Habit stats for the past 7 days
  const habitStats = useMemo(() => {
    const results = [];
    for (const habit of habits) {
      let done = 0;
      for (let i = 1; i <= 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (habit.completions?.[key] === 'done' || habit.completions?.[key] === true) done++;
      }
      results.push({ ...habit, doneCount: done });
    }
    return results;
  }, [habits]);

  // Priority goals
  const priorityGoals = useMemo(() => goals.filter(g => g.isPriority !== false), [goals]);

  const handleClose = () => {
    onClose();
    setStep(0);
    setWinsText('');
    setDroppedText('');
    setNextWeekFocus('');
  };

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleClose();
  };

  const renderStep = () => {
    switch (step) {
      case 0: // Review last week
        return (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LAST WEEK</Text>

            {lastWeekStats.total > 0 ? (
              <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.statsRow}>
                  <Text style={[styles.statsNumber, { color: colors.accent }]}>{lastWeekStats.rate}%</Text>
                  <Text style={[styles.statsLabel, { color: colors.textSecondary }]}>completion rate</Text>
                </View>
                <Text style={[styles.statsDetail, { color: colors.textMuted }]}>
                  {lastWeekStats.done} of {lastWeekStats.total} tasks done
                </Text>
                <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                  <View style={[styles.progressFill, { width: `${lastWeekStats.rate}%`, backgroundColor: colors.accentGreen }]} />
                </View>
              </View>
            ) : (
              <Text style={[styles.noData, { color: colors.textMuted }]}>No data from last week</Text>
            )}

            {/* Habit performance */}
            {habitStats.length > 0 && (
              <>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>HABIT STREAKS (7 DAYS)</Text>
                <View style={[styles.habitsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  {habitStats.map(h => (
                    <View key={h.id} style={styles.habitRow}>
                      <Text style={[styles.habitName, { color: colors.text }]}>{h.icon} {h.name}</Text>
                      <Text style={[styles.habitScore, { color: h.doneCount >= 5 ? colors.accentGreen : colors.textMuted }]}>
                        {h.doneCount}/7
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Goal check */}
            {priorityGoals.length > 0 && (
              <>
                <Text style={[styles.subTitle, { color: colors.textSecondary }]}>PRIORITY GOALS</Text>
                {priorityGoals.map(g => (
                  <View key={g.id} style={[styles.goalCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                    <Text style={[styles.goalTitle, { color: colors.text }]}>🎯 {g.title}</Text>
                    {g.ninetyDayTarget ? (
                      <Text style={[styles.goalTarget, { color: colors.accent }]}>→ {g.ninetyDayTarget}</Text>
                    ) : null}
                  </View>
                ))}
              </>
            )}
          </>
        );

      case 1: // Wins
        return (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>WINS</Text>
            <Text style={[styles.promptText, { color: colors.text }]}>
              What went well this week? Even small things count.
            </Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              placeholder="List your wins..."
              placeholderTextColor={colors.textMuted}
              value={winsText}
              onChangeText={setWinsText}
              multiline
              selectionColor={colors.accent}
              autoFocus
            />
          </>
        );

      case 2: // Dropped balls
        return (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>OPEN LOOPS</Text>
            <Text style={[styles.promptText, { color: colors.text }]}>
              What didn't get done? What's nagging at you?
            </Text>

            {/* Show incomplete tasks from last week */}
            {lastWeekAreas.some(a => a.tasks.some(t => !t.done)) && (
              <View style={[styles.incompleteCard, { backgroundColor: colors.accentRed + '08', borderColor: colors.accentRed + '20' }]}>
                <Text style={[styles.incompleteLabel, { color: colors.accentRed }]}>Incomplete from last week:</Text>
                {lastWeekAreas.map(a =>
                  a.tasks.filter(t => !t.done).map(t => (
                    <Text key={t.id} style={[styles.incompleteTask, { color: colors.text }]}>
                      • {t.text}
                    </Text>
                  ))
                )}
              </View>
            )}

            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              placeholder="Anything else on your mind..."
              placeholderTextColor={colors.textMuted}
              value={droppedText}
              onChangeText={setDroppedText}
              multiline
              selectionColor={colors.accent}
            />
          </>
        );

      case 3: // Next week
        return (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>NEXT WEEK</Text>
            <Text style={[styles.promptText, { color: colors.text }]}>
              What's the one thing that would make next week a success?
            </Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              placeholder="My focus for next week..."
              placeholderTextColor={colors.textMuted}
              value={nextWeekFocus}
              onChangeText={setNextWeekFocus}
              multiline
              selectionColor={colors.accent}
              autoFocus
            />
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Head to Weekly Intentions to set your areas and tasks for the week.
            </Text>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.bgElevated || colors.bgCard }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>📋 Weekly Review</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Step dots */}
            <View style={styles.stepDots}>
              {[0, 1, 2, 3].map(i => (
                <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.accent : colors.border }]} />
              ))}
            </View>

            {renderStep()}

            {/* Navigation */}
            <View style={styles.navRow}>
              {step > 0 && (
                <TouchableOpacity onPress={() => setStep(step - 1)} style={[styles.navBtn, { backgroundColor: colors.bgInput }]}>
                  <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
                  <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Back</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {step < 3 ? (
                <TouchableOpacity onPress={() => setStep(step + 1)} style={[styles.navBtn, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.navBtnText, { color: colors.text }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={handleComplete} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[colors.accent, colors.accentWarm || colors.accent]}
                    style={styles.completeBtn}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="checkmark-circle" size={20} color={colors.text} />
                    <Text style={[styles.completeBtnText, { color: colors.text }]}>Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  stepDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  subTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 8,
  },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  statsNumber: {
    fontSize: 32,
    fontWeight: '800',
  },
  statsLabel: {
    fontSize: SIZES.base,
    fontWeight: '500',
  },
  statsDetail: {
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  noData: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: SIZES.base,
  },
  habitsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  habitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  habitName: { fontSize: SIZES.sm, flex: 1 },
  habitScore: { fontSize: SIZES.sm, fontWeight: '700' },
  goalCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  goalTitle: { fontSize: SIZES.base, fontWeight: '600' },
  goalTarget: { fontSize: SIZES.sm, marginTop: 4, fontWeight: '500' },
  promptText: {
    fontSize: SIZES.base,
    marginBottom: 12,
  },
  textArea: {
    fontSize: SIZES.base,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  hint: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    marginTop: 8,
  },
  incompleteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  incompleteLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  incompleteTask: {
    fontSize: SIZES.sm,
    paddingVertical: 2,
  },
  navRow: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  navBtnText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  completeBtnText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});
