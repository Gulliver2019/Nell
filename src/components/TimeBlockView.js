import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList,
} from 'react-native';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const START_HOUR = 5;
const END_HOUR = 22;
const SLOT_HEIGHT = 52;

const generateSlots = () => {
  const slots = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
};

const ALL_SLOTS = generateSlots();

const formatSlotLabel = (slot) => {
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
};

export default function TimeBlockView({ entries, onUpdate, colors }) {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  // Tap-to-select: user taps a chip, it becomes "selected", then taps a slot to place it
  const [selectedEntry, setSelectedEntry] = useState(null);

  // Build a map: slot → entry (accounting for multi-slot pomodoros)
  const slotMap = useMemo(() => {
    const map = {};
    entries.forEach(entry => {
      if (!entry.timeBlock) return;
      const startIdx = ALL_SLOTS.indexOf(entry.timeBlock);
      if (startIdx === -1) return;
      const slotsNeeded = Math.max(1, entry.pomodoros || 1);
      for (let i = 0; i < slotsNeeded && (startIdx + i) < ALL_SLOTS.length; i++) {
        map[ALL_SLOTS[startIdx + i]] = {
          entry,
          isStart: i === 0,
          isEnd: i === slotsNeeded - 1,
          slotIndex: i,
          totalSlots: slotsNeeded,
        };
      }
    });
    return map;
  }, [entries]);

  // Unassigned entries (no timeBlock)
  const unassigned = useMemo(() =>
    entries.filter(e => !e.timeBlock && e.state !== 'migrated' && e.state !== 'cancelled'),
    [entries]
  );

  // Check if a range of slots is available
  const canAssignAt = useCallback((startIndex, slotsNeeded) => {
    for (let i = 0; i < slotsNeeded && (startIndex + i) < ALL_SLOTS.length; i++) {
      if (slotMap[ALL_SLOTS[startIndex + i]]) return false;
    }
    return startIndex + slotsNeeded <= ALL_SLOTS.length;
  }, [slotMap]);

  // Compute which slots would be highlighted for the selected entry
  const highlightSlots = useMemo(() => {
    if (!selectedEntry) return {};
    const slotsNeeded = Math.max(1, selectedEntry.pomodoros || 1);
    const highlights = {};
    ALL_SLOTS.forEach((slot, idx) => {
      if (canAssignAt(idx, slotsNeeded)) {
        highlights[slot] = true;
      }
    });
    return highlights;
  }, [selectedEntry, canAssignAt]);

  const handleChipPress = (entry) => {
    Haptics.selectionAsync();
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(null); // deselect
    } else {
      setSelectedEntry(entry);
    }
  };

  const handleSlotPress = (slot, slotIndex) => {
    if (slotMap[slot]) return;

    if (selectedEntry) {
      // Place the selected entry at this slot
      const slotsNeeded = Math.max(1, selectedEntry.pomodoros || 1);
      if (canAssignAt(slotIndex, slotsNeeded)) {
        onUpdate?.(selectedEntry.id, { timeBlock: slot });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedEntry(null);
      }
    } else if (unassigned.length > 0) {
      // Fallback: show modal picker
      Haptics.selectionAsync();
      setSelectedSlot(slot);
      setAssignModalVisible(true);
    }
  };

  const assignEntry = (entryId) => {
    if (selectedSlot) {
      onUpdate?.(entryId, { timeBlock: selectedSlot });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setAssignModalVisible(false);
    setSelectedSlot(null);
  };

  const renderSlot = (slot, index) => {
    const block = slotMap[slot];
    const isHour = slot.endsWith(':00');
    const isHighlighted = !!highlightSlots[slot];

    if (block && !block.isStart) {
      return null;
    }

    if (block && block.isStart) {
      const { entry, totalSlots } = block;
      const pomodoroText = entry.pomodoros > 0 ? `[${entry.pomodoros}]` : '';
      const isComplete = entry.state === 'complete';

      return (
        <View key={slot} style={styles.slotRow}>
          <Text style={[styles.timeLabel, { color: colors.textMuted }, isHour && styles.timeLabelHour]}>
            {isHour ? formatSlotLabel(slot) : ''}
          </Text>
          <TouchableOpacity
            style={[
              styles.slotBlock,
              {
                backgroundColor: colors.accent + '18',
                borderLeftColor: isComplete ? colors.accentGreen : colors.accent,
                height: SLOT_HEIGHT * totalSlots - 2,
              },
            ]}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onUpdate?.(entry.id, { timeBlock: null });
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.blockText,
                { color: colors.text },
                isComplete && { textDecorationLine: 'line-through', color: colors.textSecondary },
              ]}
              numberOfLines={2}
            >
              {entry.text}
            </Text>
            {pomodoroText ? (
              <Text style={[styles.blockPomo, { color: colors.accentGold }]}>{pomodoroText}</Text>
            ) : null}
          </TouchableOpacity>
        </View>
      );
    }

    // Empty slot (with possible highlight when entry is selected)
    return (
      <View key={slot} style={styles.slotRow}>
        <Text style={[styles.timeLabel, { color: colors.textMuted }, isHour && styles.timeLabelHour]}>
          {isHour ? formatSlotLabel(slot) : ''}
        </Text>
        <TouchableOpacity
          style={[
            styles.slotEmpty,
            { borderBottomColor: colors.border },
            isHighlighted && { backgroundColor: colors.accent + '15' },
          ]}
          onPress={() => handleSlotPress(slot, index)}
          activeOpacity={0.5}
        >
          {isHour && (
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
          )}
          {isHighlighted && selectedEntry && (
            <Text style={[styles.dropHint, { color: colors.accent }]}>tap to place</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Unassigned entries — tap to select, then tap a slot */}
      {unassigned.length > 0 && (
        <View style={[styles.unassignedSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {selectedEntry ? 'TAP A TIME SLOT BELOW' : `UNSCHEDULED (${unassigned.length})`}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unassignedList}>
            {unassigned.map(entry => {
              const isSelected = selectedEntry?.id === entry.id;
              const slotsNeeded = Math.max(1, entry.pomodoros || 1);
              const durationText = slotsNeeded === 1 ? '30m' : `${slotsNeeded * 30}m`;
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={[
                    styles.unassignedChip,
                    { backgroundColor: colors.bgElevated, borderColor: colors.border },
                    isSelected && { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
                  ]}
                  onPress={() => handleChipPress(entry)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.unassignedText, { color: isSelected ? colors.accent : colors.text }]} numberOfLines={1}>
                    {entry.text}
                  </Text>
                  {entry.pomodoros > 0 && (
                    <Text style={[styles.unassignedPomo, { color: colors.accentGold }]}>[{entry.pomodoros}]</Text>
                  )}
                  <Text style={[styles.durationBadge, { color: colors.textMuted }]}>{durationText}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {selectedEntry && (
            <TouchableOpacity
              style={[styles.cancelSelectBtn, { borderColor: colors.textMuted }]}
              onPress={() => { setSelectedEntry(null); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.cancelSelectText, { color: colors.textMuted }]}>✕ Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Timeline */}
      <ScrollView
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
      >
        {ALL_SLOTS.map((slot, index) => renderSlot(slot, index))}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Assign entry modal (tap fallback when no chip selected) */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.bgCard }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Assign to {selectedSlot ? formatSlotLabel(selectedSlot) : ''}
              </Text>
              <TouchableOpacity onPress={() => { setAssignModalVisible(false); setSelectedSlot(null); }}>
                <Text style={[styles.modalCancel, { color: colors.accentRed }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={unassigned}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalEntry, { borderBottomColor: colors.border }]}
                  onPress={() => assignEntry(item.id)}
                >
                  <Text style={[styles.modalEntryText, { color: colors.text }]} numberOfLines={2}>
                    {item.text}
                  </Text>
                  {item.pomodoros > 0 && (
                    <Text style={[styles.modalEntryPomo, { color: colors.accentGold }]}>
                      [{item.pomodoros}]
                    </Text>
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.modalEmpty, { color: colors.textMuted }]}>No unscheduled entries</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unassignedSection: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  unassignedList: {
    gap: 8,
    paddingRight: 16,
  },
  cancelSelectBtn: {
    alignSelf: 'flex-end',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  cancelSelectText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  unassignedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 200,
    gap: 4,
  },
  unassignedText: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    flexShrink: 1,
  },
  unassignedPomo: {
    fontSize: SIZES.xs,
  },
  durationBadge: {
    fontSize: 9,
    fontWeight: '600',
    marginLeft: 2,
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 4,
  },
  slotRow: {
    flexDirection: 'row',
    minHeight: SLOT_HEIGHT,
  },
  timeLabel: {
    width: 56,
    fontSize: SIZES.xs,
    fontWeight: '500',
    textAlign: 'right',
    paddingRight: 8,
    paddingTop: 2,
  },
  timeLabelHour: {
    fontWeight: '600',
  },
  slotEmpty: {
    flex: 1,
    height: SLOT_HEIGHT,
    borderBottomWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    borderRadius: 4,
  },
  hourLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  dropHint: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    paddingHorizontal: 8,
    opacity: 0.7,
  },
  slotBlock: {
    flex: 1,
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginVertical: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  blockText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  blockPomo: {
    fontSize: SIZES.xs,
    marginTop: 2,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
  },
  modalCancel: {
    fontSize: SIZES.md,
    fontWeight: '600',
  },
  modalEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalEntryText: {
    flex: 1,
    fontSize: SIZES.base,
  },
  modalEntryPomo: {
    fontSize: SIZES.sm,
    marginLeft: 8,
  },
  modalEmpty: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: SIZES.md,
  },
});
