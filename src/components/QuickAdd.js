import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { SIZES, getBulletTypes, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function QuickAdd({ onAdd, onUpdateLast, placeholder = "What's on your mind?" }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const SIGNIFIERS = getSignifiers(colors);

  const [text, setText] = useState('');
  const [type, setType] = useState('task');
  const [signifier, setSignifier] = useState(null);
  const [pomodoroPrompt, setPomodoroPrompt] = useState(false);
  const [pomoCount, setPomoCount] = useState(0);
  const [lastEntryId, setLastEntryId] = useState(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await onAdd({ text: text.trim(), type, signifier });
    setText('');
    setSignifier(null);
    // Show pomodoro prompt
    if (result?.id) {
      setLastEntryId(result.id);
      setPomoCount(0);
      setPomodoroPrompt(true);
    }
    // Flash animation
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handlePomoConfirm = () => {
    if (pomoCount > 0 && lastEntryId && onUpdateLast) {
      onUpdateLast(lastEntryId, { pomodoros: pomoCount });
    }
    setPomodoroPrompt(false);
    setLastEntryId(null);
    setPomoCount(0);
  };

  const handlePomoSkip = () => {
    setPomodoroPrompt(false);
    setLastEntryId(null);
    setPomoCount(0);
  };

  const cycleType = () => {
    Haptics.selectionAsync();
    const types = ['task', 'event', 'note'];
    const next = types[(types.indexOf(type) + 1) % types.length];
    setType(next);
  };

  const cycleSignifier = () => {
    Haptics.selectionAsync();
    const sigs = [null, 'priority', 'inspiration', 'explore'];
    const next = sigs[(sigs.indexOf(signifier) + 1) % sigs.length];
    setSignifier(next);
  };

  const currentBullet = BULLET_TYPES[type];
  const currentSig = signifier ? SIGNIFIERS[signifier] : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
      {/* Success flash */}
      <Animated.View style={[styles.flash, { opacity: fadeAnim, backgroundColor: colors.accent }]} pointerEvents="none" />

      {/* Pomodoro prompt */}
      {pomodoroPrompt && (
        <View style={[styles.pomoPrompt, { backgroundColor: colors.bgElevated, borderBottomColor: colors.border }]}>
          <Text style={[styles.pomoLabel, { color: colors.textSecondary }]}>🍅 Pomodoros?</Text>
          <View style={styles.pomoStepper}>
            <TouchableOpacity
              onPress={() => { setPomoCount(Math.max(0, pomoCount - 1)); Haptics.selectionAsync(); }}
              style={[styles.pomoBtn, { backgroundColor: colors.bgInput }]}
            >
              <Text style={[styles.pomoBtnText, { color: colors.text }]}>−</Text>
            </TouchableOpacity>
            <Text style={[styles.pomoCount, { color: colors.accent }]}>{pomoCount}</Text>
            <TouchableOpacity
              onPress={() => { setPomoCount(Math.min(12, pomoCount + 1)); Haptics.selectionAsync(); }}
              style={[styles.pomoBtn, { backgroundColor: colors.bgInput }]}
            >
              <Text style={[styles.pomoBtnText, { color: colors.text }]}>+</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handlePomoConfirm} style={[styles.pomoAction, { backgroundColor: colors.accent }]}>
            <Text style={[styles.pomoActionText, { color: colors.textInverse }]}>
              {pomoCount > 0 ? `Add ${pomoCount}` : 'Skip'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePomoSkip} style={styles.pomoSkip}>
            <Text style={[styles.pomoSkipText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputRow, { backgroundColor: colors.bgInput }]}>
        {/* Signifier toggle */}
        <TouchableOpacity onPress={cycleSignifier} style={styles.sigButton}>
          <Text style={[styles.sigText, { color: colors.textMuted }, currentSig && { color: currentSig.color }]}>
            {currentSig ? currentSig.symbol : '·'}
          </Text>
        </TouchableOpacity>

        {/* Type toggle */}
        <TouchableOpacity onPress={cycleType} style={styles.typeButton}>
          <Text style={[styles.typeText, { color: currentBullet.color }]}>
            {currentBullet.symbol}
          </Text>
        </TouchableOpacity>

        {/* Input */}
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: colors.text }]}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
        />

        {/* Add button */}
        {text.trim().length > 0 && (
          <TouchableOpacity onPress={handleSubmit} style={[styles.addButton, { backgroundColor: colors.accent }]}>
            <Text style={[styles.addIcon, { color: colors.text }]}>↵</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type labels */}
      <View style={styles.hints}>
        {['task', 'event', 'note'].map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => { setType(t); Haptics.selectionAsync(); }}
            style={[styles.hintChip, { backgroundColor: colors.bgInput }, type === t && [styles.hintChipActive, { backgroundColor: colors.bgElevated, borderColor: colors.accent + '40' }]]}
          >
            <Text style={[styles.hintBullet, { color: BULLET_TYPES[t].color }]}>
              {BULLET_TYPES[t].symbol}
            </Text>
            <Text style={[styles.hintText, { color: colors.textMuted }, type === t && { color: colors.textSecondary }]}>
              {BULLET_TYPES[t].label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    position: 'relative',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: SIZES.radius,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: 8,
    minHeight: 44,
  },
  sigButton: {
    width: 24,
    alignItems: 'center',
  },
  sigText: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  typeButton: {
    width: 28,
    alignItems: 'center',
  },
  typeText: {
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    fontSize: SIZES.base,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  hints: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  hintChipActive: {
    borderWidth: 1,
  },
  hintBullet: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  hintText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pomoPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    marginBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  pomoLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  pomoStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pomoBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pomoBtnText: {
    fontSize: SIZES.lg,
    fontWeight: '600',
    lineHeight: 22,
  },
  pomoCount: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    minWidth: 20,
    textAlign: 'center',
  },
  pomoAction: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  pomoActionText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  pomoSkip: {
    padding: 4,
  },
  pomoSkipText: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
});
