import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = 'nell_medication_checklist';

// Medication schedule grouped by time slot
const DAILY_MEDS = [
  {
    slot: 'Morning',
    icon: '☀️',
    items: [
      { id: 'am-spray', label: 'Spray' },
      { id: 'am-gabapentin-1', label: 'Gabapentin' },
      { id: 'am-gabapentin-2', label: 'Gabapentin' },
      { id: 'am-antibiotic', label: 'Antibiotic' },
      { id: 'am-vitamin-d', label: 'Vitamin D' },
    ],
  },
  {
    slot: 'Lunch',
    icon: '🍽️',
    items: [
      { id: 'lunch-antibiotic', label: 'Antibiotic' },
      { id: 'lunch-gabapentin', label: 'Gabapentin' },
    ],
  },
  {
    slot: 'Dinner',
    icon: '🍲',
    items: [
      { id: 'dinner-antibiotic', label: 'Antibiotic' },
    ],
  },
  {
    slot: 'Evening',
    icon: '🌙',
    items: [
      { id: 'eve-usual-meds', label: 'Usual Meds' },
      { id: 'eve-spray', label: 'Spray' },
      { id: 'eve-antibiotic', label: 'Antibiotic' },
      { id: 'eve-gabapentin', label: 'Gabapentin' },
    ],
  },
];

// Big antibiotic only on Sun (0), Wed (3), Sat (6)
const BIG_ANTIBIOTIC = {
  slot: 'Big Antibiotic',
  icon: '💊',
  items: [
    { id: 'big-antibiotic', label: 'Big Antibiotic (Sun/Wed/Sat)' },
  ],
  days: [0, 3, 6],
};

function getDateKey(date) {
  const d = date || new Date();
  return d.toISOString().split('T')[0];
}

export default function MedicationScreen() {
  const { colors } = useTheme();
  const [checked, setChecked] = useState({});
  const [loaded, setLoaded] = useState(false);

  const todayKey = getDateKey();
  const today = new Date();
  const dayOfWeek = today.getDay();

  // Include big antibiotic on relevant days
  const schedule = useMemo(() => {
    const slots = [...DAILY_MEDS];
    if (BIG_ANTIBIOTIC.days.includes(dayOfWeek)) {
      slots.push(BIG_ANTIBIOTIC);
    }
    return slots;
  }, [dayOfWeek]);

  // Total items for progress
  const totalItems = useMemo(() => {
    return schedule.reduce((sum, group) => sum + group.items.length, 0);
  }, [schedule]);

  const checkedCount = useMemo(() => {
    return Object.values(checked).filter(Boolean).length;
  }, [checked]);

  // Load today's state
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          if (data.date === todayKey) {
            setChecked(data.checked || {});
          }
        }
      } catch (e) {
        console.warn('Failed to load medication state:', e);
      }
      setLoaded(true);
    })();
  }, [todayKey]);

  // Persist on change
  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ date: todayKey, checked }));
  }, [checked, loaded, todayKey]);

  const toggleItem = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setChecked(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const allDone = checkedCount === totalItems && totalItems > 0;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>💊 Jenny's Meds</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {dayNames[dayOfWeek]} — {checkedCount}/{totalItems} done
        </Text>
        {allDone && (
          <Text style={styles.allDoneBadge}>✅ All taken!</Text>
        )}
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.bgCard }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: allDone ? '#4CAF50' : colors.accent,
              width: totalItems > 0 ? `${(checkedCount / totalItems) * 100}%` : '0%',
            },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {schedule.map((group) => (
          <View key={group.slot} style={[styles.groupCard, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.groupTitle, { color: colors.text }]}>
              {group.icon} {group.slot}
            </Text>
            {group.items.map((item) => {
              const isChecked = !!checked[item.id];
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.itemRow, isChecked && styles.itemRowDone]}
                  onPress={() => toggleItem(item.id)}
                  activeOpacity={0.6}
                >
                  <Ionicons
                    name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                    size={26}
                    color={isChecked ? '#4CAF50' : colors.textMuted}
                  />
                  <Text style={[
                    styles.itemLabel,
                    { color: isChecked ? colors.textMuted : colors.text },
                    isChecked && styles.itemLabelDone,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Reset button */}
        <TouchableOpacity
          style={[styles.resetBtn, { borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setChecked({});
          }}
        >
          <Ionicons name="refresh" size={18} color={colors.textMuted} />
          <Text style={[styles.resetText, { color: colors.textMuted }]}>Reset All</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: SIZES.md, paddingTop: SIZES.md, paddingBottom: SIZES.xs },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, marginTop: 4 },
  allDoneBadge: { fontSize: 16, marginTop: 6 },
  progressBar: {
    height: 6,
    marginHorizontal: SIZES.md,
    borderRadius: 3,
    marginBottom: SIZES.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  scrollContent: { paddingHorizontal: SIZES.md, paddingBottom: 40 },
  groupCard: {
    borderRadius: 12,
    padding: SIZES.sm,
    marginBottom: SIZES.sm,
  },
  groupTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  itemRowDone: { opacity: 0.7 },
  itemLabel: { fontSize: 16, marginLeft: 12, flex: 1 },
  itemLabelDone: { textDecorationLine: 'line-through' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: SIZES.sm,
    borderWidth: 1,
    borderRadius: 8,
  },
  resetText: { fontSize: 14, marginLeft: 6 },
});
