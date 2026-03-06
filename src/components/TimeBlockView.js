import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList,
  TextInput, Keyboard, Animated, Dimensions, KeyboardAvoidingView, Platform,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedModule, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import PomodoroTimer from './PomodoroTimer';

const AnimatedView = ReanimatedModule.default?.createAnimatedComponent
  ? ReanimatedModule.default.createAnimatedComponent(View)
  : ReanimatedModule.createAnimatedComponent
    ? ReanimatedModule.createAnimatedComponent(View)
    : View;

const POM_IMAGE = require('../../assets/pom.png');

const START_HOUR = 5;
const END_HOUR = 23;
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
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatSlotLabel = (slot) => {
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
};

// ─── Draggable Block wrapper ────────────────────────────────────────────────
function DraggableBlock({
  slot, entry, totalSlots, isMeeting, isComplete, colors,
  slotIndex: slotStartIdx, onDragStart, onDragEnd, onResizeEnd,
  onTap, onUnschedule, allSlots, slotMap,
}) {
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const zIdx = useSharedValue(1);
  const isDragging = useSharedValue(false);
  const startSlotIdx = allSlots.indexOf(slot);

  // Resize shared values
  const resizeTranslateY = useSharedValue(0);
  const isResizing = useSharedValue(false);

  const blockHeight = SLOT_HEIGHT * totalSlots - 2;

  // -- Drag gesture (long-press + pan) --
  const longPress = Gesture.LongPress()
    .minDuration(300)
    .onStart(() => {
      isDragging.value = true;
      scale.value = withSpring(1.03, { damping: 15 });
      zIdx.value = 100;
      runOnJS(onDragStart)();
    });

  const pan = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_evt, state) => {
      if (isDragging.value) state.activate();
      else state.fail();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      const slotDelta = Math.round(translateY.value / SLOT_HEIGHT);
      const newIdx = startSlotIdx + slotDelta;
      isDragging.value = false;

      runOnJS(onDragEnd)(newIdx, totalSlots, entry, isMeeting);
      translateY.value = withSpring(0, { damping: 20 });
      scale.value = withSpring(1, { damping: 15 });
      zIdx.value = 1;
    })
    .onFinalize(() => {
      if (isDragging.value) {
        isDragging.value = false;
        translateY.value = withSpring(0, { damping: 20 });
        scale.value = withSpring(1, { damping: 15 });
        zIdx.value = 1;
        runOnJS(onDragEnd)(-1, totalSlots, entry, isMeeting); // cancel
      }
    });

  const dragGesture = Gesture.Simultaneous(longPress, pan);

  const animatedBlockStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    zIndex: zIdx.value,
    shadowOpacity: isDragging.value ? 0.35 : 0,
    elevation: isDragging.value ? 12 : 0,
  }));

  // -- Resize gesture (bottom handle) --
  const resizePan = Gesture.Pan()
    .onStart(() => {
      isResizing.value = true;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      resizeTranslateY.value = e.translationY;
    })
    .onEnd(() => {
      const slotDelta = Math.round(resizeTranslateY.value / SLOT_HEIGHT);
      isResizing.value = false;
      runOnJS(onResizeEnd)(startSlotIdx, totalSlots, slotDelta, entry, isMeeting);
      resizeTranslateY.value = withTiming(0, { duration: 150 });
    })
    .onFinalize(() => {
      if (isResizing.value) {
        isResizing.value = false;
        resizeTranslateY.value = withTiming(0, { duration: 150 });
        runOnJS(onResizeEnd)(startSlotIdx, totalSlots, 0, entry, isMeeting);
      }
    });

  const animatedResizeStyle = useAnimatedStyle(() => ({
    height: Math.max(SLOT_HEIGHT - 2, blockHeight + resizeTranslateY.value),
  }));

  return (
    <GestureDetector gesture={dragGesture}>
      <AnimatedView style={[
        styles.slotBlockOuter,
        animatedBlockStyle,
      ]}>
        <AnimatedView style={[
          styles.slotBlock,
          {
            backgroundColor: isMeeting ? colors.accentSecondary + '18' : colors.accent + '18',
            borderLeftColor: isMeeting ? colors.accentSecondary : (isComplete ? colors.accentGreen : colors.accent),
          },
          animatedResizeStyle,
        ]}>
          <TouchableOpacity
            style={styles.blockTouchable}
            onPress={onTap}
            activeOpacity={0.7}
          >
            <View style={styles.blockContent}>
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.blockText,
                    { color: colors.text },
                    isComplete && { textDecorationLine: 'line-through', color: colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {isMeeting
                    ? `📅 ${entry.meetingTime ? formatSlotLabel(entry.meetingTime) : formatSlotLabel(entry.timeBlock)} ${entry.text}`
                    : entry.text}
                </Text>
              </View>
              {!isMeeting && (
                <TouchableOpacity
                  onPress={onUnschedule}
                  style={[styles.unscheduleBtn, { backgroundColor: colors.textMuted + '20' }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.unscheduleBtnText, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </TouchableOpacity>

          {/* Resize handle at bottom */}
          <GestureDetector gesture={resizePan}>
            <AnimatedView style={[styles.resizeHandle, { backgroundColor: colors.textMuted + '30' }]}>
              <View style={[styles.resizeHandleDot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.resizeHandleDot, { backgroundColor: colors.textMuted }]} />
              <View style={[styles.resizeHandleDot, { backgroundColor: colors.textMuted }]} />
            </AnimatedView>
          </GestureDetector>
        </AnimatedView>
      </AnimatedView>
    </GestureDetector>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function TimeBlockView({ entries, onUpdate, colors, dateKey, onAddPress, onAddEntry }) {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [timerEntry, setTimerEntry] = useState(null);

  // Inline creation
  const [inlineSlot, setInlineSlot] = useState(null);
  const [inlineText, setInlineText] = useState('');
  const inlineInputRef = useRef(null);

  // Current time indicator
  const [currentMinute, setCurrentMinute] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Scroll ref + disable scroll during drag
  const scrollRef = useRef(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Meetings: time-block-only items stored separately
  const [meetings, setMeetings] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingText, setMeetingText] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30);
  const [meetingHour, setMeetingHour] = useState(9);
  const [meetingMinute, setMeetingMinute] = useState(0);

  const meetingSlideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const meetingInputRef = useRef(null);

  const meetingStorageKey = `crushedit_meetings_${dateKey || 'default'}`;

  // Update current time every minute
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentMinute(now.getHours() * 60 + now.getMinutes());
    };
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll to current time on mount
  useEffect(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
    const startMin = START_HOUR * 60;
    const offset = Math.max(0, ((nowMin - startMin) / 30) * SLOT_HEIGHT - SCREEN_HEIGHT / 3);
    setTimeout(() => scrollRef.current?.scrollTo({ y: offset, animated: false }), 100);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(meetingStorageKey);
        if (raw) setMeetings(JSON.parse(raw));
        else setMeetings([]);
      } catch (e) { setMeetings([]); }
    })();
  }, [meetingStorageKey]);

  const persistMeetings = useCallback(async (updated) => {
    setMeetings(updated);
    try { await AsyncStorage.setItem(meetingStorageKey, JSON.stringify(updated)); } catch (e) {}
  }, [meetingStorageKey]);

  const addMeeting = useCallback(() => {
    const trimmed = meetingText.trim();
    if (!trimmed) return;
    const startMinFromDay = (meetingHour - START_HOUR) * 60 + meetingMinute;
    const endMinFromDay = startMinFromDay + meetingDuration;
    const startSlotIdx = Math.floor(startMinFromDay / 30);
    const endSlotIdx = Math.ceil(endMinFromDay / 30);
    const slotsNeeded = Math.max(1, endSlotIdx - startSlotIdx);
    const timeBlock = ALL_SLOTS[startSlotIdx];
    if (!timeBlock) return;
    const meetingTime = `${String(meetingHour).padStart(2, '0')}:${String(meetingMinute).padStart(2, '0')}`;
    const meeting = {
      id: 'mtg_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: trimmed,
      timeBlock,
      slots: slotsNeeded,
      meetingTime,
      durationMin: meetingDuration,
      isMeeting: true,
    };
    persistMeetings([...meetings, meeting]);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMeetingText('');
    setMeetingDuration(30);
    setMeetingHour(9);
    setMeetingMinute(0);
    setShowMeetingModal(false);
    Keyboard.dismiss();
  }, [meetingText, meetingHour, meetingMinute, meetingDuration, meetings, persistMeetings]);

  const deleteMeeting = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    persistMeetings(meetings.filter(m => m.id !== id));
  }, [meetings, persistMeetings]);

  // Animate meeting flyout
  useEffect(() => {
    if (showMeetingModal) {
      Animated.spring(meetingSlideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      setTimeout(() => meetingInputRef.current?.focus(), 350);
    } else {
      Animated.timing(meetingSlideAnim, { toValue: -SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [showMeetingModal]);

  // Build a map: slot → entry or meeting (accounting for multi-slot blocks)
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
    meetings.forEach(mtg => {
      if (!mtg.timeBlock) return;
      const startIdx = ALL_SLOTS.indexOf(mtg.timeBlock);
      if (startIdx === -1) return;
      const slotsNeeded = Math.max(1, mtg.slots || 1);
      for (let i = 0; i < slotsNeeded && (startIdx + i) < ALL_SLOTS.length; i++) {
        map[ALL_SLOTS[startIdx + i]] = {
          entry: mtg,
          isStart: i === 0,
          isEnd: i === slotsNeeded - 1,
          slotIndex: i,
          totalSlots: slotsNeeded,
          isMeeting: true,
        };
      }
    });
    return map;
  }, [entries, meetings]);

  // Unassigned entries (no timeBlock)
  const unassigned = useMemo(() =>
    entries.filter(e => !e.timeBlock && e.state !== 'migrated' && e.state !== 'cancelled' && e.state !== 'complete'),
    [entries]
  );

  // Check if a range of slots is available (optionally ignoring a specific entry)
  const canAssignAt = useCallback((startIndex, slotsNeeded, ignoreId) => {
    for (let i = 0; i < slotsNeeded && (startIndex + i) < ALL_SLOTS.length; i++) {
      const existing = slotMap[ALL_SLOTS[startIndex + i]];
      if (existing && existing.entry.id !== ignoreId) {
        return false;
      }
    }
    return startIndex >= 0 && startIndex + slotsNeeded <= ALL_SLOTS.length;
  }, [slotMap]);

  // Compute which slots would be highlighted for the selected entry
  const highlightSlots = useMemo(() => {
    if (!selectedEntry) return {};
    const slotsNeeded = Math.max(1, selectedEntry.pomodoros || 1);
    const highlights = {};
    ALL_SLOTS.forEach((slot, idx) => {
      if (canAssignAt(idx, slotsNeeded, undefined)) {
        highlights[slot] = true;
      }
    });
    return highlights;
  }, [selectedEntry, canAssignAt]);

  const handleChipPress = (entry) => {
    Haptics.selectionAsync();
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(null);
    } else {
      setSelectedEntry(entry);
    }
  };

  // -- Drag start/end handlers (disable/enable scroll) --
  const handleDragStart = useCallback(() => {
    setScrollEnabled(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleDragEnd = useCallback((newStartIdx, totalSlots, entry, isMeeting) => {
    setScrollEnabled(true);
    if (newStartIdx < 0 || newStartIdx >= ALL_SLOTS.length) return; // cancelled
    const newSlot = ALL_SLOTS[newStartIdx];
    if (!newSlot) return;
    if (newSlot === entry.timeBlock) return; // same position

    if (!canAssignAt(newStartIdx, totalSlots, entry.id)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isMeeting) {
      const updated = meetings.map(m =>
        m.id === entry.id ? { ...m, timeBlock: newSlot } : m
      );
      persistMeetings(updated);
    } else {
      onUpdate?.(entry.id, { timeBlock: newSlot });
    }
  }, [canAssignAt, meetings, persistMeetings, onUpdate]);

  // -- Resize end handler --
  const handleResizeEnd = useCallback((startIdx, currentSlots, slotDelta, entry, isMeeting) => {
    setScrollEnabled(true);
    const newSlots = Math.max(1, currentSlots + slotDelta);
    if (newSlots === currentSlots) return;

    // Check new slots don't overlap
    if (newSlots > currentSlots) {
      for (let i = currentSlots; i < newSlots; i++) {
        const checkIdx = startIdx + i;
        if (checkIdx >= ALL_SLOTS.length) return;
        const existing = slotMap[ALL_SLOTS[checkIdx]];
        if (existing && existing.entry.id !== entry.id) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          return;
        }
      }
    }

    Haptics.selectionAsync();
    if (isMeeting) {
      const updated = meetings.map(m =>
        m.id === entry.id ? { ...m, slots: newSlots, durationMin: newSlots * 30 } : m
      );
      persistMeetings(updated);
    } else {
      onUpdate?.(entry.id, { pomodoros: newSlots });
    }
  }, [slotMap, meetings, persistMeetings, onUpdate]);

  const handleSlotPress = (slot, slotIndex) => {
    const existing = slotMap[slot];
    if (existing) return;

    if (selectedEntry) {
      const slotsNeeded = Math.max(1, selectedEntry.pomodoros || 1);
      if (canAssignAt(slotIndex, slotsNeeded, undefined)) {
        onUpdate?.(selectedEntry.id, { timeBlock: slot });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedEntry(null);
      }
    } else if (onAddEntry) {
      // Inline creation: show TextInput in this slot
      Haptics.selectionAsync();
      setInlineSlot(slot);
      setInlineText('');
      setTimeout(() => inlineInputRef.current?.focus(), 50);
    } else {
      // Fallback: open meeting modal pre-filled with this slot's time
      Haptics.selectionAsync();
      const [h, m] = slot.split(':').map(Number);
      setMeetingHour(h);
      setMeetingMinute(m);
      setShowMeetingModal(true);
    }
  };

  const handleInlineSubmit = useCallback(() => {
    const text = inlineText.trim();
    if (!text || !inlineSlot) {
      setInlineSlot(null);
      setInlineText('');
      return;
    }
    onAddEntry?.({ text, timeBlock: inlineSlot, pomodoros: 1 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setInlineSlot(null);
    setInlineText('');
    Keyboard.dismiss();
  }, [inlineText, inlineSlot, onAddEntry]);

  const assignEntry = (entryId) => {
    if (selectedSlot) {
      onUpdate?.(entryId, { timeBlock: selectedSlot });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setAssignModalVisible(false);
    setSelectedSlot(null);
  };

  // -- Current time position --
  const currentTimeTop = useMemo(() => {
    const startMin = START_HOUR * 60;
    const endMin = END_HOUR * 60;
    if (currentMinute < startMin || currentMinute > endMin) return null;
    return ((currentMinute - startMin) / 30) * SLOT_HEIGHT;
  }, [currentMinute]);

  const renderSlot = (slot, index) => {
    const block = slotMap[slot];
    const isHour = slot.endsWith(':00');
    const isHighlighted = !!highlightSlots[slot];

    if (block && !block.isStart) {
      return null;
    }

    if (block && block.isStart) {
      const { entry, totalSlots, isMeeting } = block;
      const isComplete = entry.state === 'complete';

      return (
        <View key={slot} style={styles.slotRow}>
          <Text style={[styles.timeLabel, { color: colors.textMuted }, isHour && styles.timeLabelHour]}>
            {isHour ? formatSlotLabel(slot) : ''}
          </Text>
          <DraggableBlock
            slot={slot}
            entry={entry}
            totalSlots={totalSlots}
            isMeeting={!!isMeeting}
            isComplete={isComplete}
            colors={colors}
            slotIndex={block.slotIndex}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onResizeEnd={handleResizeEnd}
            allSlots={ALL_SLOTS}
            slotMap={slotMap}
            onTap={() => {
              if (!isMeeting) {
                setTimerEntry(entry);
                setShowTimer(true);
              }
            }}
            onUnschedule={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isMeeting) {
                deleteMeeting(entry.id);
              } else {
                onUpdate?.(entry.id, { timeBlock: null });
              }
            }}
          />
        </View>
      );
    }

    // Inline creation slot
    if (inlineSlot === slot) {
      return (
        <View key={slot} style={styles.slotRow}>
          <Text style={[styles.timeLabel, { color: colors.textMuted }, isHour && styles.timeLabelHour]}>
            {isHour ? formatSlotLabel(slot) : ''}
          </Text>
          <View style={[styles.inlineInputWrap, { borderColor: colors.accent, backgroundColor: colors.accent + '10' }]}>
            <TextInput
              ref={inlineInputRef}
              style={[styles.inlineInput, { color: colors.text }]}
              placeholder="Task name..."
              placeholderTextColor={colors.textMuted}
              value={inlineText}
              onChangeText={setInlineText}
              onSubmitEditing={handleInlineSubmit}
              onBlur={() => { if (!inlineText.trim()) { setInlineSlot(null); setInlineText(''); } }}
              returnKeyType="done"
              autoFocus
              selectionColor={colors.accent}
            />
          </View>
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
        ref={scrollRef}
        style={styles.timeline}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.timelineInner}>
          {ALL_SLOTS.map((slot, index) => renderSlot(slot, index))}
          <View style={{ height: 120 }} />

          {/* Current time indicator */}
          {currentTimeTop != null && (
            <View style={[styles.currentTimeLine, { top: currentTimeTop }]} pointerEvents="none">
              <View style={styles.currentTimeDot} />
              <View style={styles.currentTimeBar} />
            </View>
          )}
        </View>
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

      {/* Stacked FAB buttons — left side */}
      <View style={styles.fabStack}>
        <TouchableOpacity
          style={[styles.fabCircle, { backgroundColor: colors.accentRed }]}
          onPress={() => setShowTimer(true)}
          activeOpacity={0.8}
        >
          <Image source={POM_IMAGE} style={styles.fabIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.fabCircle, { backgroundColor: colors.accentSecondary }]}
          onPress={() => { setShowMeetingModal(true); }}
          activeOpacity={0.8}
        >
          <Text style={styles.fabEmoji}>📅</Text>
        </TouchableOpacity>
        {onAddPress && (
          <TouchableOpacity
            style={[styles.fabCircle, { backgroundColor: colors.accent }]}
            onPress={onAddPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.fabEmoji, { color: colors.textInverse, fontSize: 26 }]}>+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Meeting flyout (slides from top like EntryFormFlyout) */}
      <Modal visible={showMeetingModal} transparent animationType="none" onRequestClose={() => { setShowMeetingModal(false); setMeetingText(''); }}>
        <TouchableOpacity style={styles.flyoutBackdrop} activeOpacity={1} onPress={() => { setShowMeetingModal(false); setMeetingText(''); }}>
          <View />
        </TouchableOpacity>
        <Animated.View style={[styles.flyout, { backgroundColor: colors.bgCard, borderColor: colors.border, transform: [{ translateY: meetingSlideAnim }] }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 0 }}>
            <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
              <View style={styles.flyoutHeader}>
                <Text style={[styles.flyoutTitle, { color: colors.text }]}>Add Meeting</Text>
                <TouchableOpacity onPress={() => { setShowMeetingModal(false); setMeetingText(''); }} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                  <Text style={[styles.flyoutClose, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                ref={meetingInputRef}
                style={[styles.flyoutInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bgInput }]}
                placeholder="Meeting name..."
                placeholderTextColor={colors.textMuted}
                value={meetingText}
                onChangeText={setMeetingText}
                selectionColor={colors.accent}
              />

              {/* Time spinners */}
              <Text style={[styles.meetingPickLabel, { color: colors.textSecondary }]}>Time</Text>
              <View style={styles.spinnerRow}>
                <TouchableOpacity
                  style={[styles.spinnerBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingHour(h => Math.max(START_HOUR, h - 1))}
                >
                  <Text style={[styles.spinnerBtnText, { color: colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.spinnerValue, { color: colors.text }]}>
                  {String(meetingHour).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  style={[styles.spinnerBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingHour(h => Math.min(END_HOUR - 1, h + 1))}
                >
                  <Text style={[styles.spinnerBtnText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>

                <Text style={[styles.spinnerColon, { color: colors.textMuted }]}>:</Text>

                <TouchableOpacity
                  style={[styles.spinnerBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingMinute(m => m <= 0 ? 55 : m - 5)}
                >
                  <Text style={[styles.spinnerBtnText, { color: colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.spinnerValue, { color: colors.text }]}>
                  {String(meetingMinute).padStart(2, '0')}
                </Text>
                <TouchableOpacity
                  style={[styles.spinnerBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingMinute(m => m >= 55 ? 0 : m + 5)}
                >
                  <Text style={[styles.spinnerBtnText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Duration stepper (5-min increments) */}
              <View style={styles.meetingDurationRow}>
                <Text style={[styles.meetingDurationLabel, { color: colors.textSecondary }]}>Duration</Text>
                <TouchableOpacity
                  style={[styles.meetingStepBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingDuration(d => Math.max(5, d - 5))}
                >
                  <Text style={[styles.meetingStepText, { color: colors.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.meetingDurationValue, { color: colors.accentSecondary }]}>
                  {meetingDuration >= 60
                    ? `${Math.floor(meetingDuration / 60)}h${meetingDuration % 60 > 0 ? ` ${meetingDuration % 60}m` : ''}`
                    : `${meetingDuration}min`}
                </Text>
                <TouchableOpacity
                  style={[styles.meetingStepBtn, { backgroundColor: colors.bgInput }]}
                  onPress={() => setMeetingDuration(d => Math.min(240, d + 5))}
                >
                  <Text style={[styles.meetingStepText, { color: colors.text }]}>+</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.meetingAddBtn, { backgroundColor: colors.accentSecondary }, (!meetingText.trim()) && { opacity: 0.4 }]}
                onPress={addMeeting}
                disabled={!meetingText.trim()}
              >
                <Text style={styles.meetingAddBtnText}>Add Meeting</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </KeyboardAvoidingView>
        </Animated.View>
      </Modal>

      {/* Full-screen Pomodoro Timer */}
      <PomodoroTimer
        visible={showTimer}
        onClose={() => setShowTimer(false)}
        colors={colors}
        activeEntry={timerEntry}
        onPomodoroComplete={() => {}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fabStack: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  fabEmoji: {
    fontSize: 22,
  },
  fabIcon: {
    width: 22,
    height: 22,
  },
  flyoutBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  flyout: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  flyoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  flyoutTitle: {
    fontSize: SIZES.xl,
    fontWeight: '700',
  },
  flyoutClose: {
    fontSize: SIZES.xl,
    fontWeight: '600',
  },
  flyoutInput: {
    fontSize: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    padding: 14,
    minHeight: 48,
    marginBottom: 16,
  },
  meetingDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  meetingDurationLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    flex: 1,
  },
  meetingStepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetingStepText: {
    fontSize: 18,
    fontWeight: '600',
  },
  meetingDurationValue: {
    fontSize: SIZES.base,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  meetingPickLabel: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginBottom: 8,
  },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 20,
  },
  spinnerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerBtnText: {
    fontSize: 20,
    fontWeight: '600',
  },
  spinnerValue: {
    fontSize: 28,
    fontWeight: '700',
    minWidth: 44,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  spinnerColon: {
    fontSize: 28,
    fontWeight: '700',
    marginHorizontal: 2,
  },
  meetingAddBtn: {
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 4,
  },
  meetingAddBtnText: {
    color: '#fff',
    fontSize: SIZES.base,
    fontWeight: '700',
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
  timelineInner: {
    position: 'relative',
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
  slotBlockOuter: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  slotBlock: {
    flex: 1,
    borderLeftWidth: 3,
    borderRadius: 6,
    marginVertical: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  blockTouchable: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  blockText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  blockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  unscheduleBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unscheduleBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  // Resize handle
  resizeHandle: {
    height: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  resizeHandleDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  // Inline creation
  inlineInputWrap: {
    flex: 1,
    height: SLOT_HEIGHT,
    borderWidth: 1,
    borderRadius: 6,
    marginVertical: 1,
    marginRight: 8,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  inlineInput: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    padding: 0,
  },
  // Current time indicator
  currentTimeLine: {
    position: 'absolute',
    left: 52,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 50,
  },
  currentTimeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    marginLeft: -4,
  },
  currentTimeBar: {
    flex: 1,
    height: 2,
    backgroundColor: '#EF4444',
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
