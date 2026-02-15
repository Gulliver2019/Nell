import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { COLORS, SIZES, BULLET_TYPES, SIGNIFIERS } from '../utils/theme';
import * as Haptics from 'expo-haptics';

export default function QuickAdd({ onAdd, placeholder = "What's on your mind?" }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('task');
  const [signifier, setSignifier] = useState(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleSubmit = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onAdd({ text: text.trim(), type, signifier });
    setText('');
    setSignifier(null);
    // Flash animation
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
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
    <View style={styles.container}>
      {/* Success flash */}
      <Animated.View style={[styles.flash, { opacity: fadeAnim }]} pointerEvents="none" />

      <View style={styles.inputRow}>
        {/* Signifier toggle */}
        <TouchableOpacity onPress={cycleSignifier} style={styles.sigButton}>
          <Text style={[styles.sigText, currentSig && { color: currentSig.color }]}>
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
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.accent}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          blurOnSubmit={false}
        />

        {/* Add button */}
        {text.trim().length > 0 && (
          <TouchableOpacity onPress={handleSubmit} style={styles.addButton}>
            <Text style={styles.addIcon}>↵</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Type labels */}
      <View style={styles.hints}>
        {['task', 'event', 'note'].map(t => (
          <TouchableOpacity
            key={t}
            onPress={() => { setType(t); Haptics.selectionAsync(); }}
            style={[styles.hintChip, type === t && styles.hintChipActive]}
          >
            <Text style={[styles.hintBullet, { color: BULLET_TYPES[t].color }]}>
              {BULLET_TYPES[t].symbol}
            </Text>
            <Text style={[styles.hintText, type === t && styles.hintTextActive]}>
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
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    position: 'relative',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accent,
    borderRadius: SIZES.radius,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgInput,
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
    color: COLORS.textMuted,
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
    color: COLORS.text,
    fontSize: SIZES.base,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: {
    color: COLORS.text,
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
    backgroundColor: COLORS.bgInput,
    gap: 4,
  },
  hintChipActive: {
    backgroundColor: COLORS.bgElevated,
    borderWidth: 1,
    borderColor: COLORS.accent + '40',
  },
  hintBullet: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  hintText: {
    color: COLORS.textMuted,
    fontSize: SIZES.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  hintTextActive: {
    color: COLORS.textSecondary,
  },
});
