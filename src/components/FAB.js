import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { SHADOWS } from '../utils/theme';
import * as Haptics from 'expo-haptics';

export default function FAB({ onPress, bottom = 90 }) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.fab, { backgroundColor: colors.accent, bottom }, SHADOWS.glow(colors.accent)]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onPress(); }}
      activeOpacity={0.8}
    >
      <Text style={[styles.fabIcon, { color: colors.textInverse }]}>+</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  fabIcon: {
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 34,
  },
});
