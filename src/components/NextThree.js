import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';
import { SIZES } from '../utils/theme';

const MAX_SLOTS = 3;

export default function NextThree({ entries, onComplete, onSelectEntry, dateKey }) {
  const { colors } = useTheme();
  const [pinnedIds, setPinnedIds] = useState([]);
  const storageKey = `nell_next3_${dateKey}`;

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) setPinnedIds(JSON.parse(saved));
        else setPinnedIds([]);
      } catch (e) { setPinnedIds([]); }
    })();
  }, [storageKey]);

  const save = useCallback(async (ids) => {
    setPinnedIds(ids);
    try { await AsyncStorage.setItem(storageKey, JSON.stringify(ids)); } catch (e) {}
  }, [storageKey]);

  // Remove completed/deleted entries from pinned list
  const activePinned = pinnedIds.filter(id => {
    const entry = entries.find(e => e.id === id);
    return entry && entry.state !== 'complete' && entry.state !== 'cancelled' && entry.state !== 'migrated';
  });

  // Sync if stale entries were removed
  useEffect(() => {
    if (activePinned.length !== pinnedIds.length) {
      save(activePinned);
    }
  }, [activePinned.length, pinnedIds.length]);

  const pinnedEntries = activePinned.map(id => entries.find(e => e.id === id)).filter(Boolean);
  const emptySlots = MAX_SLOTS - pinnedEntries.length;

  const handleComplete = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(id);
  }, [onComplete]);

  const handleRemoveFromNext3 = useCallback((id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.selectionAsync();
    save(activePinned.filter(pid => pid !== id));
  }, [activePinned, save]);

  const handleAddSlot = useCallback(() => {
    Haptics.selectionAsync();
    onSelectEntry((entryId) => {
      if (!activePinned.includes(entryId)) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        save([...activePinned, entryId]);
      }
    });
  }, [activePinned, save, onSelectEntry]);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.accent + '30' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.accent }]}>NEXT UP</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Do the thing.</Text>
      </View>

      {pinnedEntries.map((entry, index) => (
        <View key={entry.id} style={[styles.item, index === 0 && styles.itemFirst, { borderBottomColor: colors.border + '40' }]}>
          <TouchableOpacity
            style={[styles.completeBtn, { backgroundColor: colors.accent + '15' }]}
            onPress={() => handleComplete(entry.id)}
          >
            <Ionicons name="checkmark" size={16} color={colors.accent} />
          </TouchableOpacity>
          <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={2}>
            {entry.text}
          </Text>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => handleRemoveFromNext3(entry.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ))}

      {emptySlots > 0 && (
        <TouchableOpacity style={[styles.addSlot, { borderColor: colors.border }]} onPress={handleAddSlot}>
          <Ionicons name="add" size={18} color={colors.textMuted} />
          <Text style={[styles.addSlotText, { color: colors.textMuted }]}>
            {pinnedEntries.length === 0 ? 'Pick your next thing' : 'Add next'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    gap: 10,
  },
  itemFirst: {
    borderTopWidth: 0,
  },
  completeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    flex: 1,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  removeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    marginTop: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addSlotText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
});
