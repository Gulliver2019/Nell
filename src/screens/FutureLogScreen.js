import React, { useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, BULLET_TYPES } from '../utils/theme';
import { useApp } from '../context/AppContext';
import { getMonthKey, getMonthName } from '../utils/storage';

export default function FutureLogScreen() {
  const { futureLog, addFutureLogEntry, removeFutureLogEntry } = useApp();
  const [newTexts, setNewTexts] = useState({});
  const [newTypes, setNewTypes] = useState({});

  // Generate next 6 months
  const months = useMemo(() => {
    const result = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      result.push(getMonthKey(d));
    }
    return result;
  }, []);

  const handleAdd = async (monthKey) => {
    const text = newTexts[monthKey]?.trim();
    if (!text) return;
    await addFutureLogEntry(monthKey, {
      text,
      type: newTypes[monthKey] || 'task',
    });
    setNewTexts(prev => ({ ...prev, [monthKey]: '' }));
  };

  const handleRemove = (monthKey, entryId) => {
    Alert.alert('Remove', 'Delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeFutureLogEntry(monthKey, entryId) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[COLORS.accentGold + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.title}>Future Log</Text>
        <Text style={styles.subtitle}>Plan ahead, dream big</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {months.map(monthKey => {
          const monthEntries = futureLog[monthKey] || [];
          const type = newTypes[monthKey] || 'task';
          const bullet = BULLET_TYPES[type];

          return (
            <View key={monthKey} style={styles.monthCard}>
              <LinearGradient
                colors={[COLORS.bgElevated, COLORS.bgCard]}
                style={styles.cardGradient}
              >
                <Text style={styles.monthTitle}>{getMonthName(monthKey)}</Text>

                {monthEntries.map(entry => (
                  <TouchableOpacity
                    key={entry.id}
                    style={styles.entryRow}
                    onLongPress={() => handleRemove(monthKey, entry.id)}
                  >
                    <Text style={[styles.entryBullet, { color: BULLET_TYPES[entry.type]?.color || COLORS.text }]}>
                      {BULLET_TYPES[entry.type]?.symbol || '•'}
                    </Text>
                    <Text style={styles.entryText}>{entry.text}</Text>
                  </TouchableOpacity>
                ))}

                {/* Add new */}
                <View style={styles.addRow}>
                  <TouchableOpacity
                    onPress={() => {
                      const types = ['task', 'event', 'note'];
                      const next = types[(types.indexOf(type) + 1) % types.length];
                      setNewTypes(prev => ({ ...prev, [monthKey]: next }));
                    }}
                    style={styles.typeBtn}
                  >
                    <Text style={[styles.typeText, { color: bullet.color }]}>{bullet.symbol}</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={styles.input}
                    placeholder="Add entry..."
                    placeholderTextColor={COLORS.textMuted}
                    value={newTexts[monthKey] || ''}
                    onChangeText={t => setNewTexts(prev => ({ ...prev, [monthKey]: t }))}
                    onSubmitEditing={() => handleAdd(monthKey)}
                    returnKeyType="done"
                    selectionColor={COLORS.accent}
                  />
                </View>
              </LinearGradient>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  title: { color: COLORS.text, fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { color: COLORS.textMuted, fontSize: SIZES.md, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },
  monthCard: {
    marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden',
  },
  cardGradient: {
    padding: 16, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  monthTitle: {
    color: COLORS.accentGold, fontSize: SIZES.lg, fontWeight: '700',
    marginBottom: 12, letterSpacing: 0.5,
  },
  entryRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 8,
  },
  entryBullet: { fontSize: SIZES.base, fontWeight: '700', width: 20, textAlign: 'center', lineHeight: 22 },
  entryText: { flex: 1, color: COLORS.text, fontSize: SIZES.md, lineHeight: 22 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  typeBtn: { width: 28, alignItems: 'center' },
  typeText: { fontSize: SIZES.lg, fontWeight: '700' },
  input: {
    flex: 1, color: COLORS.text, fontSize: SIZES.md, paddingVertical: 4,
  },
});
