import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const REASONS = [
  { key: 'no_time', label: 'Ran out of time', emoji: '⏰' },
  { key: 'forgot', label: 'Forgot', emoji: '🤦' },
  { key: 'low_energy', label: 'Low energy', emoji: '😴' },
  { key: 'skipped', label: 'Chose to skip', emoji: '🤷' },
  { key: 'other', label: 'Other', emoji: '💬' },
];

const MOTIVATIONS = [
  "Yesterday's gaps are today's opportunities. 💪",
  "Progress isn't perfection — just keep showing up.",
  "One missed day doesn't erase your progress. Start again now.",
  "The best time was yesterday. The next best time is right now.",
  "Small steps still move you forward. 🚀",
  "You noticed the gap — that's already growth.",
];

export function YesterdayNudge({ colors }) {
  const { habits, habitReflections } = useApp();
  const todayKey = getDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday);

  // Find yesterday's reflection
  const yesterdayReflection = useMemo(() => {
    return habitReflections.find(r => r.date === yesterdayKey);
  }, [habitReflections, yesterdayKey]);

  // Find habits missed yesterday (that haven't been done today yet)
  const gapsToFill = useMemo(() => {
    if (!yesterdayReflection) return [];
    return yesterdayReflection.commitments
      .filter(c => {
        const habit = habits.find(h => h.id === c.habitId);
        return habit && !habit.completions?.[todayKey];
      });
  }, [yesterdayReflection, habits, todayKey]);

  if (gapsToFill.length === 0) return null;

  const motivation = MOTIVATIONS[Math.floor(new Date().getDate() % MOTIVATIONS.length)];

  return (
    <View style={[styles.nudgeCard, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
      <Text style={[styles.nudgeTitle, { color: colors.accent }]}>🌅 Fill Yesterday's Gaps</Text>
      <Text style={[styles.nudgeMotivation, { color: colors.textSecondary }]}>{motivation}</Text>
      {gapsToFill.map(c => (
        <View key={c.habitId} style={[styles.nudgeHabit, { backgroundColor: colors.bgInput }]}>
          <Text style={styles.nudgeHabitIcon}>{c.habitIcon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.nudgeHabitName, { color: colors.text }]}>{c.habitName}</Text>
            {c.commitment ? (
              <Text style={[styles.nudgeCommitment, { color: colors.textMuted }]}>You said: "{c.commitment}"</Text>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function EndOfDayReflection({ visible, onClose }) {
  const { colors } = useTheme();
  const { habits, saveHabitReflection } = useApp();
  const todayKey = getDateKey();

  const missedHabits = useMemo(() => {
    return habits.filter(h => !h.completions?.[todayKey]);
  }, [habits, todayKey]);

  const completedHabits = useMemo(() => {
    return habits.filter(h => h.completions?.[todayKey]);
  }, [habits, todayKey]);

  const [reasons, setReasons] = useState({});      // { habitId: reasonKey }
  const [commitments, setCommitments] = useState({}); // { habitId: text }
  const [step, setStep] = useState('review');       // 'review' | 'commit' | 'done'

  const setReason = (habitId, reason) => {
    Haptics.selectionAsync();
    setReasons(prev => ({ ...prev, [habitId]: reason }));
  };

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveHabitReflection({
      missedHabits: missedHabits.map(h => ({
        habitId: h.id,
        habitName: h.name,
        habitIcon: h.icon,
        reason: reasons[h.id] || 'skipped',
      })),
      completedCount: completedHabits.length,
      totalCount: habits.length,
      commitments: missedHabits.map(h => ({
        habitId: h.id,
        habitName: h.name,
        habitIcon: h.icon,
        commitment: commitments[h.id] || '',
      })),
    });
    setStep('done');
  };

  const handleClose = () => {
    setStep('review');
    setReasons({});
    setCommitments({});
    onClose();
  };

  const allReasonsSelected = missedHabits.every(h => reasons[h.id]);
  const completionRate = habits.length > 0
    ? Math.round((completedHabits.length / habits.length) * 100) : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.overlay, { backgroundColor: colors.bg + 'F5' }]}>
        <View style={[styles.modal, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {step === 'done' ? '✅ Day Wrapped' : '🌙 End of Day Check-in'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {step === 'done' ? (
              <View style={styles.doneSection}>
                <Text style={styles.doneEmoji}>🎯</Text>
                <Text style={[styles.doneTitle, { color: colors.text }]}>
                  {completionRate >= 80 ? 'Great day!' : completionRate >= 50 ? 'Solid effort!' : 'Tomorrow is a new start.'}
                </Text>
                <Text style={[styles.doneSubtitle, { color: colors.textMuted }]}>
                  {completedHabits.length}/{habits.length} habits completed ({completionRate}%)
                </Text>
                {missedHabits.length > 0 && (
                  <Text style={[styles.doneNudge, { color: colors.accent }]}>
                    Your commitments are saved — you'll see them tomorrow. 💪
                  </Text>
                )}
                <TouchableOpacity onPress={handleClose} style={{ marginTop: 24 }}>
                  <LinearGradient
                    colors={[colors.accent, colors.accentLight || colors.accent]}
                    style={styles.doneBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.doneBtnText, { color: colors.text }]}>Close</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : step === 'review' ? (
              <>
                {/* Score summary */}
                <View style={[styles.scoreCard, { backgroundColor: colors.bgInput }]}>
                  <Text style={[styles.scoreValue, { color: completionRate >= 80 ? colors.accentGreen : completionRate >= 50 ? '#F0A500' : colors.accentRed }]}>
                    {completionRate}%
                  </Text>
                  <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>
                    {completedHabits.length}/{habits.length} done today
                  </Text>
                </View>

                {/* Completed habits */}
                {completedHabits.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.accentGreen }]}>✓ Crushed It</Text>
                    {completedHabits.map(h => (
                      <View key={h.id} style={[styles.habitItem, { backgroundColor: colors.accentGreen + '10' }]}>
                        <Text style={styles.habitItemIcon}>{h.icon}</Text>
                        <Text style={[styles.habitItemName, { color: colors.text }]}>{h.name}</Text>
                        <Text style={[styles.checkMark, { color: colors.accentGreen }]}>✓</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Missed habits with reason selection */}
                {missedHabits.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.accentRed }]}>✕ Missed</Text>
                    <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
                      Quick — what got in the way?
                    </Text>
                    {missedHabits.map(h => (
                      <View key={h.id} style={styles.missedBlock}>
                        <View style={[styles.habitItem, { backgroundColor: colors.accentRed + '10' }]}>
                          <Text style={styles.habitItemIcon}>{h.icon}</Text>
                          <Text style={[styles.habitItemName, { color: colors.text }]}>{h.name}</Text>
                        </View>
                        <View style={styles.reasonRow}>
                          {REASONS.map(r => (
                            <TouchableOpacity
                              key={r.key}
                              onPress={() => setReason(h.id, r.key)}
                              style={[
                                styles.reasonChip,
                                { backgroundColor: colors.bgInput },
                                reasons[h.id] === r.key && { backgroundColor: colors.accent + '25', borderColor: colors.accent, borderWidth: 1 },
                              ]}
                            >
                              <Text style={styles.reasonEmoji}>{r.emoji}</Text>
                              <Text style={[
                                styles.reasonText,
                                { color: colors.textMuted },
                                reasons[h.id] === r.key && { color: colors.accent },
                              ]}>{r.label}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Next button */}
                {missedHabits.length > 0 ? (
                  <TouchableOpacity
                    onPress={() => setStep('commit')}
                    disabled={!allReasonsSelected}
                    style={{ opacity: allReasonsSelected ? 1 : 0.4, marginTop: 8 }}
                  >
                    <LinearGradient
                      colors={[colors.accent, colors.accentLight || colors.accent]}
                      style={styles.actionBtn}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>What's the plan for tomorrow?</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={handleSave} style={{ marginTop: 8 }}>
                    <LinearGradient
                      colors={[colors.accentGreen, colors.accent]}
                      style={styles.actionBtn}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    >
                      <Text style={[styles.actionBtnText, { color: colors.text }]}>Perfect day! Save 🎉</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // Commit step
              <>
                <Text style={[styles.commitIntro, { color: colors.textSecondary }]}>
                  Set a quick intention for each missed habit tomorrow.{'\n'}Even a small commitment helps. 🌱
                </Text>

                {missedHabits.map(h => (
                  <View key={h.id} style={[styles.commitBlock, { borderColor: colors.border }]}>
                    <View style={styles.commitHeader}>
                      <Text style={styles.commitIcon}>{h.icon}</Text>
                      <Text style={[styles.commitName, { color: colors.text }]}>{h.name}</Text>
                    </View>
                    {h.twoMinVersion ? (
                      <Text style={[styles.twoMinHint, { color: colors.accent }]}>
                        💡 Minimum: {h.twoMinVersion}
                      </Text>
                    ) : null}
                    <TextInput
                      style={[styles.commitInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                      placeholder={h.twoMinVersion ? `e.g. "${h.twoMinVersion}" or more` : 'e.g. "Do it first thing in the morning"'}
                      placeholderTextColor={colors.textMuted}
                      value={commitments[h.id] || ''}
                      onChangeText={t => setCommitments(prev => ({ ...prev, [h.id]: t }))}
                      selectionColor={colors.accent}
                    />
                  </View>
                ))}

                <TouchableOpacity onPress={handleSave} style={{ marginTop: 12 }}>
                  <LinearGradient
                    colors={[colors.accent, colors.accentLight || colors.accent]}
                    style={styles.actionBtn}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  >
                    <Text style={[styles.actionBtnText, { color: colors.text }]}>Save & Wrap Up 🌙</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', borderWidth: 1, borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8,
  },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  closeBtn: { padding: 8 },
  closeText: { fontSize: 18, fontWeight: '600' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 40 },
  scoreCard: {
    borderRadius: SIZES.radiusLg, padding: 20,
    alignItems: 'center', marginBottom: 20,
  },
  scoreValue: { fontSize: 36, fontWeight: '800' },
  scoreLabel: { fontSize: SIZES.md, marginTop: 4 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '700', marginBottom: 8 },
  sectionHint: { fontSize: SIZES.sm, marginBottom: 12 },
  habitItem: {
    flexDirection: 'row', alignItems: 'center',
    padding: 10, borderRadius: SIZES.radius, marginBottom: 4,
  },
  habitItemIcon: { fontSize: 18, marginRight: 10 },
  habitItemName: { fontSize: SIZES.md, fontWeight: '500', flex: 1 },
  checkMark: { fontSize: SIZES.base, fontWeight: '700' },
  missedBlock: { marginBottom: 16 },
  reasonRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reasonChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: 'transparent',
  },
  reasonEmoji: { fontSize: 13 },
  reasonText: { fontSize: SIZES.xs, fontWeight: '600' },
  actionBtn: {
    borderRadius: SIZES.radius, padding: 16, alignItems: 'center',
  },
  actionBtnText: { fontSize: SIZES.base, fontWeight: '700' },
  commitIntro: { fontSize: SIZES.md, lineHeight: 22, marginBottom: 20 },
  commitBlock: {
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  commitIcon: { fontSize: 20 },
  commitName: { fontSize: SIZES.base, fontWeight: '600' },
  twoMinHint: { fontSize: SIZES.sm, fontStyle: 'italic', marginBottom: 8 },
  commitInput: {
    borderRadius: SIZES.radius, padding: 12, fontSize: SIZES.md,
  },
  doneSection: { alignItems: 'center', paddingVertical: 20 },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  doneSubtitle: { fontSize: SIZES.md, marginTop: 4 },
  doneNudge: { fontSize: SIZES.sm, marginTop: 16, textAlign: 'center', fontWeight: '500' },
  doneBtn: { borderRadius: SIZES.radius, paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center' },
  doneBtnText: { fontSize: SIZES.base, fontWeight: '700' },
  // Yesterday nudge card
  nudgeCard: {
    marginHorizontal: 12, marginBottom: 12, marginTop: 4,
    borderRadius: SIZES.radiusLg, padding: 16, borderWidth: 1,
  },
  nudgeTitle: { fontSize: SIZES.base, fontWeight: '700', marginBottom: 6 },
  nudgeMotivation: { fontSize: SIZES.sm, fontStyle: 'italic', marginBottom: 12, lineHeight: 18 },
  nudgeHabit: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: SIZES.radius, marginBottom: 6,
  },
  nudgeHabitIcon: { fontSize: 18 },
  nudgeHabitName: { fontSize: SIZES.md, fontWeight: '600' },
  nudgeCommitment: { fontSize: SIZES.sm, marginTop: 2 },
});
