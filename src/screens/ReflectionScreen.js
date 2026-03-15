import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDate } from '../utils/storage';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Crushed it' },
];

const PROMPTS = {
  daily: [
    { key: 'gratitude', label: 'Grateful for', icon: '🙏', placeholder: 'What are you thankful for today?' },
    { key: 'meaningful', label: 'Meaningful moment', icon: '💛', placeholder: 'What did you do today that really mattered?' },
    { key: 'wins', label: 'Wins', icon: '🏆', placeholder: 'What did you crush today?' },
    { key: 'kindness', label: 'Kindness', icon: '🤝', placeholder: 'Any kindness you gave or received today?' },
    { key: 'tomorrow', label: 'Looking forward to', icon: '🌅', placeholder: 'What are you excited about tomorrow?' },
  ],
  weekly: [
    { key: 'gratitude', label: 'Highlights', icon: '⭐', placeholder: 'Best moments this week?' },
    { key: 'meaningful', label: 'Moments of meaning', icon: '💛', placeholder: 'What felt truly worthwhile this week?' },
    { key: 'wins', label: 'Achievements', icon: '🏆', placeholder: 'What did you accomplish?' },
    { key: 'appreciated', label: 'People I appreciated', icon: '💜', placeholder: 'Who made your week better?' },
    { key: 'tomorrow', label: 'Next Week', icon: '🚀', placeholder: 'What are you looking forward to?' },
  ],
};

const POSITIVITY_BANNER = {
  daily: {
    title: 'Your Positivity Space',
    message: 'This is your moment to celebrate the good stuff — gratitude, meaning, and the wins that made today yours.',
  },
  weekly: {
    title: 'Weekly Glow-Up',
    message: 'Look back on the week with warmth — the people, the moments, and everything you crushed.',
  },
};

const buildShareText = (reflection, prompts, moods) => {
  const moodEmoji = moods.find(m => m.value === reflection.mood)?.emoji || '🙂';
  const moodLabel = moods.find(m => m.value === reflection.mood)?.label || '';
  const dateStr = formatDate(reflection.date);
  const isWeekly = reflection.type === 'weekly';

  let lines = [];
  lines.push(`Hi - I am working with Nell to help me see the glass as half full so here are some reflections from today.`);
  lines.push('');

  prompts.forEach(p => {
    const val = reflection[p.key];
    if (val?.trim()) {
      lines.push(`${p.icon} ${p.label}`);
      lines.push(val.trim());
      lines.push('');
    }
  });

  lines.push('— Shared from CrushedIT 💪');
  return lines.join('\n');
};

export default function ReflectionScreen() {
  const { colors } = useTheme();
  const { reflections, saveReflection, entries } = useApp();
  const [mode, setMode] = useState('write'); // 'write' or 'history'
  const [reflectionType, setReflectionType] = useState('daily');
  const [mood, setMood] = useState(3);
  const [answers, setAnswers] = useState({});

  const todayKey = getDateKey();
  const todayReflection = useMemo(() => {
    return reflections.find(r => r.date === todayKey && r.type === reflectionType);
  }, [reflections, todayKey, reflectionType]);

  // Today's stats for context
  const todayStats = useMemo(() => {
    const dayEntries = entries.filter(e => e.date === todayKey);
    const tasks = dayEntries.filter(e => e.type === 'task');
    return {
      total: tasks.length,
      done: tasks.filter(t => t.state === 'complete').length,
      events: dayEntries.filter(e => e.type === 'event').length,
    };
  }, [entries, todayKey]);

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveReflection({
      type: reflectionType,
      mood,
      ...answers,
    });
    setAnswers({});
    setMood(3);
    setMode('history');
  };

  const prompts = PROMPTS[reflectionType] || PROMPTS.daily;
  const allDailyPrompts = PROMPTS.daily;
  const allWeeklyPrompts = PROMPTS.weekly;
  const hasContent = Object.values(answers).some(v => v?.trim());

  const handleShare = async (reflection) => {
    const refPrompts = reflection.type === 'weekly' ? allWeeklyPrompts : allDailyPrompts;
    const text = buildShareText(reflection, refPrompts, MOODS);
    try {
      await Share.share({ message: text });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (_) {}
  };

  // History sorted by date
  const sortedReflections = useMemo(() => {
    return [...reflections].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [reflections]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[colors.accentWarm + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={[styles.title, { color: colors.text }]}>Reflect</Text>
          <View style={[styles.modeToggle, { backgroundColor: colors.bgInput }]}>
            <TouchableOpacity
              onPress={() => setMode('write')}
              style={[styles.modeBtn, mode === 'write' && [styles.modeBtnActive, { backgroundColor: colors.accent }]]}
            >
              <Text style={[styles.modeText, { color: colors.textMuted }, mode === 'write' && { color: colors.text }]}>Write</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('history')}
              style={[styles.modeBtn, mode === 'history' && [styles.modeBtnActive, { backgroundColor: colors.accent }]]}
            >
              <Text style={[styles.modeText, { color: colors.textMuted }, mode === 'history' && { color: colors.text }]}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {mode === 'write' ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Type toggle */}
            <View style={styles.typeRow}>
              {['daily', 'weekly'].map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setReflectionType(t)}
                  style={[styles.typeChip, { backgroundColor: colors.bgInput }, reflectionType === t && { backgroundColor: colors.accent + '30', borderWidth: 1, borderColor: colors.accent }]}
                >
                  <Text style={[styles.typeChipText, { color: colors.textMuted }, reflectionType === t && { color: colors.accent }]}>
                    {t === 'daily' ? '📅 Daily' : '📆 Weekly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Positivity banner */}
            <View style={[styles.positivityBanner, { backgroundColor: colors.accentGold + '12', borderColor: colors.accentGold + '30' }]}>
              <Text style={[styles.positivityTitle, { color: '#FFFFFF' }]}>{POSITIVITY_BANNER[reflectionType].title}</Text>
              <Text style={[styles.positivityMessage, { color: colors.textSecondary }]}>
                {POSITIVITY_BANNER[reflectionType].message}
              </Text>
            </View>

            {/* Today's context */}
            {todayStats.total > 0 && (
              <View style={[styles.contextCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.contextLabel, { color: colors.textMuted }]}>Today's Progress</Text>
                <Text style={[styles.contextValue, { color: colors.text }]}>
                  {todayStats.done}/{todayStats.total} tasks done
                  {todayStats.events > 0 ? ` · ${todayStats.events} events` : ''}
                </Text>
              </View>
            )}

            {todayReflection && (
              <View style={[styles.alreadyDone, { backgroundColor: colors.accentGreen + '15' }]}>
                <Text style={[styles.alreadyText, { color: colors.accentGreen }]}>✓ You've already reflected today</Text>
              </View>
            )}

            {/* Mood */}
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

            {/* Prompts */}
            {prompts.map(p => (
              <View key={p.key} style={[styles.promptCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <View style={styles.promptHeader}>
                  <Text style={styles.promptIcon}>{p.icon}</Text>
                  <Text style={[styles.promptLabel, { color: colors.text }]}>{p.label}</Text>
                </View>
                <TextInput
                  style={[styles.promptInput, { color: colors.text }]}
                  placeholder={p.placeholder}
                  placeholderTextColor={colors.textMuted}
                  value={answers[p.key] || ''}
                  onChangeText={t => setAnswers(prev => ({ ...prev, [p.key]: t }))}
                  multiline
                  textAlignVertical="top"
                  selectionColor={colors.accent}
                />
              </View>
            ))}

            {/* Save */}
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.saveBtn, !hasContent && styles.saveBtnDisabled]}
              disabled={!hasContent}
            >
              <LinearGradient
                colors={hasContent ? [colors.accent, colors.accentWarm] : [colors.bgInput, colors.bgInput]}
                style={styles.saveGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={[styles.saveText, { color: colors.text }, !hasContent && { color: colors.textMuted }]}>
                  Save Reflection
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          // History
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {sortedReflections.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>🪞</Text>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No reflections yet</Text>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>Take a moment to look back on your day</Text>
              </View>
            ) : (
              sortedReflections.map(ref => {
                const refPrompts = ref.type === 'weekly' ? allWeeklyPrompts : allDailyPrompts;
                const hasAnyContent = refPrompts.some(p => ref[p.key]?.trim()) || ref.challenges?.trim();
                return (
                <View key={ref.id} style={[styles.historyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                  <View style={styles.historyHeader}>
                    <View style={styles.historyDateRow}>
                      <Text style={[styles.historyDate, { color: colors.text }]}>{formatDate(ref.date)}</Text>
                      {ref.type === 'weekly' && (
                        <View style={[styles.weeklyBadge, { backgroundColor: colors.accent + '20' }]}>
                          <Text style={[styles.weeklyBadgeText, { color: colors.accent }]}>WEEKLY</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.historyMood}>
                      {MOODS.find(m => m.value === ref.mood)?.emoji || '🙂'}
                    </Text>
                  </View>
                  {refPrompts.map(p => (
                    ref[p.key] ? (
                      <View key={p.key} style={styles.historyItem}>
                        <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>{p.icon} {p.label}</Text>
                        <Text style={[styles.historyText, { color: colors.text }]}>{ref[p.key]}</Text>
                      </View>
                    ) : null
                  ))}
                  {/* Show old "challenges" field from legacy reflections */}
                  {ref.challenges && !refPrompts.some(p => p.key === 'challenges') ? (
                    <View style={styles.historyItem}>
                      <Text style={[styles.historyLabel, { color: colors.textSecondary }]}>💭 Challenges</Text>
                      <Text style={[styles.historyText, { color: colors.text }]}>{ref.challenges}</Text>
                    </View>
                  ) : null}
                  {hasAnyContent && (
                    <TouchableOpacity
                      onPress={() => handleShare(ref)}
                      style={[styles.shareBtn, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '30' }]}
                    >
                      <Text style={[styles.shareBtnText, { color: colors.accentGreen }]}>Share this reflection</Text>
                    </TouchableOpacity>
                  )}
                </View>
                );
              })
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <KnowledgeBaseButton sectionId="reflection" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    position: 'relative',
  },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  modeToggle: {
    flexDirection: 'row', borderRadius: 20, padding: 2,
  },
  modeBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 18 },
  modeBtnActive: {},
  modeText: { fontSize: SIZES.sm, fontWeight: '600' },
  content: { paddingHorizontal: 16, paddingBottom: 100 },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  typeChipText: { fontSize: SIZES.sm, fontWeight: '600' },
  contextCard: {
    borderRadius: SIZES.radius, padding: 12,
    marginBottom: 16, borderWidth: 1,
  },
  contextLabel: { fontSize: SIZES.xs, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  contextValue: { fontSize: SIZES.md, fontWeight: '500', marginTop: 4 },
  alreadyDone: {
    borderRadius: SIZES.radius,
    padding: 10, marginBottom: 16,
  },
  alreadyText: { fontSize: SIZES.sm, fontWeight: '600', textAlign: 'center' },
  sectionLabel: {
    fontSize: SIZES.md, fontWeight: '600', marginBottom: 12,
  },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24 },
  moodBtn: { alignItems: 'center', padding: 8, borderRadius: SIZES.radius },
  moodEmoji: { fontSize: 28 },
  moodLabel: { fontSize: SIZES.xs, marginTop: 4, fontWeight: '500' },
  promptCard: {
    borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 12, borderWidth: 1,
  },
  promptHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  promptIcon: { fontSize: 18 },
  promptLabel: { fontSize: SIZES.base, fontWeight: '600' },
  promptInput: {
    fontSize: SIZES.md, lineHeight: 22,
    minHeight: 60, padding: 0,
  },
  saveBtn: { marginTop: 8, borderRadius: SIZES.radius, overflow: 'hidden' },
  saveBtnDisabled: { opacity: 0.5 },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontSize: SIZES.base, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '600' },
  emptyText: { fontSize: SIZES.md, marginTop: 4 },
  historyCard: {
    borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 12, borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12,
  },
  historyDate: { fontSize: SIZES.base, fontWeight: '600' },
  historyDateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  weeklyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  weeklyBadgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  historyMood: { fontSize: 24 },
  historyItem: { marginBottom: 10 },
  historyLabel: { fontSize: SIZES.sm, fontWeight: '600', marginBottom: 4 },
  historyText: { fontSize: SIZES.md, lineHeight: 20 },
  positivityBanner: {
    borderRadius: SIZES.radiusLg, padding: 16, marginBottom: 16,
    borderWidth: 1, alignItems: 'center',
  },
  positivityTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  positivityMessage: { fontSize: SIZES.sm, textAlign: 'center', lineHeight: 18 },
  shareBtn: {
    marginTop: 10, paddingVertical: 10, borderRadius: SIZES.radius,
    alignItems: 'center', borderWidth: 1,
  },
  shareBtnText: { fontSize: SIZES.sm, fontWeight: '700' },
});
