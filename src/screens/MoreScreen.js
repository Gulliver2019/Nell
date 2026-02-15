import React, { useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, TASK_STATES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { getDateKey, formatDateShort } from '../utils/storage';
import * as Haptics from 'expo-haptics';

export default function MoreScreen({ navigation }) {
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerBar}>
          <LinearGradient
            colors={[COLORS.accent + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <Text style={styles.title}>CrushedIT</Text>
          <Text style={styles.subtitle}>Your bullet journal, digitised</Text>
        </View>

        {/* Overall Stats */}
        <View style={styles.statsCard}>
          <LinearGradient
            colors={[COLORS.accent + '15', COLORS.accentSecondary + '08']}
            style={styles.statsGradient}
          >
            <View style={styles.bigStat}>
              <Text style={styles.bigStatValue}>{completionRate}%</Text>
              <Text style={styles.bigStatLabel}>Completion Rate</Text>
            </View>
            <View style={styles.statsGrid}>
              {[
                { icon: '•', label: 'Tasks', value: stats.totalTasks, color: COLORS.text },
                { icon: '✕', label: 'Crushed', value: stats.completed, color: COLORS.accentGreen },
                { icon: '○', label: 'Events', value: stats.events, color: COLORS.accentSecondary },
                { icon: '—', label: 'Notes', value: stats.notes, color: COLORS.textSecondary },
              ].map(s => (
                <View key={s.label} style={styles.statItem}>
                  <Text style={[styles.statBullet, { color: s.color }]}>{s.icon}</Text>
                  <Text style={styles.statValue}>{s.value}</Text>
                  <Text style={styles.statLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </View>

        {/* Migration Review */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>⚡ Migration Review</Text>
              <Text style={styles.sectionSub}>
                {migrationCandidates.length > 0
                  ? `${migrationCandidates.length} tasks need attention`
                  : 'All caught up!'}
              </Text>
            </View>
            {migrationCandidates.length > 1 && (
              <TouchableOpacity onPress={handleMigrateAll} style={styles.migrateAllBtn}>
                <Text style={styles.migrateAllText}>Move All →</Text>
              </TouchableOpacity>
            )}
          </View>

          {migrationCandidates.length === 0 ? (
            <View style={styles.emptyMigration}>
              <Text style={styles.emptyIcon}>✨</Text>
              <Text style={styles.emptyText}>No overdue tasks</Text>
            </View>
          ) : (
            migrationCandidates.map(entry => (
              <View key={entry.id} style={styles.migrationCard}>
                <View style={styles.migrationInfo}>
                  <Text style={styles.migrationDate}>{formatDateShort(entry.date)}</Text>
                  <Text style={styles.migrationText} numberOfLines={2}>{entry.text}</Text>
                </View>
                <View style={styles.migrationActions}>
                  <TouchableOpacity
                    onPress={() => handleMigrate(entry.id)}
                    style={styles.migrateBtn}
                  >
                    <Text style={styles.migrateBtnText}>{'>'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleCancel(entry.id)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Legend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Key</Text>
          <View style={styles.legendGrid}>
            <View style={styles.legendCol}>
              <Text style={styles.legendHeader}>Bullets</Text>
              {Object.entries(TASK_STATES).map(([key, val]) => (
                <View key={key} style={styles.legendRow}>
                  <Text style={[styles.legendSymbol, { color: val.color }]}>{val.symbol}</Text>
                  <Text style={styles.legendLabel}>{val.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.legendCol}>
              <Text style={styles.legendHeader}>Types</Text>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: COLORS.accentSecondary }]}>○</Text>
                <Text style={styles.legendLabel}>Event</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: COLORS.textSecondary }]}>—</Text>
                <Text style={styles.legendLabel}>Note</Text>
              </View>
              <Text style={[styles.legendHeader, { marginTop: 12 }]}>Signifiers</Text>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: COLORS.accentRed }]}>!</Text>
                <Text style={styles.legendLabel}>Priority</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: COLORS.accentGold }]}>★</Text>
                <Text style={styles.legendLabel}>Inspiration</Text>
              </View>
              <View style={styles.legendRow}>
                <Text style={[styles.legendSymbol, { color: COLORS.accentSecondary }]}>?</Text>
                <Text style={styles.legendLabel}>Explore</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Gestures guide */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👆 Gestures</Text>
          <View style={styles.gestureList}>
            {[
              { gesture: 'Tap bullet', action: 'Cycle: open → done → cancelled' },
              { gesture: 'Long press text', action: 'Edit entry' },
              { gesture: 'Tap signifier area', action: 'Cycle: none → ! → ★ → ?' },
              { gesture: 'Swipe right →', action: 'Migrate to today' },
              { gesture: 'Swipe left ←', action: 'Schedule forward' },
            ].map(g => (
              <View key={g.gesture} style={styles.gestureRow}>
                <Text style={styles.gestureAction}>{g.gesture}</Text>
                <Text style={styles.gestureResult}>{g.action}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 20 },
  headerBar: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative' },
  title: {
    color: COLORS.text, fontSize: SIZES.xxxl, fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: { color: COLORS.textMuted, fontSize: SIZES.md, marginTop: 2 },
  statsCard: {
    marginHorizontal: 16, borderRadius: SIZES.radiusLg, overflow: 'hidden', marginBottom: 20,
  },
  statsGradient: {
    padding: 20, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bigStat: { alignItems: 'center', marginBottom: 16 },
  bigStatValue: { color: COLORS.accent, fontSize: 48, fontWeight: '800' },
  bigStatLabel: { color: COLORS.textMuted, fontSize: SIZES.sm, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statBullet: { fontSize: SIZES.lg, fontWeight: '700' },
  statValue: { color: COLORS.text, fontSize: SIZES.xl, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2 },
  section: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radiusLg,
    padding: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 12,
  },
  sectionTitle: { color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700' },
  sectionSub: { color: COLORS.textMuted, fontSize: SIZES.sm, marginTop: 2 },
  migrateAllBtn: {
    backgroundColor: COLORS.accent + '20', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  migrateAllText: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600' },
  emptyMigration: { alignItems: 'center', paddingVertical: 16 },
  emptyIcon: { fontSize: 32, marginBottom: 4 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.md },
  migrationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  migrationInfo: { flex: 1, marginRight: 12 },
  migrationDate: { color: COLORS.textMuted, fontSize: SIZES.xs, marginBottom: 2 },
  migrationText: { color: COLORS.text, fontSize: SIZES.md },
  migrationActions: { flexDirection: 'row', gap: 8 },
  migrateBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accentOrange + '20', alignItems: 'center', justifyContent: 'center',
  },
  migrateBtnText: { color: COLORS.accentOrange, fontSize: SIZES.lg, fontWeight: '700' },
  cancelBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.accentRed + '15', alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { color: COLORS.accentRed, fontSize: SIZES.md, fontWeight: '700' },
  legendGrid: { flexDirection: 'row', gap: 20, marginTop: 8 },
  legendCol: { flex: 1 },
  legendHeader: { color: COLORS.textSecondary, fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 },
  legendSymbol: { fontSize: SIZES.lg, fontWeight: '700', width: 20, textAlign: 'center' },
  legendLabel: { color: COLORS.text, fontSize: SIZES.sm },
  gestureList: { marginTop: 8 },
  gestureRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  gestureAction: { color: COLORS.accent, fontSize: SIZES.sm, fontWeight: '600' },
  gestureResult: { color: COLORS.textSecondary, fontSize: SIZES.sm },
});
