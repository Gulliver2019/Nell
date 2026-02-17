import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import HelpScreen from './HelpScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SLIDES = [
  {
    emoji: '📓',
    title: 'Welcome to Goal Digger',
    subtitle: 'Your digital bullet journal',
    body: 'A beautifully simple system for organising your life — tasks, events, notes, habits and reflections, all in one place.',
  },
  {
    emoji: '⚡',
    title: 'Rapid Logging',
    subtitle: 'The core technique',
    body: 'Bullet journaling uses short-form notation to capture information quickly:\n\n•  Task — something to do\n○  Event — something happening\n—  Note — a thought to remember\n\nJust write what matters. No fluff.',
  },
  {
    emoji: '🔄',
    title: 'Migration',
    subtitle: 'Stay intentional',
    body: 'At the end of each day, review your open tasks. If it still matters, migrate it forward. If not, cancel it.\n\nThis forces you to regularly ask: "Is this still worth my time?"',
  },
  {
    emoji: '📅',
    title: 'Daily · Monthly · Future',
    subtitle: 'Three time horizons',
    body: 'Daily Log — today\'s rapid log\nMonthly Log — bird\'s eye view of the month\nFuture Log — plan months ahead\n\nEverything connects. Nothing gets lost.',
  },
  {
    emoji: '🎯',
    title: 'Projects & Collections',
    subtitle: 'Custom pages for anything',
    body: 'Group related tasks into Projects with kanban boards. Create Collections for reading lists, recipes, gift ideas — whatever you need.',
  },
  {
    emoji: '🍅',
    title: 'Time Blocking & Pomodoro',
    subtitle: 'Deep focus tools',
    body: 'Assign tasks to time slots on your daily timeline. Use the built-in Pomodoro timer (25min focus sessions) to stay in the zone.',
  },
  {
    emoji: '💪',
    title: 'You\'re Ready!',
    subtitle: 'Go dig those goals',
    body: 'Track habits, reflect on your day, search everything from the Index. The more you use it, the more powerful it becomes.\n\nLet\'s get started.',
  },
];

export default function OnboardingScreen({ onComplete }) {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const scrollRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goToSlide = (index) => {
    Haptics.selectionAsync();
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentSlide(index);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      goToSlide(currentSlide + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  const handleSkip = () => {
    Haptics.selectionAsync();
    onComplete();
  };

  const slide = SLIDES[currentSlide];
  const isLast = currentSlide === SLIDES.length - 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.accent + '12', 'transparent', colors.accentSecondary + '08']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Skip */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        {!isLast && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Slide content */}
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.slideEmoji}>{slide.emoji}</Text>
        <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
        <Text style={[styles.slideSubtitle, { color: colors.accent }]}>{slide.subtitle}</Text>
        <Text style={[styles.slideBody, { color: colors.textSecondary }]}>{slide.body}</Text>
      </Animated.View>

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToSlide(i)}>
            <View
              style={[
                styles.dot,
                { backgroundColor: colors.border },
                i === currentSlide && { backgroundColor: colors.accent, width: 24 },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* Help link on last slide */}
      {isLast && (
        <TouchableOpacity onPress={() => setShowHelp(true)} style={styles.helpLink}>
          <Text style={[styles.helpLinkText, { color: colors.accent }]}>
            📖  See the Help page
          </Text>
        </TouchableOpacity>
      )}

      {/* Action button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, { overflow: 'hidden' }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.accent, colors.accentLight || colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextGradient}
          >
            <Text style={[styles.nextText, { color: colors.textInverse || '#fff' }]}>
              {isLast ? 'Get Started' : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Help modal */}
      {showHelp && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.bg }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.helpHeader}>
              <TouchableOpacity onPress={() => setShowHelp(false)} style={styles.helpClose}>
                <Text style={[styles.helpCloseText, { color: colors.accent }]}>✕ Close</Text>
              </TouchableOpacity>
            </View>
            <HelpScreen embedded />
          </SafeAreaView>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8,
  },
  skipBtn: { padding: 8 },
  skipText: { fontSize: SIZES.base, fontWeight: '600' },

  slideContent: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },
  slideEmoji: { fontSize: 64, marginBottom: 16 },
  slideTitle: { fontSize: SIZES.xxl, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  slideSubtitle: { fontSize: SIZES.base, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  slideBody: { fontSize: SIZES.md, lineHeight: 24, textAlign: 'center' },

  dotsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 20,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
  },

  bottomBar: {
    paddingHorizontal: 32, paddingBottom: 24,
  },
  nextBtn: {
    borderRadius: SIZES.radius,
  },
  nextGradient: {
    paddingVertical: 16, alignItems: 'center', borderRadius: SIZES.radius,
  },
  nextText: {
    fontSize: SIZES.lg, fontWeight: '700',
  },

  helpLink: {
    alignItems: 'center', paddingBottom: 8,
  },
  helpLinkText: {
    fontSize: SIZES.base, fontWeight: '600',
  },
  helpHeader: {
    flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingVertical: 8,
  },
  helpClose: { padding: 8 },
  helpCloseText: { fontSize: SIZES.base, fontWeight: '700' },
});
