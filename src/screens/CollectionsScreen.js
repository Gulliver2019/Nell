import React, { useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../utils/theme';
import { useApp } from '../context/AppContext';
import EntryItem from '../components/EntryItem';
import QuickAdd from '../components/QuickAdd';

const ICONS = ['📋', '🎯', '📚', '💡', '🏃', '🎨', '🛒', '✈️', '💰', '🎵', '🍽️', '🧘', '💼', '🌱', '❤️', '⭐'];
const ACCENT_COLORS = ['#6C5CE7', '#00CEC9', '#FD79A8', '#FDCB6E', '#00B894', '#E17055', '#FF6B6B', '#74B9FF'];

export default function CollectionsScreen() {
  const {
    collections, entries, addCollection, deleteCollection,
    addEntry, updateEntry, deleteEntry, migrateEntry,
  } = useApp();

  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newIcon, setNewIcon] = useState('📋');
  const [newColor, setNewColor] = useState(ACCENT_COLORS[0]);

  const collectionEntries = useMemo(() => {
    if (!selectedCollection) return [];
    return entries
      .filter(e => e.collection === selectedCollection.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
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
    await addEntry({ ...data, collection: selectedCollection.id });
  };

  // Collection detail view
  if (selectedCollection) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.detailHeader}>
          <TouchableOpacity onPress={() => setSelectedCollection(null)} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <View style={styles.detailTitleRow}>
            <Text style={styles.detailIcon}>{selectedCollection.icon}</Text>
            <Text style={styles.detailTitle}>{selectedCollection.title}</Text>
          </View>
          <TouchableOpacity onPress={() => handleDeleteCollection(selectedCollection)}>
            <Text style={styles.deleteBtn}>🗑</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={collectionEntries}
          renderItem={({ item }) => (
            <EntryItem
              entry={item}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
              onMigrate={() => migrateEntry(item.id)}
            />
          )}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{selectedCollection.icon}</Text>
              <Text style={styles.emptyText}>No entries yet</Text>
            </View>
          }
        />

        <QuickAdd onAdd={handleAddEntry} placeholder="Add to collection..." />
      </SafeAreaView>
    );
  }

  // Collections list view
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.headerBar}>
        <LinearGradient
          colors={[COLORS.accentWarm + '15', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.title}>Collections</Text>
        <Text style={styles.subtitle}>Your custom pages</Text>
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
                style={styles.cardInner}
              >
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardCount}>{count} {count === 1 ? 'entry' : 'entries'}</Text>
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
            style={styles.addCard}
            onPress={() => setShowNewModal(true)}
          >
            <Text style={styles.addCardIcon}>+</Text>
            <Text style={styles.addCardText}>New Collection</Text>
          </TouchableOpacity>
        }
      />

      {/* New Collection Modal */}
      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Collection</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Collection name"
              placeholderTextColor={COLORS.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
              selectionColor={COLORS.accent}
              autoFocus
            />

            <Text style={styles.modalLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  style={[styles.iconBtn, newIcon === icon && styles.iconBtnActive]}
                  onPress={() => setNewIcon(icon)}
                >
                  <Text style={styles.iconText}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Colour</Text>
            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map(color => (
                <TouchableOpacity
                  key={color}
                  style={[styles.colorBtn, { backgroundColor: color }, newColor === color && styles.colorBtnActive]}
                  onPress={() => setNewColor(color)}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowNewModal(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreateCollection} style={styles.createBtn}>
                <LinearGradient colors={[COLORS.accent, COLORS.accentLight]} style={styles.createGradient}>
                  <Text style={styles.createText}>Create</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  grid: { paddingHorizontal: 12, paddingBottom: 40 },
  gridRow: { gap: 8 },
  collectionCard: {
    flex: 1, marginBottom: 8, borderRadius: SIZES.radiusLg, overflow: 'hidden',
    maxWidth: '50%',
  },
  cardInner: {
    padding: 16, borderRadius: SIZES.radiusLg, minHeight: 120,
    borderWidth: 1, borderColor: COLORS.border,
    justifyContent: 'space-between',
  },
  cardIcon: { fontSize: 32 },
  cardTitle: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '600', marginTop: 8 },
  cardCount: { color: COLORS.textMuted, fontSize: SIZES.xs, marginTop: 4 },
  addCard: {
    margin: 4, borderRadius: SIZES.radiusLg, borderWidth: 1.5,
    borderColor: COLORS.border, borderStyle: 'dashed',
    padding: 24, alignItems: 'center', justifyContent: 'center',
  },
  addCardIcon: { color: COLORS.accent, fontSize: 32, fontWeight: '300' },
  addCardText: { color: COLORS.textMuted, fontSize: SIZES.sm, marginTop: 4 },
  // Detail view
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8,
    paddingVertical: 8, gap: 8,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: COLORS.accent, fontSize: 32, fontWeight: '300' },
  detailTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailIcon: { fontSize: 24 },
  detailTitle: { color: COLORS.text, fontSize: SIZES.xl, fontWeight: '700' },
  deleteBtn: { fontSize: 20, padding: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 20, flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: SIZES.md },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgCard, borderTopLeftRadius: SIZES.radiusXl,
    borderTopRightRadius: SIZES.radiusXl, padding: 24,
  },
  modalTitle: { color: COLORS.text, fontSize: SIZES.xl, fontWeight: '700', marginBottom: 16 },
  modalInput: {
    backgroundColor: COLORS.bgInput, borderRadius: SIZES.radius,
    padding: 14, color: COLORS.text, fontSize: SIZES.base, marginBottom: 16,
  },
  modalLabel: {
    color: COLORS.textSecondary, fontSize: SIZES.sm, fontWeight: '600',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  iconBtn: {
    width: 44, height: 44, borderRadius: SIZES.radius,
    backgroundColor: COLORS.bgInput, alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderWidth: 2, borderColor: COLORS.accent },
  iconText: { fontSize: 22 },
  colorGrid: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  colorBtn: {
    width: 36, height: 36, borderRadius: 18,
  },
  colorBtnActive: { borderWidth: 3, borderColor: COLORS.text },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, padding: 14, borderRadius: SIZES.radius,
    backgroundColor: COLORS.bgInput, alignItems: 'center',
  },
  cancelText: { color: COLORS.textSecondary, fontSize: SIZES.base, fontWeight: '600' },
  createBtn: { flex: 1, borderRadius: SIZES.radius, overflow: 'hidden' },
  createGradient: { padding: 14, alignItems: 'center' },
  createText: { color: COLORS.text, fontSize: SIZES.base, fontWeight: '700' },
});
