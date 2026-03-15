import React, { useState, useCallback } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const SECTION_LABELS = {
  'daily-log': 'Daily Log',
  'weekly-intention': 'Weekly Intention',
  'monthly-log': 'Monthly Log',
  'future-log': 'Future Log',
  'projects': 'Projects',
  'collections': 'Collections',
  'shopping-list': 'Shopping List',
  'habit-tracker': 'Habit Tracker',
  'reflection': 'Reflection',
  'index-search': 'Index & Search',
};

export default function KnowledgeBaseButton({ sectionId }) {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [hidden, setHidden] = useState(false);

  const handlePress = useCallback(() => {
    navigation.navigate('More', { screen: 'Help', params: { sectionId } });
  }, [navigation, sectionId]);

  if (hidden) return null;

  const label = SECTION_LABELS[sectionId] || 'Help';

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={() => setHidden(true)}
      delayLongPress={500}
      style={[styles.banner, { backgroundColor: '#000', borderTopColor: colors.border }]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, { color: colors.accent }]} numberOfLines={1}>
        ℹ️  Learn how to use {label}   ·   hold to dismiss
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
