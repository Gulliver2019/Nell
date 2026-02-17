import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, AppState, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { SIZES } from '../utils/theme';

// Configure how notifications appear when app is in foreground
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Native module not available yet — will work after dev build with expo-notifications
}

const WORK_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60;   // 5 minutes
const LONG_BREAK = 15 * 60;   // 15 minutes
const SESSIONS_BEFORE_LONG = 4;

export default function PomodoroTimer({ colors, activeEntry, onPomodoroComplete }) {
  const [phase, setPhase] = useState('work'); // 'work' | 'shortBreak' | 'longBreak'
  const [secondsLeft, setSecondsLeft] = useState(WORK_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);
  const notifIdRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // Request notification permissions on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (e) {
        // Native module not available in current build — notifications will work after rebuild
      }
    })();
  }, []);

  // Sync timer when app returns from background
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

  const getDuration = (p) => {
    if (p === 'work') return WORK_DURATION;
    if (p === 'longBreak') return LONG_BREAK;
    return SHORT_BREAK;
  };

  const scheduleNotification = useCallback(async (secs, title, body) => {
    try {
      if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
      }
      notifIdRef.current = await Notifications.scheduleNotificationAsync({
        content: { title, body, sound: true },
        trigger: { type: 'timeInterval', seconds: Math.max(1, secs), repeats: false },
      });
    } catch (e) {
      // Native module not available — timer still works, just no notification
    }
  }, []);

  const cancelNotification = useCallback(async () => {
    try {
      if (notifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(notifIdRef.current);
        notifIdRef.current = null;
      }
    } catch (e) {}
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

  // Tick
  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          handlePhaseEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, handlePhaseEnd]);

  const start = async () => {
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
    setSecondsLeft(getDuration(phase));
    await cancelNotification();
  };

  const skip = () => {
    cancelNotification();
    handlePhaseEnd();
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const totalDuration = getDuration(phase);
  const progress = 1 - secondsLeft / totalDuration;

  const phaseLabel = phase === 'work' ? 'Focus' : phase === 'shortBreak' ? 'Short Break' : 'Long Break';
  const phaseColor = phase === 'work' ? colors.accentRed : colors.accentGreen;

  // Circular progress ring
  const RING_SIZE = 140;
  const STROKE = 5;
  const RADIUS = (RING_SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const strokeDashoffset = CIRCUMFERENCE * (1 - progress);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      {/* Phase label & session dots */}
      <View style={styles.phaseRow}>
        <Text style={[styles.phaseLabel, { color: phaseColor }]}>{phaseLabel}</Text>
        <View style={styles.sessionDots}>
          {Array.from({ length: SESSIONS_BEFORE_LONG }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.sessionDot,
                {
                  backgroundColor: i < (sessionsCompleted % SESSIONS_BEFORE_LONG)
                    ? colors.accentRed
                    : colors.border,
                },
              ]}
            />
          ))}
        </View>
      </View>

      {/* Active entry name */}
      {activeEntry && (
        <Text style={[styles.entryName, { color: colors.text }]} numberOfLines={1}>
          {activeEntry.text}
        </Text>
      )}

      {/* Timer ring */}
      <View style={[styles.ringWrapper, { width: RING_SIZE, height: RING_SIZE }]}>
        <View style={[styles.ringBg, { width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2, borderColor: colors.border }]} />
        <View style={[styles.ringProgress, { width: RING_SIZE, height: RING_SIZE }]}>
          {/* Using a simple overlay approach since react-native-svg might not be available */}
          <View style={[styles.ringFill, {
            width: RING_SIZE, height: RING_SIZE, borderRadius: RING_SIZE / 2,
            borderColor: phaseColor, borderWidth: STROKE,
            opacity: 0.2,
          }]} />
        </View>
        <View style={styles.timerCenter}>
          <Text style={[styles.timerText, { color: colors.text }]}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
          <Text style={[styles.timerSessions, { color: colors.textMuted }]}>
            #{sessionsCompleted + 1}
          </Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={reset}
        >
          <Text style={[styles.controlBtnText, { color: colors.textMuted }]}>↺</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.primaryBtn, { backgroundColor: phaseColor }]}
          onPress={isRunning ? pause : start}
        >
          <Text style={[styles.primaryBtnText, { color: '#fff' }]}>
            {isRunning ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, styles.secondaryBtn, { borderColor: colors.border }]}
          onPress={skip}
        >
          <Text style={[styles.controlBtnText, { color: colors.textMuted }]}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sessionDots: {
    flexDirection: 'row',
    gap: 4,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  entryName: {
    fontSize: SIZES.sm,
    fontWeight: '500',
    marginBottom: 8,
    maxWidth: '80%',
    textAlign: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  ringBg: {
    position: 'absolute',
    borderWidth: 3,
  },
  ringProgress: {
    position: 'absolute',
  },
  ringFill: {},
  timerCenter: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: 36,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
  },
  timerSessions: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  controlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  primaryBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  controlBtnText: {
    fontSize: 18,
  },
  primaryBtnText: {
    fontSize: 20,
  },
});
