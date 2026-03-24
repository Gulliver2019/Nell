import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal,
  Alert, Animated, Keyboard, ScrollView, Share, LayoutAnimation, UIManager, Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = 'nell_shopping';
const CATEGORY_ORDER_KEY = 'nell_shopping_cat_order';

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
  { key: 'others', label: 'Others', icon: '📦' },
];

const CATEGORY_MAP = {};
CATEGORIES.forEach(c => { CATEGORY_MAP[c.key] = c; });

/* ── Auto-categorise keywords ── */
const AUTO_CAT = {
  produce: ['apple','banana','orange','lemon','lime','grape','strawberry','blueberry','raspberry','avocado','tomato','potato','onion','garlic','ginger','carrot','broccoli','cauliflower','pepper','cucumber','lettuce','spinach','kale','celery','mushroom','corn','courgette','zucchini','aubergine','eggplant','pea','bean','sprout','cabbage','leek','parsnip','turnip','beetroot','radish','asparagus','mango','pineapple','melon','watermelon','peach','pear','plum','cherry','kiwi','coconut','fig','pomegranate','fruit','veg','salad','herb','basil','parsley','coriander','mint','chilli','spring onion','rocket','watercress'],
  meat: ['chicken','beef','pork','lamb','mince','steak','sausage','bacon','turkey','duck','ham','gammon','ribs','chop','fillet','sirloin','brisket','veal','venison'],
  bakery: ['bread','roll','baguette','croissant','muffin','scone','bagel','wrap','pitta','naan','cake','pastry','doughnut','brioche','sourdough','crumpet','pancake','waffle','teacake'],
  pasta: ['pasta','spaghetti','penne','fusilli','rice','noodle','couscous','risotto','macaroni','lasagne','tagliatelle','orzo','linguine','basmati','long grain','arborio','egg noodle','ramen','udon'],
  canned: ['tin','canned','baked bean','soup','chopped tomato','tuna','sweetcorn','chickpea','kidney bean','coconut milk','sardine','spam','corned beef'],
  cereals: ['cereal','porridge','oat','granola','muesli','weetabix','cornflake','bran','shreddies','cheerio'],
  oils: ['oil','olive oil','vegetable oil','coconut oil','sunflower oil','sesame oil','vinegar','balsamic','spray oil'],
  frozen: ['frozen','ice cream','fish finger','chips','pizza','ice','frozen veg','frozen fruit','ice lolly','waffle','frozen pie','oven chips','potato waffle'],
  medicine: ['paracetamol','ibuprofen','plaster','bandage','vitamin','cough','cold','flu','tablet','medicine','antiseptic','cream','ointment'],
  readymeals: ['ready meal','microwave','meal deal','sandwich','wrap','salad bowl','pot noodle','instant','ready made'],
  cookemeats: ['cooked chicken','sliced ham','salami','pepperoni','chorizo','pate','scotch egg','pork pie','cooked meat','deli'],
  dairy: ['milk','cheese','butter','yoghurt','yogurt','cream','egg','cheddar','mozzarella','parmesan','brie','camembert','cottage cheese','cream cheese','sour cream','double cream','single cream','skimmed','semi-skimmed','whole milk','goat','feta','halloumi','ricotta','mascarpone'],
  sauces: ['sauce','ketchup','mayo','mayonnaise','mustard','dressing','gravy','stock','oxo','soy sauce','worcestershire','hot sauce','chutney','pickle','relish','pesto','salsa','bbq','brown sauce','hp','sriracha','tabasco','marinade'],
  beverages: ['water','juice','cola','coke','pepsi','lemonade','squash','tea','coffee','beer','wine','gin','vodka','whisky','rum','prosecco','champagne','cordial','fizzy','sparkling','tonic','energy drink','lucozade','ribena','smoothie','oat milk','almond milk','soy milk'],
  goodies: ['chocolate','sweet','candy','biscuit','crisp','chip','cookie','cake','fudge','toffee','jelly','gummy','haribo','popcorn','nut','cashew','almond','peanut','pistachio','snack','treat','brownie','cereal bar','protein bar'],
  pet: ['dog food','cat food','pet food','litter','cat litter','dog treat','cat treat','pet treat','kibble','wet food','chew','dog chew','flea','worming'],
  household: ['toilet roll','kitchen roll','bin bag','washing','detergent','bleach','sponge','cloth','fairy','cleaner','polish','air freshener','candle','foil','cling film','baking paper','battery','bulb','soap','hand wash','shower gel','shampoo','conditioner','toothpaste','toothbrush','deodorant','razor','tissue','wipe','dishwasher','tablet','softener','stain remover'],
};

function guessCategory(itemText) {
  const lower = itemText.toLowerCase().trim();
  for (const [cat, keywords] of Object.entries(AUTO_CAT)) {
    for (const kw of keywords) {
      if (lower === kw || lower.includes(kw)) return cat;
    }
  }
  return null;
}

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

/* ── Item row ── */
function ShoppingItem({ item, colors, onToggle, onQty, onEdit }) {
  const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP.produce;

  return (
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
          onPress={() => onEdit(item)}
          activeOpacity={0.7}
        >
          <View style={s.itemTopRow}>
            <Text style={s.itemEmoji}>{cat.icon}</Text>
            <Text
              style={[
                s.itemName, { color: colors.text },
                item.checked && { textDecorationLine: 'line-through', color: colors.textMuted },
              ]}
            >
              {item.text}
            </Text>
          </View>
          <Text style={[s.itemCatText, { color: colors.textMuted }]}>{cat.label}</Text>
          {item.notes ? (
            <Text style={[s.itemNotes, { color: colors.textMuted }]} numberOfLines={2}>{item.notes}</Text>
          ) : null}
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
  );
}

/* ── Swipe-to-delete wrapper ── */
function SwipeableShoppingItem({ item, colors, onToggle, onDelete, onQty, onEdit }) {
  const swipeRef = useRef(null);

  const handleSwipeDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeRef.current?.close();
    animateLayout();
    onDelete(item.id);
  }, [item.id, onDelete]);

  const renderRightActions = useCallback((progress, dragX) => {
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0.5],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={[s.swipeDeleteBtn, { backgroundColor: colors.accentRed }]}
        onPress={handleSwipeDelete}
        activeOpacity={0.8}
      >
        <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
          <Text style={s.swipeDeleteIcon}>🗑</Text>
          <Text style={s.swipeDeleteLabel}>Delete</Text>
        </Animated.View>
      </TouchableOpacity>
    );
  }, [colors, handleSwipeDelete]);

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <ShoppingItem
        item={item}
        colors={colors}
        onToggle={onToggle}
        onQty={onQty}
        onEdit={onEdit}
      />
    </Swipeable>
  );
}

/* ── Main screen ── */
export default function ShoppingListScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState([]);
  const [text, setText] = useState('');
  const [categoryOrder, setCategoryOrder] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('others');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editNotes, setEditNotes] = useState('');
  const [showEditCatPicker, setShowEditCatPicker] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setItems(JSON.parse(raw));
        } else {
          // Seed default items on first load
          const defaults = [
            { id: generateId(), name: 'Cereal', category: 'cereals', checked: false, qty: '' },
          ];
          setItems(defaults);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
        }
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
    const category = guessCategory(trimmed) || 'others';
    const newItem = {
      id: generateId(),
      text: trimmed,
      category,
      quantity: 1,
      checked: false,
      createdAt: new Date().toISOString(),
    };
    persist([newItem, ...items]);
    setText('');
    Keyboard.dismiss();
  }, [text, items, persist]);

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

  // Always group by category
  const sections = useMemo(() => {
    const unchecked = items.filter(i => !i.checked);
    const checked = items.filter(i => i.checked);
    const groups = {};
    unchecked.forEach(i => {
      const key = i.category || 'others';
      if (!groups[key]) groups[key] = [];
      groups[key].push(i);
    });
    let sectionList = Object.entries(groups).map(([key, sectionItems]) => ({
      category: CATEGORY_MAP[key] || CATEGORY_MAP.others,
      items: sectionItems,
    }));
    if (categoryOrder) {
      sectionList.sort((a, b) => {
        const ai = categoryOrder.indexOf(a.category.key);
        const bi = categoryOrder.indexOf(b.category.key);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
    }
    return { sections: sectionList, checked };
  }, [items, categoryOrder]);

  // Flat list for drag-and-drop: interleave section headers with items
  const reorderFlatData = useMemo(() => {
    if (!sections) return [];
    const flat = [];
    sections.sections.forEach(({ category, items: sectionItems }) => {
      flat.push({ _type: 'header', _id: `hdr_${category.key}`, category });
      sectionItems.forEach(item => flat.push({ ...item, _type: 'item' }));
    });
    return flat;
  }, [sections]);

  const handleShare = useCallback(async () => {
    const unchecked = items.filter(i => !i.checked);
    if (unchecked.length === 0) {
      Alert.alert('Nothing to share', 'Add some items first!');
      return;
    }
    const grouped = {};
    unchecked.forEach(i => {
      const cat = CATEGORY_MAP[i.category] || CATEGORY_MAP.others;
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

  const handleDragEnd = useCallback(({ data }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Walk through reordered flat list: headers set current category, items get that category
    let currentCat = 'others';
    const updatedItems = [];
    for (const entry of data) {
      if (entry._type === 'header') {
        currentCat = entry.category.key;
      } else {
        updatedItems.push({ ...entry, category: currentCat });
      }
    }
    const checkedItems = items.filter(i => i.checked);
    persist([...updatedItems, ...checkedItems]);
  }, [items, persist]);

  const openEdit = useCallback((item) => {
    setEditItem(item);
    setEditName(item.text);
    setEditCategory(item.category || 'others');
    setEditQuantity(item.quantity || 1);
    setEditNotes(item.notes || '');
    setShowEditCatPicker(false);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editItem || !editName.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateLayout();
    const nameChanged = editName.trim() !== editItem.text;
    const catChanged = editCategory !== (editItem.category || 'others');
    const newCat = catChanged ? editCategory : (nameChanged ? (guessCategory(editName.trim()) || editCategory) : editCategory);
    persist(items.map(i => i.id === editItem.id ? {
      ...i,
      text: editName.trim(),
      category: newCat,
      quantity: editQuantity,
      notes: editNotes.trim() || undefined,
    } : i));
    setEditItem(null);
  }, [editItem, editName, editCategory, editQuantity, editNotes, items, persist]);

  const cancelEdit = useCallback(() => {
    setEditItem(null);
  }, []);

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
          {remaining > 0 && (
            <View
              style={[s.actionPill, { backgroundColor: colors.accent + '14' }]}
            >
              <Text style={[s.actionPillText, { color: colors.accent }]}>☰ Hold to reorder</Text>
            </View>
          )}
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
        <Text style={s.addBarEmoji}>🛒</Text>

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

      {/* ── Item list with drag & drop ── */}
      <GestureHandlerRootView style={s.listScroll}>
        {items.length === 0 ? (
          <View style={s.empty}>
            <View style={[s.emptyCircle, { backgroundColor: colors.bgCard }]}>
              <Text style={s.emptyIcon}>🛒</Text>
            </View>
            <Text style={[s.emptyTitle, { color: colors.textSecondary }]}>Start your list</Text>
            <Text style={[s.emptyHint, { color: colors.textMuted }]}>
              Type an item and it will be auto-sorted into the right aisle
            </Text>
          </View>
        ) : reorderFlatData.length > 0 ? (
          /* ── Always-on drag & drop list ── */
          <DraggableFlatList
            data={reorderFlatData}
            keyExtractor={entry => entry._type === 'header' ? entry._id : entry.id}
            onDragEnd={handleDragEnd}
            contentContainerStyle={[s.listContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={sections && sections.checked.length > 0 ? (
              <View style={s.section}>
                <View style={s.sectionHeader}>
                  <Text style={s.sectionEmoji}>✅</Text>
                  <Text style={[s.sectionTitle, { color: colors.textMuted }]}>Done</Text>
                  <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
                  <Text style={[s.sectionCount, { color: colors.textMuted }]}>{sections.checked.length}</Text>
                </View>
                {sections.checked.map(item => (
                  <SwipeableShoppingItem
                    key={item.id}
                    item={item}
                    colors={colors}
                    onToggle={toggleCheck}
                    onDelete={deleteItem}
                    onQty={updateQuantity}
                    onEdit={openEdit}
                  />
                ))}
              </View>
            ) : null}
            renderItem={({ item: entry, drag, isActive }) => {
              if (entry._type === 'header') {
                const sIdx = sections.sections.findIndex(sec => sec.category.key === entry.category.key);
                return (
                  <View style={s.sectionHeader}>
                    <Text style={s.sectionEmoji}>{entry.category.icon}</Text>
                    <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{entry.category.label}</Text>
                    <View style={[s.sectionLine, { backgroundColor: colors.border }]} />
                    <Text style={[s.sectionCount, { color: colors.textMuted }]}>
                      {sections.sections[sIdx]?.items.length || 0}
                    </Text>
                    <TouchableOpacity
                      onPress={() => moveSectionUp(entry.category.key)}
                      style={[s.sectionArrow, sIdx === 0 && { opacity: 0.2 }]}
                      disabled={sIdx === 0}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[s.sectionArrowText, { color: colors.textMuted }]}>▲</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveSectionDown(entry.category.key)}
                      style={[s.sectionArrow, sIdx === sections.sections.length - 1 && { opacity: 0.2 }]}
                      disabled={sIdx === sections.sections.length - 1}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Text style={[s.sectionArrowText, { color: colors.textMuted }]}>▼</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <ScaleDecorator>
                  <View style={[s.reorderRow, isActive && { backgroundColor: colors.bgElevated, borderRadius: SIZES.radius }]}>
                    <TouchableOpacity
                      onLongPress={drag}
                      delayLongPress={100}
                      disabled={isActive}
                      style={s.dragHandle}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={[s.dragHandleIcon, { color: isActive ? colors.accent : colors.textMuted }]}>☰</Text>
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                      <SwipeableShoppingItem
                        item={entry}
                        colors={colors}
                        onToggle={toggleCheck}
                        onDelete={deleteItem}
                        onQty={updateQuantity}
                        onEdit={openEdit}
                      />
                    </View>
                  </View>
                </ScaleDecorator>
              );
            }}
          />
        ) : null}
      </GestureHandlerRootView>

      {/* ── Edit Modal ── */}
      <Modal visible={!!editItem} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={s.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={[s.modalCard, { backgroundColor: colors.bgCard }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} keyboardShouldPersistTaps="handled">
            <Text style={[s.modalTitle, { color: colors.text }]}>Edit Item</Text>

            {/* Name */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Name</Text>
            <TextInput
              style={[s.modalInput, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={editName}
              onChangeText={setEditName}
              selectionColor={colors.accent}
              autoFocus
            />

            {/* Category */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Category</Text>
            <TouchableOpacity
              style={[s.modalCatBtn, { backgroundColor: colors.bgInput, borderColor: colors.border }]}
              onPress={() => setShowEditCatPicker(!showEditCatPicker)}
            >
              <Text style={{ fontSize: 18 }}>{(CATEGORY_MAP[editCategory] || CATEGORY_MAP.others).icon}</Text>
              <Text style={[s.modalCatLabel, { color: colors.text }]}>
                {(CATEGORY_MAP[editCategory] || CATEGORY_MAP.others).label}
              </Text>
              <Text style={{ color: colors.textMuted }}>▾</Text>
            </TouchableOpacity>
            {showEditCatPicker && (
              <View style={[s.modalCatGrid, { backgroundColor: colors.bgInput }]}>
                {CATEGORIES.filter(c => c.key !== 'all').map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      s.modalCatTile,
                      { backgroundColor: colors.bgElevated },
                      editCategory === cat.key && { backgroundColor: colors.accent + '20', borderColor: colors.accent, borderWidth: 1 },
                    ]}
                    onPress={() => { setEditCategory(cat.key); setShowEditCatPicker(false); }}
                  >
                    <Text style={{ fontSize: 16 }}>{cat.icon}</Text>
                    <Text style={[s.modalCatTileLabel, { color: editCategory === cat.key ? colors.accent : colors.textMuted }]} numberOfLines={1}>{cat.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Quantity */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Quantity</Text>
            <View style={s.modalQtyRow}>
              <TouchableOpacity
                style={[s.modalQtyBtn, { backgroundColor: colors.bgInput }]}
                onPress={() => setEditQuantity(Math.max(1, editQuantity - 1))}
              >
                <Text style={[s.modalQtyBtnTxt, { color: colors.textSecondary }]}>−</Text>
              </TouchableOpacity>
              <Text style={[s.modalQtyVal, { color: colors.accent }]}>{editQuantity}</Text>
              <TouchableOpacity
                style={[s.modalQtyBtn, { backgroundColor: colors.bgInput }]}
                onPress={() => setEditQuantity(editQuantity + 1)}
              >
                <Text style={[s.modalQtyBtnTxt, { color: colors.textSecondary }]}>+</Text>
              </TouchableOpacity>
            </View>

            {/* Notes */}
            <Text style={[s.modalLabel, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput
              style={[s.modalInput, s.modalNotes, { color: colors.text, backgroundColor: colors.bgInput, borderColor: colors.border }]}
              value={editNotes}
              onChangeText={setEditNotes}
              placeholder="Add a note..."
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              multiline
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={s.modalBtns}>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.bgInput }]} onPress={cancelEdit}>
                <Text style={[s.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalBtn, { backgroundColor: colors.accent }]} onPress={saveEdit}>
                <Text style={[s.modalBtnText, { color: '#fff' }]}>Save</Text>
              </TouchableOpacity>
            </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  addBarEmoji: { fontSize: 20, marginLeft: 8 },
  addInput: { flex: 1, fontSize: SIZES.base, paddingVertical: 8 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 24, fontWeight: '600', color: '#fff', lineHeight: 26 },

  // Sections
  section: { marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 },
  sectionEmoji: { fontSize: 14 },
  sectionTitle: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
  sectionCount: { fontSize: SIZES.xs, fontWeight: '700' },
  sectionArrow: { padding: 2 },
  sectionArrowText: { fontSize: 10 },
  sectionEditBtn: { padding: 4, marginLeft: 2 },
  sectionEditIcon: { fontSize: 14 },

  // Reorder mode
  reorderRow: { flexDirection: 'row', alignItems: 'center' },
  reorderSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingTop: 12, paddingBottom: 6 },
  dragHandle: { width: 32, alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  dragHandleIcon: { fontSize: 20, fontWeight: '700' },

  // Swipe-to-delete
  swipeDeleteBtn: {
    justifyContent: 'center', alignItems: 'center', width: 80,
    borderRadius: SIZES.radius, marginBottom: 8, marginLeft: 4,
  },
  swipeDeleteIcon: { fontSize: 20 },
  swipeDeleteLabel: { color: '#fff', fontSize: 10, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },

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
  itemName: { fontSize: SIZES.base, fontWeight: '600', flex: 1, flexWrap: 'wrap' },
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

  // Item notes
  itemNotes: { fontSize: 11, marginTop: 2, marginLeft: 26, fontStyle: 'italic', lineHeight: 15 },

  // Edit modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  modalTitle: { fontSize: 20, fontWeight: '800', marginBottom: 20, textAlign: 'center' },
  modalLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  modalInput: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  modalNotes: { minHeight: 80, paddingTop: 12 },
  modalCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  modalCatLabel: { flex: 1, fontSize: 16 },
  modalCatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, padding: 8, borderRadius: 12 },
  modalCatTile: { alignItems: 'center', gap: 2, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8, width: '22%', flexGrow: 1, borderWidth: 1, borderColor: 'transparent' },
  modalCatTileLabel: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
  modalQtyRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalQtyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  modalQtyBtnTxt: { fontSize: 20, fontWeight: '700' },
  modalQtyVal: { fontSize: 24, fontWeight: '800', minWidth: 30, textAlign: 'center' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  modalBtnText: { fontSize: 16, fontWeight: '700' },
});
