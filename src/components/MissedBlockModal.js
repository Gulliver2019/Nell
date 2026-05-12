import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import * as Haptics from 'expo-haptics';

export default function MissedBlockModal({ visible, entry, onSkip, onReschedule, onShorten, onClose, colors }) {
  if (!entry) return null;

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSkip(entry.id);
  };

  const handleReschedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReschedule(entry.id);
  };

  const handleShorten = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onShorten(entry.id);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bgElevated || colors.bgCard }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Missed Block</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.taskCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.taskText, { color: colors.text }]}>{entry.text}</Text>
            <Text style={[styles.taskTime, { color: colors.textMuted }]}>
              Scheduled for {entry.timeBlock}
            </Text>
          </View>

          <Text style={[styles.prompt, { color: colors.textSecondary }]}>
            That's okay — what would you like to do?
          </Text>

          <View style={styles.options}>
            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={handleShorten}
            >
              <Text style={styles.optionEmoji}>⚡</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>15-min version</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Do a shorter version right now</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={handleReschedule}
            >
              <Text style={styles.optionEmoji}>🔄</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Reschedule</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Move to a later time today</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionBtn, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={handleSkip}
            >
              <Text style={styles.optionEmoji}>⏭️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.optionTitle, { color: colors.text }]}>Skip it</Text>
                <Text style={[styles.optionDesc, { color: colors.textMuted }]}>Move on — don't let it derail you</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.encouragement, { backgroundColor: colors.accent + '10' }]}>
            <Text style={[styles.encouragementText, { color: colors.accent }]}>
              🎯 Next block starts now. One missed block doesn't define your day.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    borderRadius: 20,
    padding: 20,
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
  taskCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  taskText: {
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  taskTime: {
    fontSize: SIZES.sm,
    marginTop: 4,
  },
  prompt: {
    fontSize: SIZES.base,
    fontWeight: '500',
    marginBottom: 16,
  },
  options: {
    gap: 10,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionTitle: {
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  encouragement: {
    borderRadius: 12,
    padding: 14,
  },
  encouragementText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
});
