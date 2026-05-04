import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  Animated, Dimensions, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SIZES, getBulletTypes, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TIME_SLOTS = [];
for (let h = 5; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

/**
 * Universal add/edit flyout.
 *
 * Props:
 *  visible        – boolean
 *  onClose        – () => void
 *  onSubmit       – (data) => void   (receives full entry-shape data)
 *  entry          – existing entry when editing (null for add)
 *  visibleFields  – array of field keys to show, e.g. ['text','type','signifier','pomodoros','timeBlock','date']
 *  extraData      – any extra data merged into submit payload (e.g. { collection: id })
 */
export default function EntryFormFlyout({
  visible, onClose, onSubmit, entry = null, visibleFields, extraData = {}, onToggleRoutine,
}) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const SIGNIFIER_MAP = getSignifiers(colors);
  const isEdit = !!entry;

  const slideAnim = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const inputRef = useRef(null);

  // Form state
  const [text, setText] = useState('');
  const [type, setType] = useState('task');
  const [signifier, setSignifier] = useState(null);
  const [pomodoros, setPomodoros] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeBlock, setTimeBlock] = useState(null);
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeatDaily, setRepeatDaily] = useState(false);

  // Which fields to render
  const fields = visibleFields || ['text', 'type', 'signifier', 'pomodoros', 'timeBlock', 'date'];
  const show = (f) => fields.includes(f);

  // Reset / pre-fill when opened
  useEffect(() => {
    if (visible) {
      if (entry) {
        setText(entry.text || '');
        setType(entry.type || 'task');
        setSignifier(entry.signifier || null);
        setPomodoros(entry.pomodoros || 0);
        setIsAdmin(!!entry.isAdmin);
        setTimeBlock(entry.timeBlock || null);
        setDate(entry.date ? new Date(entry.date + 'T00:00:00') : null);
        setRepeatDaily(entry.source === 'routine' || !!entry.routineId);
      } else {
        setText('');
        setType('task');
        setSignifier(null);
        setPomodoros(0);
        setIsAdmin(false);
        setTimeBlock(null);
        setDate(null);
        setRepeatDaily(false);
      }
      setShowDatePicker(false);
      setShowTimePicker(false);
      // Slide in
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      Animated.timing(slideAnim, { toValue: -SCREEN_HEIGHT, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  const handleSubmit = () => {
    if (!text.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const data = { text: text.trim(), type, signifier, ...extraData };
    if (show('pomodoros')) data.pomodoros = pomodoros;
    if (show('timeBlock')) data.timeBlock = timeBlock || null;
    if (show('date') && date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      data.date = `${y}-${m}-${d}`;
    }
    if (isEdit) data.id = entry.id;
    // Handle repeat daily toggle change
    if (isEdit && onToggleRoutine) {
      const wasRoutine = entry.source === 'routine' || !!entry.routineId;
      if (repeatDaily !== wasRoutine) {
        onToggleRoutine(entry, repeatDaily);
      }
    }
    onSubmit(data);
    onClose();
  };

  const handleClose = () => {
    Haptics.selectionAsync();
    onClose();
  };

  const formatTime = (t) => {
    if (!t) return 'None';
    const [h, m] = t.split(':');
    const hr = parseInt(h, 10);
    const ampm = hr >= 12 ? 'pm' : 'am';
    return `${hr > 12 ? hr - 12 : hr || 12}:${m}${ampm}`;
  };

  const formatDateLabel = (d) => {
    if (!d) return 'None';
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      {/* Backdrop */}
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose}>
        <View />
      </TouchableOpacity>

      <Animated.View style={[styles.flyout, { backgroundColor: colors.bgCard, borderColor: colors.border, transform: [{ translateY: slideAnim }] }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}>
          <ScrollView keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.flyoutHeader}>
              <Text style={[styles.flyoutTitle, { color: colors.text }]}>{isEdit ? 'Edit Entry' : 'New Entry'}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.closeBtn, { color: colors.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Text input */}
            <TextInput
              ref={inputRef}
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={text}
              onChangeText={setText}
              placeholder="What needs doing?"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              multiline
              maxLength={500}
              returnKeyType="default"
            />

            {/* Type selector */}
            {show('type') && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Type</Text>
                <View style={styles.chipRow}>
                  {['task', 'event', 'note'].map(t => {
                    const b = BULLET_TYPES[t];
                    const active = type === t;
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.chip, { backgroundColor: colors.bgInput }, active && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                        onPress={() => { setType(t); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.chipBullet, { color: b.color }]}>{b.symbol}</Text>
                        <Text style={[styles.chipText, { color: active ? colors.text : colors.textMuted }]}>{b.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Signifier selector */}
            {show('signifier') && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Signifier</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[styles.chip, { backgroundColor: colors.bgInput }, !signifier && { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
                    onPress={() => { setSignifier(null); Haptics.selectionAsync(); }}
                  >
                    <Text style={[styles.chipText, { color: !signifier ? colors.text : colors.textMuted }]}>None</Text>
                  </TouchableOpacity>
                  {Object.entries(SIGNIFIER_MAP).map(([key, s]) => {
                    const active = signifier === key;
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[styles.chip, { backgroundColor: colors.bgInput }, active && { backgroundColor: s.color + '20', borderColor: s.color }]}
                        onPress={() => { setSignifier(key); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.chipBullet, { color: s.color }]}>{s.symbol}</Text>
                        <Text style={[styles.chipText, { color: active ? colors.text : colors.textMuted }]}>{s.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Pomodoros stepper */}
            {show('pomodoros') && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pomodoros</Text>
                <View style={styles.stepperRow}>
                  <TouchableOpacity
                    onPress={() => { setPomodoros(Math.max(0, pomodoros - 1)); Haptics.selectionAsync(); }}
                    style={[styles.stepBtn, { backgroundColor: colors.bgInput }]}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.text }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.stepValue, { color: colors.accentGold }]}>{pomodoros}</Text>
                  <TouchableOpacity
                    onPress={() => { setPomodoros(Math.min(12, pomodoros + 1)); Haptics.selectionAsync(); }}
                    style={[styles.stepBtn, { backgroundColor: colors.bgInput }]}
                  >
                    <Text style={[styles.stepBtnText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                  {pomodoros > 0 && (
                    <Text style={[styles.pomoDuration, { color: colors.textMuted }]}>
                      ≈ {pomodoros * 25}min
                    </Text>
                  )}
                </View>
              </View>
            )}

            {/* Time block picker */}
            {show('timeBlock') && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Time Block</Text>
                <TouchableOpacity
                  style={[styles.pickerBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                  onPress={() => setShowTimePicker(!showTimePicker)}
                >
                  <Text style={[styles.pickerBtnText, { color: timeBlock ? colors.accent : colors.textMuted }]}>
                    🧱 {formatTime(timeBlock)}
                  </Text>
                  {timeBlock && (
                    <TouchableOpacity onPress={() => { setTimeBlock(null); Haptics.selectionAsync(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showTimePicker && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.timeSlotScroll}>
                    {TIME_SLOTS.map(slot => (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeSlot, { backgroundColor: colors.bgInput }, timeBlock === slot && { backgroundColor: colors.accent + '30', borderColor: colors.accent }]}
                        onPress={() => { setTimeBlock(slot); setShowTimePicker(false); Haptics.selectionAsync(); }}
                      >
                        <Text style={[styles.timeSlotText, { color: timeBlock === slot ? colors.accent : colors.textSecondary }]}>
                          {formatTime(slot)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Date picker */}
            {show('date') && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Schedule Date</Text>
                <TouchableOpacity
                  style={[styles.pickerBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
                  onPress={() => setShowDatePicker(!showDatePicker)}
                >
                  <Text style={[styles.pickerBtnText, { color: date ? colors.accent : colors.textMuted }]}>
                    📅 {formatDateLabel(date)}
                  </Text>
                  {date && (
                    <TouchableOpacity onPress={() => { setDate(null); Haptics.selectionAsync(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={[styles.clearBtn, { color: colors.textMuted }]}>✕</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={date || new Date()}
                    mode="date"
                    display="inline"
                    themeVariant="dark"
                    accentColor={colors.accent}
                    onChange={(event, selected) => {
                      if (event.type === 'dismissed') { setShowDatePicker(false); return; }
                      if (selected) { setDate(selected); setShowDatePicker(false); }
                    }}
                  />
                )}
              </View>
            )}

            {/* Repeat daily toggle */}
            {isEdit && entry.type === 'task' && (
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Repeat Daily</Text>
                <TouchableOpacity
                  style={[styles.toggleRow, { backgroundColor: colors.bgInput }]}
                  onPress={() => { setRepeatDaily(!repeatDaily); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.toggleText, { color: repeatDaily ? colors.accentGreen : colors.textMuted }]}>
                    {repeatDaily ? '🔁 Repeating every day' : 'Off — one-time task'}
                  </Text>
                  <View style={[styles.toggleSwitch, { backgroundColor: repeatDaily ? colors.accentGreen : colors.border }]}>
                    <View style={[styles.toggleKnob, { transform: [{ translateX: repeatDaily ? 18 : 2 }] }]} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Submit button */}
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.accent }, !text.trim() && { opacity: 0.4 }]}
              onPress={handleSubmit}
              disabled={!text.trim()}
            >
              <Text style={[styles.submitText, { color: colors.textInverse }]}>
                {isEdit ? 'Save Changes' : 'Add Entry'}
              </Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
    flex: 1,
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
  closeBtn: {
    fontSize: SIZES.xl,
    fontWeight: '600',
  },
  textInput: {
    fontSize: SIZES.base,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    padding: 14,
    minHeight: 48,
    maxHeight: 100,
    marginBottom: 16,
  },
  fieldRow: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  chipBullet: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  chipText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: SIZES.xl,
    fontWeight: '600',
    lineHeight: 24,
  },
  stepValue: {
    fontSize: SIZES.xl,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  pomoDuration: {
    fontSize: SIZES.xs,
    marginLeft: 4,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
    borderWidth: 1,
  },
  pickerBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  clearBtn: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    padding: 4,
  },
  timeSlotScroll: {
    marginTop: 8,
    maxHeight: 44,
  },
  timeSlot: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 6,
  },
  timeSlotText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
  submitBtn: {
    paddingVertical: 14,
    borderRadius: SIZES.radius,
    alignItems: 'center',
    marginTop: 8,
  },
  submitText: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SIZES.radius,
  },
  toggleText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  toggleSwitch: {
    width: 40,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
  },
});
