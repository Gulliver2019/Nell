import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
  Alert, Animated, Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = 'crushedit_shopping';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🛒' },
  { key: 'produce', label: 'Produce', icon: '🥦' },
  { key: 'meat', label: 'Meat', icon: '🥩' },
  { key: 'bakery', label: 'Bakery', icon: '🍞' },
  { key: 'medicine', label: 'Medicine', icon: '💊' },
  { key: 'readymeals', label: 'Ready Meals', icon: '🍱' },
  { key: 'cookemeats', label: 'Cooke Meats', icon: '🍗' },
  { key: 'dairy', label: 'Dairy', icon: '🧀' },
  { key: 'sauces', label: 'Sauces', icon: '🫙' },
  { key: 'beverages', label: 'Beverages', icon: '🥤' },
  { key: 'goodies', label: 'Goodies', icon: '🍫' },
  { key: 'pet', label: 'Pet', icon: '🐾' },
  { key: 'household', label: 'Household', icon: '🏠' },
];

const CATEGORY_MAP = {};
CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c; });

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('produce');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // Save
  const persist = useCallback(async (newItems) => {
    setItems(newItems);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems)); } catch (e) { /* ignore */ }
  }, []);

  // Add item
  const handleAdd = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newItem = {
      id: generateId(),
      text: trimmed,
      category: selectedCategory,
      quantity: 1,
      checked: false,
      createdAt: new Date().toISOString(),
    };
    persist([newItem, ...items]);
    setText('');
    Keyboard.dismiss();
  }, [text, selectedCategory, items, persist]);

  // Toggle checked
  const toggleCheck = useCallback((id) => {
    Haptics.selectionAsync();
    persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }, [items, persist]);

  // Update quantity
  const updateQuantity = useCallback((id, delta) => {
    Haptics.selectionAsync();
    persist(items.map(i => {
      if (i.id !== id) return i;
      const q = Math.max(1, (i.quantity || 1) + delta);
      return { ...i, quantity: q };
    }));
  }, [items, persist]);

  // Delete item
  const deleteItem = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    persist(items.filter(i => i.id !== id));
  }, [items, persist]);

  // Clear checked
  const clearChecked = useCallback(() => {
    const checkedCount = items.filter(i => i.checked).length;
    if (checkedCount === 0) return;
    Alert.alert(
      'Clear Checked',
      `Remove ${checkedCount} checked item${checkedCount > 1 ? 's' : ''}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          persist(items.filter(i => !i.checked));
        }},
      ]
    );
  }, [items, persist]);

  // Filtered & sorted: unchecked first, then checked at bottom
  const displayItems = useMemo(() => {
    let filtered = items;
    if (filterCategory !== 'all') {
      filtered = filtered.filter(i => i.category === filterCategory);
    }
    const unchecked = filtered.filter(i => !i.checked);
    const checked = filtered.filter(i => i.checked);
    return [...unchecked, ...checked];
  }, [items, filterCategory]);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;

  const renderItem = useCallback(({ item }) => {
    const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.other;
    return (
      <View style={[
        styles.itemRow,
        { backgroundColor: colors.bgCard, borderColor: colors.border },
        item.checked && { opacity: 0.5 },
      ]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[
            styles.checkbox,
            { borderColor: colors.border },
            item.checked && { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
          ]}
          onPress={() => toggleCheck(item.id)}
        >
          {item.checked && <Text style={styles.checkmark}>✓</Text>}
        </TouchableOpacity>

        {/* Content */}
        <TouchableOpacity
          style={styles.itemContent}
          onPress={() => toggleCheck(item.id)}
          onLongPress={() => {
            Alert.alert('Delete', `Remove "${item.text}"?`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => deleteItem(item.id) },
            ]);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.itemCatIcon}>{cat.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.itemText, { color: colors.text },
                item.checked && { textDecorationLine: 'line-through', color: colors.textMuted },
              ]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
            <Text style={[styles.itemCatLabel, { color: colors.textMuted }]}>{cat.label}</Text>
          </View>
        </TouchableOpacity>

        {/* Quantity stepper */}
        <View style={styles.quantityStepper}>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.bgInput }]}
            onPress={() => updateQuantity(item.id, -1)}
          >
            <Text style={[styles.qtyBtnText, { color: colors.text }]}>−</Text>
          </TouchableOpacity>
          <Text style={[styles.qtyValue, { color: colors.accentGold }]}>{item.quantity || 1}</Text>
          <TouchableOpacity
            style={[styles.qtyBtn, { backgroundColor: colors.bgInput }]}
            onPress={() => updateQuantity(item.id, 1)}
          >
            <Text style={[styles.qtyBtnText, { color: colors.text }]}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [colors, toggleCheck, deleteItem, updateQuantity]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.accentGreen + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Shopping List</Text>
          {checkedCount > 0 && (
            <TouchableOpacity
              style={[styles.clearBtn, { backgroundColor: colors.accentRed + '18' }]}
              onPress={clearChecked}
            >
              <Text style={[styles.clearBtnText, { color: colors.accentRed }]}>
                Clear {checkedCount} ✓
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {totalCount === 0 ? 'No items yet' : `${totalCount - checkedCount} remaining · ${checkedCount} done`}
        </Text>
      </View>

      {/* Quick-add bar */}
      <View style={[styles.addBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.catPickerBtn, { backgroundColor: colors.bgInput }]}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Text style={styles.catPickerIcon}>
            {(CATEGORY_MAP[selectedCategory] || CATEGORY_MAP.other).icon}
          </Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.addInput, { color: colors.text }]}
          placeholder="Add item..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          selectionColor={colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.accentGreen }, !text.trim() && { opacity: 0.4 }]}
          onPress={handleAdd}
          disabled={!text.trim()}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Category picker (expandable) */}
      {showCategoryPicker && (
        <View style={[styles.catPickerRow, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.catOption,
                { backgroundColor: colors.bgInput },
                selectedCategory === cat.key && { backgroundColor: colors.accent + '25', borderColor: colors.accent },
              ]}
              onPress={() => {
                setSelectedCategory(cat.key);
                setShowCategoryPicker(false);
                Haptics.selectionAsync();
              }}
            >
              <Text style={styles.catOptionIcon}>{cat.icon}</Text>
              <Text style={[styles.catOptionLabel, { color: selectedCategory === cat.key ? colors.accent : colors.textMuted }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORIES.map(cat => {
          const isActive = filterCategory === cat.key;
          const count = cat.key === 'all'
            ? items.filter(i => !i.checked).length
            : items.filter(i => i.category === cat.key && !i.checked).length;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.filterChip,
                { backgroundColor: colors.bgInput },
                isActive && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
              ]}
              onPress={() => { setFilterCategory(cat.key); Haptics.selectionAsync(); }}
            >
              <Text style={styles.filterIcon}>{cat.icon}</Text>
              {count > 0 && (
                <Text style={[styles.filterCount, { color: isActive ? colors.accent : colors.textMuted }]}>
                  {count}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <FlatList
        data={displayItems}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              {filterCategory !== 'all' ? 'No items in this category' : 'Add your first item above'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, position: 'relative',
  },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.sm, marginTop: 2 },
  clearBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
  },
  clearBtnText: { fontSize: SIZES.xs, fontWeight: '700' },

  // Quick-add
  addBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    borderRadius: SIZES.radius, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 4, gap: 6,
  },
  catPickerBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  catPickerIcon: { fontSize: 18 },
  addInput: {
    flex: 1, fontSize: SIZES.base, paddingVertical: 8,
  },
  addBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, fontWeight: '600', color: '#fff', lineHeight: 24 },

  // Category picker
  catPickerRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginHorizontal: 16,
    marginTop: 8, padding: 10, borderRadius: SIZES.radius, borderWidth: 1,
  },
  catOption: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: 'transparent',
  },
  catOptionIcon: { fontSize: 14 },
  catOptionLabel: { fontSize: SIZES.xs, fontWeight: '600' },

  // Filter
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 6,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: 'transparent',
  },
  filterIcon: { fontSize: 13 },
  filterCount: { fontSize: 10, fontWeight: '700' },

  // List
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 12, borderRadius: SIZES.radius, borderWidth: 1, marginBottom: 6,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemContent: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  itemCatIcon: { fontSize: 16 },
  itemText: { fontSize: SIZES.base, fontWeight: '500' },
  itemCatLabel: { fontSize: SIZES.xs, marginTop: 1 },

  // Quantity
  quantityStepper: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  qtyBtn: {
    width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, fontWeight: '600', lineHeight: 18 },
  qtyValue: { fontSize: SIZES.sm, fontWeight: '700', minWidth: 16, textAlign: 'center' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: SIZES.md },
});
