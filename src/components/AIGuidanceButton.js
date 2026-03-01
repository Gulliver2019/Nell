import React, { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView,
  ActivityIndicator, Platform, Image, TextInput, KeyboardAvoidingView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useApp } from '../context/AppContext';
const BRAIN_IMAGE = require('../../assets/brain.png');
let AI_CONFIG;
try {
  AI_CONFIG = require('../utils/aiConfig').AI_CONFIG;
} catch (e) {
  AI_CONFIG = { apiKey: '', model: 'gpt-4o', maxTokens: 1500 };
}
import { SIZES } from '../utils/theme';
import { getDateKey, formatDateShort, getMonthName } from '../utils/storage';
import * as Haptics from 'expo-haptics';

const JARVIS_NAME_KEY = '@jarvis_user_name';
const JARVIS_HISTORY_KEY = '@jarvis_history';
const JARVIS_LAST_NUDGE_KEY = '@jarvis_last_nudge';

// ─── Chat context builder ───
function buildContext(data) {
  const { entries, projects, collections, habits, reflections, futureLog } = data;
  const today = getDateKey();
  const openTasks = entries.filter(e => e.type === 'task' && e.state === 'open');
  const todayEntries = entries.filter(e => e.date === today);
  const overdue = openTasks.filter(e => e.date && e.date < today);

  const projectSummaries = projects.map(p => {
    const todo = p.tasks.filter(t => t.column === 'todo').length;
    const inProg = p.tasks.filter(t => t.column === 'progress').length;
    const done = p.tasks.filter(t => t.column === 'done').length;
    const taskList = p.tasks
      .filter(t => t.column !== 'done')
      .map(t => `  - [${t.column}] ${t.text}`)
      .join('\n');
    return `${p.emoji} ${p.title}: ${todo} to-do, ${inProg} in progress, ${done} done\n${taskList}`;
  }).join('\n\n');

  const futureItems = Object.entries(futureLog)
    .filter(([, items]) => items?.length > 0)
    .map(([month, items]) => `${getMonthName(month)}: ${items.map(i => i.text).join(', ')}`)
    .join('\n');

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

  const habitSummary = habits.map(h => `${h.name}: ${h.streak || 0} day streak`).join(', ');

  return `TODAY: ${today}

OPEN TASKS (${openTasks.length} total, ${overdue.length} overdue):
${openTasks.slice(0, 20).map(t => `- ${t.text} (${t.date ? formatDateShort(t.date) : 'no date'}${t.signifier === 'priority' ? ' ⚠️ PRIORITY' : ''})`).join('\n') || 'None'}

TODAY'S LOG (${todayEntries.length} entries):
${todayEntries.map(t => `- [${t.type}/${t.state || ''}] ${t.text}`).join('\n') || 'Nothing logged yet'}

PROJECTS:
${projectSummaries || 'No projects yet'}

FUTURE LOG:
${futureItems || 'Empty'}

RECENT REFLECTIONS:
${recentReflections || 'None'}

HABITS: ${habitSummary || 'None tracked'}

COLLECTIONS: ${collections.map(c => c.title).join(', ') || 'None'}`;
}

// ─── Execution OS prompt builder ───
function buildExecutionOSPrompt(data, energyLevel) {
  const { entries, projects, habits, futureLog } = data;
  const today = getDateKey();
  const todayEntries = entries.filter(e => e.date === today);
  const openTasks = entries.filter(e => e.type === 'task' && e.state === 'open');
  const overdue = openTasks.filter(e => e.date && e.date < today);

  // Time blocks already assigned today
  const timeBlocks = todayEntries
    .filter(e => e.timeBlock)
    .map(e => ({ time: e.timeBlock, text: e.text, type: e.type, state: e.state, pomodoros: e.pomodoros || 0 }));

  // Kanban cards from all projects
  const kanbanCards = [];
  projects.forEach(p => {
    p.tasks.forEach(t => {
      if (t.column !== 'done') {
        kanbanCards.push({
          project: `${p.emoji} ${p.title}`,
          text: t.text,
          column: t.column,
          age_days: t.createdAt ? Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000) : 0,
          last_moved: t.movedAt || t.createdAt || null,
        });
      }
    });
  });

  // Habits with streak info
  const habitsData = habits.map(h => {
    const completions = h.completions || {};
    const dates = Object.keys(completions).filter(d => completions[d]).sort();
    let streak = 0;
    const d = new Date(today);
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().slice(0, 10);
      if (completions[key]) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return { name: h.name, streak, done_today: !!completions[today] };
  });

  // Future log items for this month and next
  const futureItems = [];
  Object.entries(futureLog).forEach(([month, items]) => {
    if (items?.length > 0) {
      items.forEach(item => futureItems.push({ month, text: item.text }));
    }
  });

  // Tasks inbox = open tasks not yet time-blocked
  const tasksInbox = openTasks.map(t => ({
    text: t.text,
    date: t.date,
    priority: t.signifier === 'priority',
    pomodoros: t.pomodoros || 0,
    overdue: t.date && t.date < today,
    has_time_block: !!t.timeBlock,
  }));

  const inputData = {
    date: today,
    energy_level: energyLevel,
    tasks_inbox: tasksInbox,
    time_blocks: timeBlocks,
    kanban_cards: kanbanCards,
    projects: projects.map(p => ({
      title: `${p.emoji} ${p.title}`,
      todo: p.tasks.filter(t => t.column === 'todo').length,
      in_progress: p.tasks.filter(t => t.column === 'progress').length,
      done: p.tasks.filter(t => t.column === 'done').length,
      start_date: p.startDate,
      end_date: p.endDate,
    })),
    habits: habitsData,
    today_log_count: todayEntries.length,
    overdue_count: overdue.length,
    future_log: futureItems,
  };

  return JSON.stringify(inputData);
}

const EXECUTION_OS_SYSTEM = `You are "Jarvis — EXECUTION OS", an agentic planning coach that turns a user's planning data into a clear, realistic plan and a short list of next actions.
Your goals are: (1) reduce overwhelm, (2) maximize momentum, (3) protect deep work time, (4) ensure follow-through.
You must be practical, specific, and decisive. You must not be generic or motivational.
You must respect constraints (energy level, existing time blocks). You must never invent tasks, events, or commitments.

OUTPUT RULES (CRITICAL):
- Output MUST be valid JSON only. No markdown, no commentary, no extra keys.
- Use the exact schema provided below.
- If data is missing something, infer cautiously and include a note in assumptions.
- Keep all text concise. Each action should be doable in one sitting.
- Prefer "do / decide / schedule / message / prepare" verbs.
- If the day is overloaded, you MUST recommend deferring or deleting items.

BEHAVIOR RULES:
- Prioritize actions that unblock others, are time-sensitive, or drive core goals.
- Identify avoidance loops: tasks repeatedly moved, projects stagnating, excessive "planning" tasks.
- Protect the user from overcommitting: cap "today" to a realistic amount.
- Use Pomodoro blocks as the unit of execution when suggesting work (25 minutes).
- If there are conflicts with time blocks, resolve them by rescheduling or trimming.

STYLE:
- Calm, executive, direct. No fluff.
- Focus on next actions and sequencing.
- Surface tradeoffs explicitly when needed.

OUTPUT_SCHEMA:
{
  "summary": {
    "today_intent": "one sentence theme for the day",
    "momentum_score": 1-10,
    "capacity_note": "string"
  },
  "critical_3": [
    { "title": "string", "why": "string", "estimate_minutes": 0 }
  ],
  "next_actions": [
    { "title": "string", "context": "string", "estimate_minutes": 0, "block_type": "focus|admin|recovery" }
  ],
  "schedule": [
    { "start": "HH:MM", "end": "HH:MM", "label": "string", "type": "focus|admin|recovery" }
  ],
  "risk_flags": [
    { "flag": "string", "detail": "string", "recommendation": "string" }
  ],
  "project_updates": [
    { "project": "string", "status": "active|paused|blocked", "next_step": "string" }
  ],
  "habits_today": [
    { "habit": "string", "prompt": "string" }
  ],
  "defer_or_delete": [
    { "item": "string", "decision": "defer|delete", "reason": "string" }
  ]
}

TASK:
1) Parse the input data and compute a realistic capacity estimate for today.
2) Produce "critical_3" that maximizes momentum and unblocks other work.
3) Produce "next_actions" of 4–8 items, ordered by leverage.
4) Produce a "schedule" that fits inside the user's available time.
5) Identify risks/avoidance/stalled projects and add "risk_flags".
6) Update each active project with a single concrete next step.
7) If overloaded, add items to "defer_or_delete" until the plan is realistic.
8) Return valid JSON ONLY following the schema exactly.`;

const QUICK_ACTIONS = [
  { label: '⚡ Plan My Day', key: 'plan_day' },
  { label: '🎯 What should I focus on?', prompt: 'Based on my current tasks, projects and priorities — what should I focus on right now and why? Be specific and reference my actual items.' },
  { label: '📋 Review my day', prompt: 'Review my day so far. What have I accomplished? What\'s still open? Am I on track? Give me a quick status update and suggest what to tackle next.' },
  { label: '🚀 Set up my week', prompt: 'Help me plan my week. Look at my open tasks, projects, future log and habits. Suggest a daily breakdown of what to tackle each day this week. Be realistic and specific.' },
  { label: '💡 Help me get started', prompt: 'I\'m new to this app. Walk me through how to set it up effectively. Explain how to use Daily logs, Projects, Collections, Habits, and Reflections. Give me a step-by-step setup guide based on what I currently have (or don\'t have) in the app.' },
  { label: '🏗️ Project check-in', prompt: 'Review all my projects. For each one, tell me: what\'s the next concrete step? Are there tasks that should be in my daily log but aren\'t? Any projects that seem stalled? Suggest how to move each one forward.' },
  { label: '🔥 Quick wins', prompt: 'Find me 3-5 quick wins I can knock out in the next 30 minutes. Small tasks that are easy to complete and will build momentum. Be specific — reference my actual tasks.' },
];

// ─── Plan Card Renderers ───
function PlanCard({ title, icon, children, colors }) {
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <Text style={[cardStyles.cardTitle, { color: colors.text }]}>{icon} {title}</Text>
      {children}
    </View>
  );
}

function SummaryCard({ data, colors }) {
  if (!data) return null;
  const scoreColor = data.momentum_score >= 7 ? '#4CAF50' : data.momentum_score >= 4 ? '#FFA726' : '#EF5350';
  return (
    <PlanCard title="Today's Mission" icon="🎯" colors={colors}>
      <Text style={[cardStyles.intentText, { color: colors.accent }]}>{data.today_intent}</Text>
      <View style={cardStyles.scoreRow}>
        <Text style={[cardStyles.label, { color: colors.textMuted }]}>Momentum</Text>
        <View style={[cardStyles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
          <Text style={[cardStyles.scoreText, { color: scoreColor }]}>{data.momentum_score}/10</Text>
        </View>
      </View>
      {data.capacity_note ? (
        <Text style={[cardStyles.note, { color: colors.textSecondary }]}>{data.capacity_note}</Text>
      ) : null}
    </PlanCard>
  );
}

function Critical3Card({ items, colors }) {
  if (!items?.length) return null;
  return (
    <PlanCard title="Critical 3" icon="⚡" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={[cardStyles.critItem, { borderLeftColor: ['#EF5350', '#FFA726', '#42A5F5'][i] || colors.accent }]}>
          <View style={cardStyles.critHeader}>
            <Text style={[cardStyles.critNumber, { color: ['#EF5350', '#FFA726', '#42A5F5'][i] }]}>#{i + 1}</Text>
            <Text style={[cardStyles.critTitle, { color: colors.text }]}>{item.title}</Text>
            {item.estimate_minutes > 0 && (
              <Text style={[cardStyles.timeBadge, { color: colors.textMuted }]}>{item.estimate_minutes}m</Text>
            )}
          </View>
          <Text style={[cardStyles.critWhy, { color: colors.textSecondary }]}>{item.why}</Text>
        </View>
      ))}
    </PlanCard>
  );
}

function ScheduleCard({ items, colors }) {
  if (!items?.length) return null;
  const typeColors = { focus: '#42A5F5', admin: '#FFA726', recovery: '#66BB6A' };
  return (
    <PlanCard title="Suggested Schedule" icon="📅" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.schedRow}>
          <View style={[cardStyles.schedDot, { backgroundColor: typeColors[item.type] || colors.accent }]} />
          <Text style={[cardStyles.schedTime, { color: colors.textMuted }]}>{item.start}–{item.end}</Text>
          <Text style={[cardStyles.schedLabel, { color: colors.text }]} numberOfLines={1}>{item.label}</Text>
        </View>
      ))}
    </PlanCard>
  );
}

function NextActionsCard({ items, colors }) {
  if (!items?.length) return null;
  const typeIcons = { focus: '🧠', admin: '📋', recovery: '☕' };
  return (
    <PlanCard title="Next Actions" icon="📋" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.actionRow}>
          <Text style={cardStyles.actionIcon}>{typeIcons[item.block_type] || '▸'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.actionTitle, { color: colors.text }]}>{item.title}</Text>
            <Text style={[cardStyles.actionMeta, { color: colors.textMuted }]}>
              {item.context}{item.estimate_minutes > 0 ? ` · ${item.estimate_minutes}m` : ''}
            </Text>
          </View>
        </View>
      ))}
    </PlanCard>
  );
}

function RiskFlagsCard({ items, colors }) {
  if (!items?.length) return null;
  return (
    <PlanCard title="Risk Flags" icon="🚩" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={[cardStyles.riskItem, { backgroundColor: '#EF5350' + '10' }]}>
          <Text style={[cardStyles.riskFlag, { color: '#EF5350' }]}>⚠️ {item.flag}</Text>
          <Text style={[cardStyles.riskDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
          <Text style={[cardStyles.riskRec, { color: colors.text }]}>→ {item.recommendation}</Text>
        </View>
      ))}
    </PlanCard>
  );
}

function ProjectUpdatesCard({ items, colors }) {
  if (!items?.length) return null;
  const statusColors = { active: '#42A5F5', paused: '#FFA726', blocked: '#EF5350' };
  return (
    <PlanCard title="Project Updates" icon="🏗️" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.projRow}>
          <View style={cardStyles.projHeader}>
            <Text style={[cardStyles.projName, { color: colors.text }]}>{item.project}</Text>
            <View style={[cardStyles.statusBadge, { backgroundColor: (statusColors[item.status] || colors.accent) + '20' }]}>
              <Text style={[cardStyles.statusText, { color: statusColors[item.status] || colors.accent }]}>{item.status}</Text>
            </View>
          </View>
          <Text style={[cardStyles.projNext, { color: colors.textSecondary }]}>→ {item.next_step}</Text>
        </View>
      ))}
    </PlanCard>
  );
}

function DeferDeleteCard({ items, colors }) {
  if (!items?.length) return null;
  return (
    <PlanCard title="Defer or Delete" icon="🗑️" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.deferRow}>
          <Text style={{ fontSize: 16 }}>{item.decision === 'delete' ? '✕' : '→'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[cardStyles.deferTitle, { color: colors.text }]}>
              <Text style={{ fontWeight: '700', textTransform: 'uppercase', color: item.decision === 'delete' ? '#EF5350' : '#FFA726' }}>
                {item.decision}
              </Text>
              {'  '}{item.item}
            </Text>
            <Text style={[cardStyles.deferReason, { color: colors.textMuted }]}>{item.reason}</Text>
          </View>
        </View>
      ))}
    </PlanCard>
  );
}

function HabitsCard({ items, colors }) {
  if (!items?.length) return null;
  return (
    <PlanCard title="Habits Today" icon="🔁" colors={colors}>
      {items.map((item, i) => (
        <View key={i} style={cardStyles.habitRow}>
          <Text style={[cardStyles.habitName, { color: colors.text }]}>{item.habit}</Text>
          <Text style={[cardStyles.habitPrompt, { color: colors.textSecondary }]}>{item.prompt}</Text>
        </View>
      ))}
    </PlanCard>
  );
}

// ─── Main Component ───
const AIGuidanceButton = forwardRef(function AIGuidanceButton(props, ref) {
  const { colors } = useTheme();
  const appData = useApp();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [userName, setUserName] = useState(null);
  const [nameInput, setNameInput] = useState('');
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [planData, setPlanData] = useState(null);
  const [showEnergyPicker, setShowEnergyPicker] = useState(false);
  const [didAutoLaunch, setDidAutoLaunch] = useState(false);
  const scrollRef = useRef(null);

  // Expose open method to parent
  useImperativeHandle(ref, () => ({
    open: () => {
      setVisible(true);
      if (!userName) setShowNamePrompt(true);
    },
  }), [userName]);

  useEffect(() => {
    (async () => {
      try {
        const [name, history] = await Promise.all([
          AsyncStorage.getItem(JARVIS_NAME_KEY),
          AsyncStorage.getItem(JARVIS_HISTORY_KEY),
        ]);
        if (name) setUserName(name);
        if (history) {
          try { setMessages(JSON.parse(history)); } catch (_) {}
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      const toSave = messages.slice(-30);
      AsyncStorage.setItem(JARVIS_HISTORY_KEY, JSON.stringify(toSave)).catch(() => {});
    }
  }, [messages]);

  // Auto-launch Jarvis when app has no data (first use) or weekly nudge
  useEffect(() => {
    if (didAutoLaunch) return;
    const { entries, projects, habits } = appData;
    const isEmpty = entries.length === 0 && projects.length === 0 && habits.length === 0;

    (async () => {
      if (isEmpty) {
        // First time — open Jarvis to guide setup
        setDidAutoLaunch(true);
        setTimeout(() => {
          setVisible(true);
          if (!userName) {
            setShowNamePrompt(true);
          } else {
            // Existing user with cleared data
            sendSetupNudge();
          }
        }, 800);
        return;
      }

      // Weekly nudge — check last nudge date
      try {
        const lastNudge = await AsyncStorage.getItem(JARVIS_LAST_NUDGE_KEY);
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (!lastNudge || (now - parseInt(lastNudge, 10)) > oneWeek) {
          setDidAutoLaunch(true);
          await AsyncStorage.setItem(JARVIS_LAST_NUDGE_KEY, String(now));
          setTimeout(() => {
            setVisible(true);
            sendWeeklyNudge();
          }, 1000);
        }
      } catch (_) {}
    })();
  }, [appData, didAutoLaunch, userName]);

  const sendSetupNudge = useCallback(() => {
    const msg = `👋 Looks like you're just getting started! I'm Jarvis — let me help you set up your system.\n\nHere's what I'd recommend:\n\n1️⃣ **Daily Log** — Start by adding a few tasks for today\n2️⃣ **Projects** — Create your first project and break it into tasks\n3️⃣ **Habits** — Pick 2-3 habits you want to track daily\n4️⃣ **Reflections** — End each day with a quick reflection\n\nTap "💡 Help me get started" below and I'll walk you through it step by step.`;
    setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
  }, []);

  const sendWeeklyNudge = useCallback(() => {
    const { entries, projects, habits } = appData;
    const openTasks = entries.filter(e => e.type === 'task' && e.state === 'open');
    const today = getDateKey();
    const overdue = openTasks.filter(e => e.date && e.date < today);
    const parts = [`Hey${userName ? ` ${userName}` : ''}! 👋 Weekly check-in from Jarvis.`];
    if (overdue.length > 0) parts.push(`\n\n🚩 You have **${overdue.length} overdue tasks** that need attention.`);
    if (openTasks.length > 10) parts.push(`\n\n📋 ${openTasks.length} open tasks — might be time to defer or delete some.`);
    const stalledProjects = projects.filter(p => p.tasks.filter(t => t.column === 'progress').length === 0 && p.tasks.filter(t => t.column === 'todo').length > 0);
    if (stalledProjects.length > 0) parts.push(`\n\n🏗️ ${stalledProjects.length} project${stalledProjects.length > 1 ? 's' : ''} with nothing in progress.`);
    parts.push('\n\nTry **⚡ Plan My Day** to get a structured execution plan, or ask me anything.');
    setMessages(prev => [...prev, { role: 'assistant', content: parts.join('') }]);
  }, [appData, userName]);

  const systemPrompt = useCallback(() => {
    const nameRef = userName ? `The user's name is ${userName}. Address them by name occasionally — be warm but not sycophantic.` : '';
    return `You are Jarvis — a sharp, witty and motivating personal productivity AI built into a bullet journal app called Goal Digger. You're like a trusted chief of staff who knows everything about the user's tasks, projects, habits and reflections.

${nameRef}

Your personality:
- Direct and actionable — no waffle
- Warm but efficient — you respect their time
- Slightly witty — a dry sense of humour, never forced
- You reference their ACTUAL data by name — tasks, projects, habits
- Use bullet points and short paragraphs
- Use emoji sparingly for emphasis (not decoration)

You can help with:
1. Execution guidance — what to focus on, priority ordering, weekly planning
2. App setup — how to use Daily logs, Projects, Collections, Habits, Reflections, Time Blocking, Pomodoro
3. Project coaching — breaking down projects, suggesting next steps, spotting stalled work
4. Pattern insights — observing trends in their habits, reflections, and task completion
5. Motivation — acknowledging wins, reframing challenges, building momentum
6. Accountability — calling out overdue tasks, suggesting cancellations, keeping them honest

When the app has little or no data, proactively guide them to set things up — suggest creating their first project, starting a daily log, setting up habits, etc.

Keep responses concise — aim for 150-250 words unless the user asks for detail.`;
  }, [userName]);

  // ─── Plan My Day (Execution OS) ───
  const fetchPlan = useCallback(async (energy) => {
    if (!AI_CONFIG.apiKey) return;
    setShowEnergyPicker(false);
    setPlanData(null);
    setLoading(true);

    try {
      const inputData = buildExecutionOSPrompt(appData, energy);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: [
            { role: 'system', content: EXECUTION_OS_SYSTEM },
            { role: 'user', content: `INPUT_DATA:\n${inputData}` },
          ],
          max_tokens: 2000,
          temperature: 0.4,
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const data = await response.json();
      let text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response');

      // Strip markdown code fences if present
      text = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(text);
      setPlanData(parsed);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Couldn't generate your plan: ${err.message}. Try again.` }]);
      setPlanData(null);
    } finally {
      setLoading(false);
    }
  }, [appData]);

  // ─── Chat message ───
  const sendMessage = useCallback(async (userMessage) => {
    if (!AI_CONFIG.apiKey) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'I need an API key to work. Add your OpenAI key to the app configuration.' }]);
      return;
    }

    setPlanData(null);
    const context = buildContext(appData);
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setInputText('');
    setLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: systemPrompt() },
        { role: 'system', content: `Here is the user's current bullet journal data:\n\n${context}` },
        ...newMessages.slice(-10),
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        },
        body: JSON.stringify({
          model: AI_CONFIG.model,
          messages: apiMessages,
          max_tokens: AI_CONFIG.maxTokens,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response');

      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Something went wrong: ${err.message}. Try again in a moment.` }]);
    } finally {
      setLoading(false);
    }
  }, [appData, messages, systemPrompt]);

  const handleOpen = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVisible(true);
    if (!userName && messages.length === 0) {
      setShowNamePrompt(true);
    }
  }, [userName, messages.length]);

  const handleSetName = useCallback(async () => {
    const name = nameInput.trim();
    if (!name) return;
    setUserName(name);
    setShowNamePrompt(false);
    await AsyncStorage.setItem(JARVIS_NAME_KEY, name);
    const greeting = `Hey ${name}! 👋 I'm Jarvis — your personal productivity copilot. I can see everything in your bullet journal and help you execute like a machine.\n\nTry "⚡ Plan My Day" for a full execution plan, or tap any quick action below.`;
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [nameInput]);

  const handleClose = useCallback(() => setVisible(false), []);

  const handleQuickAction = useCallback((action) => {
    if (action.key === 'plan_day') {
      setPlanData(null);
      setShowEnergyPicker(true);
      return;
    }
    setPlanData(null);
    sendMessage(action.prompt);
  }, [sendMessage]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text || loading) return;
    setPlanData(null);
    sendMessage(text);
  }, [inputText, loading, sendMessage]);

  const handleClearHistory = useCallback(async () => {
    setMessages([]);
    setPlanData(null);
    await AsyncStorage.removeItem(JARVIS_HISTORY_KEY);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentGold || colors.accent }]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Image source={BRAIN_IMAGE} style={styles.fabIcon} resizeMode="contain" />
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
        <View style={[styles.overlay, { backgroundColor: colors.bg }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
              <Image source={BRAIN_IMAGE} style={{ width: 28, height: 28 }} resizeMode="contain" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Jarvis</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {userName ? `Working for ${userName}` : 'Your productivity copilot'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClearHistory} style={styles.headerBtn}>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Name prompt */}
          {showNamePrompt && (
            <View style={[styles.namePrompt, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.nameTitle, { color: colors.text }]}>👋 Hey there!</Text>
              <Text style={[styles.nameBody, { color: colors.textSecondary }]}>
                I'm Jarvis — your personal productivity copilot. What should I call you?
              </Text>
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.bg }]}
                  placeholder="Your name..."
                  placeholderTextColor={colors.textMuted}
                  value={nameInput}
                  onChangeText={setNameInput}
                  onSubmitEditing={handleSetName}
                  autoFocus
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.nameBtn, { backgroundColor: colors.accent }]}
                  onPress={handleSetName}
                >
                  <Text style={[styles.nameBtnText, { color: '#fff' }]}>Go</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Energy picker for Plan My Day */}
          {showEnergyPicker && (
            <View style={[styles.namePrompt, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={[styles.nameTitle, { color: colors.text }]}>⚡ Plan My Day</Text>
              <Text style={[styles.nameBody, { color: colors.textSecondary }]}>
                How's your energy right now? This helps me build a realistic plan.
              </Text>
              <View style={styles.energyRow}>
                {[
                  { level: 3, label: '😴 Low', desc: 'Tired' },
                  { level: 5, label: '😐 Mid', desc: 'Okay' },
                  { level: 7, label: '💪 Good', desc: 'Solid' },
                  { level: 9, label: '🔥 Peak', desc: 'Let\'s go' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.level}
                    style={[styles.energyBtn, { backgroundColor: colors.bg, borderColor: colors.border }]}
                    onPress={() => fetchPlan(opt.level)}
                  >
                    <Text style={styles.energyEmoji}>{opt.label.split(' ')[0]}</Text>
                    <Text style={[styles.energyLabel, { color: colors.text }]}>{opt.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Content area */}
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {/* Plan My Day cards */}
            {planData && (
              <View style={{ gap: 12 }}>
                <SummaryCard data={planData.summary} colors={colors} />
                <Critical3Card items={planData.critical_3} colors={colors} />
                <ScheduleCard items={planData.schedule} colors={colors} />
                <NextActionsCard items={planData.next_actions} colors={colors} />
                <ProjectUpdatesCard items={planData.project_updates} colors={colors} />
                <HabitsCard items={planData.habits_today} colors={colors} />
                <RiskFlagsCard items={planData.risk_flags} colors={colors} />
                <DeferDeleteCard items={planData.defer_or_delete} colors={colors} />
                <TouchableOpacity
                  style={[styles.refreshBtn, { backgroundColor: colors.accent + '15' }]}
                  onPress={() => setShowEnergyPicker(true)}
                >
                  <Text style={[styles.refreshText, { color: colors.accent }]}>🔄 Regenerate Plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Chat messages */}
            {!planData && messages.length === 0 && !showNamePrompt && !showEnergyPicker && (
              <View style={styles.emptyState}>
                <Image source={BRAIN_IMAGE} style={{ width: 48, height: 48, opacity: 0.4, marginBottom: 12 }} resizeMode="contain" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  {userName ? `Hey ${userName}!` : 'Hey!'}
                </Text>
                <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                  Try "⚡ Plan My Day" for a full execution plan, or ask me anything.
                </Text>
              </View>
            )}

            {!planData && messages.map((msg, i) => (
              <View
                key={i}
                style={[
                  styles.bubble,
                  msg.role === 'user'
                    ? [styles.userBubble, { backgroundColor: colors.accent }]
                    : [styles.assistantBubble, { backgroundColor: colors.bgCard, borderColor: colors.border }],
                ]}
              >
                {msg.role === 'assistant' && (
                  <Text style={[styles.bubbleLabel, { color: colors.accent }]}>Jarvis</Text>
                )}
                <Text style={[
                  styles.bubbleText,
                  { color: msg.role === 'user' ? '#fff' : colors.text },
                ]}>
                  {msg.content}
                </Text>
              </View>
            ))}

            {loading && (
              <View style={[styles.assistantBubble, styles.bubble, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
                <Text style={[styles.bubbleLabel, { color: colors.accent }]}>Jarvis</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.accent} />
                  <Text style={[styles.typingText, { color: colors.textMuted }]}>
                    {showEnergyPicker || planData !== null ? 'Building your plan...' : 'Thinking...'}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Quick actions */}
          {!showNamePrompt && !showEnergyPicker && !loading && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickBar}
              contentContainerStyle={styles.quickBarContent}
            >
              {QUICK_ACTIONS.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.quickChip,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                    action.key === 'plan_day' && { backgroundColor: colors.accent + '20', borderColor: colors.accent },
                  ]}
                  onPress={() => handleQuickAction(action)}
                >
                  <Text style={[
                    styles.quickText,
                    { color: colors.text },
                    action.key === 'plan_day' && { color: colors.accent, fontWeight: '700' },
                  ]}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Input bar */}
          {!showNamePrompt && !showEnergyPicker && (
            <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.bg }]}>
              <TextInput
                style={[styles.input, { color: colors.text, backgroundColor: colors.bgCard, borderColor: colors.border }]}
                placeholder="Ask Jarvis anything..."
                placeholderTextColor={colors.textMuted}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={handleSend}
                returnKeyType="send"
                multiline
                maxLength={500}
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: inputText.trim() ? colors.accent : colors.border }]}
                onPress={handleSend}
                disabled={!inputText.trim() || loading}
              >
                <Text style={styles.sendText}>↑</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
});

// ─── Styles ───
const styles = StyleSheet.create({
  fab: {
    position: 'absolute', right: 20, bottom: 155,
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', zIndex: 101,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  fabIcon: { width: 28, height: 28 },
  overlay: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  title: { fontSize: SIZES.xl, fontWeight: '700' },
  subtitle: { fontSize: SIZES.xs, marginTop: 1 },
  headerBtn: { padding: 8 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 22, fontWeight: '300' },

  namePrompt: { margin: 16, borderRadius: 16, borderWidth: 1, padding: 20 },
  nameTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 8 },
  nameBody: { fontSize: SIZES.md, lineHeight: 22, marginBottom: 16 },
  nameRow: { flexDirection: 'row', gap: 10 },
  nameInput: {
    flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    fontSize: SIZES.md,
  },
  nameBtn: { paddingHorizontal: 20, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameBtnText: { fontSize: SIZES.md, fontWeight: '700' },

  energyRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  energyBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, gap: 4,
  },
  energyEmoji: { fontSize: 24 },
  energyLabel: { fontSize: SIZES.xs, fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 8 },

  bubble: { borderRadius: 16, padding: 14, marginBottom: 10, maxWidth: '88%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleLabel: { fontSize: SIZES.xs, fontWeight: '700', marginBottom: 4 },
  bubbleText: { fontSize: SIZES.md, lineHeight: 22 },
  typingText: { fontSize: SIZES.sm },

  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: SIZES.xl, fontWeight: '700', marginBottom: 6 },
  emptyBody: { fontSize: SIZES.md, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },

  quickBar: { maxHeight: 52 },
  quickBarContent: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexDirection: 'row' },
  quickChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  quickText: { fontSize: SIZES.sm, fontWeight: '500' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 34 : 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, fontSize: SIZES.md, maxHeight: 100,
  },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  refreshBtn: { alignSelf: 'center', marginTop: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  refreshText: { fontSize: SIZES.sm, fontWeight: '700' },
});

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 10,
  },
  cardTitle: { fontSize: SIZES.md, fontWeight: '700' },

  intentText: { fontSize: SIZES.lg, fontWeight: '600', lineHeight: 24 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: SIZES.sm },
  scoreBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  scoreText: { fontSize: SIZES.sm, fontWeight: '700' },
  note: { fontSize: SIZES.sm, lineHeight: 20 },

  critItem: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  critHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  critNumber: { fontSize: SIZES.sm, fontWeight: '800' },
  critTitle: { fontSize: SIZES.md, fontWeight: '600', flex: 1 },
  timeBadge: { fontSize: SIZES.xs },
  critWhy: { fontSize: SIZES.sm, lineHeight: 18, marginTop: 2 },

  schedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  schedDot: { width: 8, height: 8, borderRadius: 4 },
  schedTime: { fontSize: SIZES.xs, fontWeight: '600', width: 90 },
  schedLabel: { fontSize: SIZES.sm, flex: 1 },

  actionRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'flex-start' },
  actionIcon: { fontSize: 16, marginTop: 1 },
  actionTitle: { fontSize: SIZES.sm, fontWeight: '600' },
  actionMeta: { fontSize: SIZES.xs },

  riskItem: { borderRadius: 10, padding: 12, gap: 4 },
  riskFlag: { fontSize: SIZES.sm, fontWeight: '700' },
  riskDetail: { fontSize: SIZES.sm, lineHeight: 18 },
  riskRec: { fontSize: SIZES.sm, fontWeight: '600' },

  projRow: { gap: 4, paddingVertical: 4 },
  projHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projName: { fontSize: SIZES.sm, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: SIZES.xs, fontWeight: '700' },
  projNext: { fontSize: SIZES.sm, lineHeight: 18 },

  deferRow: { flexDirection: 'row', gap: 8, paddingVertical: 4, alignItems: 'flex-start' },
  deferTitle: { fontSize: SIZES.sm },
  deferReason: { fontSize: SIZES.xs, marginTop: 2 },

  habitRow: { paddingVertical: 4 },
  habitName: { fontSize: SIZES.sm, fontWeight: '600' },
  habitPrompt: { fontSize: SIZES.sm, lineHeight: 18 },
});

export default AIGuidanceButton;
