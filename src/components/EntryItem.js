import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions, Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import TargetIcon from './TargetIcon';

const SWIPE_THRESHOLD = 80;

export default function EntryItem({ entry, onUpdate, onDelete, onMigrate, onSchedule, onAddToDaily, onEdit, onPress, drag, isActive, isNextUp, isAdminTask, isQuickWin }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const TASK_STATES = getTaskStates(colors);
  const SIGNIFIERS = getSignifiers(colors);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const wasNextUp = useRef(isNextUp);
  const swipeableRef = useRef(null);

  // Pulse when this item becomes the new NEXT UP
  useEffect(() => {
    if (isNextUp && !wasNextUp.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
      ]).start();
    }
    wasNextUp.current = isNextUp;
  }, [isNextUp]);

  const bulletConfig = entry.type === 'task'
    ? TASK_STATES[entry.state] || TASK_STATES.open
    : BULLET_TYPES[entry.type] || BULLET_TYPES.task;

  const signifierConfig = entry.signifier ? SIGNIFIERS[entry.signifier] : null;

  const canSwipe = entry.type === 'task' && entry.state === 'open';
  const canMigrate = canSwipe && entry.source !== 'routine' && !entry.routineId;

  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: 'clamp',
    });
    return (
      <View style={[styles.swipeAction, { backgroundColor: colors.accent + '20' }]}>  
        <Animated.Text
          style={[styles.swipeActionText, { color: colors.accent, transform: [{ translateX: trans }] }]}
        >
          {'<'} Schedule
        </Animated.Text>
      </View>
    );
  };

  const renderLeftActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [0, 100],
      outputRange: [-100, 0],
      extrapolate: 'clamp',
    });
    return (
      <View style={[styles.swipeAction, styles.swipeActionLeft, { backgroundColor: colors.accentOrange + '20' }]}>
        <Animated.Text
          style={[styles.swipeActionText, { color: colors.accentOrange, transform: [{ translateX: trans }] }]}
        >
          Migrate {'>'}
        </Animated.Text>
      </View>
    );
  };

  const onSwipeRight = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onMigrate?.(entry.id);
    swipeableRef.current?.close();
  };

  const onSwipeLeft = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSchedule?.(entry.id);
    swipeableRef.current?.close();
  };

  // Tap cycles: open → complete → migrated → cancelled → open
  const handleTap = () => {
    if (entry.type === 'task') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const cycle = { open: 'complete', complete: 'migrated', migrated: 'open', cancelled: 'open' };
      const newState = cycle[entry.state] || 'open';
      onUpdate?.(entry.id, { state: newState });

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete?.(entry.id) },
    ]);
  };

  const handleSignifierToggle = () => {
    Haptics.selectionAsync();
    const signifiers = [null, 'priority', 'inspiration', 'explore'];
    const currentIdx = signifiers.indexOf(entry.signifier);
    const next = signifiers[(currentIdx + 1) % signifiers.length];
    onUpdate?.(entry.id, { signifier: next });
  };

  const handlePomodoroTap = () => {
    Haptics.selectionAsync();
    const next = ((entry.pomodoros || 0) + 1) % 9; // cycle 0-8
    onUpdate?.(entry.id, { pomodoros: next });
  };

  const handleSubmitEdit = () => {
    if (editText.trim()) {
      onUpdate?.(entry.id, { text: editText.trim() });
    }
    setIsEditing(false);
  };

  const isCompleted = entry.state === 'complete';
  const isMigrated = entry.state === 'migrated';
  const isCancelled = entry.state === 'cancelled';
  const isInactive = isMigrated || isCancelled;

  const pulseBackground = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.accentGreen + '12', colors.accentGreen + '40'],
  });

  const entryContent = (
    <Animated.View
      style={[
        styles.entry,
        { backgroundColor: colors.bg },
        isNextUp && { backgroundColor: pulseBackground, borderLeftWidth: 3, borderLeftColor: colors.accentGreen, borderRadius: 6 },
        isInactive && styles.entryInactive,
        isActive && { backgroundColor: colors.bgElevated, opacity: 0.9 },
      ]}
    >
      {/* Drag handle */}
      {drag && (
        <TouchableOpacity onLongPress={drag} delayLongPress={150} style={styles.dragHandle}>
          <Text style={[styles.dragIcon, { color: colors.textMuted }]}>⠿</Text>
        </TouchableOpacity>
      )}
      {/* Signifier */}
      <TouchableOpacity onPress={handleSignifierToggle} style={styles.signifierArea}>
        {signifierConfig && (
          <Text style={[styles.signifier, { color: signifierConfig.color }]}>
            {signifierConfig.symbol}
          </Text>
        )}
      </TouchableOpacity>

      {/* Bullet */}
      <TouchableOpacity onPress={handleTap} onLongPress={handleDelete} style={styles.bulletArea}>
        <Animated.Text
          style={[
            styles.bullet,
            { color: bulletConfig.color, transform: [{ scale: scaleAnim }] },
            isCompleted && styles.bulletComplete,
          ]}
        >
          {bulletConfig.symbol}
        </Animated.Text>
      </TouchableOpacity>

      {/* Text */}
      {isEditing ? (
        <TextInput
          style={[styles.editInput, { color: colors.text, borderBottomColor: colors.accent, marginLeft: 8 }]}
          value={editText}
          onChangeText={setEditText}
          onBlur={handleSubmitEdit}
          onSubmitEditing={handleSubmitEdit}
          autoFocus
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.accent}
        />
      ) : (
        <TouchableOpacity
          style={styles.textArea}
          onPress={() => {}}
          onLongPress={() => setIsEditing(true)}
        >
          <View style={styles.textRow}>
            {onEdit && (
              <TouchableOpacity
                onPress={() => onEdit(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={styles.editBtn}
              >
                <Text style={[styles.editIcon, { color: colors.textSecondary }]}>✎</Text>
              </TouchableOpacity>
            )}
            <Text
              style={[
                styles.text,
                { color: colors.text },
                isCompleted && [styles.textComplete, { color: colors.textSecondary }],
                isInactive && { color: colors.textMuted },
              ]}
              numberOfLines={3}
            >
              {entry.text}
            </Text>
            {isAdminTask && (
              <Text style={[styles.adminBadge, { color: colors.accentOrange }]}>📋</Text>
            )}
            {isQuickWin && (
              <Text style={[styles.adminBadge, { color: colors.accentGreen }]}>⚡</Text>
            )}
            {(entry.pomodoros || 0) > 0 && (
              <TouchableOpacity onPress={handlePomodoroTap} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                <Text style={[styles.pomoIndicator, { color: colors.accentGold }]}>
                  [{entry.pomodoros}]
                </Text>
              </TouchableOpacity>
            )}
            {entry.timeBlock && (
              <Text style={[styles.timeBlockIcon, { color: colors.accentOrange }]}>🧱</Text>
            )}
            {entry.fromProject && (
              <TargetIcon size={10} color="#fff" style={{ marginLeft: 4 }} />
            )}
            {isNextUp && (
              <Text style={[styles.nextUpBadge, { color: colors.accentGreen }]}>NEXT</Text>
            )}
            {onAddToDaily && !entry._addedToDaily && entry.state !== 'complete' && (
              <TouchableOpacity
                onPress={() => onAddToDaily(entry)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                style={[styles.addToDailyBtn, { backgroundColor: colors.accentGreen + '18' }]}
              >
                <Text style={[styles.addToDailyText, { color: colors.accentGreen }]}>→ Daily</Text>
              </TouchableOpacity>
            )}
            {onAddToDaily && entry._addedToDaily && (
              <Text style={[styles.addedBadge, { color: colors.textMuted }]}>✓</Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );

  if (!canSwipe) {
    return <View style={styles.container}>{entryContent}</View>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={canMigrate ? renderLeftActions : undefined}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && canMigrate) onSwipeRight();
        else if (direction === 'right') onSwipeLeft();
      }}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
    >
      {entryContent}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 2,
  },
  dragHandle: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 1,
  },
  dragIcon: {
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    width: 120,
  },
  swipeActionLeft: {
    alignItems: 'flex-start',
  },
  swipeActionText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  entryInactive: {
    opacity: 0.5,
  },
  signifierArea: {
    width: 18,
    alignItems: 'center',
    paddingTop: 1,
  },
  signifier: {
    fontSize: SIZES.md,
    fontWeight: '700',
  },
  bulletArea: {
    width: 24,
    alignItems: 'center',
    paddingTop: 1,
  },
  bullet: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    lineHeight: 22,
  },
  bulletComplete: {
  },
  textArea: {
    flex: 1,
    paddingRight: 8,
    marginLeft: 8,
  },
  textRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  text: {
    fontSize: SIZES.base,
    lineHeight: 22,
    flex: 1,
  },
  pomoIndicator: {
    fontSize: SIZES.xs,
    marginLeft: 6,
    fontWeight: '700',
  },
  timeBlockIcon: {
    fontSize: SIZES.xs,
    marginLeft: 4,
  },
  adminBadge: {
    fontSize: SIZES.xs,
    marginLeft: 4,
  },
  projectBadge: {
    fontSize: SIZES.xs,
    marginLeft: 4,
  },
  nextUpBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginLeft: 6,
  },
  editBtn: {
    marginLeft: 6,
    marginRight: 4,
    padding: 2,
  },
  editIcon: {
    fontSize: SIZES.sm,
    fontWeight: '600',
  },
  textComplete: {
    textDecorationLine: 'line-through',
  },
  editInput: {
    flex: 1,
    fontSize: SIZES.base,
    lineHeight: 22,
    padding: 0,
    borderBottomWidth: 1,
    paddingBottom: 2,
  },
  addToDailyBtn: {
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginLeft: 6,
  },
  addToDailyText: { fontSize: SIZES.xs, fontWeight: '700' },
  addedBadge: { fontSize: SIZES.xs, marginLeft: 6 },
});
