import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput,
  Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey, saveCommitment } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const FLYLADY_ZONES = [
  { week: 1, zone: 'Entrance, Front Porch & Dining Room', emoji: '🚪' },
  { week: 2, zone: 'Kitchen', emoji: '🍳' },
  { week: 3, zone: 'Bathroom & Extra Bedroom', emoji: '🛁' },
  { week: 4, zone: 'Master Bedroom', emoji: '🛏️' },
  { week: 5, zone: 'Living Room', emoji: '🛋️' },
];

function getFlyLadyZone() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  const zoneIdx = ((weekNum - 1) % 5);
  return FLYLADY_ZONES[zoneIdx];
}

export default function MorningLaunchScreen({ onComplete }) {
  const { colors } = useTheme();
  const { morningSteps, completeMorningLaunch } = useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [commitment, setCommitment] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  const enabledSteps = morningSteps
    .filter(s => s.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const step = enabledSteps[currentStep];
  const isLast = currentStep === enabledSteps.length - 1;
  const progress = enabledSteps.length > 0 ? (currentStep + 1) / enabledSteps.length : 0;

  const flyLadyZone = getFlyLadyZone();

  const handleNext = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Save commitment if this is the commitment step
    if (step?.text?.toLowerCase().includes('commitment') && commitment.trim()) {
      await saveCommitment(getDateKey(), commitment.trim());
    }

    if (isLast) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await completeMorningLaunch();
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, isLast, commitment, step, completeMorningLaunch, onComplete]);

  const handleSkipAll = useCallback(async () => {
    Alert.alert(
      'Skip Morning Launch?',
      'You can always come back to this. The app will open normally.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: async () => {
          await completeMorningLaunch();
          onComplete();
        }},
      ]
    );
  }, [completeMorningLaunch, onComplete]);

  if (enabledSteps.length === 0) {
    // No steps configured — skip
    useEffect(() => {
      completeMorningLaunch().then(onComplete);
    }, []);
    return null;
  }

  const isCommitmentStep = step?.text?.toLowerCase().includes('commitment');
  const isFlyLadyStep = step?.text?.toLowerCase().includes('flylady') || step?.text?.toLowerCase().includes('zone');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Morning Launch</Text>
        <TouchableOpacity onPress={handleSkipAll} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <LinearGradient
          colors={[colors.accent, colors.accentLight || colors.accent]}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>

      {/* Step counter */}
      <Text style={[styles.stepCounter, { color: colors.textMuted }]}>
        Step {currentStep + 1} of {enabledSteps.length}
      </Text>

      {/* Current step */}
      <View style={styles.stepContainer}>
        <Text style={styles.stepIcon}>{step?.icon || '☀️'}</Text>
        <Text style={[styles.stepText, { color: colors.text }]}>{step?.text}</Text>

        {/* FlyLady zone info */}
        {isFlyLadyStep && (
          <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <Text style={styles.infoEmoji}>{flyLadyZone.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>THIS WEEK'S ZONE</Text>
              <Text style={[styles.infoText, { color: colors.text }]}>{flyLadyZone.zone}</Text>
            </View>
          </View>
        )}

        {/* Commitment input */}
        {isCommitmentStep && (
          <View style={styles.commitmentWrap}>
            <Text style={[styles.commitmentLabel, { color: colors.textSecondary }]}>
              What do you commit to today?
            </Text>
            <TextInput
              style={[styles.commitmentInput, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
              placeholder="I commit to staying focused and being present..."
              placeholderTextColor={colors.textMuted}
              value={commitment}
              onChangeText={setCommitment}
              multiline
              maxLength={200}
              selectionColor={colors.accent}
            />
          </View>
        )}
      </View>

      {/* Action button */}
      <View style={styles.footer}>
        <TouchableOpacity onPress={handleNext} activeOpacity={0.8}>
          <LinearGradient
            colors={[colors.accent, colors.accentWarm || colors.accent]}
            style={styles.nextBtn}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.nextBtnText, { color: colors.text }]}>
              {isLast ? '🚀 Launch My Day' : 'Done — Next'}
            </Text>
            {!isLast && <Ionicons name="arrow-forward" size={20} color={colors.text} />}
          </LinearGradient>
        </TouchableOpacity>

        {currentStep > 0 && (
          <TouchableOpacity
            onPress={() => { setCurrentStep(prev => prev - 1); Haptics.selectionAsync(); }}
            style={styles.backBtn}
          >
            <Text style={[styles.backBtnText, { color: colors.textMuted }]}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  skipText: {
    fontSize: SIZES.base,
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepCounter: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  stepIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  stepText: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    width: '100%',
  },
  infoEmoji: {
    fontSize: 28,
  },
  infoLabel: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoText: {
    fontSize: SIZES.base,
    fontWeight: '600',
    marginTop: 2,
  },
  commitmentWrap: {
    width: '100%',
    marginTop: 24,
  },
  commitmentLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  commitmentInput: {
    fontSize: SIZES.base,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  footer: {
    paddingBottom: 20,
    gap: 12,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
  },
  nextBtnText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  backBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backBtnText: {
    fontSize: SIZES.base,
    fontWeight: '500',
  },
});
