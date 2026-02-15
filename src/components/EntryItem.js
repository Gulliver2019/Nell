import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const SWIPE_THRESHOLD = 80;

export default function EntryItem({ entry, onUpdate, onDelete, onMigrate, onSchedule, onPress }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const TASK_STATES = getTaskStates(colors);
  const SIGNIFIERS = getSignifiers(colors);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const swipeableRef = useRef(null);

  const bulletConfig = entry.type === 'task'
    ? TASK_STATES[entry.state] || TASK_STATES.open
    : BULLET_TYPES[entry.type] || BULLET_TYPES.task;

  const signifierConfig = entry.signifier ? SIGNIFIERS[entry.signifier] : null;

  const canSwipe = entry.type === 'task' && entry.state === 'open';

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
          {'<'} Monthly
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

  // Tap cycles: open → complete → cancelled → open
  const handleTap = () => {
    if (entry.type === 'task') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const cycle = { open: 'complete', complete: 'open', cancelled: 'open', migrated: 'open' };
      const newState = cycle[entry.state] || 'open';
      onUpdate?.(entry.id, { state: newState });

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleSignifierToggle = () => {
    Haptics.selectionAsync();
    const signifiers = [null, 'priority', 'inspiration', 'explore'];
    const currentIdx = signifiers.indexOf(entry.signifier);
    const next = signifiers[(currentIdx + 1) % signifiers.length];
    onUpdate?.(entry.id, { signifier: next });
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

  const entryContent = (
    <View
      style={[
        styles.entry,
        { backgroundColor: colors.bg },
        isInactive && styles.entryInactive,
      ]}
    >
      {/* Signifier */}
      <TouchableOpacity onPress={handleSignifierToggle} style={styles.signifierArea}>
        {signifierConfig && (
          <Text style={[styles.signifier, { color: signifierConfig.color }]}>
            {signifierConfig.symbol}
          </Text>
        )}
      </TouchableOpacity>

      {/* Bullet */}
      <TouchableOpacity onPress={handleTap} style={styles.bulletArea}>
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
          onPress={handleTap}
          onLongPress={() => setIsEditing(true)}
        >
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
        </TouchableOpacity>
      )}
    </View>
  );

  if (!canSwipe) {
    return <View style={styles.container}>{entryContent}</View>;
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') onSwipeRight();
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
  text: {
    fontSize: SIZES.base,
    lineHeight: 22,
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
});
