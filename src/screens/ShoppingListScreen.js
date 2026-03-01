import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, Animated, Keyboard, ScrollView, Share, LayoutAnimation, UIManager, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = 'crushedit_shopping';
const CATEGORY_ORDER_KEY = 'crushedit_shopping_cat_order';

const CATEGORIES = [
  { key: 'all', label: 'All', icon: '🛒' },
  { key: 'produce', label: 'Produce', icon: '🥦' },
  { key: 'meat', label: 'Meat', icon: '🥩' },
  { key: 'bakery', label: 'Bakery', icon: '🍞' },
  { key: 'pasta', label: 'Pasta & Rice', icon: '🍝' },
  { key: 'canned', label: 'Canned Goods', icon: '🥫' },
  { key: 'cereals', label: 'Cereals', icon: '🥣' },
  { key: 'oils', label: 'Oils', icon: '🫒' },
  { key: 'frozen', label: 'Frozen', icon: '🧊' },
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

const animateLayout = () => {
  LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity'));
};

/* ── Progress ring (SVG-free) ── */
function ProgressRing({ progress, size, accent, bg }) {
  const displayPct = Math.round(progress * 100);
  return (
    <View style={[s.ring, { width: size, height: size, borderRadius: size / 2, borderColor: bg }]}>
      <View style={[s.ringFill, {
        width: size - 6, height: size - 6, borderRadius: (size - 6) / 2,
        borderColor: accent, borderLeftColor: 'transparent',
        transform: [{ rotate: `${progress * 360}deg` }],
      }]} />
      <Text style={[s.ringText, { color: accent, fontSize: size * 0.28 }]}>{displayPct}%</Text>
    </View>
  );
}

/* ── Swipeable item row ── */
function ShoppingItem({ item, colors, onToggle, onDelete, onQty }) {
  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.produce;
  const pan = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleDelete = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      animateLayout();
      onDelete(item.id);
    });
  }, [item.id, onDelete, opacity]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateX: pan }] }}>
      <View style={[
        s.itemCard,
        { backgroundColor: colors.bgCard },
        item.checked && s.itemCardChecked,
        !item.checked && SHADOWS.card(colors.accent),
      ]}>
        {/* Left accent stripe */}
        <View style={[s.itemStripe, { backgroundColor: item.checked ? colors.accentGreen : colors.accent + '40' }]} />

        <View style={s.itemInner}>
          {/* Checkbox */}
          <TouchableOpacity
            style={[
              s.checkbox,
              { borderColor: colors.borderLight },
              item.checked && { backgroundColor: colors.accentGreen, borderColor: colors.accentGreen },
            ]}
            onPress={() => onToggle(item.id)}
            activeOpacity={0.7}
          >
            {item.checked && <Text style={s.checkIcon}>✓</Text>}
          </TouchableOpacity>

          {/* Main content */}
          <TouchableOpacity
            style={s.itemBody}
            onPress={() => onToggle(item.id)}
            onLongPress={() => {
              Alert.alert('Delete', `Remove "${item.text}"?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: handleDelete },
              ]);
            }}
            activeOpacity={0.7}
          >
            <View style={s.itemTopRow}>
              <Text style={s.itemEmoji}>{cat.icon}</Text>
              <Text
                style={[
                  s.itemName, { color: colors.text },
                  item.checked && { textDecorationLine: 'line-through', color: colors.textMuted },
                ]}
                numberOfLines={3}
              >
                {item.text}
              </Text>
            </View>
            <Text style={[s.itemCatText, { color: colors.textMuted }]}>{cat.label}</Text>
          </TouchableOpacity>

          {/* Quantity */}
          <View style={s.qtyWrap}>
            <TouchableOpacity
              style={[s.qtyBtn, { backgroundColor: colors.bgInput }]}
              onPress={() => onQty(item.id, -1)}
            >
              <Text style={[s.qtyBtnTxt, { color: colors.textSecondary }]}>−</Text>
            </TouchableOpacity>
            <View style={[s.qtyBadge, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[s.qtyVal, { color: colors.accent }]}>{item.quantity || 1}</Text>
            </View>
            <TouchableOpacity
              style={[s.qtyBtn, { backgroundColor: colors.bgInput }]}
              onPress={() => onQty(item.id, 1)}
            >
              <Text style={[s.qtyBtnTxt, { color: colors.textSecondary }]}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

/* ── Main screen ── */
export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('produce');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setItems(JSON.parse(raw));
        const orderRaw = await AsyncStorage.getItem(CATEGORY_ORDER_KEY);
        if (orderRaw) setCategoryOrder(JSON.parse(orderRaw));
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const persist = useCallback(async (newItems) => {
    setItems(newItems);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newItems)); } catch (e) { /* ignore */ }
  }, []);

  const handleAdd = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
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

  const toggleCheck = useCallback((id) => {
    Haptics.selectionAsync();
    animateLayout();
    persist(items.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  }, [items, persist]);

  const updateQuantity = useCallback((id, delta) => {
    Haptics.selectionAsync();
    persist(items.map(i => {
      if (i.id !== id) return i;
      const q = Math.max(1, (i.quantity || 1) + delta);
      return { ...i, quantity: q };
    }));
  }, [items, persist]);

  const deleteItem = useCallback((id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    persist(items.filter(i => i.id !== id));
  }, [items, persist]);

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
          animateLayout();
          persist(items.filter(i => !i.checked));
        }},
      ]
    );
  }, [items, persist]);

  const displayItems = useMemo(() => {
    let filtered = items;
    if (filterCategory !== 'all') {
      filtered = filtered.filter(i => i.category === filterCategory);
    }
    const unchecked = filtered.filter(i => !i.checked);
    const checked = filtered.filter(i => i.checked);
    return [...unchecked, ...checked];
  }, [items, filterCategory]);

  const handleShare = useCallback(async () => {
    const unchecked = items.filter(i => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('Nothing to share', 'Add some items first!');
      return;
    }
    const grouped = {};
    unchecked.forEach(i => {
      const cat = CATEGORY_MAP[i.category] || CATEGORY_MAP.produce;
      if (!grouped[cat.label]) grouped[cat.label] = [];
      const qty = (i.quantity || 1) > 1 ? ` x${i.quantity}` : '';
      grouped[cat.label].push(`  • ${i.text}${qty}`);
    });
    const lines = ['🛒 Shopping List', ''];
    Object.entries(grouped).forEach(([label, lineItems]) => {
      lines.push(`${label}:`);
      lineItems.forEach(l => lines.push(l));
      lines.push('');
    });
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e) { /* cancelled */ }
  }, [items]);

  const checkedCount = items.filter(i => i.checked).length;
  const totalCount = items.length;
  const remaining = totalCount - checkedCount;
  const progress = totalCount > 0 ? checkedCount / totalCount : 0;

  // Group display items by category for section rendering
  const sections = useMemo(() => {
    if (filterCategory !== 'all') return null;
    const unchecked = displayItems.filter(i => !i.checked);
    const checked = displayItems.filter(i => i.checked);
    const groups = {};
    unchecked.forEach(i => {
      const key = i.category || 'produce';
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    });
    let sectionList = Object.entries(groups).map(([key, sectionItems]) => ({
      category: CATEGORY_MAP[key] || CATEGORY_MAP.produce,
      items: sectionItems,
    }));
    // Sort by saved category order
    if (categoryOrder) {
      sectionList.sort((a, b) => {
        const ai = categoryOrder.indexOf(a.category.key);
        const bi = categoryOrder.indexOf(b.category.key);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
    return { sections: sectionList, checked };
  }, [displayItems, filterCategory, categoryOrder]);

  const moveSectionUp = useCallback((catKey) => {
    if (!sections) return;
    const keys = sections.sections.map(s => s.category.key);
    const idx = keys.indexOf(catKey);
    if (idx <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    [keys[idx - 1], keys[idx]] = [keys[idx], keys[idx - 1]];
    setCategoryOrder(keys);
    AsyncStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(keys)).catch(() => {});
  }, [sections]);

  const moveSectionDown = useCallback((catKey) => {
    if (!sections) return;
    const keys = sections.sections.map(s => s.category.key);
    const idx = keys.indexOf(catKey);
    if (idx === -1 || idx >= keys.length - 1) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    [keys[idx], keys[idx + 1]] = [keys[idx + 1], keys[idx]];
    setCategoryOrder(keys);
    AsyncStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(keys)).catch(() => {});
  }, [sections]);

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <LinearGradient
          colors={[colors.accent + '12', colors.accentGreen + '08', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={s.headerTop}>
          <View style={s.headerLeft}>
            <Text style={[s.title, { color: colors.text }]}>Shopping</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              {totalCount === 0
                ? 'Your list is empty'
                : `${remaining} to go · ${checkedCount} done`}
            </Text>
          </View>
          {totalCount > 0 && (
            <ProgressRing progress={progress} size={48} accent={colors.accentGreen} bg={colors.bgInput} />
          )}
        </View>

        {/* Action pills */}
        <View style={s.headerActions}>
          <TouchableOpacity
            style={[s.actionPill, { backgroundColor: colors.accent + '14' }]}
            onPress={handleShare}
          >
            <Text style={[s.actionPillText, { color: colors.accent }]}>📤 Share</Text>
          </TouchableOpacity>
          {checkedCount > 0 && (
            <TouchableOpacity
              style={[s.actionPill, { backgroundColor: colors.accentRed + '14' }]}
              onPress={clearChecked}
            >
              <Text style={[s.actionPillText, { color: colors.accentRed }]}>
                🗑 Clear {checkedCount}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Add bar ── */}
      <View style={[s.addBar, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[s.catPickerBtn, { backgroundColor: colors.bgElevated }]}
          onPress={() => { setShowCategoryPicker(!showCategoryPicker); Haptics.selectionAsync(); }}
        >
          <Text style={s.catPickerEmoji}>
            {(CATEGORY_MAP[selectedCategory] || CATEGORY_MAP.produce).icon}
          </Text>
          <Text style={[s.catPickerCaret, { color: colors.textMuted }]}>▾</Text>
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[s.addInput, { color: colors.text }]}
          placeholder="Add item..."
          placeholderTextColor={colors.textMuted}
          value={text}
          onChangeText={setText}
          selectionColor={colors.accent}
          returnKeyType="done"
          onSubmitEditing={handleAdd}
        />

        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.accentGreen }, !text.trim() && { opacity: 0.35 }]}
          onPress={handleAdd}
          disabled={!text.trim()}
        >
          <Text style={s.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category picker ── */}
      {showCategoryPicker && (
        <View style={[s.catGrid, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          {CATEGORIES.filter(c => c.key !== 'all').map(cat => {
            const active = selectedCategory === cat.key;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[
                  s.catTile,
                  { backgroundColor: colors.bgInput },
                  active && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                ]}
                onPress={() => {
                  setSelectedCategory(cat.key);
                  setShowCategoryPicker(false);
                  Haptics.selectionAsync();
                }}
              >
                <Text style={s.catTileIcon}>{cat.icon}</Text>
                <Text style={[s.catTileLabel, { color: active ? colors.accent : colors.textMuted }]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── Filter chips ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.filterScroll}
        contentContainerStyle={s.filterRow}
      >
        {CATEGORIES.map(cat => {
          const isActive = filterCategory === cat.key;
          const count = cat.key === 'all'
            ? items.filter(i => !i.checked).length
            : items.filter(i => i.category === cat.key && !i.checked).length;
          if (cat.key !== 'all' && count === 0 && !isActive) return null;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[
                s.filterChip,
                { backgroundColor: colors.bgInput, borderColor: 'transparent' },
                isActive && { backgroundColor: colors.accent + '18', borderColor: colors.accent },
              ]}
              onPress={() => {
                setFilterCategory(cat.key);
                if (cat.key !== 'all') setSelectedCategory(cat.key);
                Haptics.selectionAsync();
              }}
            >
              <Text style={s.filterEmoji}>{cat.icon}</Text>
              <Text style={[s.filterLabel, { color: isActive ? colors.accent : colors.textSecondary }]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[s.filterBadge, { backgroundColor: isActive ? colors.accent : colors.bgElevated }]}>
                  <Text style={[s.filterBadgeText, { color: isActive ? '#fff' : colors.textMuted }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Item list ── */}
      <ScrollView
        style={s.listScroll}
        contentContainerStyle={s.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {displayItems.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyCircle, { backgroundColor: colors.bgCard }]}>
              <Text style={s.emptyIcon}>🛒</Text>
            </View>
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>
              {filterCategory !== 'all' ? 'Nothing here' : 'Start your list'}
            </Text>
            <Text style={[s.emptyHint, { color: colors.textMuted }]}>
              {filterCategory !== 'all' ? 'No items in this category yet' : 'Tap the field above to add items'}
            </Text>
          </View>
        ) : sections && filterCategory === 'all' ? (
          <>
            {sections.sections.map(({ category, items: sectionItems }, sIdx) => (
              <View key={category.key} style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionEmoji}>{category.icon}</Text>
                  <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{category.label}</Text>
                  <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{sectionItems.length}</Text>
                  <TouchableOpacity
                    onPress={() => moveSectionUp(category.key)}
                    style={[s.sectionArrow, sIdx === 0 && { opacity: 0.2 }]}
                    disabled={sIdx === 0}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[s.sectionArrowText, { color: colors.textMuted }]}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveSectionDown(category.key)}
                    style={[s.sectionArrow, sIdx === sections.sections.length - 1 && { opacity: 0.2 }]}
                    disabled={sIdx === sections.sections.length - 1}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[s.sectionArrowText, { color: colors.textMuted }]}>▼</Text>
                  </TouchableOpacity>
                </View>
                {sectionItems.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    colors={colors}
                    onToggle={toggleCheck}
                    onDelete={deleteItem}
                    onQty={updateQuantity}
                  />
                ))}
              </View>
            ))}
            {sections.checked.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionEmoji}>✅</Text>
                  <Text style={[s.sectionTitle, { color: colors.textMuted }]}>Done</Text>
                  <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{sections.checked.length}</Text>
                </View>
                {sections.checked.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    colors={colors}
                    onToggle={toggleCheck}
                    onDelete={deleteItem}
                    onQty={updateQuantity}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          displayItems.map(item => (
            <ShoppingItem
              key={item.id}
              item={item}
              colors={colors}
              onToggle={toggleCheck}
              onDelete={deleteItem}
              onQty={updateQuantity}
            />
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <KnowledgeBaseButton sectionId="shopping-list" />
    </SafeAreaView>
  );
}

/* ── Styles ── */
const s = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 6 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: SIZES.sm, marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionPill: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  actionPillText: { fontSize: SIZES.xs, fontWeight: '700', letterSpacing: 0.2 },

  // Progress ring
  ring: {
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  ringFill: {
    position: 'absolute', borderWidth: 3, borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringText: { fontWeight: '800' },

  // Add bar
  addBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 4,
    borderRadius: SIZES.radiusLg, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 6, gap: 8,
  },
  catPickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: SIZES.radius,
  },
  catPickerEmoji: { fontSize: 18 },
  catPickerCaret: { fontSize: 10, marginLeft: 2 },
  addInput: { flex: 1, fontSize: SIZES.base, paddingVertical: 8 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 24, fontWeight: '600', color: '#fff', lineHeight: 26 },

  // Category grid
  catGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16,
    marginTop: 10, padding: 12, borderRadius: SIZES.radiusLg, borderWidth: 1,
  },
  catTile: {
    alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 6,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: 'transparent',
    width: '22%', flexGrow: 1,
  },
  catTileIcon: { fontSize: 20 },
  catTileLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },

  // Filter chips
  filterScroll: { marginTop: 4, maxHeight: 36 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 6, paddingBottom: 2 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  filterEmoji: { fontSize: 13 },
  filterLabel: { fontSize: SIZES.xs, fontWeight: '600' },
  filterBadge: {
    minWidth: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  filterBadgeText: { fontSize: 9, fontWeight: '800' },

  // Sections
  section: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
  sectionEmoji: { fontSize: 14 },
  sectionTitle: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionCount: { fontSize: SIZES.xs, fontWeight: '700' },
  sectionArrow: { padding: 2 },
  sectionArrowText: { fontSize: 10 },

  // Item card
  itemCard: {
    borderRadius: SIZES.radius, marginBottom: 8, overflow: 'hidden',
  },
  itemCardChecked: { opacity: 0.45 },
  itemStripe: { height: 3 },
  itemInner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  checkbox: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
  },
  checkIcon: { color: '#fff', fontSize: 14, fontWeight: '800' },
  itemBody: { flex: 1 },
  itemTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemEmoji: { fontSize: 18 },
  itemName: { fontSize: SIZES.base, fontWeight: '600', flex: 1 },
  itemCatText: { fontSize: SIZES.xs, marginTop: 2, marginLeft: 26 },

  // Quantity
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnTxt: { fontSize: 16, fontWeight: '700', lineHeight: 18 },
  qtyBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  qtyVal: { fontSize: SIZES.sm, fontWeight: '800' },

  // List
  listScroll: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 4 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 4 },
  emptyHint: { fontSize: SIZES.sm },
});
