import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import RevenueCatUI from 'react-native-purchases-ui';
import { SIZES, getTaskStates } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useRevenueCat } from '../context/RevenueCatContext';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDateShort } from '../utils/storage';
import GoalDiggerLogo from '../components/GoalDiggerLogo';
import * as Haptics from 'expo-haptics';

export default function MoreScreen({ navigation }) {
  const { colors } = useTheme();
  const { isProUser, restorePurchases } = useRevenueCat();
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const TASK_STATES = getTaskStates(colors);
  const { entries, migrateEntry, updateEntry } = useApp();

  // Open tasks from past days (migration candidates)
  const migrationCandidates = useMemo(() => {
    const today = getDateKey();
    return entries
      .filter(e => e.type === 'task' && e.state === 'open' && e.date < today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

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

  const handleMigrate = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    migrateEntry(id);
  };

  const handleCancel = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updateEntry(id, { state: 'cancelled' });
  };

  const handleMigrateAll = () => {
    Alert.alert(
      'Migrate All',
      `Move ${migrationCandidates.length} open tasks to today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Migrate All',
          onPress: () => {
            migrationCandidates.forEach(e => migrateEntry(e.id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

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
              <GoalDiggerLogo color={colors.accent} height={30} style={{ marginBottom: 4 }} />
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

        {/* Migration Review */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>⚡ Migration Review</Text>
              <Text style={[styles.sectionSub, { color: colors.textMuted }]}>
                {migrationCandidates.length > 0
                  ? `${migrationCandidates.length} tasks need attention`
                  : 'All caught up!'}
              </Text>
            </View>
            {migrationCandidates.length > 1 && (
              <TouchableOpacity onPress={handleMigrateAll} style={[styles.migrateAllBtn, { backgroundColor: colors.accent + '20' }]}>
                <Text style={[styles.migrateAllText, { color: colors.accent }]}>Move All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {migrationCandidates.length === 0 ? (
            <View style={styles.emptyMigration}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No overdue tasks</Text>
            </View>
          ) : (
            migrationCandidates.map(entry => (
              <View key={entry.id} style={[styles.migrationCard, { borderBottomColor: colors.border }]}>
                <View style={styles.migrationInfo}>
                  <Text style={[styles.migrationDate, { color: colors.textMuted }]}>{formatDateShort(entry.date)}</Text>
                  <Text style={[styles.migrationText, { color: colors.text }]} numberOfLines={2}>{entry.text}</Text>
                </View>
                <View style={styles.migrationActions}>
                  <TouchableOpacity
                    onPress={() => handleMigrate(entry.id)}
                    style={[styles.migrateBtn, { backgroundColor: colors.accentOrange + '20' }]}
                  >
                    <Text style={[styles.migrateBtnText, { color: colors.accentOrange }]}>{'>'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCancel(entry.id)}
                    style={[styles.cancelBtn, { backgroundColor: colors.accentRed + '15' }]}
                  >
                    <Text style={[styles.cancelBtnText, { color: colors.accentRed }]}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
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
              {isProUser ? 'GoalDigger Pro ✓' : 'Free'}
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
                    Alert.alert('Restored!', 'Your GoalDigger Pro subscription has been restored.');
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

        {/* Contact & Support */}
        <View style={[styles.section, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>📬 Contact & Support</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL('mailto:goaldigger@sr6labs.co.uk')}
            style={[styles.contactRow, { borderBottomColor: colors.border }]}
          >
            <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email us</Text>
            <Text style={[styles.contactValue, { color: colors.accent }]}>goaldigger@sr6labs.co.uk</Text>
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
  content: { paddingBottom: 20 },
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
});
