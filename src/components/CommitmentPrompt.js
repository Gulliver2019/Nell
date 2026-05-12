import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getDateKey, getCommitment, saveCommitment, getCommitmentCheck, saveCommitmentCheck } from '../utils/storage';
import * as Haptics from 'expo-haptics';

// Evening commitment check-in component
export default function CommitmentCheckModal({ visible, onClose, onComplete }) {
  const { colors } = useTheme();
  const todayKey = getDateKey();
  const [commitment, setCommitment] = useState(null);
  const [alreadyChecked, setAlreadyChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      (async () => {
        const c = await getCommitment(todayKey);
        setCommitment(c);
        const check = await getCommitmentCheck(todayKey);
        setAlreadyChecked(!!check);
      })();
    }
  }, [visible, todayKey]);

  const handleCheck = async (honoured) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await saveCommitmentCheck(todayKey, honoured);
    onComplete(honoured);
  };

  if (!commitment || alreadyChecked) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.bgElevated || colors.bgCard }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Evening Check-in</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.commitmentCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={[styles.commitmentLabel, { color: colors.textSecondary }]}>
              This morning you committed to:
            </Text>
            <Text style={[styles.commitmentText, { color: colors.text }]}>
              "{commitment.text}"
            </Text>
          </View>

          <Text style={[styles.question, { color: colors.text }]}>
            Did you honour this commitment today?
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.checkBtn, { backgroundColor: colors.accentGreen + '15', borderColor: colors.accentGreen + '40' }]}
              onPress={() => handleCheck(true)}
            >
              <Text style={styles.checkEmoji}>✅</Text>
              <Text style={[styles.checkLabel, { color: colors.accentGreen }]}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.checkBtn, { backgroundColor: colors.accentRed + '15', borderColor: colors.accentRed + '40' }]}
              onPress={() => handleCheck(false)}
            >
              <Text style={styles.checkEmoji}>❌</Text>
              <Text style={[styles.checkLabel, { color: colors.accentRed }]}>No</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.note, { color: colors.textMuted }]}>
            Be honest with yourself. No judgement — just awareness.
          </Text>
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
    padding: 24,
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
  commitmentCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
  },
  commitmentLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  commitmentText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  question: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  checkBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  checkEmoji: {
    fontSize: 28,
  },
  checkLabel: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  note: {
    fontSize: SIZES.sm,
    textAlign: 'center',
  },
});
