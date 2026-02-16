import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList,
  PanResponder, Animated, Dimensions,
} from 'react-native';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const START_HOUR = 5;
const END_HOUR = 22; // 10pm
const SLOT_HEIGHT = 52;

// Generate time slots from 5:00 to 21:30 (last slot starts at 21:30)
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

// Draggable chip component for unassigned entries
function DraggableChip({ entry, colors, onDragStart, onDragMove, onDragEnd }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 || Math.abs(g.dx) > 5,
      onPanResponderGrant: (evt) => {
        isDragging.current = true;
        startPos.current = { x: evt.nativeEvent.pageX, y: evt.nativeEvent.pageY };
        pan.setOffset({ x: 0, y: 0 });
        pan.setValue({ x: 0, y: 0 });
        onDragStart(entry, evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
        onDragMove(evt.nativeEvent.pageY);
      },
      onPanResponderRelease: (evt) => {
        isDragging.current = false;
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        onDragEnd(evt.nativeEvent.pageY);
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        onDragEnd(-1); // cancelled
      },
    })
  ).current;

  const slotsNeeded = Math.max(1, entry.pomodoros || 1);
  const durationText = slotsNeeded === 1 ? '30m' : `${slotsNeeded * 30}m`;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.unassignedChip,
        { backgroundColor: colors.bgElevated, borderColor: colors.border },
        { transform: pan.getTranslateTransform() },
      ]}
    >
      <Text style={[styles.unassignedText, { color: colors.text }]} numberOfLines={1}>
        {entry.text}
      </Text>
      {entry.pomodoros > 0 && (
        <Text style={[styles.unassignedPomo, { color: colors.accentGold }]}>[{entry.pomodoros}]</Text>
      )}
      <Text style={[styles.durationBadge, { color: colors.textMuted }]}>{durationText}</Text>
    </Animated.View>
  );
}

export default function TimeBlockView({ entries, onUpdate, colors }) {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dragEntry, setDragEntry] = useState(null);
  const [highlightSlots, setHighlightSlots] = useState([]);
  const timelineRef = useRef(null);
  const timelineY = useRef(0);
  const scrollOffset = useRef(0);

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

  // Calculate which slot a Y position maps to
  const getSlotFromY = useCallback((pageY) => {
    const relY = pageY - timelineY.current + scrollOffset.current;
    const slotIndex = Math.floor(relY / SLOT_HEIGHT);
    if (slotIndex >= 0 && slotIndex < ALL_SLOTS.length) {
      return { slot: ALL_SLOTS[slotIndex], index: slotIndex };
    }
    return null;
  }, []);

  // Check if a range of slots is available
  const canAssignAt = useCallback((startIndex, slotsNeeded) => {
    for (let i = 0; i < slotsNeeded && (startIndex + i) < ALL_SLOTS.length; i++) {
      if (slotMap[ALL_SLOTS[startIndex + i]]) return false;
    }
    return startIndex + slotsNeeded <= ALL_SLOTS.length;
  }, [slotMap]);

  const handleDragStart = useCallback((entry) => {
    setDragEntry(entry);
  }, []);

  const handleDragMove = useCallback((pageY) => {
    if (!dragEntry) return;
    const target = getSlotFromY(pageY);
    if (!target) { setHighlightSlots([]); return; }
    const slotsNeeded = Math.max(1, dragEntry.pomodoros || 1);
    if (canAssignAt(target.index, slotsNeeded)) {
      const slots = [];
      for (let i = 0; i < slotsNeeded; i++) {
        slots.push(ALL_SLOTS[target.index + i]);
      }
      setHighlightSlots(slots);
    } else {
      setHighlightSlots([]);
    }
  }, [dragEntry, getSlotFromY, canAssignAt]);

  const handleDragEnd = useCallback((pageY) => {
    if (!dragEntry || pageY < 0) {
      setDragEntry(null);
      setHighlightSlots([]);
      return;
    }
    const target = getSlotFromY(pageY);
    if (target) {
      const slotsNeeded = Math.max(1, dragEntry.pomodoros || 1);
      if (canAssignAt(target.index, slotsNeeded)) {
        onUpdate?.(dragEntry.id, { timeBlock: target.slot });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
    setDragEntry(null);
    setHighlightSlots([]);
  }, [dragEntry, getSlotFromY, canAssignAt, onUpdate]);

  const handleSlotPress = (slot) => {
    if (slotMap[slot]) return; // assigned slots use long-press to unassign
    if (unassigned.length > 0) {
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
    const isHighlighted = highlightSlots.includes(slot);

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

    // Empty slot (with possible drag highlight)
    return (
      <View key={slot} style={styles.slotRow}>
        <Text style={[styles.timeLabel, { color: colors.textMuted }, isHour && styles.timeLabelHour]}>
          {isHour ? formatSlotLabel(slot) : ''}
        </Text>
        <TouchableOpacity
          style={[
            styles.slotEmpty,
            { borderBottomColor: colors.border },
            isHighlighted && { backgroundColor: colors.accent + '25' },
          ]}
          onPress={() => handleSlotPress(slot)}
          activeOpacity={0.5}
        >
          {isHour && (
            <View style={[styles.hourLine, { backgroundColor: colors.border }]} />
          )}
          {isHighlighted && highlightSlots[0] === slot && dragEntry && (
            <Text style={[styles.dropHint, { color: colors.accent }]} numberOfLines={1}>
              {dragEntry.text}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Unassigned entries — draggable */}
      {unassigned.length > 0 && (
        <View style={[styles.unassignedSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            DRAG TO SCHEDULE ({unassigned.length})
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.unassignedList}>
            {unassigned.map(entry => (
              <DraggableChip
                key={entry.id}
                entry={entry}
                colors={colors}
                onDragStart={handleDragStart}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Timeline */}
      <ScrollView
        ref={timelineRef}
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollOffset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        onLayout={() => {
          timelineRef.current?.measureInWindow((x, y) => {
            timelineY.current = y;
          });
        }}
      >
        {ALL_SLOTS.map((slot, index) => renderSlot(slot, index))}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Assign entry modal (tap fallback) */}
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
