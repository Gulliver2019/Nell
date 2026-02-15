import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES, getTaskStates } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getMonthKey, getMonthName, getDateKey, formatDateShort } from '../utils/storage';

export default function MonthlyLogScreen() {
  const { colors } = useTheme();
  const TASK_STATES = getTaskStates(colors);
  const { entries, setSelectedDate } = useApp();
  const [currentMonth, setCurrentMonth] = useState(getMonthKey());

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
    // Pad start
    for (let i = 0; i < firstDay; i++) days.push(null);
    
    for (let d = 1; d <= daysInMonth; d++) {
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEntries = entries.filter(e => e.date === dateKey && !e.collection);
      const tasks = dayEntries.filter(e => e.type === 'task');
      const completed = tasks.filter(t => t.state === 'complete').length;
      const total = tasks.length;

      days.push({
        day: d,
        dateKey,
        isToday: dateKey === today,
        entryCount: dayEntries.length,
        taskCount: total,
        completedCount: completed,
        hasEvents: dayEntries.some(e => e.type === 'event'),
        hasPriority: dayEntries.some(e => e.signifier === 'priority'),
      });
    }
    return days;
  }, [currentMonth, entries]);

  // Month tasks overview
  const monthTasks = useMemo(() => {
    return entries
      .filter(e => e.date && e.date.startsWith(currentMonth) && e.type === 'task' && !e.collection)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [entries, currentMonth]);

  const monthStats = useMemo(() => {
    const tasks = monthTasks;
    return {
      total: tasks.length,
      done: tasks.filter(t => t.state === 'complete').length,
      open: tasks.filter(t => t.state === 'open').length,
      migrated: tasks.filter(t => t.state === 'migrated').length,
    };
  }, [monthTasks]);

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
              { label: 'Tasks', value: monthStats.total, color: colors.text },
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

        {/* Calendar Grid */}
        <View style={styles.calendar}>
          {/* Weekday headers */}
          <View style={styles.weekRow}>
            {weekDays.map((d, i) => (
              <View key={i} style={styles.weekCell}>
                <Text style={[styles.weekDay, { color: colors.textMuted }]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Days grid */}
          <View style={styles.daysGrid}>
            {calendarData.map((day, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.dayCell,
                  day?.isToday && [styles.dayCellToday, { backgroundColor: colors.accent + '20' }],
                ]}
                disabled={!day}
                onPress={() => day && setSelectedDate(day.dateKey)}
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
                    {/* Activity indicators */}
                    <View style={styles.dayDots}>
                      {day.taskCount > 0 && (
                        <View style={[
                          styles.dot,
                          {
                            backgroundColor: day.completedCount === day.taskCount
                              ? colors.accentGreen
                              : colors.accent,
                          },
                        ]} />
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

        {/* Task List */}
        <View style={styles.taskList}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Task Overview</Text>
          {monthTasks.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No tasks this month</Text>
          ) : (
            monthTasks.map(task => (
              <View key={task.id} style={[styles.taskRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.taskDate, { color: colors.textMuted }]}>
                  {formatDateShort(task.date)}
                </Text>
                <Text style={[styles.taskBullet, { color: TASK_STATES[task.state].color }]}>
                  {TASK_STATES[task.state].symbol}
                </Text>
                <Text
                  style={[
                    styles.taskText,
                    { color: colors.text },
                    task.state === 'complete' && { color: colors.textMuted, textDecorationLine: 'line-through' },
                  ]}
                  numberOfLines={1}
                >
                  {task.text}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  dayCellToday: {
    borderRadius: SIZES.radius,
  },
  dayNum: { fontSize: SIZES.md, fontWeight: '500' },
  dayDots: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  taskList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12,
  },
  emptyText: { fontSize: SIZES.md },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  taskDate: { fontSize: SIZES.xs, width: 48, fontWeight: '500' },
  taskBullet: { fontSize: SIZES.base, fontWeight: '700', width: 20, textAlign: 'center' },
  taskText: { flex: 1, fontSize: SIZES.md },
});
