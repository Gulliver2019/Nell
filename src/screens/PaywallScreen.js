import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import GoalDiggerLogo from '../components/GoalDiggerLogo';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WEEKLY_PRICE = '99p';
const WEEKLY_ANNUAL = 51.48; // 0.99 * 52
const ANNUAL_PRICE = '£19.99';
const ANNUAL_SAVING = Math.round(((WEEKLY_ANNUAL - 19.99) / WEEKLY_ANNUAL) * 100);

const FEATURES = [
  { icon: '📓', text: 'Full bullet journal system' },
  { icon: '🍅', text: 'Pomodoro timer & time blocking' },
  { icon: '📊', text: 'Habit tracker & reflections' },
  { icon: '🛒', text: 'Shopping lists & collections' },
  { icon: '🔄', text: 'Smart task migration' },
  { icon: '🎨', text: 'Beautiful themes' },
];

export default function PaywallScreen({ onComplete }) {
  const { colors } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideUp = useRef(new Animated.Value(60)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.parallel([
      Animated.timing(slideUp, { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();

    // Pulse the savings badge
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSubscribe = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // In production, this would trigger StoreKit/IAP
    // For now, just proceed
    onComplete();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <LinearGradient
        colors={[colors.accent + '18', 'transparent', colors.accentGold + '10']}
        style={StyleSheet.absoluteFillObject}
      />

      <Animated.View style={[styles.container, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        {/* Hero */}
        <View style={styles.hero}>
          <GoalDiggerLogo color={colors.accent} height={38} style={{ marginBottom: 12 }} />
          <Text style={[styles.heroTitle, { color: colors.text }]}>Unlock Goal Digger</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Start your 3-day free trial
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
            </View>
          ))}
        </View>

        {/* Plan cards */}
        <View style={styles.plans}>
          {/* Annual — best value */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
              selectedPlan === 'annual' && { borderColor: colors.accentGold, borderWidth: 2, backgroundColor: colors.accentGold + '10' },
            ]}
            onPress={() => { setSelectedPlan('annual'); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <Animated.View style={[styles.savingsBadge, { backgroundColor: colors.accentGold, transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.savingsText}>SAVE {ANNUAL_SAVING}%</Text>
            </Animated.View>
            <View style={styles.planInfo}>
              <Text style={[styles.planLabel, { color: colors.text }]}>Annual</Text>
              <Text style={[styles.planPrice, { color: colors.accentGold }]}>{ANNUAL_PRICE}<Text style={styles.planPeriod}>/year</Text></Text>
              <Text style={[styles.planBreakdown, { color: colors.textMuted }]}>
                Just £0.38/week · Billed annually
              </Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: selectedPlan === 'annual' ? colors.accentGold : colors.border }]}>
              {selectedPlan === 'annual' && <View style={[styles.radioInner, { backgroundColor: colors.accentGold }]} />}
            </View>
          </TouchableOpacity>

          {/* Weekly */}
          <TouchableOpacity
            style={[
              styles.planCard,
              { borderColor: colors.border, backgroundColor: colors.bgCard },
              selectedPlan === 'weekly' && { borderColor: colors.accent, borderWidth: 2, backgroundColor: colors.accent + '10' },
            ]}
            onPress={() => { setSelectedPlan('weekly'); Haptics.selectionAsync(); }}
            activeOpacity={0.8}
          >
            <View style={styles.planInfo}>
              <Text style={[styles.planLabel, { color: colors.text }]}>Weekly</Text>
              <Text style={[styles.planPrice, { color: colors.accent }]}>{WEEKLY_PRICE}<Text style={styles.planPeriod}>/week</Text></Text>
              <Text style={[styles.planBreakdown, { color: colors.textMuted }]}>
                £{WEEKLY_ANNUAL.toFixed(2)}/year · Cancel anytime
              </Text>
            </View>
            <View style={[styles.radioOuter, { borderColor: selectedPlan === 'weekly' ? colors.accent : colors.border }]}>
              {selectedPlan === 'weekly' && <View style={[styles.radioInner, { backgroundColor: colors.accent }]} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, { overflow: 'hidden' }]}
          onPress={handleSubscribe}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={selectedPlan === 'annual'
              ? [colors.accentGold, colors.accentOrange || colors.accentGold]
              : [colors.accent, colors.accentLight || colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Text style={[styles.ctaText, { color: '#fff' }]}>
              Start Free Trial
            </Text>
            <Text style={[styles.ctaSub, { color: 'rgba(255,255,255,0.8)' }]}>
              3 days free, then {selectedPlan === 'annual' ? ANNUAL_PRICE + '/year' : WEEKLY_PRICE + '/week'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legal, { color: colors.textMuted }]}>
          Cancel anytime during your trial and you won't be charged.{'\n'}
          Payment will be charged to your Apple ID account at the confirmation of purchase.
        </Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1, paddingHorizontal: 24, justifyContent: 'center',
  },

  // Hero
  hero: { alignItems: 'center', marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', textAlign: 'center' },
  heroSubtitle: { fontSize: SIZES.base, fontWeight: '500', marginTop: 4 },

  // Features
  features: {
    marginBottom: 24, gap: 8,
  },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  featureIcon: { fontSize: 18 },
  featureText: { fontSize: SIZES.md, fontWeight: '500' },

  // Plans
  plans: { gap: 10, marginBottom: 20 },
  planCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: SIZES.radiusLg, borderWidth: 1,
    position: 'relative', overflow: 'visible',
  },
  savingsBadge: {
    position: 'absolute', top: -10, right: 16,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10,
  },
  savingsText: {
    color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5,
  },
  planInfo: { flex: 1 },
  planLabel: { fontSize: SIZES.base, fontWeight: '700' },
  planPrice: { fontSize: SIZES.xl, fontWeight: '800', marginTop: 2 },
  planPeriod: { fontSize: SIZES.sm, fontWeight: '500' },
  planBreakdown: { fontSize: SIZES.xs, marginTop: 2 },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: {
    width: 12, height: 12, borderRadius: 6,
  },

  // CTA
  ctaBtn: { borderRadius: SIZES.radiusLg, marginBottom: 12 },
  ctaGradient: {
    paddingVertical: 16, alignItems: 'center', borderRadius: SIZES.radiusLg,
  },
  ctaText: { fontSize: SIZES.lg, fontWeight: '800' },
  ctaSub: { fontSize: SIZES.xs, fontWeight: '500', marginTop: 2 },

  // Legal
  legal: {
    fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 16,
  },
});
