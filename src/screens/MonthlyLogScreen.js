import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, getBulletTypes, getTaskStates, getSignifiers } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getMonthKey, getMonthName, getDateKey } from '../utils/storage';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthlyLogScreen({ route }) {
  const { colors } = useTheme();
  const TASK_STATES = getTaskStates(colors);
  const BULLET_TYPES = getBulletTypes(colors);
  const SIGNIFIERS = getSignifiers(colors);
  const { entries, goals, addEntry, updateEntry } = useApp();
  const [currentMonth, setCurrentMonth] = useState(getMonthKey());
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [addingToDay, setAddingToDay] = useState(null);
  const [convertEntry, setConvertEntry] = useState(null);
  const [convertDate, setConvertDate] = useState(new Date());

  // Deep-link: jump to specific month from route params
  React.useEffect(() => {
    if (route?.params?.monthKey) {
      setCurrentMonth(route.params.monthKey);
    }
  }, [route?.params?.monthKey]);

  const goMonth = (offset) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + offset, 1);
    setCurrentMonth(getMonthKey(d));
  };

  // Calendar data
  const calendarData = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = getDateKey();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEntries = entries.filter(e => e.date === dateKey && !e.collection && e.source === 'monthly');
      const tasks = dayEntries.filter(e => e.type === 'task');
      const completed = tasks.filter(t => t.state === 'complete').length;

      days.push({
        day: d,
        dateKey,
        isToday: dateKey === today,
        entryCount: dayEntries.length,
        taskCount: tasks.length,
        completedCount: completed,
        hasEvents: dayEntries.some(e => e.type === 'event'),
        hasPriority: dayEntries.some(e => e.signifier === 'priority'),
      });
    }
    return days;
  }, [currentMonth, entries]);

  // Day-by-day list: all days of month with their entries
  const daysList = useMemo(() => {
    const [year, month] = currentMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = getDateKey();
    const result = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = new Date(year, month - 1, d).getDay();
      const dayEntries = entries
        .filter(e => e.date === dateKey && !e.collection && e.source === 'monthly')
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

      result.push({
        day: d,
        dateKey,
        dayName: DAY_NAMES[dayOfWeek],
        isToday: dateKey === today,
        entries: dayEntries,
      });
    }
    return result;
  }, [currentMonth, entries]);

  const monthStats = useMemo(() => {
    const allEntries = entries.filter(e => e.date && e.date.startsWith(currentMonth) && !e.collection && e.source === 'monthly');
    const tasks = allEntries.filter(e => e.type === 'task');
    return {
      total: allEntries.length,
      done: tasks.filter(t => t.state === 'complete').length,
      open: tasks.filter(t => t.state === 'open').length,
      migrated: tasks.filter(t => t.state === 'migrated').length,
    };
  }, [entries, currentMonth]);

  // Check if an entry already exists on the daily (not a monthly source)
  const isOnDaily = useCallback((entry) => {
    return !entry.source || entry.source === 'daily';
  }, []);

  const handleAddToDaily = useCallback(async (entry) => {
    // Open date picker modal
    setConvertEntry(entry);
    setConvertDate(entry.date ? new Date(entry.date + 'T00:00:00') : new Date());
  }, []);

  const confirmConvertToDaily = useCallback(async () => {
    if (!convertEntry) return;
    const { id, source, createdAt, ...rest } = convertEntry;
    const y = convertDate.getFullYear();
    const m = String(convertDate.getMonth() + 1).padStart(2, '0');
    const d = String(convertDate.getDate()).padStart(2, '0');
    const targetDate = `${y}-${m}-${d}`;
    await addEntry({ ...rest, date: targetDate, source: 'daily' });
    await updateEntry(id, { _addedToDaily: true });
    setConvertEntry(null);
    Alert.alert('Added', `"${convertEntry.text}" added to daily for ${targetDate}`);
  }, [convertEntry, convertDate, addEntry, updateEntry]);

  const getBullet = (entry) => {
    if (entry.type === 'task') {
      const st = TASK_STATES[entry.state] || TASK_STATES.open;
      return { symbol: st.symbol, color: st.color };
    }
    const bt = BULLET_TYPES[entry.type] || BULLET_TYPES.task;
    return { symbol: bt.symbol, color: bt.color };
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Monthly focuses from goals
  const monthlyFocuses = useMemo(() => {
    const focuses = [];
    (goals || []).forEach(goal => {
      (goal.monthlyFocuses || []).forEach(f => {
        if (f.monthKey === currentMonth) {
          focuses.push({ ...f, goalEmoji: goal.emoji, goalTitle: goal.title, goalColor: goal.color });
        }
      });
    });
    return focuses;
  }, [goals, currentMonth]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.accentSecondary + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => goMonth(-1)} style={styles.navBtn}>
              <Text style={[styles.navArrow, { color: colors.accentSecondary }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{getMonthName(currentMonth)}</Text>
            <TouchableOpacity onPress={() => goMonth(1)} style={styles.navBtn}>
              <Text style={[styles.navArrow, { color: colors.accentSecondary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={[styles.statsRow, { backgroundColor: colors.bgCard }]}>
            {[
              { label: 'Items', value: monthStats.total, color: colors.text },
              { label: 'Done', value: monthStats.done, color: colors.accentGreen },
              { label: 'Open', value: monthStats.open, color: colors.accentGold },
              { label: 'Moved', value: monthStats.migrated, color: colors.accentOrange },
            ].map(s => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Monthly Focus Banner */}
        {monthlyFocuses.length > 0 && (
          <View style={[styles.focusBanner, { backgroundColor: colors.accent + '12', borderColor: colors.accent + '30' }]}>
            <Text style={[styles.focusBannerTitle, { color: colors.accent }]}>MONTHLY FOCUS MOTHER FUCKER</Text>
            {monthlyFocuses.map(f => (
              <View key={f.id} style={[styles.focusBannerItem, { backgroundColor: f.goalColor + '15' }]}>
                <Text style={[styles.focusBannerEmoji]}>{f.goalEmoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.focusBannerText, { color: colors.text }]}>{f.text}</Text>
                  <Text style={[styles.focusBannerGoal, { color: colors.textMuted }]}>{f.goalTitle}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {weekDays.map((d, i) => (
              <View key={i} style={styles.weekCell}>
                <Text style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
              </View>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {calendarData.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayCell,
                  day?.isToday && [styles.dayCellToday, { backgroundColor: colors.accent + '20' }],
                ]}
                disabled={!day}
                onPress={() => {
                  if (day) {
                    setAddingToDay(day.dateKey);
                    setEditingEntry(null);
                    setFlyoutVisible(true);
                  }
                }}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dayNum,
                      { color: colors.textSecondary },
                      day.isToday && { color: colors.accent, fontWeight: '700' },
                      day.entryCount > 0 && { color: colors.text, fontWeight: '600' },
                    ]}>
                      {day.day}
                    </Text>
                    <View style={styles.dayDots}>
                      {day.taskCount > 0 && (
                        <View style={[styles.dot, {
                          backgroundColor: day.completedCount === day.taskCount
                            ? colors.accentGreen : colors.accent,
                        }]} />
                      )}
                      {day.hasEvents && <View style={[styles.dot, { backgroundColor: colors.accentSecondary }]} />}
                      {day.hasPriority && <View style={[styles.dot, { backgroundColor: colors.accentRed }]} />}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Day-by-day list */}
        <View style={styles.dayList}>
          {daysList.map(day => (
            <View key={day.dateKey} style={[styles.daySection, day.isToday && { backgroundColor: colors.accent + '08' }]}>
              {/* Day header */}
              <View style={[styles.dayHeader, { borderBottomColor: colors.border }]}>
                <Text style={[
                  styles.dayHeaderNum,
                  { color: day.isToday ? colors.accent : colors.text },
                ]}>
                  {day.day}
                </Text>
                <Text style={[
                  styles.dayHeaderName,
                  { color: day.isToday ? colors.accent : colors.textMuted },
                ]}>
                  {day.dayName}
                </Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={[styles.addDayBtn, { backgroundColor: colors.accent + '15' }]}
                  onPress={() => { setAddingToDay(day.dateKey); setEditingEntry(null); setFlyoutVisible(true); }}
                >
                  <Text style={[styles.addDayBtnText, { color: colors.accent }]}>+</Text>
                </TouchableOpacity>
              </View>

              {/* Entries for this day */}
              {day.entries.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Text style={[styles.emptyDayText, { color: colors.textMuted }]}>—</Text>
                </View>
              ) : (
                day.entries.map(entry => {
                  const bullet = getBullet(entry);
                  const sig = entry.signifier ? SIGNIFIERS[entry.signifier] : null;
                  const onDaily = isOnDaily(entry) || entry._addedToDaily;

                  return (
                    <View key={entry.id} style={[styles.entryRow, { borderBottomColor: colors.border }]}>
                      {sig && (
                        <Text style={[styles.sigSymbol, { color: sig.color }]}>{sig.symbol}</Text>
                      )}
                      <Text style={[styles.entryBullet, { color: bullet.color }]}>{bullet.symbol}</Text>
                      <TouchableOpacity
                        style={{ flex: 1 }}
                        onPress={() => { setEditingEntry(entry); setAddingToDay(null); setFlyoutVisible(true); }}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.entryText,
                            { color: colors.text },
                            entry.state === 'complete' && { color: colors.textMuted, textDecorationLine: 'line-through' },
                          ]}
                          numberOfLines={2}
                        >
                          {entry.text}
                        </Text>
                      </TouchableOpacity>

                      {/* Add to Daily button — only for monthly-source entries not yet added */}
                      {entry.source === 'monthly' && !entry._addedToDaily && (
                        <TouchableOpacity
                          style={[styles.addToDailyBtn, { backgroundColor: colors.accentGreen + '18' }]}
                          onPress={() => handleAddToDaily(entry)}
                        >
                          <Text style={[styles.addToDailyText, { color: colors.accentGreen }]}>→ Daily</Text>
                        </TouchableOpacity>
                      )}
                      {entry._addedToDaily && (
                        <Text style={[styles.addedBadge, { color: colors.textMuted }]}>✓ added</Text>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB onPress={() => { setEditingEntry(null); setAddingToDay(null); setFlyoutVisible(true); }} />
      <EntryFormFlyout
        visible={flyoutVisible}
        onClose={() => { setFlyoutVisible(false); setEditingEntry(null); setAddingToDay(null); }}
        onSubmit={async (data) => {
          if (data.id) {
            const { id, ...updates } = data;
            await updateEntry(id, updates);
          } else {
            // If adding to a specific day, set date and source
            const date = addingToDay || data.date;
            await addEntry({ ...data, date, source: addingToDay ? 'monthly' : (data.source || 'monthly') });
          }
          setAddingToDay(null);
        }}
        entry={editingEntry}
        visibleFields={addingToDay ? ['text', 'type', 'signifier'] : ['text', 'type', 'signifier', 'date']}
      />

      {/* Convert to Daily date picker modal */}
      <Modal visible={!!convertEntry} transparent animationType="fade">
        <View style={styles.convertOverlay}>
          <View style={[styles.convertModal, { backgroundColor: colors.bgCard }]}>
            <Text style={[styles.convertTitle, { color: colors.text }]}>Add to Daily</Text>
            <Text style={[styles.convertSubtitle, { color: colors.textMuted }]} numberOfLines={2}>
              {convertEntry?.text}
            </Text>
            <Text style={[styles.convertLabel, { color: colors.textSecondary }]}>Pick a date:</Text>
            <DateTimePicker
              value={convertDate}
              mode="date"
              display="inline"
              themeVariant="dark"
              accentColor={colors.accent}
              onChange={(event, selected) => {
                if (selected) setConvertDate(selected);
              }}
            />
            <View style={styles.convertActions}>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.bgInput }]}
                onPress={() => setConvertEntry(null)}
              >
                <Text style={[styles.convertBtnText, { color: colors.textMuted }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.convertBtn, { backgroundColor: colors.accentGreen }]}
                onPress={confirmConvertToDaily}
              >
                <Text style={[styles.convertBtnText, { color: '#fff' }]}>Add to Daily</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <KnowledgeBaseButton sectionId="monthly-log" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow: { fontSize: 32, fontWeight: '300' },
  monthTitle: { fontSize: SIZES.xxl, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 16,
    borderRadius: SIZES.radius, padding: 12,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: SIZES.xxl, fontWeight: '700' },
  statLabel: { fontSize: SIZES.xs, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  calendar: { paddingHorizontal: 16, marginTop: 8 },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  weekDay: { fontSize: SIZES.xs, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    padding: 2,
  },
  dayCellToday: { borderRadius: SIZES.radius },
  dayNum: { fontSize: SIZES.md, fontWeight: '500' },
  dayDots: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 4, height: 4, borderRadius: 2 },

  // Day-by-day list
  dayList: { paddingHorizontal: 16, paddingTop: 16 },
  daySection: { marginBottom: 4, borderRadius: SIZES.radius, overflow: 'hidden' },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, gap: 6,
  },
  dayHeaderNum: { fontSize: SIZES.lg, fontWeight: '700', minWidth: 32 },
  dayHeaderName: { fontSize: SIZES.sm, fontWeight: '600' },
  addDayBtn: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  addDayBtnText: { fontSize: 18, fontWeight: '600', lineHeight: 20 },
  emptyDay: { paddingVertical: 4, paddingLeft: 38 },
  emptyDayText: { fontSize: SIZES.sm },

  entryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 6,
    paddingLeft: 8, paddingRight: 4, gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sigSymbol: { fontSize: SIZES.sm, fontWeight: '700', width: 14, textAlign: 'center' },
  entryBullet: { fontSize: SIZES.base, fontWeight: '700', width: 18, textAlign: 'center' },
  entryText: { fontSize: SIZES.md },

  addToDailyBtn: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  addToDailyText: { fontSize: SIZES.xs, fontWeight: '700' },
  addedBadge: { fontSize: SIZES.xs, fontWeight: '500', marginLeft: 4 },

  // Convert to Daily modal
  convertOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20,
  },
  convertModal: {
    borderRadius: 20, padding: 20,
  },
  convertTitle: {
    fontSize: SIZES.xl, fontWeight: '700', textAlign: 'center', marginBottom: 4,
  },
  convertSubtitle: {
    fontSize: SIZES.sm, textAlign: 'center', marginBottom: 12,
  },
  convertLabel: {
    fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
  },
  convertActions: {
    flexDirection: 'row', gap: 12, marginTop: 16,
  },
  convertBtn: {
    flex: 1, paddingVertical: 12, borderRadius: SIZES.radius, alignItems: 'center',
  },
  convertBtnText: {
    fontSize: SIZES.base, fontWeight: '700',
  },
  // Monthly Focus Banner
  focusBanner: {
    marginHorizontal: 16, marginBottom: 12, borderRadius: 14,
    borderWidth: 1, padding: 14, overflow: 'hidden',
  },
  focusBannerTitle: {
    fontSize: SIZES.sm, fontWeight: '900', letterSpacing: 1.5,
    textAlign: 'center', marginBottom: 10,
  },
  focusBannerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderRadius: 10, marginBottom: 6,
  },
  focusBannerEmoji: { fontSize: 22 },
  focusBannerText: { fontSize: SIZES.base, fontWeight: '700' },
  focusBannerGoal: { fontSize: SIZES.xs, marginTop: 1 },
});
