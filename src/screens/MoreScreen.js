import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking, Switch, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RevenueCatUI from 'react-native-purchases-ui';
import { SIZES, getTaskStates } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useApp } from '../context/AppContext';
import NellLogo from '../components/NellLogo';
import * as Haptics from 'expo-haptics';

const DEFAULT_SCREEN_KEY = '@default_screen';
const SCREEN_OPTIONS = [
  { value: 'Daily', label: 'Daily Log' },
  // { value: 'Jarvis', label: 'Jarvis (AI)' }, // AI disabled
  { value: 'Index', label: 'Index' },
];

export default function MoreScreen({ navigation }) {
  const { colors } = useTheme();
  const { isProUser, restorePurchases } = useRevenueCat();
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const TASK_STATES = getTaskStates(colors);
  const { entries, enabledFeatures, toggleFeature, personalityEnabled, togglePersonality } = useApp();
  const [defaultScreen, setDefaultScreen] = useState('Daily');

  useEffect(() => {
    AsyncStorage.getItem(DEFAULT_SCREEN_KEY).then(v => { if (v) setDefaultScreen(v); }).catch(() => {});
  }, []);

  const handleDefaultScreen = async (value) => {
    Haptics.selectionAsync();
    setDefaultScreen(value);
    await AsyncStorage.setItem(DEFAULT_SCREEN_KEY, value);
  };

  // Stats
  const stats = useMemo(() => {
    const tasks = entries.filter(e => e.type === 'task');
    return {
      totalEntries: entries.length,
      totalTasks: tasks.length,
      completed: tasks.filter(t => t.state === 'complete').length,
      migrated: tasks.filter(t => t.state === 'migrated').length,
      events: entries.filter(e => e.type === 'event').length,
      notes: entries.filter(e => e.type === 'note').length,
    };
  }, [entries]);

  const completionRate = stats.totalTasks > 0
    ? Math.round((stats.completed / stats.totalTasks) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[colors.accent + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <NellLogo color={colors.accent} accentColor={colors.accent} height={30} style={{ marginBottom: 4 }} />
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your bullet journal, digitised</Text>
            </View>
            <View style={styles.headerBtns}>
              <TouchableOpacity
                onPress={() => navigation.navigate('ThemePicker')}
                style={[styles.helpBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
              >
                <Text style={[styles.helpBtnText, { color: colors.accent }]}>🎨</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => navigation.navigate('Help')}
                style={[styles.helpBtn, { backgroundColor: colors.accent + '20', borderColor: colors.accent }]}
              >
                <Text style={[styles.helpBtnText, { color: colors.accent }]}>?</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Default Screen Picker */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🏠 Default Screen</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted, marginBottom: 10 }]}>Choose what opens when you launch the app</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {SCREEN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => handleDefaultScreen(opt.value)}
                style={[
                  styles.screenChip,
                  { borderColor: colors.border, backgroundColor: colors.bg },
                  defaultScreen === opt.value && { borderColor: colors.accent, backgroundColor: colors.accent + '20' },
                ]}
              >
                <Text style={[
                  styles.screenChipText,
                  { color: colors.textSecondary },
                  defaultScreen === opt.value && { color: colors.accent, fontWeight: '700' },
                ]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Manage Features */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📋 Manage Features</Text>
          <Text style={[styles.sectionSub, { color: colors.textMuted, marginBottom: 10 }]}>Show or hide tabs from your navigation</Text>
          {[
            { key: 'logging', label: 'Logging', desc: 'Monthly & Future logs' },
            { key: 'shopping', label: 'Shopping List', desc: 'Shopping list tab' },
            { key: 'projects', label: 'Projects', desc: 'Project boards' },
            { key: 'collections', label: 'Collections', desc: 'Custom collections' },
            { key: 'habits', label: 'Habits', desc: 'Habit tracker' },
            { key: 'reflections', label: 'Reflections', desc: 'Reflect tab' },
          ].map(feature => (
            <View key={feature.key} style={[styles.featureRow, { borderBottomColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.featureLabel, { color: colors.text }]}>{feature.label}</Text>
                <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{feature.desc}</Text>
              </View>
              <Switch
                value={enabledFeatures[feature.key] !== false}
                onValueChange={() => {
                  Haptics.selectionAsync();
                  toggleFeature(feature.key);
                }}
                trackColor={{ false: colors.border, true: colors.accent + '60' }}
                thumbColor={enabledFeatures[feature.key] !== false ? colors.accent : colors.textMuted}
              />
            </View>
          ))}
        </View>

        {/* Personality */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={[styles.featureRow, { borderBottomWidth: 0 }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Image source={require('../../assets/personality.png')} style={{ width: 24, height: 24 }} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Personality Mode</Text>
              </View>
              <Text style={[styles.featureDesc, { color: colors.textMuted }]}>Add fun flavour text throughout the app</Text>
            </View>
            <Switch
              value={personalityEnabled}
              onValueChange={() => {
                Haptics.selectionAsync();
                togglePersonality();
              }}
              trackColor={{ false: colors.border, true: colors.accent + '60' }}
              thumbColor={personalityEnabled ? colors.accent : colors.textMuted}
            />
          </View>
        </View>

        {/* Overall Stats */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={[colors.accent + '15', colors.accentSecondary + '08']}
            style={[styles.statsGradient, { borderColor: colors.border }]}
          >
            <View style={styles.bigStat}>
              <Text style={[styles.bigStatValue, { color: colors.accent }]}>{completionRate}%</Text>
              <Text style={[styles.bigStatLabel, { color: colors.textMuted }]}>Completion Rate</Text>
            </View>
            <View style={styles.statsGrid}>
              {[
                { icon: '•', label: 'Tasks', value: stats.totalTasks, color: colors.text },
                { icon: '✕', label: 'Done', value: stats.completed, color: colors.accentGreen },
                { icon: '○', label: 'Events', value: stats.events, color: colors.accentSecondary },
                { icon: '—', label: 'Notes', value: stats.notes, color: colors.textSecondary },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statBullet, { color: s.color }]}>{s.icon}</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Legend */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📖 Key</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendCol}>
              <Text style={[styles.legendHeader, { color: colors.textSecondary }]}>Bullets</Text>
              {Object.entries(TASK_STATES).map(([key, val]) => (
                <View key={key} style={styles.legendRow}>
                  <Text style={[styles.legendSymbol, { color: val.color }]}>{val.symbol}</Text>
                  <Text style={[styles.legendLabel, { color: colors.text }]}>{val.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.legendCol}>
              <Text style={[styles.legendHeader, { color: colors.textSecondary }]}>Types</Text>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: colors.accentSecondary }]}>○</Text>
                <Text style={[styles.legendLabel, { color: colors.text }]}>Event</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: colors.textSecondary }]}>—</Text>
                <Text style={[styles.legendLabel, { color: colors.text }]}>Note</Text>
              </View>
              <Text style={[styles.legendHeader, { color: colors.textSecondary, marginTop: 12 }]}>Signifiers</Text>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: colors.accentRed }]}>!</Text>
                <Text style={[styles.legendLabel, { color: colors.text }]}>Priority</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: colors.accentGold }]}>★</Text>
                <Text style={[styles.legendLabel, { color: colors.text }]}>Inspiration</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: colors.accentSecondary }]}>?</Text>
                <Text style={[styles.legendLabel, { color: colors.text }]}>Explore</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gestures guide */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>👆 Gestures</Text>
          <View style={styles.gestureList}>
            {[
              { gesture: 'Tap + button', action: 'Add new entry (flyout form)' },
              { gesture: 'Tap ✎ pencil', action: 'Edit entry (flyout form)' },
              { gesture: 'Tap bullet', action: 'Cycle: open → done → migrate' },
              { gesture: 'Long press bullet', action: 'Delete entry' },
              { gesture: 'Tap signifier area', action: 'Cycle: none → ! → ★ → ?' },
              { gesture: 'Tap [N] indicator', action: 'Cycle pomodoro count (0-8)' },
              { gesture: 'Swipe right →', action: 'Migrate to today' },
              { gesture: 'Swipe left ←', action: 'Schedule to date' },
              { gesture: 'Long press drag handle', action: 'Reorder entries' },
              { gesture: '🕐 toggle (header)', action: 'Switch list ↔ time blocks' },
              { gesture: 'Tap empty time slot', action: 'Assign entry to slot' },
              { gesture: 'Long press time block', action: 'Unassign from slot' },
            ].map(g => (
              <View key={g.gesture} style={[styles.gestureRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.gestureAction, { color: colors.accent }]}>{g.gesture}</Text>
                <Text style={[styles.gestureResult, { color: colors.textSecondary }]}>{g.action}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Subscription */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>💎 Subscription</Text>
          <View style={[styles.subscriptionStatus, { borderBottomColor: colors.border }]}>
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Status</Text>
            <Text style={[styles.contactValue, { color: isProUser ? colors.accentGreen : colors.textMuted }]}>
              {isProUser ? 'Nell Pro ✓' : 'Free'}
            </Text>
          </View>
          {isProUser ? (
            <TouchableOpacity
              onPress={() => setShowCustomerCenter(true)}
              style={[styles.contactRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Manage Subscription</Text>
              <Text style={[styles.contactValue, { color: colors.accent }]}>Open →</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => setShowCustomerCenter(true)}
                style={[styles.contactRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Upgrade to Pro</Text>
                <Text style={[styles.contactValue, { color: colors.accent }]}>View Plans →</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const result = await restorePurchases();
                  if (result.success && result.customerInfo?.entitlements?.active?.['GoalDigger Pro']) {
                    Alert.alert('Restored!', 'Your Nell Pro subscription has been restored.');
                  } else {
                    Alert.alert('No Purchases Found', 'We couldn\'t find any previous purchases to restore.');
                  }
                }}
                style={[styles.contactRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Restore Purchases</Text>
                <Text style={[styles.contactValue, { color: colors.accent }]}>Restore →</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Customer Center Modal */}
        {showCustomerCenter && (
          <RevenueCatUI.CustomerCenter
            onDismiss={() => setShowCustomerCenter(false)}
          />
        )}

        {/* Coming Soon */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image source={require('../../assets/alexa.png')} style={{ width: 24, height: 24 }} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Coming Soon</Text>
          </View>
          <Text style={[styles.sectionSub, { color: colors.textMuted, marginBottom: 12 }]}>Voice assistant integration</Text>
          <Text style={[styles.comingSoonBody, { color: colors.textSecondary }]}>
            {"\"Hey Siri, add 'call the dentist' to my daily\"\n\"Alexa, what's next on my schedule?\"\n\"Hey Google, how's my day going?\""}
          </Text>
          <View style={styles.assistantRow}>
            {['🍎 Siri', '🔵 Alexa', '🟢 Google'].map(a => (
              <View key={a} style={[styles.assistantChip, { backgroundColor: colors.accent + '12' }]}>
                <Text style={[styles.assistantChipText, { color: colors.accent }]}>{a}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact & Support */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📬 Contact & Support</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:nell@sr6labs.co.uk')}
            style={[styles.contactRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email us</Text>
            <Text style={[styles.contactValue, { color: colors.accent }]}>nell@sr6labs.co.uk</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://sr6labs.co.uk/privacy.html')}
            style={[styles.contactRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Privacy Policy</Text>
            <Text style={[styles.contactValue, { color: colors.accent }]}>View →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Linking.openURL('https://sr6labs.co.uk/privacy.html')}
            style={styles.contactRow}
          >
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Terms of Service</Text>
            <Text style={[styles.contactValue, { color: colors.accent }]}>View →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 80 },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerBtns: { flexDirection: 'row', gap: 8, marginTop: 4 },
  title: {
    fontSize: SIZES.xxxl, fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { fontSize: SIZES.md, marginTop: 2 },
  helpBtn: {
    width: 36, height: 36, borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  helpBtnText: { fontSize: SIZES.lg, fontWeight: '700' },
  statsCard: {
    marginHorizontal: 16, borderRadius: SIZES.radiusLg, overflow: 'hidden', marginBottom: 20,
  },
  statsGradient: {
    padding: 20, borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  bigStat: { alignItems: 'center', marginBottom: 16 },
  bigStatValue: { fontSize: 48, fontWeight: '800' },
  bigStatLabel: { fontSize: SIZES.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statBullet: { fontSize: SIZES.lg, fontWeight: '700' },
  statValue: { fontSize: SIZES.xl, fontWeight: '700' },
  statLabel: { fontSize: SIZES.xs, marginTop: 2 },
  section: {
    marginHorizontal: 16, marginBottom: 20,
    borderRadius: SIZES.radiusLg,
    padding: 16, borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  sectionSub: { fontSize: SIZES.sm, marginTop: 2 },
  screenChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1,
  },
  screenChipText: { fontSize: SIZES.sm, fontWeight: '500' },
  migrateAllBtn: {
    borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  migrateAllText: { fontSize: SIZES.sm, fontWeight: '600' },
  emptyMigration: { alignItems: 'center', paddingVertical: 16 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyText: { fontSize: SIZES.md },
  migrationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  migrationInfo: { flex: 1, marginRight: 12 },
  migrationDate: { fontSize: SIZES.xs, marginBottom: 2 },
  migrationText: { fontSize: SIZES.md },
  migrationActions: { flexDirection: 'row', gap: 8 },
  migrateBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  migrateBtnText: { fontSize: SIZES.lg, fontWeight: '700' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { fontSize: SIZES.md, fontWeight: '700' },
  legendGrid: { flexDirection: 'row', gap: 20, marginTop: 8 },
  legendCol: { flex: 1 },
  legendHeader: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  legendSymbol: { fontSize: SIZES.lg, fontWeight: '700', width: 20, textAlign: 'center' },
  legendLabel: { fontSize: SIZES.sm },
  gestureList: { marginTop: 8 },
  gestureRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  gestureAction: { fontSize: SIZES.sm, fontWeight: '600' },
  gestureResult: { fontSize: SIZES.sm },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  subscriptionStatus: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contactLabel: { fontSize: SIZES.md },
  contactValue: { fontSize: SIZES.sm, fontWeight: '600' },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featureLabel: { fontSize: SIZES.md, fontWeight: '600' },
  featureDesc: { fontSize: SIZES.xs, marginTop: 2 },
  comingSoonBody: { fontSize: SIZES.sm, lineHeight: 22, fontStyle: 'italic' },
  assistantRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  assistantChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  assistantChipText: { fontSize: SIZES.sm, fontWeight: '600' },
});
