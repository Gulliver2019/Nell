import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { formatDateShort, getDateKey, getMonthName } from '../utils/storage';

export default function IndexScreen({ navigation }) {
  const { colors } = useTheme();
  const BULLET_TYPES = getBulletTypes(colors);
  const TASK_STATES = getTaskStates(colors);
  const SIGNIFIERS = getSignifiers(colors);
  const { entries, collections, projects, searchQuery, setSearchQuery, setSelectedDate } = useApp();
  const [expandedSection, setExpandedSection] = useState(null);

  const today = getDateKey();

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return entries
      .filter(e => e.text?.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 30);
  }, [entries, searchQuery]);

  // Open tasks across everything
  const openTasks = useMemo(() =>
    entries
      .filter(e => e.type === 'task' && e.state === 'open')
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [entries]
  );

  // Monthly summaries
  const monthlySummaries = useMemo(() => {
    const months = {};
    entries.forEach(e => {
      if (!e.date) return;
      const mk = e.date.substring(0, 7);
      if (!months[mk]) months[mk] = { total: 0, open: 0, done: 0 };
      months[mk].total++;
      if (e.type === 'task' && e.state === 'open') months[mk].open++;
      if (e.type === 'task' && e.state === 'complete') months[mk].done++;
    });
    return Object.entries(months)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 6)
      .map(([key, stats]) => ({ key, ...stats }));
  }, [entries]);

  const getCollectionName = (colId) => collections.find(c => c.id === colId)?.title;

  const navigateToEntry = (item) => {
    if (item.collection) {
      navigation.navigate('Collections');
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
            {item.date ? formatDateShort(item.date) : ''}{colName ? ` · ${colName}` : ''}
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

          {/* Open Tasks */}
          <TouchableOpacity
            style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            onPress={() => toggleSection('open')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Text style={[styles.sectionEmoji]}>○</Text>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Open Tasks</Text>
              </View>
              <View style={[styles.countBadge, { backgroundColor: openTasks.length > 0 ? colors.accentOrange + '20' : colors.bgElevated }]}>
                <Text style={[styles.countText, { color: openTasks.length > 0 ? colors.accentOrange : colors.textMuted }]}>
                  {openTasks.length}
                </Text>
              </View>
            </View>
            {expandedSection === 'open' && openTasks.length > 0 && (
              <View style={styles.sectionBody}>
                {openTasks.slice(0, 10).map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.entryRow, { borderBottomColor: colors.border }]}
                    onPress={() => navigateToEntry(item)}
                  >
                    <View style={styles.entryBulletCol}>
                      <Text style={[styles.bullet, { color: TASK_STATES.open.color }]}>{TASK_STATES.open.symbol}</Text>
                    </View>
                    <View style={styles.entryContent}>
                      <Text style={[styles.entryText, { color: colors.text }]} numberOfLines={1}>{item.text}</Text>
                      <Text style={[styles.entryMeta, { color: colors.textMuted }]}>{item.date ? formatDateShort(item.date) : ''}</Text>
                    </View>
                    <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
                {openTasks.length > 10 && (
                  <Text style={[styles.moreText, { color: colors.textMuted }]}>
                    +{openTasks.length - 10} more
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          {/* Projects */}
          {projects.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>🚀</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Projects</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>{projects.length}</Text>
                </View>
              </View>
              {projects.map(project => {
                const total = project.tasks.length;
                const done = project.tasks.filter(t => t.column === 'done').length;
                const progress = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <TouchableOpacity
                    key={project.id}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('Projects')}
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

          {/* Collections */}
          {collections.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>📋</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Collections</Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgElevated }]}>
                  <Text style={[styles.countText, { color: colors.textMuted }]}>{collections.length}</Text>
                </View>
              </View>
              {collections.map(col => {
                const colEntries = entries.filter(e => e.collection === col.id);
                return (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('Collections')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.itemText, { color: colors.text }]} numberOfLines={1}>{col.title}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>{colEntries.length} items</Text>
                    <Text style={[styles.entryArrow, { color: colors.textMuted }]}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Monthly Overview */}
          {monthlySummaries.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <View style={[styles.sectionHeader, { marginBottom: 8 }]}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionEmoji}>📅</Text>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>Monthly</Text>
                </View>
              </View>
              {monthlySummaries.map(m => {
                const label = getMonthName(m.key);
                return (
                  <TouchableOpacity
                    key={m.key}
                    style={[styles.itemRow, { borderBottomColor: colors.border }]}
                    onPress={() => navigation.navigate('Monthly')}
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

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
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

  list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: SIZES.md },
});
