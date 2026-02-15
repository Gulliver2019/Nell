import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, TASK_STATES, BULLET_TYPES, SIGNIFIERS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { formatDateShort, getDateKey } from '../utils/storage';

export default function IndexScreen({ navigation }) {
  const { entries, collections, searchQuery, setSearchQuery, setSelectedDate } = useApp();
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredEntries = useMemo(() => {
    let results = [...entries];
    
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(e => e.text?.toLowerCase().includes(q));
    }

    // Type filter
    if (activeFilter === 'tasks') results = results.filter(e => e.type === 'task');
    if (activeFilter === 'events') results = results.filter(e => e.type === 'event');
    if (activeFilter === 'notes') results = results.filter(e => e.type === 'note');
    if (activeFilter === 'priority') results = results.filter(e => e.signifier === 'priority');
    if (activeFilter === 'open') results = results.filter(e => e.type === 'task' && e.state === 'open');

    return results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [entries, searchQuery, activeFilter]);

  const filters = [
    { key: 'all', label: 'All', count: entries.length },
    { key: 'open', label: 'Open', count: entries.filter(e => e.type === 'task' && e.state === 'open').length },
    { key: 'tasks', label: 'Tasks', count: entries.filter(e => e.type === 'task').length },
    { key: 'events', label: 'Events', count: entries.filter(e => e.type === 'event').length },
    { key: 'notes', label: 'Notes', count: entries.filter(e => e.type === 'note').length },
    { key: 'priority', label: '! Priority', count: entries.filter(e => e.signifier === 'priority').length },
  ];

  const getCollectionName = (colId) => {
    return collections.find(c => c.id === colId)?.title;
  };

  const renderEntry = ({ item }) => {
    const bulletConfig = item.type === 'task'
      ? TASK_STATES[item.state] || TASK_STATES.open
      : BULLET_TYPES[item.type] || BULLET_TYPES.task;
    const sig = item.signifier ? SIGNIFIERS[item.signifier] : null;
    const colName = item.collection ? getCollectionName(item.collection) : null;

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => {
          if (item.date) setSelectedDate(item.date);
        }}
      >
        <View style={styles.entryHeader}>
          <View style={styles.entryBulletRow}>
            {sig && (
              <Text style={[styles.sig, { color: sig.color }]}>{sig.symbol}</Text>
            )}
            <Text style={[styles.bullet, { color: bulletConfig.color }]}>
              {bulletConfig.symbol}
            </Text>
          </View>
          <Text style={styles.entryDate}>
            {item.date ? formatDateShort(item.date) : ''}
          </Text>
        </View>
        <Text style={[
          styles.entryText,
          item.state === 'complete' && styles.entryTextDone,
        ]} numberOfLines={2}>
          {item.text}
        </Text>
        {colName && (
          <View style={styles.colTag}>
            <Text style={styles.colTagText}>{colName}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[COLORS.accent + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.title}>Index</Text>
        <Text style={styles.subtitle}>{entries.length} entries</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search everything..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            selectionColor={COLORS.accent}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(f.key)}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, activeFilter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
              <Text style={[styles.filterCount, activeFilter === f.key && styles.filterCountActive]}>
                {f.count}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={f => f.key}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>⌕</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No results found' : 'No entries yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, position: 'relative',
  },
  title: { color: COLORS.text, fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: SIZES.md, marginTop: 2 },
  searchContainer: { paddingHorizontal: 16, paddingBottom: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    paddingHorizontal: 12, height: 44,
  },
  searchIcon: { color: COLORS.textMuted, fontSize: 18, marginRight: 8 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: SIZES.base },
  clearIcon: { color: COLORS.textMuted, fontSize: 14, padding: 4 },
  filterRow: { marginBottom: 4 },
  filterList: { paddingHorizontal: 16, gap: 6 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: COLORS.bgInput,
  },
  filterChipActive: {
    backgroundColor: COLORS.accent + '25', borderWidth: 1, borderColor: COLORS.accent,
  },
  filterText: { color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '600' },
  filterTextActive: { color: COLORS.accent },
  filterCount: {
    color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '700',
    backgroundColor: COLORS.bgElevated, paddingHorizontal: 6, paddingVertical: 1,
    borderRadius: 8, overflow: 'hidden',
  },
  filterCountActive: { backgroundColor: COLORS.accent + '30', color: COLORS.accent },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, flexGrow: 1 },
  entryCard: {
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radius,
    padding: 12, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  entryHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 4,
  },
  entryBulletRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sig: { fontSize: SIZES.sm, fontWeight: '700' },
  bullet: { fontSize: SIZES.base, fontWeight: '700' },
  entryDate: { color: COLORS.textMuted, fontSize: SIZES.xs },
  entryText: { color: COLORS.text, fontSize: SIZES.md, lineHeight: 20 },
  entryTextDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  colTag: {
    marginTop: 6, backgroundColor: COLORS.bgElevated, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
  },
  colTagText: { color: COLORS.textSecondary, fontSize: SIZES.xs },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, color: COLORS.textMuted, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.md },
});
