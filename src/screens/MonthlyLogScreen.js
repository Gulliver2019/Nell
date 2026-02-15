import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, TASK_STATES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { getMonthKey, getMonthName, getDateKey, formatDateShort } from '../utils/storage';

export default function MonthlyLogScreen() {
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
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[COLORS.accentSecondary + '15', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => goMonth(-1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{getMonthName(currentMonth)}</Text>
            <TouchableOpacity onPress={() => goMonth(1)} style={styles.navBtn}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {[
              { label: 'Tasks', value: monthStats.total, color: COLORS.text },
              { label: 'Crushed', value: monthStats.done, color: COLORS.accentGreen },
              { label: 'Open', value: monthStats.open, color: COLORS.accentGold },
              { label: 'Moved', value: monthStats.migrated, color: COLORS.accentOrange },
            ].map(s => (
              <View key={s.label} style={styles.statItem}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
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
                <Text style={styles.weekDay}>{d}</Text>
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
                  day?.isToday && styles.dayCellToday,
                ]}
                disabled={!day}
                onPress={() => day && setSelectedDate(day.dateKey)}
              >
                {day && (
                  <>
                    <Text style={[
                      styles.dayNum,
                      day.isToday && styles.dayNumToday,
                      day.entryCount > 0 && styles.dayNumActive,
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
                              ? COLORS.accentGreen
                              : COLORS.accent,
                          },
                        ]} />
                      )}
                      {day.hasEvents && <View style={[styles.dot, { backgroundColor: COLORS.accentSecondary }]} />}
                      {day.hasPriority && <View style={[styles.dot, { backgroundColor: COLORS.accentRed }]} />}
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Task List */}
        <View style={styles.taskList}>
          <Text style={styles.sectionTitle}>Task Overview</Text>
          {monthTasks.length === 0 ? (
            <Text style={styles.emptyText}>No tasks this month</Text>
          ) : (
            monthTasks.map(task => (
              <View key={task.id} style={styles.taskRow}>
                <Text style={[styles.taskDate, { color: COLORS.textMuted }]}>
                  {formatDateShort(task.date)}
                </Text>
                <Text style={[styles.taskBullet, { color: TASK_STATES[task.state].color }]}>
                  {TASK_STATES[task.state].symbol}
                </Text>
                <Text
                  style={[
                    styles.taskText,
                    task.state === 'complete' && styles.taskDone,
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
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  navArrow: { color: COLORS.accentSecondary, fontSize: 32, fontWeight: '300' },
  monthTitle: { color: COLORS.text, fontSize: SIZES.xxl, fontWeight: '700' },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around', marginTop: 16,
    backgroundColor: COLORS.bgCard, borderRadius: SIZES.radius, padding: 12,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: SIZES.xxl, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
  calendar: { paddingHorizontal: 16, marginTop: 8 },
  weekRow: { flexDirection: 'row' },
  weekCell: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  weekDay: { color: COLORS.textMuted, fontSize: SIZES.xs, fontWeight: '600' },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    padding: 2,
  },
  dayCellToday: {
    backgroundColor: COLORS.accent + '20', borderRadius: SIZES.radius,
  },
  dayNum: { color: COLORS.textSecondary, fontSize: SIZES.md, fontWeight: '500' },
  dayNumToday: { color: COLORS.accent, fontWeight: '700' },
  dayNumActive: { color: COLORS.text, fontWeight: '600' },
  dayDots: { flexDirection: 'row', gap: 2, marginTop: 2, height: 6 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  taskList: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40 },
  sectionTitle: {
    color: COLORS.text, fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12,
  },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.md },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
    gap: 8,
  },
  taskDate: { fontSize: SIZES.xs, width: 48, fontWeight: '500' },
  taskBullet: { fontSize: SIZES.base, fontWeight: '700', width: 20, textAlign: 'center' },
  taskText: { flex: 1, color: COLORS.text, fontSize: SIZES.md },
  taskDone: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
});
