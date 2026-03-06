import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, LayoutAnimation,
  Platform, UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { SIZES } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const SECTIONS = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: '🚀',
    items: [
      {
        q: 'What is Nell?',
        a: 'Nell is a digital bullet journal — a beautifully simple system for organising your tasks, events, notes, habits and reflections. The approach we use in this app follows the popular bullet journaling technique, built for your phone.',
      },
      {
        q: 'What is a bullet journal?',
        a: 'A bullet journal (or BuJo) is a rapid-logging system invented by Ryder Carroll. It uses short bullets to capture tasks, events and notes quickly. The key idea: write less, but write what matters.',
      },
    ],
  },
  {
    id: 'rapid-logging',
    title: 'Rapid Logging',
    icon: '⚡',
    items: [
      {
        q: 'What are the bullet types?',
        a: '• Task — something you need to do\n○ Event — something that happened or is scheduled\n— Note — a thought, fact or idea worth remembering',
      },
      {
        q: 'How do I add an entry?',
        a: 'Tap the + button at the bottom of the Daily Log. Choose the entry type, add signifiers if needed, and type your note. You can also assign a time block or pomodoro count.',
      },
      {
        q: 'What are signifiers?',
        a: 'Signifiers are markers you add to any entry for extra meaning:\n\n!  Priority — this is important\n★  Inspiration — a great idea or spark\n?  Explore — something to research later\n\nTap the dot to the left of the bullet to cycle through them.',
      },
    ],
  },
  {
    id: 'task-states',
    title: 'Task States',
    icon: '✓',
    items: [
      {
        q: 'How do I complete a task?',
        a: 'Tap the bullet symbol (•) to mark it as done (✕). Tap again to cancel it (—). Tap once more to reopen it.',
      },
      {
        q: 'What do the different symbols mean?',
        a: '•  Open — still needs doing\n✕  Done — crushed it!\n>  Migrated — moved forward to today\n<  Scheduled — moved to a future date\n—  Cancelled — no longer needed',
      },
      {
        q: 'How do I edit an entry?',
        a: 'Long-press on any entry text to edit it inline.',
      },
    ],
  },
  {
    id: 'migration',
    title: 'Migration & Scheduling',
    icon: '📦',
    items: [
      {
        q: 'What is migration?',
        a: 'Migration is the heart of bullet journaling. At the end of each day (or week), review your open tasks. If a task is still relevant, migrate it forward. If not, cancel it. This keeps your list intentional.',
      },
      {
        q: 'How do I migrate a task?',
        a: 'Swipe an open task to the right → to migrate it to today. The original gets marked with > and a fresh copy appears in today\'s log.',
      },
      {
        q: 'How do I schedule a task?',
        a: 'Swipe an open task to the left ← to schedule it. You can move it to tomorrow or next week. The original gets marked with < and appears on the chosen date.',
      },
      {
        q: 'Where can I review overdue tasks?',
        a: 'Go to the More tab — the Migration Review section shows all open tasks from past days. You can migrate or cancel them in bulk.',
      },
    ],
  },
  {
    id: 'daily-log',
    title: 'Daily Log',
    icon: '📅',
    items: [
      {
        q: 'What is the Daily Log?',
        a: 'Your daily log is today\'s page. It\'s where you rapid-log tasks, events and notes as they come up throughout the day. Keep it simple — just capture what matters.',
      },
      {
        q: 'How do I navigate between days?',
        a: 'Use the ‹ and › arrows at the top to move between days. Tap the date to jump back to today.',
      },
      {
        q: 'What does the progress bar show?',
        a: 'It shows how many of today\'s tasks you\'ve completed. Chase that 100%!',
      },
      {
        q: 'What does the NEXT badge mean?',
        a: 'In the time block view, the first incomplete time-blocked task is highlighted with a green NEXT badge. It stays on that task until you complete it or remove it from the time block — it won\'t skip ahead.',
      },
    ],
  },
  {
    id: 'monthly-log',
    title: 'Monthly Log',
    icon: '📆',
    items: [
      {
        q: 'What is the Monthly Log?',
        a: 'A bird\'s-eye view of your month. The calendar shows activity dots for days with entries, and the task overview lists every task for the month with its current state.',
      },
      {
        q: 'What do the coloured dots mean?',
        a: 'Purple dot — tasks exist that day\nGreen dot — all tasks completed\nTeal dot — events logged\nRed dot — priority items',
      },
      {
        q: 'How do I move a monthly entry to my daily?',
        a: 'Tap the green "→ Daily" button next to any monthly entry. Pick a date and the entry will be copied to that day\'s daily log. A ✓ badge appears once it\'s been added.',
      },
    ],
  },
  {
    id: 'future-log',
    title: 'Future Log',
    icon: '🔮',
    items: [
      {
        q: 'What is the Future Log?',
        a: 'The future log lets you plan months ahead. Add tasks, events or notes to any of the next 6 months. Perfect for birthdays, deadlines, goals and things you don\'t want to forget.',
      },
    ],
  },
  {
    id: 'collections',
    title: 'Collections',
    icon: '📚',
    items: [
      {
        q: 'What are Collections?',
        a: 'Collections are custom themed pages for anything that doesn\'t fit in your daily log. Think: reading lists, project plans, recipes, gift ideas, travel packing lists — anything you want to group together.',
      },
      {
        q: 'How do I create one?',
        a: 'Go to the Collections tab and tap "+ New Collection". Choose a name, icon and colour. Then add entries just like you would in the daily log.',
      },
      {
        q: 'How do I delete a collection?',
        a: 'Long-press on a collection card to delete it. Warning: this removes all entries inside it too.',
      },
      {
        q: 'How do I add a collection entry to my daily?',
        a: 'Each entry in a collection has a green "→ Daily" button. Tap it, pick a date, and the entry is copied to that day\'s daily log. You can also swipe left on an entry to schedule it to a specific date.',
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    icon: '📋',
    items: [
      {
        q: 'How do Projects work?',
        a: 'Projects have a kanban-style board with three columns: To Do, In Progress and Done. Use the ‹ › arrow buttons to move tasks between columns, and long-press to drag and reorder tasks within a column.',
      },
      {
        q: 'How do I create a project?',
        a: 'Go to the Projects tab and tap "+ New Project". Give it a name, emoji, colour and optional timeline. Add tasks with the + button inside each column.',
      },
      {
        q: 'How do I read or edit a task?',
        a: 'Tap the task text to expand it and see the full content. Long-press the task text to open an edit modal where you can update it.',
      },
      {
        q: 'How do I add a project task to my daily?',
        a: 'Tap the green "→ Daily" button on any task card. Pick a date and it\'ll be copied to that day\'s daily log with a 🎯 badge so you know it came from a project.',
      },
    ],
  },
  {
    id: 'time-blocking',
    title: 'Time Blocking',
    icon: '🧱',
    items: [
      {
        q: 'What is time blocking?',
        a: 'Time blocking assigns your tasks to specific time slots in your day. Switch to the time block view on the Daily Log to see a visual timeline from 5am to 10pm.',
      },
      {
        q: 'How do I assign a task?',
        a: 'Tap an unscheduled task chip at the top, then tap the time slot where you want to place it. Tasks auto-fill based on their pomodoro count (1 pomodoro = 30 minutes).',
      },
      {
        q: 'How do I remove a time block?',
        a: 'Long-press on a scheduled block to unassign it from the timeline.',
      },
    ],
  },
  {
    id: 'pomodoro',
    title: 'Pomodoro Timer',
    icon: '🍅',
    items: [
      {
        q: 'What is the Pomodoro technique?',
        a: 'Work in focused 25-minute sessions (called pomodoros), followed by short 5-minute breaks. After 4 sessions, take a longer 15-minute break. It helps maintain deep focus.',
      },
      {
        q: 'How do I use the timer?',
        a: 'On the time block view, tap the floating 🍅 button or tap any scheduled task to open the full-screen Pomodoro timer. Controls: play/pause, reset and skip to next phase.',
      },
      {
        q: 'Will I get notified?',
        a: 'Yes! When a session ends, you\'ll receive a notification and see a celebration screen with a motivational message.',
      },
    ],
  },
  {
    id: 'shopping-list',
    title: 'Shopping List',
    icon: '🛒',
    items: [
      {
        q: 'How does the Shopping List work?',
        a: 'Just type an item name and tap +. Nell automatically sorts it into the right aisle — milk goes to Dairy, bread to Bakery, chicken to Meat, and so on. No need to pick a category yourself.',
      },
      {
        q: 'How do I edit an item?',
        a: 'Tap any item to open the edit screen. You can change the name, category, quantity, and add notes (e.g. "get the big one" or "Lurpak brand"). Notes appear under the item on your list.',
      },
      {
        q: 'Can I reorder items?',
        a: 'Yes — long-press and drag an item to reorder it within its category. You can also reorder entire category sections using the ▲ ▼ arrows in the section headers to match your shop layout.',
      },
      {
        q: 'How do I delete an item?',
        a: 'Long-press an item and confirm to delete it. Or check off items as you shop, then use "Clear Checked" to remove them all at once.',
      },
      {
        q: 'What if an item ends up in the wrong category?',
        a: 'Tap the item to edit it, then change the category from the dropdown. The auto-categoriser learns from common product names but you can always override it.',
      },
    ],
  },
  {
    id: 'habit-tracker',
    title: 'Habit Tracker',
    icon: '💪',
    items: [
      {
        q: 'How does the habit tracker work?',
        a: 'Add habits you want to build (exercise, reading, water, etc). Each day, tap the cell to mark it done. The tracker shows the last 7 days and counts your current streak.',
      },
      {
        q: 'What are streaks?',
        a: 'A streak counts how many consecutive days you\'ve completed a habit. The 🔥 icon shows your current streak. Don\'t break the chain!',
      },
      {
        q: 'How do I remove a habit?',
        a: 'Long-press on a habit row to delete it.',
      },
    ],
  },
  {
    id: 'reflection',
    title: 'Reflection',
    icon: '🪞',
    items: [
      {
        q: 'What is Reflection?',
        a: 'Reflection is where you pause and look back. Answer prompts about gratitude, wins, challenges and tomorrow\'s focus. Choose between daily and weekly reflection.',
      },
      {
        q: 'What are the mood emojis?',
        a: '😞 Rough · 😐 Meh · 🙂 Okay · 😊 Good · 🔥 Crushed it\n\nTracking your mood over time helps you spot patterns and celebrate progress.',
      },
      {
        q: 'Where do I see past reflections?',
        a: 'Tap "History" at the top right of the Reflect tab to browse all your previous entries.',
      },
    ],
  },
  {
    id: 'index-search',
    title: 'Index & Search',
    icon: '🔍',
    items: [
      {
        q: 'What is the Index?',
        a: 'The Index is your master directory — a dashboard showing open tasks, projects, collections and monthly summaries at a glance. It also has a powerful search that covers everything in your journal.',
      },
      {
        q: 'How do I find something?',
        a: 'Type in the search bar to search across all your content — daily entries, monthly entries, future log, project tasks and collection entries. Each result shows where it lives and tapping it takes you straight there.',
      },
    ],
  },
];

function AccordionItem({ item, initialOpen }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(initialOpen || false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  return (
    <TouchableOpacity onPress={toggle} style={[styles.accordionItem, { borderTopColor: colors.border }]} activeOpacity={0.7}>
      <View style={styles.questionRow}>
        <Text style={[styles.questionText, { color: colors.text }]}>{item.q}</Text>
        <Text style={[styles.chevron, { color: colors.accent }]}>{open ? '−' : '+'}</Text>
      </View>
      {open && (
        <Text style={[styles.answerText, { color: colors.textSecondary }]}>{item.a}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function HelpScreen({ navigation, route, embedded }) {
  const { colors } = useTheme();
  const sectionId = route?.params?.sectionId;
  const scrollRef = useRef(null);
  const sectionLayouts = useRef({});
  const hasScrolled = useRef(false);

  const handleSectionLayout = useCallback((id, event) => {
    sectionLayouts.current[id] = event.nativeEvent.layout.y;
  }, []);

  useEffect(() => {
    if (sectionId && !hasScrolled.current) {
      const timer = setTimeout(() => {
        const y = sectionLayouts.current[sectionId];
        if (y != null && scrollRef.current) {
          scrollRef.current.scrollTo({ y: y - 10, animated: true });
          hasScrolled.current = true;
        }
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [sectionId]);

  // Reset scroll tracking when sectionId changes
  useEffect(() => {
    hasScrolled.current = false;
  }, [sectionId]);

  const Wrapper = embedded ? View : SafeAreaView;
  const wrapperProps = embedded ? { style: [styles.safe, { backgroundColor: colors.bg }] } : { style: [styles.safe, { backgroundColor: colors.bg }], edges: ['top'] };
  return (
    <Wrapper {...wrapperProps}>
      {/* Header */}
      {!embedded && (
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.accentGold + '18', 'transparent']}
          style={StyleSheet.absoluteFillObject}
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={[styles.backArrow, { color: colors.accent }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>How It Works</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your guide to crushing it</Text>
        </View>
      </View>
      )}

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Quick reference card */}
        <View style={styles.quickRef}>
          <LinearGradient
            colors={[colors.accent + '20', colors.accentSecondary + '10']}
            style={[styles.quickRefGradient, { borderColor: colors.border }]}
          >
            <Text style={[styles.quickRefTitle, { color: colors.text }]}>Quick Reference</Text>
            <View style={styles.quickRefGrid}>
              <View style={styles.quickRefCol}>
                <Text style={[styles.quickRefHeader, { color: colors.textSecondary }]}>Bullets</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.text }}>•</Text>  Task</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentSecondary }}>○</Text>  Event</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.textSecondary }}>—</Text>  Note</Text>
              </View>
              <View style={styles.quickRefCol}>
                <Text style={[styles.quickRefHeader, { color: colors.textSecondary }]}>States</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentGreen }}>✕</Text>  Done</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentOrange }}>{'>'}</Text>  Migrated</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accent }}>{'<'}</Text>  Scheduled</Text>
              </View>
              <View style={styles.quickRefCol}>
                <Text style={[styles.quickRefHeader, { color: colors.textSecondary }]}>Signifiers</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentRed }}>!</Text>  Priority</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentGold }}>★</Text>  Inspiration</Text>
                <Text style={[styles.quickRefLine, { color: colors.text }]}><Text style={{ color: colors.accentSecondary }}>?</Text>  Explore</Text>
              </View>
            </View>

            <View style={[styles.gesturesRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.quickRefHeader, { color: colors.textSecondary }]}>Gestures</Text>
              <View style={styles.gestureItem}>
                <Text style={[styles.gestureKey, { color: colors.accent }]}>Tap •</Text>
                <Text style={[styles.gestureVal, { color: colors.textSecondary }]}>Cycle task state</Text>
              </View>
              <View style={styles.gestureItem}>
                <Text style={[styles.gestureKey, { color: colors.accent }]}>Long press</Text>
                <Text style={[styles.gestureVal, { color: colors.textSecondary }]}>Edit entry text</Text>
              </View>
              <View style={styles.gestureItem}>
                <Text style={[styles.gestureKey, { color: colors.accent }]}>Swipe →</Text>
                <Text style={[styles.gestureVal, { color: colors.textSecondary }]}>Migrate to today</Text>
              </View>
              <View style={styles.gestureItem}>
                <Text style={[styles.gestureKey, { color: colors.accent }]}>Swipe ←</Text>
                <Text style={[styles.gestureVal, { color: colors.textSecondary }]}>Schedule forward</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Accordion sections */}
        {SECTIONS.map((section, idx) => {
          const isTarget = section.id === sectionId;
          return (
          <View
            key={idx}
            onLayout={(e) => handleSectionLayout(section.id, e)}
            style={[
              styles.section,
              { backgroundColor: colors.bgCard, borderColor: isTarget ? colors.accent : colors.border },
              isTarget && { borderWidth: 2 },
            ]}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>{section.icon}</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            {section.items.map((item, i) => (
              <AccordionItem key={i} item={item} initialOpen={isTarget} />
            ))}
          </View>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerEmoji}>💜</Text>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Built with love. Now go dig those goals.</Text>
        </View>
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingRight: 20,
    paddingTop: 4, paddingBottom: 12, position: 'relative',
  },
  backBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 32, fontWeight: '300' },
  headerContent: { flex: 1 },
  title: { fontSize: SIZES.xxl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.md, marginTop: 2 },
  content: { paddingHorizontal: 16, paddingBottom: 40 },

  // Quick reference
  quickRef: { borderRadius: SIZES.radiusLg, overflow: 'hidden', marginBottom: 20 },
  quickRefGradient: {
    padding: 16, borderRadius: SIZES.radiusLg,
    borderWidth: 1,
  },
  quickRefTitle: {
    fontSize: SIZES.lg, fontWeight: '700', marginBottom: 12,
  },
  quickRefGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  quickRefCol: { flex: 1 },
  quickRefHeader: {
    fontSize: SIZES.xs, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  quickRefLine: {
    fontSize: SIZES.sm, lineHeight: 22, fontWeight: '500',
  },
  gesturesRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  gestureItem: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3,
  },
  gestureKey: { fontSize: SIZES.sm, fontWeight: '600' },
  gestureVal: { fontSize: SIZES.sm },

  // Sections
  section: {
    borderRadius: SIZES.radiusLg,
    marginBottom: 12, borderWidth: 1,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 16, paddingBottom: 4,
  },
  sectionIcon: { fontSize: 20 },
  sectionTitle: { fontSize: SIZES.base, fontWeight: '700' },

  // Accordion
  accordionItem: {
    paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  questionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  questionText: {
    fontSize: SIZES.md, fontWeight: '600', flex: 1, paddingRight: 12,
  },
  chevron: {
    fontSize: SIZES.lg, fontWeight: '300', width: 20, textAlign: 'center',
  },
  answerText: {
    fontSize: SIZES.md, lineHeight: 22,
    marginTop: 8,
  },

  // Footer
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerEmoji: { fontSize: 28, marginBottom: 4 },
  footerText: { fontSize: SIZES.sm, fontWeight: '500' },
});
