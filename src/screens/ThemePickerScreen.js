import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48 - 12) / 2;

// Mini preview of what the app looks like in each theme
function ThemePreviewCard({ themeData, isSelected, onPress }) {
  const c = themeData.colors;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: c.bgCard, borderColor: isSelected ? c.accent : c.border },
        isSelected && { borderWidth: 2.5 },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Mini app preview */}
      <View style={[styles.preview, { backgroundColor: c.bg }]}>  
        {/* Status bar mock */}
        <View style={[styles.previewHeader, { backgroundColor: c.bgCard }]}>
          <View style={[styles.previewDot, { backgroundColor: c.accent }]} />
          <View style={[styles.previewLine, { backgroundColor: c.textMuted, width: 36 }]} />
          <View style={{ width: 8 }} />
        </View>

        {/* Entry lines mock */}
        <View style={styles.previewBody}>
          {[c.text, c.accentGreen, c.text, c.accentSecondary].map((color, i) => (
            <View key={i} style={styles.previewEntryRow}>
              <View style={[styles.previewBullet, { backgroundColor: color }]} />
              <View style={[styles.previewEntryLine, {
                backgroundColor: c.textMuted + '40',
                width: [52, 40, 60, 34][i],
              }]} />
            </View>
          ))}
        </View>

        {/* Tab bar mock */}
        <View style={[styles.previewTabBar, { backgroundColor: c.tabBar, borderTopColor: c.border }]}>
          {[c.accent, c.textMuted, c.textMuted, c.textMuted].map((color, i) => (
            <View key={i} style={[styles.previewTab, { backgroundColor: color }]} />
          ))}
        </View>
      </View>

      {/* Colour swatches */}
      <View style={styles.swatches}>
        {themeData.preview.map((color, i) => (
          <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
        ))}
      </View>

      {/* Label */}
      <Text style={[styles.cardName, { color: c.text }]}>{themeData.name}</Text>
      <Text style={[styles.cardCategory, { color: c.accent }]}>{themeData.category}</Text>
      <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={1}>
        {themeData.description}
      </Text>

      {/* Selected indicator */}
      {isSelected && (
        <View style={[styles.selectedBadge, { backgroundColor: c.accent }]}>
          <Text style={styles.selectedCheck}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function ThemePickerScreen({ isFirstLaunch = false, onDone, navigation }) {
  const { themes, themeId, colors, selectTheme, confirmThemeChoice } = useTheme();

  const handleSelect = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    selectTheme(id);
  };

  const handleConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    confirmThemeChoice();
    if (onDone) {
      onDone();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };

  const themeList = Object.values(themes);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={[colors.accent + '20', 'transparent']}
            style={StyleSheet.absoluteFillObject}
          />
          {isFirstLaunch ? (
            <>
              <Text style={[styles.welcomeEmoji]}>✦</Text>
              <Text style={[styles.title, { color: colors.text }]}>Make it yours</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Choose a theme that fits your style.{'\n'}You can always change it later.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.title, { color: colors.text }]}>Themes</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Switch up your vibe
              </Text>
            </>
          )}
        </View>

        {/* Theme grid */}
        <View style={styles.grid}>
          {themeList.map((t) => (
            <ThemePreviewCard
              key={t.id}
              themeData={t}
              isSelected={themeId === t.id}
              onPress={() => handleSelect(t.id)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Confirm button */}
      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={handleConfirm} style={styles.confirmBtn}>
          <LinearGradient
            colors={[colors.accent, colors.accentLight]}
            style={styles.confirmGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={[styles.confirmText, { color: colors.textInverse || '#000' }]}>
              {isFirstLaunch ? "Let's go" : 'Done'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingBottom: 20 },
  header: {
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: 20,
    alignItems: 'center', position: 'relative',
  },
  welcomeEmoji: { fontSize: 40, marginBottom: 8, color: '#6C5CE7' },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: {
    fontSize: 15, fontWeight: '500', textAlign: 'center',
    marginTop: 6, lineHeight: 22,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 18, gap: 12,
    justifyContent: 'center',
  },
  card: {
    width: CARD_WIDTH, borderRadius: 16,
    borderWidth: 1, padding: 10,
    position: 'relative', overflow: 'hidden',
  },
  preview: {
    borderRadius: 10, overflow: 'hidden',
    height: 100, marginBottom: 8,
  },
  previewHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 6, paddingVertical: 5, gap: 4,
  },
  previewDot: { width: 6, height: 6, borderRadius: 3 },
  previewLine: { height: 4, borderRadius: 2 },
  previewBody: { flex: 1, paddingHorizontal: 8, paddingTop: 4, gap: 5 },
  previewEntryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  previewBullet: { width: 4, height: 4, borderRadius: 2 },
  previewEntryLine: { height: 3, borderRadius: 1.5 },
  previewTabBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 4, borderTopWidth: 0.5,
  },
  previewTab: { width: 10, height: 3, borderRadius: 1.5 },
  swatches: {
    flexDirection: 'row', gap: 4, marginBottom: 8, justifyContent: 'center',
  },
  swatch: { width: 20, height: 20, borderRadius: 10 },
  cardName: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  cardCategory: {
    fontSize: 10, fontWeight: '700', textAlign: 'center',
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 2,
  },
  cardDesc: { fontSize: 11, textAlign: 'center', marginTop: 2 },
  selectedBadge: {
    position: 'absolute', top: 8, right: 8,
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  selectedCheck: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  footer: {
    paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 0.5,
  },
  confirmBtn: { borderRadius: 14, overflow: 'hidden' },
  confirmGradient: { paddingVertical: 16, alignItems: 'center' },
  confirmText: { fontSize: 17, fontWeight: '700' },
});
