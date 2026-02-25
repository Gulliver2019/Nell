import React, { useMemo, useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, FlatList,
  TextInput, Keyboard, Animated, Dimensions, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import PomodoroTimer from './PomodoroTimer';

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
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatSlotLabel = (slot) => {
  const [h, m] = slot.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')}${ampm}`;
};

export default function TimeBlockView({ entries, onUpdate, colors, dateKey, onAddPress }) {
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showTimer, setShowTimer] = useState(false);
  const [timerEntry, setTimerEntry] = useState(null);

  // Meetings: time-block-only items stored separately
  const [meetings, setMeetings] = useState([]);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [meetingText, setMeetingText] = useState('');
  const [meetingDuration, setMeetingDuration] = useState(30); // minutes, 5-min steps
  const [meetingHour, setMeetingHour] = useState(9);
  const [meetingMinute, setMeetingMinute] = useState(0);

  const meetingSlideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const meetingInputRef = useRef(null);

  const meetingStorageKey = `crushedit_meetings_${dateKey || 'default'}`;

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
    // Entries
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
    // Meetings
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
    entries.filter(e => !e.timeBlock && e.state !== 'migrated' && e.state !== 'cancelled'),
    [entries]
  );

  // Check if a range of slots is available
  const canAssignAt = useCallback((startIndex, slotsNeeded) => {
    for (let i = 0; i < slotsNeeded && (startIndex + i) < ALL_SLOTS.length; i++) {
      const existing = slotMap[ALL_SLOTS[startIndex + i]];
      if (existing) {
        return false;
      }
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
    const existing = slotMap[slot];
    if (existing) return;

    if (selectedEntry) {
      const slotsNeeded = Math.max(1, selectedEntry.pomodoros || 1);
      if (canAssignAt(slotIndex, slotsNeeded)) {
        onUpdate?.(selectedEntry.id, { timeBlock: slot });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedEntry(null);
      }
    } else {
      // Open meeting modal pre-filled with this slot's time
      Haptics.selectionAsync();
      const [h, m] = slot.split(':').map(Number);
      setMeetingHour(h);
      setMeetingMinute(m);
      setShowMeetingModal(true);
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
      const { entry, totalSlots, isMeeting } = block;
      const pomodoroText = !isMeeting && entry.pomodoros > 0 ? `[${entry.pomodoros}]` : '';
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
                backgroundColor: isMeeting ? colors.accentSecondary + '18' : colors.accent + '18',
                borderLeftColor: isMeeting ? colors.accentSecondary : (isComplete ? colors.accentGreen : colors.accent),
                height: SLOT_HEIGHT * totalSlots - 2,
              },
            ]}
            onLongPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              if (isMeeting) {
                deleteMeeting(entry.id);
              } else {
                onUpdate?.(entry.id, { timeBlock: null });
              }
            }}
            onPress={() => {
              if (!isMeeting) {
                setTimerEntry(entry);
                setShowTimer(true);
              }
            }}
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
                  {isMeeting ? `📅 ${entry.meetingTime ? formatSlotLabel(entry.meetingTime) : formatSlotLabel(entry.timeBlock)} ${entry.text}` : entry.text}
                </Text>
              </View>
              {!isMeeting && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onUpdate?.(entry.id, { timeBlock: null });
                  }}
                  style={[styles.unscheduleBtn, { backgroundColor: colors.textMuted + '20' }]}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Text style={[styles.unscheduleBtnText, { color: colors.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* Stacked FAB buttons — left side */}
      <View style={styles.fabStack}>
        <TouchableOpacity
          style={[styles.fabCircle, { backgroundColor: colors.accentRed }]}
          onPress={() => setShowTimer(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.fabEmoji}>🍅</Text>
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
  meetingTimeRow: {
    gap: 6,
    paddingBottom: 16,
  },
  meetingTimeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  meetingTimeText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
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
  blockPlay: {
    fontSize: 16,
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
