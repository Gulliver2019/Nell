import React, { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Modal, ScrollView,
  KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, getCommitment, getCommitmentCheck, saveCommitmentCheck } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import TargetIcon from './TargetIcon';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Crushed it' },
];

export default function UnifiedEODReview({ visible, onClose, onComplete, stats, colors }) {
  const { habits, saveHabitReflection } = useApp();
  const todayKey = getDateKey();

  const [step, setStep] = useState(0); // 0=tasks, 1=habits, 2=commitment, 3=reflection
  const [mood, setMood] = useState(3);
  const [wins, setWins] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [commitment, setCommitment] = useState(null);
  const [commitmentHonoured, setCommitmentHonoured] = useState(null);
  const [commitmentChecked, setCommitmentChecked] = useState(false);

  const completedHabits = useMemo(() => {
    return habits.filter(h => h.completions?.[todayKey] === 'done' || h.completions?.[todayKey] === true);
  }, [habits, todayKey]);

  const missedHabits = useMemo(() => {
    return habits.filter(h => h.completions?.[todayKey] !== 'done' && h.completions?.[todayKey] !== true);
  }, [habits, todayKey]);

  // Load commitment
  useEffect(() => {
    if (visible) {
      setStep(0);
      setMood(3);
      setWins('');
      setTomorrow('');
      setCommitmentHonoured(null);
      setCommitmentChecked(false);
      (async () => {
        const c = await getCommitment(todayKey);
        setCommitment(c);
        const check = await getCommitmentCheck(todayKey);
        setCommitmentChecked(!!check);
      })();
    }
  }, [visible, todayKey]);

  const totalSteps = commitment && !commitmentChecked ? 4 : 3;
  const openTasks = stats.open || 0;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < totalSteps - 1) {
      // Skip commitment step if no commitment or already checked
      let nextStep = step + 1;
      if (nextStep === 2 && (!commitment || commitmentChecked)) {
        nextStep = 3;
      }
      setStep(nextStep);
    }
  };

  const handleCommitmentCheck = async (honoured) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCommitmentHonoured(honoured);
    await saveCommitmentCheck(todayKey, honoured);
    // Auto-advance after a moment
    setTimeout(() => setStep(3), 300);
  };

  const handleComplete = async () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Save habit reflection
      if (habits && habits.length > 0) {
        await saveHabitReflection({
          date: todayKey,
          completedCount: completedHabits.length,
          totalCount: habits.length,
          missedHabits: missedHabits.map(h => ({ habitId: h.id, habitName: h.name, habitIcon: h.icon })),
        });
      }

      const reflection = (wins.trim() || tomorrow.trim()) ? {
        type: 'daily',
        mood,
        wins: wins.trim(),
        tomorrow: tomorrow.trim(),
      } : null;

      onComplete(reflection);
      setStep(0);
      setMood(3);
      setWins('');
      setTomorrow('');
    } catch (e) {
      Alert.alert('Error', 'Something went wrong saving your review. Please try again.');
      console.error('EOD Review error:', e);
    }
  };

  const handleClose = () => {
    onClose();
    setStep(0);
    setMood(3);
    setWins('');
    setTomorrow('');
  };

  const renderStepContent = () => {
    switch (step) {
      case 0: // Tasks overview
        return (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Today's Tasks</Text>
            <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.statRow}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={[styles.statText, { color: colors.text }]}>
                  {stats.done} task{stats.done !== 1 ? 's' : ''} completed
                </Text>
              </View>
              {openTasks > 0 && (
                <View style={styles.statRow}>
                  <Text style={styles.statEmoji}>→</Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {openTasks} will migrate to tomorrow
                  </Text>
                </View>
              )}
            </View>
          </>
        );

      case 1: // Habits
        return (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Habits</Text>
            {habits.length === 0 ? (
              <Text style={[styles.noHabits, { color: colors.textMuted }]}>No habits tracked yet</Text>
            ) : (
              <View style={[styles.habitsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                {completedHabits.length > 0 && (
                  <View style={styles.habitSection}>
                    <Text style={[styles.habitSectionLabel, { color: colors.accentGreen }]}>
                      ✅ Done ({completedHabits.length})
                    </Text>
                    {completedHabits.map(h => (
                      <Text key={h.id} style={[styles.habitItem, { color: colors.text }]}>
                        {h.icon} {h.name}
                      </Text>
                    ))}
                  </View>
                )}
                {missedHabits.length > 0 && (
                  <View style={[styles.habitSection, completedHabits.length > 0 && { marginTop: 12 }]}>
                    <Text style={[styles.habitSectionLabel, { color: colors.accentRed || colors.textMuted }]}>
                      ⏳ Missed ({missedHabits.length})
                    </Text>
                    {missedHabits.map(h => (
                      <Text key={h.id} style={[styles.habitItem, { color: colors.textMuted }]}>
                        {h.icon} {h.name}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </>
        );

      case 2: // Commitment check
        return (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Commitment Check</Text>
            <View style={[styles.commitCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.commitLabel, { color: colors.textMuted }]}>This morning you said:</Text>
              <Text style={[styles.commitText, { color: colors.text }]}>"{commitment?.text}"</Text>
            </View>
            <Text style={[styles.commitQuestion, { color: colors.text }]}>
              Did you honour this?
            </Text>
            <View style={styles.commitBtns}>
              <TouchableOpacity
                style={[styles.commitBtn, commitmentHonoured === true && { backgroundColor: colors.accentGreen + '20' }, { borderColor: colors.border }]}
                onPress={() => handleCommitmentCheck(true)}
              >
                <Text style={styles.commitBtnEmoji}>✅</Text>
                <Text style={[styles.commitBtnLabel, { color: commitmentHonoured === true ? colors.accentGreen : colors.text }]}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.commitBtn, commitmentHonoured === false && { backgroundColor: colors.accentRed + '20' }, { borderColor: colors.border }]}
                onPress={() => handleCommitmentCheck(false)}
              >
                <Text style={styles.commitBtnEmoji}>❌</Text>
                <Text style={[styles.commitBtnLabel, { color: commitmentHonoured === false ? colors.accentRed : colors.text }]}>No</Text>
              </TouchableOpacity>
            </View>
          </>
        );

      case 3: // Quick reflection
        return (
          <>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>How did today feel?</Text>
            <View style={styles.moodRow}>
              {MOODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  onPress={() => { setMood(m.value); Haptics.selectionAsync(); }}
                  style={[styles.moodBtn, mood === m.value && { backgroundColor: colors.accent + '20' }]}
                >
                  <Text style={styles.moodEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: colors.textMuted }, mood === m.value && { color: colors.accent }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.promptCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptIcon}>🏆</Text>
                <Text style={[styles.promptLabel, { color: colors.text }]}>One Win</Text>
              </View>
              <TextInput
                style={[styles.promptInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                placeholder="What went well today?"
                placeholderTextColor={colors.textMuted}
                value={wins}
                onChangeText={setWins}
                multiline
                selectionColor={colors.accent}
              />
            </View>

            <View style={[styles.promptCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.promptHeader}>
                <TargetIcon size={18} color="#fff" />
                <Text style={[styles.promptLabel, { color: colors.text }]}>Tomorrow</Text>
              </View>
              <TextInput
                style={[styles.promptInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                placeholder="What's the one thing for tomorrow?"
                placeholderTextColor={colors.textMuted}
                value={tomorrow}
                onChangeText={setTomorrow}
                multiline
                selectionColor={colors.accent}
              />
            </View>
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
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>End of Day</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Step indicators */}
            <View style={styles.stepDots}>
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.stepDot,
                    { backgroundColor: i <= step ? colors.accent : colors.border },
                  ]}
                />
              ))}
            </View>

            {renderStepContent()}

            {/* CTA */}
            {step === totalSteps - 1 ? (
              <TouchableOpacity onPress={handleComplete} activeOpacity={0.8}>
                <LinearGradient
                  colors={[colors.accent, colors.accentWarm || colors.accent]}
                  style={styles.ctaBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.text} />
                  <Text style={[styles.ctaText, { color: colors.text }]}>
                    {openTasks > 0 ? 'Complete Day & Migrate Tasks' : 'Complete Day'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            ) : step !== 2 ? (
              <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
                <View style={[styles.nextBtn, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.nextBtnText, { color: colors.text }]}>Next</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.text} />
                </View>
              </TouchableOpacity>
            ) : null}
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
    marginBottom: 16,
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
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statEmoji: { fontSize: 16 },
  statText: {
    fontSize: SIZES.base,
    fontWeight: '500',
    flexShrink: 1,
  },
  noHabits: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: SIZES.base,
  },
  habitsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  habitSection: {},
  habitSectionLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    marginBottom: 6,
  },
  habitItem: {
    fontSize: SIZES.base,
    paddingVertical: 3,
  },
  commitCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  commitLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  commitText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  commitQuestion: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  commitBtns: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  commitBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  commitBtnEmoji: { fontSize: 28 },
  commitBtnLabel: { fontSize: SIZES.base, fontWeight: '700' },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  moodBtn: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 12,
    minWidth: 56,
  },
  moodEmoji: { fontSize: 24 },
  moodLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  promptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  promptIcon: { fontSize: 18 },
  promptLabel: { fontSize: SIZES.base, fontWeight: '600' },
  promptInput: {
    fontSize: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    padding: 12,
    minHeight: 48,
    maxHeight: 100,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 6,
  },
  ctaText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 6,
  },
  nextBtnText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
});
