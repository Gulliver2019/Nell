import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { SIZES, getBulletTypes, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

export default function QuickAdd({ onAdd, placeholder = "What's on your mind?" }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const SIGNIFIERS = getSignifiers(colors);

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
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderTopColor: colors.border }]}>
      {/* Success flash */}
      <Animated.View style={[styles.flash, { opacity: fadeAnim, backgroundColor: colors.accent }]} pointerEvents="none" />

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
});
