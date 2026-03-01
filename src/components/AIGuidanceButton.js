import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  ActivityIndicator, Animated, Platform,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
let AI_CONFIG;
try {
  AI_CONFIG = require('../utils/aiConfig').AI_CONFIG;
} catch (e) {
  AI_CONFIG = { apiKey: '', model: 'gpt-4o', maxTokens: 1500 };
}
import { SIZES } from '../utils/theme';
import { getDateKey, formatDateShort, getMonthName } from '../utils/storage';
import * as Haptics from 'expo-haptics';

function buildPrompt(data) {
  const { entries, projects, collections, habits, reflections, futureLog } = data;
  const today = getDateKey();

  // Open tasks
  const openTasks = entries.filter(e => e.type === 'task' && e.state === 'open');
  const todayEntries = entries.filter(e => e.date === today);
  const overdue = openTasks.filter(e => e.date && e.date < today);

  // Projects summary
  const projectSummaries = projects.map(p => {
    const todo = p.tasks.filter(t => t.column === 'todo').length;
    const inProgress = p.tasks.filter(t => t.column === 'progress').length;
    const done = p.tasks.filter(t => t.column === 'done').length;
    const taskList = p.tasks
      .filter(t => t.column !== 'done')
      .map(t => `  - [${t.column}] ${t.text}`)
      .join('\n');
    return `${p.emoji} ${p.title}: ${todo} to-do, ${inProgress} in progress, ${done} done\n${taskList}`;
  }).join('\n\n');

  // Future log
  const futureItems = Object.entries(futureLog)
    .filter(([, items]) => items?.length > 0)
    .map(([month, items]) => `${getMonthName(month)}: ${items.map(i => i.text).join(', ')}`)
    .join('\n');

  // Recent reflections
  const recentReflections = reflections
    .slice(0, 3)
    .map(r => {
      const parts = [];
      if (r.gratitude) parts.push(`Gratitude: ${r.gratitude}`);
      if (r.wins) parts.push(`Wins: ${r.wins}`);
      if (r.challenges) parts.push(`Challenges: ${r.challenges}`);
      if (r.tomorrow) parts.push(`Tomorrow focus: ${r.tomorrow}`);
      if (r.mood) parts.push(`Mood: ${r.mood}`);
      return `${r.date}: ${parts.join(' | ')}`;
    })
    .join('\n');

  // Habits
  const habitSummary = habits.map(h => {
    const streak = h.streak || 0;
    return `${h.name}: ${streak} day streak`;
  }).join(', ');

  return `You are an expert productivity coach and execution strategist. Review the following bullet journal data and provide clear, actionable execution guidance.

TODAY: ${today}

OPEN TASKS (${openTasks.length} total, ${overdue.length} overdue):
${openTasks.slice(0, 20).map(t => `- ${t.text} (${t.date ? formatDateShort(t.date) : 'no date'}${t.signifier === 'priority' ? ' ⚠️ PRIORITY' : ''})`).join('\n')}

TODAY'S LOG (${todayEntries.length} entries):
${todayEntries.map(t => `- [${t.type}/${t.state || ''}] ${t.text}`).join('\n') || 'Nothing logged yet'}

PROJECTS:
${projectSummaries || 'No projects'}

FUTURE LOG:
${futureItems || 'Empty'}

RECENT REFLECTIONS:
${recentReflections || 'None'}

HABITS: ${habitSummary || 'None tracked'}

COLLECTIONS: ${collections.map(c => c.title).join(', ') || 'None'}

Please provide:
1. **Priority Focus** — What should I tackle first today and why?
2. **Overdue Review** — Any overdue tasks that need immediate action or should be cancelled?
3. **Project Execution** — For each active project, what's the next concrete step? Are any project tasks missing from my daily system?
4. **Weekly Rhythm** — Based on my patterns, what should I schedule for the coming days?
5. **Quick Wins** — 2-3 small tasks I could knock out fast to build momentum.
6. **One Insight** — A pattern or observation from my data that could help me be more effective.

Be direct, specific and actionable. Reference my actual tasks and projects by name. Keep it concise.`;
}

export default function AIGuidanceButton() {
  const { colors } = useTheme();
  const appData = useApp();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const [error, setError] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const fetchGuidance = useCallback(async () => {
    if (!AI_CONFIG.apiKey) {
      setError('API key not configured. Add your key to src/utils/aiConfig.js');
      setVisible(true);
      return;
    }
    setLoading(true);
    setError(null);
    setGuidance(null);

    try {
      const prompt = buildPrompt(appData);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: [
            { role: 'system', content: 'You are Goal Digger AI — a sharp, motivating productivity coach built into a bullet journal app. Be direct, use bullet points, and reference the user\'s actual data. Use emoji sparingly for emphasis.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: AI_CONFIG.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`API error ${response.status}: ${errBody}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from AI');

      setGuidance(text);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appData]);

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisible(true);
    fetchGuidance();
  }, [fetchGuidance]);

  const handleClose = useCallback(() => {
    setVisible(false);
  }, []);

  return (
    <>
      {/* Floating AI button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentGold || colors.accent }]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Text style={styles.fabText}>✨</Text>
      </TouchableOpacity>

      {/* Guidance modal */}
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
        <View style={[styles.overlay, { backgroundColor: colors.bg + 'F8' }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>✨ AI Guidance</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your personalised execution plan</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Analysing your journal...
                </Text>
              </View>
            )}

            {error && (
              <View style={[styles.errorCard, { backgroundColor: colors.accentRed + '15', borderColor: colors.accentRed + '30' }]}>
                <Text style={[styles.errorText, { color: colors.accentRed }]}>⚠️ {error}</Text>
                <TouchableOpacity
                  style={[styles.retryBtn, { backgroundColor: colors.accentRed + '20' }]}
                  onPress={fetchGuidance}
                >
                  <Text style={[styles.retryText, { color: colors.accentRed }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {guidance && (
              <View style={[styles.guidanceCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.guidanceText, { color: colors.text }]}>{guidance}</Text>
              </View>
            )}

            {guidance && (
              <TouchableOpacity
                style={[styles.refreshBtn, { backgroundColor: colors.accent + '15' }]}
                onPress={fetchGuidance}
              >
                <Text style={[styles.refreshText, { color: colors.accent }]}>🔄 Refresh Guidance</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 155,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    fontSize: 22,
  },

  overlay: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: SIZES.sm,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontSize: 22,
    fontWeight: '300',
  },

  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingTop: 80,
    gap: 16,
  },
  loadingText: {
    fontSize: SIZES.md,
    fontWeight: '500',
  },

  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  errorText: {
    fontSize: SIZES.sm,
    lineHeight: 20,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },

  guidanceCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  guidanceText: {
    fontSize: SIZES.md,
    lineHeight: 24,
  },

  refreshBtn: {
    alignSelf: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  refreshText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
});
