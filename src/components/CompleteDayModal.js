import React, { useState, useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import * as Haptics from 'expo-haptics';
import TargetIcon from './TargetIcon';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Rough' },
  { value: 2, emoji: '😐', label: 'Meh' },
  { value: 3, emoji: '🙂', label: 'Okay' },
  { value: 4, emoji: '😊', label: 'Good' },
  { value: 5, emoji: '🔥', label: 'Crushed it' },
];

export default function CompleteDayModal({ visible, onClose, onComplete, stats, colors }) {
  const [mood, setMood] = useState(3);
  const [wins, setWins] = useState('');
  const [tomorrow, setTomorrow] = useState('');

  const hasContent = wins.trim() || tomorrow.trim();
  const openTasks = stats.open || 0;

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const reflection = hasContent ? {
      type: 'daily',
      mood,
      wins: wins.trim(),
      tomorrow: tomorrow.trim(),
    } : null;
    onComplete(reflection);
    setMood(3);
    setWins('');
    setTomorrow('');
  };

  const handleClose = () => {
    onClose();
    setMood(3);
    setWins('');
    setTomorrow('');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.sheet, { backgroundColor: colors.bgElevated }]}>
          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Complete Your Day</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Stats summary */}
            <View style={[styles.statsCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.statRow}>
                <Text style={[styles.statEmoji]}>✅</Text>
                <Text style={[styles.statText, { color: colors.text }]}>
                  {stats.done} task{stats.done !== 1 ? 's' : ''} completed
                </Text>
              </View>
              {openTasks > 0 && (
                <View style={styles.statRow}>
                  <Text style={[styles.statEmoji]}>→</Text>
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {openTasks} open task{openTasks !== 1 ? 's' : ''} will migrate to tomorrow
                  </Text>
                </View>
              )}
            </View>

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

            {/* Quick reflection prompts */}
            <View style={[styles.promptCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={styles.promptHeader}>
                <Text style={styles.promptIcon}>🏆</Text>
                <Text style={[styles.promptLabel, { color: colors.text }]}>Wins</Text>
              </View>
              <TextInput
                style={[styles.promptInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
                placeholder="What did you crush today?"
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
                placeholder="What will you focus on?"
                placeholderTextColor={colors.textMuted}
                value={tomorrow}
                onChangeText={setTomorrow}
                multiline
                selectionColor={colors.accent}
              />
            </View>

            {/* CTA */}
            <TouchableOpacity onPress={handleComplete} activeOpacity={0.8}>
              <LinearGradient
                colors={[colors.accent, colors.accentWarm]}
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

            {!hasContent && (
              <Text style={[styles.skipNote, { color: colors.textMuted }]}>
                Reflection is optional — tap to complete without it
              </Text>
            )}
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
    marginBottom: 20,
  },
  title: {
    fontSize: SIZES.xl,
    fontWeight: '700',
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
  statEmoji: {
    fontSize: 16,
  },
  statText: {
    fontSize: SIZES.base,
    fontWeight: '500',
    flexShrink: 1,
  },
  sectionLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
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
  moodEmoji: {
    fontSize: 24,
  },
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
  promptIcon: {
    fontSize: 18,
  },
  promptLabel: {
    fontSize: SIZES.base,
    fontWeight: '600',
  },
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
  skipNote: {
    textAlign: 'center',
    fontSize: SIZES.sm,
    marginTop: 10,
  },
});
