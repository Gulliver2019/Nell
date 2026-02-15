import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

export default function EntryItem({ entry, onUpdate, onDelete, onMigrate, onSchedule, onPress }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const TASK_STATES = getTaskStates(colors);
  const SIGNIFIERS = getSignifiers(colors);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(entry.text);
  const pan = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const touchStart = useRef(0);
  const isSwiping = useRef(false);

  const bulletConfig = entry.type === 'task'
    ? TASK_STATES[entry.state] || TASK_STATES.open
    : BULLET_TYPES[entry.type] || BULLET_TYPES.task;

  const signifierConfig = entry.signifier ? SIGNIFIERS[entry.signifier] : null;

  const handleTouchStart = (e) => {
    touchStart.current = e.nativeEvent.pageX;
    isSwiping.current = false;
  };

  const handleTouchMove = (e) => {
    const diff = e.nativeEvent.pageX - touchStart.current;
    if (Math.abs(diff) > 10) {
      isSwiping.current = true;
      pan.setValue(diff);
    }
  };

  const handleTouchEnd = () => {
    const currentVal = pan._value;
    if (currentVal > SWIPE_THRESHOLD && entry.type === 'task' && entry.state === 'open') {
      // Swipe right → Migrate to next day
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onMigrate?.(entry.id);
    } else if (currentVal < -SWIPE_THRESHOLD && entry.type === 'task' && entry.state === 'open') {
      // Swipe left → Move to monthly review
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onSchedule?.(entry.id);
    }
    Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
  };

  // Tap toggles done state
  const handleTap = () => {
    if (entry.type === 'task') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newState = entry.state === 'open' ? 'complete' : 'open';
      onUpdate?.(entry.id, { state: newState });

      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleBulletPress = () => {
    handleTap();
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

  return (
    <View style={styles.container}>
      {/* Swipe background hints */}
      <View style={styles.swipeBg}>
        <View style={styles.swipeRight}>
          <Text style={[styles.swipeIcon, { color: colors.accentOrange }]}>{'>'} Migrate</Text>
        </View>
        <View style={styles.swipeLeft}>
          <Text style={[styles.swipeIcon, { color: colors.accent }]}>Monthly {'<'}</Text>
        </View>
      </View>

      <Animated.View
        style={[
          styles.entry,
          { transform: [{ translateX: pan }], backgroundColor: colors.bg },
          isInactive && styles.entryInactive,
        ]}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
        <TouchableOpacity onPress={handleBulletPress} style={styles.bulletArea}>
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
            onPress={() => {
              if (!isSwiping.current) handleTap();
            }}
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
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 2,
  },
  swipeBg: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  swipeRight: {
    alignItems: 'flex-start',
  },
  swipeLeft: {
    alignItems: 'flex-end',
  },
  swipeIcon: {
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
