import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
  ScrollView, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import HelpScreen from './HelpScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const BOOK_IMAGE = require('../../assets/book.png');
const RAPID_IMAGE = require('../../assets/rapid.png');
const MIGRATION_IMAGE = require('../../assets/migration.png');
const PROJECT_IMAGE = require('../../assets/project.png');
const READY_IMAGE = require('../../assets/ready.png');
const POM_IMAGE = require('../../assets/pom.png');
const CAL_IMAGE = require('../../assets/cal.png');

const BRAIN_IMAGE = require('../../assets/brain.png');

const SLIDES = [
  {
    emoji: '📓',
    title: 'This Is Goal Digger',
    subtitle: 'Not a to-do list. A life operating system.',
    body: 'One app to capture everything — tasks, projects, goals, habits, reflections, time blocks and shopping lists. Powered by AI. Designed so nothing falls through the cracks, ever.',
  },
  {
    key: 'rapid',
    emoji: '⚡',
    title: 'Capture Everything Fast',
    subtitle: 'Rapid logging — the core engine',
    body: 'Short-form notation to log your life in seconds:\n\n•  Task — something to do\n○  Event — something happening\n—  Note — a thought to remember\n\nNo templates. No friction. Just write.',
  },
  {
    key: 'migration',
    emoji: '🔄',
    title: 'Stay Ruthlessly Intentional',
    subtitle: 'Migration kills busywork',
    body: 'Every open task gets reviewed. If it still matters, it moves forward. If not, it dies.\n\nThis one habit will change how you think about your time.',
  },
  {
    key: 'cal',
    emoji: '📅',
    title: 'Daily · Monthly · Future',
    subtitle: 'Three lenses on your life',
    body: 'Daily Log — what matters today\nMonthly Log — the big picture\nFuture Log — months ahead, planned\n\nZoom in. Zoom out. Nothing gets lost.',
  },
  {
    key: 'project',
    emoji: '🎯',
    title: 'Projects & Collections',
    subtitle: 'Your goals, structured',
    body: 'Kanban boards for every project. Collections for anything — reading lists, gift ideas, meal plans. Pull any item into your daily log with one tap.\n\nThis is where goals become actions.',
  },
  {
    key: 'pom',
    emoji: '🍅',
    title: 'Time Blocking & Pomodoro',
    subtitle: 'Protect your deep work',
    body: 'Assign tasks to time slots. Use the built-in Pomodoro timer for 25-minute focus sprints.\n\nStop reacting. Start executing.',
  },
  {
    key: 'ai',
    emoji: '✨',
    title: 'Meet Jarvis',
    subtitle: 'Your AI-powered chief of staff',
    body: 'Jarvis sees everything — your tasks, projects, habits, reflections. Tap the brain icon for:\n\n⚡ Plan My Day — a full execution plan\n🚩 Risk flags when you\'re overloaded\n🏗️ Project coaching & next steps\n\nThis isn\'t a chatbot. It\'s your operating system.',
  },
  {
    key: 'book',
    emoji: '📖',
    title: 'The Bullet Journal Method',
    subtitle: 'By Ryder Carroll',
    body: 'Goal Digger is built on the Bullet Journal method. For the full philosophy behind the system, we recommend the original book by its creator, Ryder Carroll.',
  },
  {
    key: 'ready',
    emoji: '💪',
    title: 'Your System Starts Now',
    subtitle: 'Everything you need. Nothing you don\'t.',
    body: 'Habits. Reflections. Shopping lists. Time blocks. AI guidance. All connected through one index you can search instantly.\n\nThis is the last productivity app you\'ll ever download.',
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
        {slide.key === 'book' ? (
          <>
            <View style={styles.bookCover}>
              <Image
                source={BOOK_IMAGE}
                style={styles.bookImage}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.accent }]}>{slide.subtitle}</Text>
            <Text style={[styles.slideBody, { color: colors.textSecondary }]}>{slide.body}</Text>
          </>
        ) : slide.key === 'rapid' || slide.key === 'migration' || slide.key === 'project' || slide.key === 'ready' || slide.key === 'pom' || slide.key === 'cal' || slide.key === 'ai' ? (
          <>
            <Image source={slide.key === 'rapid' ? RAPID_IMAGE : slide.key === 'migration' ? MIGRATION_IMAGE : slide.key === 'project' ? PROJECT_IMAGE : slide.key === 'pom' ? POM_IMAGE : slide.key === 'cal' ? CAL_IMAGE : slide.key === 'ai' ? BRAIN_IMAGE : READY_IMAGE} style={styles.slideIcon} resizeMode="contain" />
            <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.accent }]}>{slide.subtitle}</Text>
            <Text style={[styles.slideBody, { color: colors.textSecondary }]}>{slide.body}</Text>
          </>
        ) : (
          <>
            <Text style={styles.slideEmoji}>{slide.emoji}</Text>
            <Text style={[styles.slideTitle, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.slideSubtitle, { color: colors.accent }]}>{slide.subtitle}</Text>
            <Text style={[styles.slideBody, { color: colors.textSecondary }]}>{slide.body}</Text>
          </>
        )}
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
  slideIcon: { width: 96, height: 96, marginBottom: 16 },
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

  // Book slide
  bookCover: {
    width: 160,
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    backgroundColor: '#333',
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
});
