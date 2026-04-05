import React, { useMemo, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal,
  Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
import { getDateKey } from '../utils/storage';
import EntryItem from '../components/EntryItem';
import FAB from '../components/FAB';
import EntryFormFlyout from '../components/EntryFormFlyout';
import * as Haptics from 'expo-haptics';
import KnowledgeBaseButton from '../components/KnowledgeBaseButton';

const ICONS = ['📋', '🎯', '📚', '💡', '🏃', '🎨', '🛒', '✈️', '💰', '🎵', '🍽️', '🧘', '💼', '🌱', '❤️', '⭐'];
const ACCENT_COLORS = ['#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E', '#00B894', '#E17055', '#FF6B6B', '#74B9FF'];

export default function CollectionsScreen({ route }) {
  const { colors } = useTheme();
  const {
    collections, entries, addCollection, deleteCollection,
    addEntry, updateEntry, deleteEntry, migrateEntry, reorderEntries,
    scheduleEntry,
  } = useApp();

  const [selectedCollection, setSelectedCollection] = useState(null);

  // Deep-link: auto-select collection from route params
  React.useEffect(() => {
    if (route?.params?.collectionId && collections.length > 0) {
      const target = collections.find(c => c.id === route.params.collectionId);
      if (target) setSelectedCollection(target);
    }
  }, [route?.params?.collectionId, collections]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0]);
  const [flyoutVisible, setFlyoutVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [scheduleEntryId, setScheduleEntryId] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [convertEntry, setConvertEntry] = useState(null);
  const [convertDate, setConvertDate] = useState(new Date());

  const collectionEntries = useMemo(() => {
    if (!selectedCollection) return [];
    return entries
      .filter(e => e.collection === selectedCollection.id)
      .sort((a, b) => {
        if (a.sortOrder != null && b.sortOrder != null) return a.sortOrder - b.sortOrder;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [entries, selectedCollection]);

  const handleCreateCollection = async () => {
    if (!newTitle.trim()) return;
    const col = await addCollection({ title: newTitle.trim(), icon: newIcon, color: newColor });
    setNewTitle('');
    setShowNewModal(false);
  };

  const handleDeleteCollection = (col) => {
    Alert.alert(
      'Delete Collection',
      `Delete "${col.title}" and all its entries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => {
          deleteCollection(col.id);
          setSelectedCollection(null);
        }},
      ]
    );
  };

  const handleAddEntry = async (data) => {
    if (data.id) {
      const { id, ...updates } = data;
      await updateEntry(id, updates);
    } else {
      await addEntry({ ...data, collection: selectedCollection.id });
    }
  };

  const handleEditEntry = (entry) => {
    setEditingEntry(entry);
    setFlyoutVisible(true);
  };

  const handleSchedule = useCallback((id) => {
    setScheduleEntryId(id);
    setShowDatePicker(true);
  }, []);

  const handleDatePicked = useCallback(async (event, selectedDateVal) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'dismissed' || !selectedDateVal) {
      setShowDatePicker(false);
      setScheduleEntryId(null);
      return;
    }
    const targetDate = getDateKey(selectedDateVal);
    if (scheduleEntryId) {
      await scheduleEntry(scheduleEntryId, targetDate);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setShowDatePicker(false);
    setScheduleEntryId(null);
  }, [scheduleEntryId, scheduleEntry]);

  const handleDragEnd = useCallback(({ data }) => {
    reorderEntries(data.map(e => e.id));
  }, [reorderEntries]);

  const handleAddToDaily = useCallback((entry) => {
    setConvertEntry(entry);
    setConvertDate(new Date());
  }, []);

  const confirmAddToDaily = useCallback(async () => {
    if (!convertEntry) return;
    const y = convertDate.getFullYear();
    const m = String(convertDate.getMonth() + 1).padStart(2, '0');
    const d = String(convertDate.getDate()).padStart(2, '0');
    const targetDate = `${y}-${m}-${d}`;
    const { id, collection, createdAt, sortOrder, ...rest } = convertEntry;
    await addEntry({ ...rest, date: targetDate, source: 'daily' });
    await updateEntry(id, { _addedToDaily: true });
    setConvertEntry(null);
    Alert.alert('Added', `"${convertEntry.text}" added to daily for ${targetDate}`);
  }, [convertEntry, convertDate, addEntry, updateEntry]);

  const renderCollectionEntry = useCallback(({ item, drag, isActive }) => (
    <ScaleDecorator>
      <EntryItem
        entry={item}
        onUpdate={updateEntry}
        onDelete={deleteEntry}
        onMigrate={() => migrateEntry(item.id)}
        onSchedule={handleSchedule}
        onAddToDaily={handleAddToDaily}
        onEdit={handleEditEntry}
        drag={drag}
        isActive={isActive}
      />
    </ScaleDecorator>
  ), [updateEntry, deleteEntry, migrateEntry, handleSchedule, handleAddToDaily]);

  // Collection detail view
  if (selectedCollection) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedCollection(null)} style={styles.backBtn}>
            <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailIcon}>{selectedCollection.icon}</Text>
            <Text style={[styles.detailTitle, { color: colors.text }]}>{selectedCollection.title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteCollection(selectedCollection)}>
            <Text style={styles.deleteBtn}>🗑</Text>
          </TouchableOpacity>
        </View>

        <DraggableFlatList
          data={collectionEntries}
          renderItem={renderCollectionEntry}
          keyExtractor={item => item.id}
          onDragEnd={handleDragEnd}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{selectedCollection.icon}</Text>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No entries yet</Text>
            </View>
          }
        />

        <FAB onPress={() => { setEditingEntry(null); setFlyoutVisible(true); }} />
        <EntryFormFlyout
          visible={flyoutVisible}
          onClose={() => { setFlyoutVisible(false); setEditingEntry(null); }}
          onSubmit={handleAddEntry}
          entry={editingEntry}
          visibleFields={['text', 'type', 'signifier', 'pomodoros']}
          extraData={{ collection: selectedCollection.id }}
        />

        {/* Date Picker for move to daily */}
        {showDatePicker && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide">
            <View style={styles.datePickerOverlay}>
              <View style={[styles.datePickerContainer, { backgroundColor: colors.bgCard }]}>
                <View style={styles.datePickerHeader}>
                  <Text style={[styles.datePickerTitle, { color: colors.text }]}>Move to daily</Text>
                  <TouchableOpacity onPress={() => { setShowDatePicker(false); setScheduleEntryId(null); }}>
                    <Text style={[styles.datePickerCancel, { color: colors.accentRed }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="inline"
                  themeVariant="dark"
                  accentColor={colors.accent}
                  onChange={handleDatePicked}
                />
              </View>
            </View>
          </Modal>
        )}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            onChange={handleDatePicked}
          />
        )}

        {/* Add to Daily date picker modal */}
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
                  onPress={confirmAddToDaily}
                >
                  <Text style={[styles.convertBtnText, { color: '#fff' }]}>Add to Daily</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Collections list view
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[colors.accentWarm + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={[styles.title, { color: colors.text }]}>Collections</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your custom pages</Text>
      </View>

      <FlatList
        data={collections}
        numColumns={2}
        renderItem={({ item }) => {
          const count = entries.filter(e => e.collection === item.id).length;
          return (
            <TouchableOpacity
              style={styles.collectionCard}
              onPress={() => setSelectedCollection(item)}
              onLongPress={() => handleDeleteCollection(item)}
            >
              <LinearGradient
                colors={[item.color + '30', item.color + '08']}
                style={[styles.cardInner, { borderColor: colors.border }]}
              >
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
                <Text style={[styles.cardCount, { color: colors.textMuted }]}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <TouchableOpacity
            style={[styles.addCard, { borderColor: colors.border }]}
            onPress={() => setShowNewModal(true)}
          >
            <Text style={[styles.addCardIcon, { color: colors.accent }]}>+</Text>
            <Text style={[styles.addCardText, { color: colors.textMuted }]}>New Collection</Text>
          </TouchableOpacity>
        }
      />

      {/* New Collection Modal */}
      <Modal visible={showNewModal} transparent animationType="fade">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SafeAreaView style={styles.modalTopContainer} edges={['top']}>
            <View style={[styles.modalContent, { backgroundColor: colors.bgCard }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>New Collection</Text>

              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.bgInput, color: colors.text }]}
                placeholder="Collection name"
                placeholderTextColor={colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
                selectionColor={colors.accent}
                autoFocus
              />

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconBtn, { backgroundColor: colors.bgInput }, newIcon === icon && [styles.iconBtnActive, { borderColor: colors.accent }]]}
                    onPress={() => setNewIcon(icon)}
                  >
                    <Text style={styles.iconText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.modalLabel, { color: colors.textSecondary }]}>Colour</Text>
              <View style={styles.colorGrid}>
                {ACCENT_COLORS.map(color => (
                  <TouchableOpacity
                    key={color}
                    style={[styles.colorBtn, { backgroundColor: color }, newColor === color && [styles.colorBtnActive, { borderColor: colors.text }]]}
                    onPress={() => setNewColor(color)}
                  />
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setShowNewModal(false)} style={[styles.cancelBtn, { backgroundColor: colors.bgInput }]}>
                  <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleCreateCollection} style={styles.createBtn}>
                  <LinearGradient colors={[colors.accent, colors.accentLight]} style={styles.createGradient}>
                    <Text style={[styles.createText, { color: colors.text }]}>Create</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
      <KnowledgeBaseButton sectionId="collections" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  headerBar: {
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, position: 'relative',
  },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.md, marginTop: 2 },
  grid: { paddingHorizontal: 12, paddingBottom: 100 },
  gridRow: { gap: 8 },
  collectionCard: {
    flex: 1, marginBottom: 8, borderRadius: SIZES.radiusLg, overflow: 'hidden',
    maxWidth: '50%',
  },
  cardInner: {
    padding: 16, borderRadius: SIZES.radiusLg, minHeight: 120,
    borderWidth: 1,
    justifyContent: 'space-between',
  },
  cardIcon: { fontSize: 32 },
  cardTitle: { fontSize: SIZES.base, fontWeight: '600', marginTop: 8 },
  cardCount: { fontSize: SIZES.xs, marginTop: 4 },
  addCard: {
    margin: 4, borderRadius: SIZES.radiusLg, borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 24, alignItems: 'center', justifyContent: 'center',
  },
  addCardIcon: { fontSize: 32, fontWeight: '300' },
  addCardText: { fontSize: SIZES.sm, marginTop: 4 },
  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 8, gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300' },
  detailTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 24 },
  detailTitle: { fontSize: SIZES.xl, fontWeight: '700' },
  deleteBtn: { fontSize: 20, padding: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 100, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: SIZES.md },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalTopContainer: {
    paddingTop: 8,
  },
  modalContent: {
    borderRadius: SIZES.radiusXl, padding: 24, marginHorizontal: 16,
  },
  modalTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    borderRadius: SIZES.radius,
    padding: 14, fontSize: SIZES.base, marginBottom: 16,
  },
  modalLabel: {
    fontSize: SIZES.sm, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconBtn: {
    width: 44, height: 44, borderRadius: SIZES.radius,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderWidth: 2 },
  iconText: { fontSize: 22 },
  colorGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  colorBtn: {
    width: 36, height: 36, borderRadius: 18,
  },
  colorBtnActive: { borderWidth: 3 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  cancelText: { fontSize: SIZES.base, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden' },
  createGradient: { padding: 14, alignItems: 'center' },
  createText: { fontSize: SIZES.base, fontWeight: '700' },
  // Date picker
  datePickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end',
  },
  datePickerContainer: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  datePickerTitle: { fontSize: SIZES.lg, fontWeight: '700' },
  datePickerCancel: { fontSize: SIZES.md, fontWeight: '600' },
  // Add to Daily modal
  convertOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  convertModal: {
    borderRadius: 20, padding: 24, width: '100%', maxWidth: 360,
  },
  convertTitle: { fontSize: SIZES.lg, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  convertSubtitle: { fontSize: SIZES.sm, textAlign: 'center', marginBottom: 16 },
  convertLabel: { fontSize: SIZES.xs, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  convertActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  convertBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  convertBtnText: { fontSize: SIZES.md, fontWeight: '700' },
});
