import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState, Modal, Animated, Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SIZES } from '../utils/theme';

const PLAY_IMAGE = require('../../assets/play.png');
const PAUSE_IMAGE = require('../../assets/pause.png');
const REFRESH_IMAGE = require('../../assets/refresh.png');
const SKIP_IMAGE = require('../../assets/skip.png');

const WORK_DURATION = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;
const SESSIONS_BEFORE_LONG = 4;

const COMPLETION_MESSAGES = [
  { emoji: '🎯', title: 'Crushed it!', sub: 'Another pomodoro in the bag.' },
  { emoji: '🔥', title: 'On fire!', sub: 'You are building momentum.' },
  { emoji: '💪', title: 'Strong work!', sub: 'Take a well-earned break.' },
  { emoji: '⭐', title: 'Stellar focus!', sub: 'Your future self thanks you.' },
  { emoji: '🏆', title: 'Champion!', sub: 'Consistency is your superpower.' },
  { emoji: '🚀', title: 'Launched!', sub: 'That session was out of this world.' },
];

export default function PomodoroTimer({ colors, activeEntry, onPomodoroComplete, visible, onClose }) {
  const [phase, setPhase] = useState('work');
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [completionMsg, setCompletionMsg] = useState(COMPLETION_MESSAGES[0]);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const notifIdRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {}, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        if (isRunning && endTimeRef.current) {
          const remaining = Math.round((endTimeRef.current - Date.now()) / 1000);
          if (remaining <= 0) {
            handlePhaseEnd();
          } else {
            setSecondsLeft(remaining);
          }
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [isRunning, phase]);

  // Pulse animation for completion
  useEffect(() => {
    if (showCompletion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [showCompletion]);

  const getDuration = (p) => {
    if (p === 'work') return WORK_DURATION;
    if (p === 'longBreak') return LONG_BREAK;
    return SHORT_BREAK;
  };

  const scheduleNotification = useCallback(async (secs, title, body) => {
    // Notifications removed — can re-add with expo-notifications later
  }, []);

  const cancelNotification = useCallback(async () => {
    if (notifIdRef.current) notifIdRef.current = null;
  }, []);

  const handlePhaseEnd = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    endTimeRef.current = null;
    setIsRunning(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (phase === 'work') {
      const newCount = sessionsCompleted + 1;
      setSessionsCompleted(newCount);
      onPomodoroComplete?.();
      const msg = COMPLETION_MESSAGES[Math.floor(Math.random() * COMPLETION_MESSAGES.length)];
      setCompletionMsg(msg);
      setShowCompletion(true);
      if (newCount % SESSIONS_BEFORE_LONG === 0) {
        setPhase('longBreak');
        setSecondsLeft(LONG_BREAK);
      } else {
        setPhase('shortBreak');
        setSecondsLeft(SHORT_BREAK);
      }
    } else {
      setPhase('work');
      setSecondsLeft(WORK_DURATION);
    }
  }, [phase, sessionsCompleted, onPomodoroComplete]);

  useEffect(() => {
    if (!isRunning) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) { handlePhaseEnd(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isRunning, handlePhaseEnd]);

  const start = async () => {
    setShowCompletion(false);
    const secs = secondsLeft;
    endTimeRef.current = Date.now() + secs * 1000;
    setIsRunning(true);
    const title = phase === 'work' ? '🍅 Pomodoro Complete!' : '☕ Break Over!';
    const body = phase === 'work'
      ? `Great work! Time for a ${(sessionsCompleted + 1) % SESSIONS_BEFORE_LONG === 0 ? 'long' : 'short'} break.`
      : 'Ready to focus again?';
    await scheduleNotification(secs, title, body);
  };

  const pause = async () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    endTimeRef.current = null;
    setIsRunning(false);
    await cancelNotification();
  };

  const reset = async () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    endTimeRef.current = null;
    setIsRunning(false);
    setShowCompletion(false);
    setSecondsLeft(getDuration(phase));
    await cancelNotification();
  };

  const skip = () => {
    cancelNotification();
    setShowCompletion(false);
    handlePhaseEnd();
  };

  const handleClose = () => {
    if (!isRunning) {
      setShowCompletion(false);
      onClose?.();
    } else {
      onClose?.();
    }
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalDuration = getDuration(phase);
  const progress = 1 - secondsLeft / totalDuration;

  const phaseLabel = phase === 'work' ? 'FOCUS' : phase === 'shortBreak' ? 'SHORT BREAK' : 'LONG BREAK';
  const phaseColor = phase === 'work' ? colors.accentRed : colors.accentGreen;

  const RING_SIZE = 220;
  const STROKE = 6;

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent>
      <View style={[styles.overlay, { backgroundColor: colors.bg + 'F5' }]}>
        {/* Close button */}
        <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
          <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
        </TouchableOpacity>

        {/* Completion celebration */}
        {showCompletion && (
          <View style={styles.completionBanner}>
            <Animated.Text style={[styles.completionEmoji, { transform: [{ scale: pulseAnim }] }]}>
              {completionMsg.emoji}
            </Animated.Text>
            <Text style={[styles.completionTitle, { color: colors.accentGreen }]}>{completionMsg.title}</Text>
            <Text style={[styles.completionSub, { color: colors.textSecondary }]}>{completionMsg.sub}</Text>
            <TouchableOpacity
              style={[styles.completionDismiss, { backgroundColor: colors.accentGreen + '20' }]}
              onPress={() => setShowCompletion(false)}
            >
              <Text style={[styles.completionDismissText, { color: colors.accentGreen }]}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main timer */}
        {!showCompletion && (
          <View style={styles.timerBody}>
            {/* Phase & dots */}
            <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
            <View style={styles.sessionDots}>
              {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.sessionDot,
                    { backgroundColor: i < (sessionsCompleted % SESSIONS_BEFORE_LONG) ? colors.accentRed : colors.border },
                  ]}
                />
              ))}
            </View>

            {/* Active entry */}
            {activeEntry && (
              <Text style={[styles.entryName, { color: colors.text }]} numberOfLines={1}>
                {activeEntry.text}
              </Text>
            )}

            {/* Ring + time */}
            <View style={[styles.ringWrapper, { width: RING_SIZE, height: RING_SIZE }]}>
              <View style={[styles.ringBg, {
                width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
                borderColor: colors.border, borderWidth: STROKE,
              }]} />
              <View style={[styles.ringFill, {
                width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
                borderColor: phaseColor, borderWidth: STROKE, opacity: 0.25,
              }]} />
              <View style={styles.timerCenter}>
                <Text style={[styles.timerText, { color: colors.text }]}>
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </Text>
                <Text style={[styles.timerSub, { color: colors.textMuted }]}>
                  session #{sessionsCompleted + 1}
                </Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={reset}>
                <Image source={REFRESH_IMAGE} style={styles.secondaryIcon} resizeMode="contain" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: phaseColor }]}
                onPress={isRunning ? pause : start}
              >
                {isRunning ? <Image source={PAUSE_IMAGE} style={styles.playIcon} resizeMode="contain" /> : <Image source={PLAY_IMAGE} style={styles.playIcon} resizeMode="contain" />}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.secondaryBtn, { borderColor: colors.border }]} onPress={skip}>
                <Image source={SKIP_IMAGE} style={styles.secondaryIcon} resizeMode="contain" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnText: {
    fontSize: 24,
    fontWeight: '300',
  },

  // Completion
  completionBanner: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  completionEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
  },
  completionSub: {
    fontSize: SIZES.lg,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 32,
  },
  completionDismiss: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
  },
  completionDismissText: {
    fontSize: SIZES.md,
    fontWeight: '700',
  },

  // Timer body
  timerBody: {
    alignItems: 'center',
  },
  phaseLabel: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 20,
  },
  sessionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  entryName: {
    fontSize: SIZES.md,
    fontWeight: '500',
    marginBottom: 24,
    maxWidth: '70%',
    textAlign: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  ringBg: {
    position: 'absolute',
  },
  ringFill: {
    position: 'absolute',
  },
  timerCenter: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 56,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  timerSub: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  secondaryBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 20,
  },
  primaryBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: 24,
    color: '#fff',
  },
  playIcon: {
    width: 28,
    height: 28,
    tintColor: '#fff',
  },
  secondaryIcon: {
    width: 20,
    height: 20,
    tintColor: '#999',
  },
});
