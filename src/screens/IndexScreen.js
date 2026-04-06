import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatDateShort, getDateKey, getMonthName, getWeekKey, getMonthKey } from '../utils/storage';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

export default function IndexScreen({ navigation }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const TASK_STATES = getTaskStates(colors);
  const SIGNIFIERS = getSignifiers(colors);
  const { entries, collections, projects, futureLog, goals, weeklyIntentions, searchQuery, setSearchQuery, setSelectedDate } = useApp();
  const [expandedSection, setExpandedSection] = useState(null);

  const today = getDateKey();

  // Search results — searches entries (daily/monthly/collections), future log, and project tasks
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results = [];

    // Daily, monthly, collection entries
    entries.forEach(e => {
      if (e.text?.toLowerCase().includes(q)) {
        results.push(e);
      }
    });

    // Future log entries
    Object.entries(futureLog).forEach(([monthKey, monthEntries]) => {
      (monthEntries || []).forEach(e => {
        if (e.text?.toLowerCase().includes(q)) {
          results.push({ ...e, _source: 'future', _monthKey: monthKey });
        }
      });
    });

    // Project tasks
    projects.forEach(project => {
      (project.tasks || []).forEach(task => {
        if (task.text?.toLowerCase().includes(q)) {
          results.push({ ...task, _source: 'project', _projectName: project.title, _projectEmoji: project.emoji, _projectId: project.id });
        }
      });
    });

    return results
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 50);
  }, [entries, futureLog, projects, searchQuery]);

  // Monthly summaries — rolling quarterly (3 months)
  const quarterlySummaries = useMemo(() => {
    const now = new Date();
    const months = {};
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[mk] = { total: 0, open: 0, done: 0 };
    }
    entries.forEach(e => {
      if (!e.date) return;
      const mk = e.date.substring(0, 7);
      if (!months[mk]) return;
      months[mk].total++;
      if (e.type === 'task' && e.state === 'open') months[mk].open++;
      if (e.type === 'task' && e.state === 'complete') months[mk].done++;
    });
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, stats]) => ({ key, ...stats }));
  }, [entries]);

  // Current week
  const currentWeekKey = getWeekKey();
  const currentWeekData = weeklyIntentions[currentWeekKey] || null;
  const currentWeekAreas = currentWeekData ? currentWeekData.areas || [] : [];
  const currentWeekTotalTasks = currentWeekAreas.reduce((sum, a) => sum + (a.tasks || []).length, 0);
  const currentWeekDoneTasks = currentWeekAreas.reduce((sum, a) => sum + (a.tasks || []).filter(t => t.done).length, 0);

  const getCollectionName = (colId) => collections.find(c => c.id === colId)?.title;

  const navigateToEntry = (item) => {
    if (item._source === 'future') {
      navigation.navigate('FutureLog');
    } else if (item._source === 'project') {
      navigation.navigate('Projects', { projectId: item._projectId });
    } else if (item.collection) {
      navigation.navigate('Collections', { collectionId: item.collection });
    } else if (item.date) {
      setSelectedDate(item.date);
      navigation.navigate('Daily');
    }
  };

  const renderSearchEntry = ({ item }) => {
    const bulletConfig = item.type === 'task'
      ? TASK_STATES[item.state] || TASK_STATES.open
      : BULLET_TYPES[item.type] || BULLET_TYPES.task;
    const sig = item.signifier ? SIGNIFIERS[item.signifier] : null;
    const colName = item.collection ? getCollectionName(item.collection) : null;

    let metaText = '';
    if (item._source === 'future') {
      metaText = `Future · ${getMonthName(item._monthKey)}`;
    } else if (item._source === 'project') {
      metaText = `${item._projectEmoji} ${item._projectName}`;
    } else {
      metaText = item.date ? formatDateShort(item.date) : '';
      if (colName) metaText += ` · ${colName}`;
      if (item.source === 'monthly') metaText += ' · Monthly';
    }

    return (
      <TouchableOpacity
        style={[styles.entryRow, { borderBottomColor: colors.border }]}
        onPress={() => navigateToEntry(item)}
        activeOpacity={0.7}
      >
        <View style={styles.entryBulletCol}>
          {sig && <Text style={[styles.sig, { color: sig.color }]}>{sig.symbol}</Text>}
          <Text style={[styles.bullet, { color: bulletConfig.color }]}>{bulletConfig.symbol}</Text>
        </View>
        <View style={styles.entryContent}>
          <Text style={[
            styles.entryText,
            { color: colors.text },
            item.state === 'complete' && { color: colors.textMuted, textDecorationLine: 'line-through' },
          ]} numberOfLines={1}>
            {item.text}
          </Text>
          <Text style={[styles.entryMeta, { color: colors.textMuted }]}>
            {metaText}
          </Text>
        </View>
        <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>
    );
  };

  const isSearching = searchQuery.trim().length > 0;

  const toggleSection = (key) => {
    setExpandedSection(prev => prev === key ? null : key);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[colors.accent + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.title, { color: colors.text }]}>Index</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.bgInput }]}>
          <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search everything..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={colors.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={[styles.clearIcon, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isSearching ? (
        /* Search results */
        <FlatList
          data={searchResults}
          renderItem={renderSearchEntry}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>⌕</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results found</Text>
            </View>
          }
        />
      ) : (
        /* Dashboard */
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.dashboard}>

          {/* Goals */}
          {(goals || []).length > 0 && (
            <TouchableOpacity
              style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => toggleSection('goals')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>🎯</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Goals</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>{goals.length}</Text>
                </View>
              </View>
              {expandedSection === 'goals' && (
                <View style={styles.sectionBody}>
                  {goals.map(goal => {
                    const linked = projects.filter(p => goal.projectIds.includes(p.id));
                    const totalTasks = linked.reduce((s, p) => s + p.tasks.length, 0);
                    const doneTasks = linked.reduce((s, p) => s + p.tasks.filter(t => t.column === 'done').length, 0);
                    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
                    return (
                      <TouchableOpacity
                        key={goal.id}
                        style={[styles.itemRow, { borderBottomColor: colors.border }]}
                        onPress={() => navigation.navigate('Goals')}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.itemEmoji}>{goal.emoji}</Text>
                        <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>{goal.title}</Text>
                        {totalTasks > 0 && <Text style={[styles.itemMeta, { color: colors.accent }]}>{pct}%</Text>}
                        <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <TouchableOpacity
              style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => toggleSection('projects')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>🚀</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Projects</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>{projects.length}</Text>
                </View>
              </View>
              {expandedSection === 'projects' && (
                <View style={styles.sectionBody}>
                  {projects.map(project => {
                    const total = project.tasks.length;
                    const done = project.tasks.filter(t => t.column === 'done').length;
                    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                    return (
                      <TouchableOpacity
                        key={project.id}
                        style={[styles.itemRow, { borderBottomColor: colors.border }]}
                        onPress={() => navigation.navigate('Projects', { projectId: project.id })}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.accentDot, { backgroundColor: project.color }]} />
                        <Text style={styles.itemEmoji}>{project.emoji}</Text>
                        <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>{project.title}</Text>
                        <Text style={[styles.itemMeta, { color: colors.textMuted }]}>{progress}%</Text>
                        <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Monthly — Rolling Quarterly */}
          {quarterlySummaries.length > 0 && (
            <TouchableOpacity
              style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
              onPress={() => toggleSection('monthly')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>📅</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Quarterly</Text>
              </View>
              {expandedSection === 'monthly' && (
                <View style={styles.sectionBody}>
                  {quarterlySummaries.map(m => {
                    const label = getMonthName(m.key);
                    return (
                      <TouchableOpacity
                        key={m.key}
                        style={[styles.itemRow, { borderBottomColor: colors.border }]}
                        onPress={() => navigation.navigate('Monthly', { monthKey: m.key })}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemText, { color: colors.text }]}>{label}</Text>
                        <View style={styles.monthStats}>
                          {m.open > 0 && <Text style={[styles.monthStat, { color: colors.accentOrange }]}>{m.open} open</Text>}
                          {m.done > 0 && <Text style={[styles.monthStat, { color: colors.accentGreen }]}>{m.done} done</Text>}
                          <Text style={[styles.monthStat, { color: colors.textMuted }]}>{m.total} total</Text>
                        </View>
                        <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Weekly — Current Week */}
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => toggleSection('weekly')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionEmoji}>📋</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Weekly</Text>
              </View>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>This week</Text>
            </View>
            {expandedSection === 'weekly' && (
              <View style={styles.sectionBody}>
                {currentWeekAreas.length > 0 ? (
                  <>
                    {currentWeekAreas.map(area => (
                      <TouchableOpacity
                        key={area.id}
                        style={[styles.itemRow, { borderBottomColor: colors.border }]}
                        onPress={() => navigation.navigate('Weekly')}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>{area.name}</Text>
                        <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                          {(area.tasks || []).filter(t => t.done).length}/{(area.tasks || []).length}
                        </Text>
                        <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={[styles.weekSummary, { color: colors.textMuted }]}>
                      {currentWeekDoneTasks}/{currentWeekTotalTasks} tasks done
                    </Text>
                  </>
                ) : (
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>No intentions set this week</Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
      <KnowledgeBaseButton sectionId="index-search" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, position: 'relative',
  },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 12 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon: { fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, fontSize: SIZES.base },
  clearIcon: { fontSize: 14, padding: 4 },

  // Dashboard
  dashboard: { paddingHorizontal: 16, paddingTop: 4 },
  sectionCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionEmoji: { fontSize: 18 },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  countBadge: {
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
  },
  countText: { fontSize: SIZES.sm, fontWeight: '700' },
  sectionBody: { marginTop: 12 },

  // Item rows
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentDot: { width: 8, height: 8, borderRadius: 4 },
  itemEmoji: { fontSize: 20 },
  itemText: { flex: 1, fontSize: SIZES.md, fontWeight: '500' },
  itemMeta: { fontSize: SIZES.xs, fontWeight: '600' },

  // Entry rows (search results & open tasks)
  entryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  entryBulletCol: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 28 },
  sig: { fontSize: SIZES.xs, fontWeight: '700' },
  bullet: { fontSize: SIZES.sm, fontWeight: '700' },
  entryContent: { flex: 1 },
  entryText: { fontSize: SIZES.md, lineHeight: 20 },
  entryMeta: { fontSize: SIZES.xs, marginTop: 1 },
  entryArrow: { fontSize: 18, fontWeight: '300' },

  // Monthly stats
  monthStats: { flexDirection: 'row', gap: 8 },
  monthStat: { fontSize: SIZES.xs, fontWeight: '600' },

  moreText: { fontSize: SIZES.xs, textAlign: 'center', paddingVertical: 8 },
  sectionSubtitle: { fontSize: SIZES.xs, fontWeight: '600' },
  weekSummary: { fontSize: SIZES.xs, textAlign: 'center', paddingTop: 8 },
  emptyHint: { fontSize: SIZES.sm, paddingVertical: 8 },

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: SIZES.md },
});
