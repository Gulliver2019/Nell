import AsyncStorage from '@react-native-async-storage/async-storage';

const LEGACY_PREFIX = 'crushedit_';
const CURRENT_PREFIX = 'nell_';
const MIGRATION_KEY = 'nell_migrated_from_crushedit';

export const migrateStorageKeys = async () => {
  try {
    const alreadyMigrated = await AsyncStorage.getItem(MIGRATION_KEY);
    if (alreadyMigrated) return;
    
    const allKeys = await AsyncStorage.getAllKeys();
    const legacyKeys = allKeys.filter(k => k.startsWith(LEGACY_PREFIX));
    
    for (const oldKey of legacyKeys) {
      const newKey = oldKey.replace(LEGACY_PREFIX, CURRENT_PREFIX);
      const existing = await AsyncStorage.getItem(newKey);
      if (!existing) {
        const value = await AsyncStorage.getItem(oldKey);
        if (value) await AsyncStorage.setItem(newKey, value);
      }
    }
    
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch (e) {
    console.warn('Storage migration error:', e);
  }
};

const STORAGE_KEYS = {
  ENTRIES: 'nell_entries',
  COLLECTIONS: 'nell_collections',
  HABITS: 'nell_habits',
  REFLECTIONS: 'nell_reflections',
  HABIT_REFLECTIONS: 'nell_habit_reflections',
  SETTINGS: 'nell_settings',
  FUTURE_LOG: 'nell_future_log',
  PROJECTS: 'nell_projects',
  ROUTINES: 'nell_routines',
  WELLNESS_TEMPLATES: 'nell_wellness_templates',
  WEEKLY_INTENTIONS: 'nell_weekly_intentions',
  GOALS: 'nell_goals',
  MORNING_STEPS: 'nell_morning_steps',
  JOB_APPLICATIONS: 'nell_job_applications',
  SEEDED: 'nell_data_seeded',
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Date helpers
export const getDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const getMonthKey = (date = new Date()) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
};

export const formatDateShort = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

export const getMonthName = (monthKey) => {
  if (!monthKey || typeof monthKey !== 'string') return '';
  const [year, month] = monthKey.split('-');
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return `${months[parseInt(month) - 1]} ${year}`;
};

// Entry CRUD
export const getAllEntries = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ENTRIES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load entries:', e);
    return [];
  }
};

export const saveAllEntries = async (entries) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save entries:', e);
  }
};

export const addEntry = async (entry) => {
  const entries = await getAllEntries();
  const newEntry = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    date: getDateKey(),
    type: 'task',       // task, event, note
    state: 'open',      // open, complete, migrated, scheduled, cancelled
    signifier: null,     // priority, inspiration, explore
    text: '',
    collection: null,
    pomodoros: 0,        // estimated pomodoro count (each = 25 min)
    timeBlock: null,     // start time string e.g. "09:00" for time blocking
    isAdmin: false,      // true = grouped under Admin block in time blocking
    isQuickWin: false,   // true = grouped under Quick Wins section
    category: null,      // category key e.g. 'launch', 'deepwork', 'exercise'
    ...entry,
  };
  entries.push(newEntry);
  await saveAllEntries(entries);
  return newEntry;
};

export const updateEntry = async (id, updates) => {
  const entries = await getAllEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveAllEntries(entries);
    return entries[idx];
  }
  return null;
};

export const deleteEntry = async (id) => {
  const entries = await getAllEntries();
  const filtered = entries.filter(e => e.id !== id);
  await saveAllEntries(filtered);
};

export const getEntriesByDate = async (dateKey) => {
  const entries = await getAllEntries();
  return entries.filter(e => e.date === dateKey).sort((a, b) => 
    new Date(a.createdAt) - new Date(b.createdAt)
  );
};

export const getEntriesByMonth = async (monthKey) => {
  const entries = await getAllEntries();
  return entries.filter(e => e.date && e.date.startsWith(monthKey));
};

export const getEntriesByCollection = async (collectionId) => {
  const entries = await getAllEntries();
  return entries.filter(e => e.collection === collectionId);
};

export const getOpenTasks = async () => {
  const entries = await getAllEntries();
  return entries.filter(e => e.type === 'task' && e.state === 'open');
};

// Migrate task to today
export const migrateEntry = async (id) => {
  const today = getDateKey();
  const entries = await getAllEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    // Mark original as migrated (and flag so auto-migrate skips it)
    entries[idx] = { ...entries[idx], state: 'migrated', _migratedToToday: true, updatedAt: new Date().toISOString() };
    // Create new entry for today
    const newEntry = {
      ...entries[idx],
      id: generateId(),
      date: today,
      state: 'open',
      createdAt: new Date().toISOString(),
      migratedFrom: id,
    };
    entries.push(newEntry);
    await saveAllEntries(entries);
    return newEntry;
  }
  return null;
};

// Schedule entry to future date
export const scheduleEntry = async (id, futureDate) => {
  const entries = await getAllEntries();
  const idx = entries.findIndex(e => e.id === id);
  if (idx !== -1) {
    entries[idx] = { ...entries[idx], state: 'scheduled', updatedAt: new Date().toISOString() };
    const { collection, ...rest } = entries[idx];
    const newEntry = {
      ...rest,
      id: generateId(),
      date: futureDate,
      state: 'open',
      createdAt: new Date().toISOString(),
      scheduledFrom: id,
    };
    entries.push(newEntry);
    await saveAllEntries(entries);
    return newEntry;
  }
  return null;
};

// Collections CRUD
export const getCollections = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.COLLECTIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveCollections = async (collections) => {
  await AsyncStorage.setItem(STORAGE_KEYS.COLLECTIONS, JSON.stringify(collections));
};

export const addCollection = async (collection) => {
  const collections = await getCollections();
  const newCol = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    title: '',
    icon: '📋',
    color: '#6C5CE7',
    ...collection,
  };
  collections.push(newCol);
  await saveCollections(collections);
  return newCol;
};

export const deleteCollection = async (id) => {
  const collections = await getCollections();
  await saveCollections(collections.filter(c => c.id !== id));
  // Also remove entries in this collection
  const entries = await getAllEntries();
  await saveAllEntries(entries.filter(e => e.collection !== id));
};

// Habits
export const getHabits = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HABITS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveHabits = async (habits) => {
  await AsyncStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(habits));
};

export const addHabit = async (habit) => {
  const habits = await getHabits();
  const newHabit = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    name: '',
    icon: '✨',
    color: '#6C5CE7',
    completions: {}, // { '2024-01-15': true }
    timeOfDay: 'morning', // 'morning' | 'afternoon' | 'evening'
    twoMinVersion: '', // Atomic Habits: scaled-down 2-minute version
    bestStreak: 0,
    ...habit,
  };
  habits.push(newHabit);
  await saveHabits(habits);
  return newHabit;
};

export const toggleHabitDay = async (habitId, dateKey) => {
  const habits = await getHabits();
  const idx = habits.findIndex(h => h.id === habitId);
  if (idx !== -1) {
    if (!habits[idx].completions) habits[idx].completions = {};
    const current = habits[idx].completions[dateKey];
    // Cycle: empty → done → missed → empty
    if (!current) {
      habits[idx].completions[dateKey] = 'done';
    } else if (current === 'done' || current === true) {
      habits[idx].completions[dateKey] = 'missed';
    } else {
      delete habits[idx].completions[dateKey];
    }
    // Update best streak
    const streak = calcStreak(habits[idx]);
    if (streak > (habits[idx].bestStreak || 0)) {
      habits[idx].bestStreak = streak;
    }
    await saveHabits(habits);
    return habits[idx];
  }
  return null;
};

function calcStreak(habit) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = getDateKey(d);
    const val = habit.completions?.[key];
    if (val === 'done' || val === true) streak++;
    else break;
  }
  return streak;
}

export const deleteHabit = async (id) => {
  const habits = await getHabits();
  await saveHabits(habits.filter(h => h.id !== id));
};

// Reflections
export const getReflections = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.REFLECTIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveReflection = async (reflection) => {
  const reflections = await getReflections();
  const newRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    date: getDateKey(),
    type: 'daily', // daily, weekly, monthly
    gratitude: '',
    meaningful: '',
    wins: '',
    kindness: '',
    appreciated: '',
    tomorrow: '',
    mood: 3, // 1-5
    ...reflection,
  };
  reflections.push(newRef);
  await AsyncStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(reflections));
  return newRef;
};

// Habit Reflections (end-of-day habit review)
export const getHabitReflections = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HABIT_REFLECTIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveHabitReflection = async (reflection) => {
  const reflections = await getHabitReflections();
  const newRef = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    date: getDateKey(),
    missedHabits: [],   // [{ habitId, habitName, habitIcon, reason }]
    completedCount: 0,
    totalCount: 0,
    commitments: [],    // [{ habitId, habitName, habitIcon, commitment }]
    ...reflection,
  };
  if (!Array.isArray(newRef.commitments)) {
    newRef.commitments = [];
  }
  reflections.push(newRef);
  await AsyncStorage.setItem(STORAGE_KEYS.HABIT_REFLECTIONS, JSON.stringify(reflections));
  return newRef;
};

// Future Log
export const getFutureLog = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FUTURE_LOG);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
};

export const addFutureLogEntry = async (monthKey, entry) => {
  const futureLog = await getFutureLog();
  if (!futureLog[monthKey]) futureLog[monthKey] = [];
  const newEntry = {
    id: generateId(),
    text: '',
    type: 'task',
    ...entry,
  };
  futureLog[monthKey].push(newEntry);
  await AsyncStorage.setItem(STORAGE_KEYS.FUTURE_LOG, JSON.stringify(futureLog));
  return newEntry;
};

export const removeFutureLogEntry = async (monthKey, entryId) => {
  const futureLog = await getFutureLog();
  if (futureLog[monthKey]) {
    futureLog[monthKey] = futureLog[monthKey].filter(e => e.id !== entryId);
    await AsyncStorage.setItem(STORAGE_KEYS.FUTURE_LOG, JSON.stringify(futureLog));
  }
};

// Reorder entries by providing an ordered list of IDs
export const reorderEntries = async (orderedIds) => {
  const entries = await getAllEntries();
  orderedIds.forEach((id, index) => {
    const entry = entries.find(e => e.id === id);
    if (entry) entry.sortOrder = index;
  });
  await saveAllEntries(entries);
};

// Search across all entries
export const searchEntries = async (query) => {
  const entries = await getAllEntries();
  const q = query.toLowerCase();
  return entries.filter(e => e.text && e.text.toLowerCase().includes(q));
};

// Weekly Intentions
// Data shape: { [weekKey]: { areas: [{ id, name, tasks: [{ id, text, scheduledDate? }] }], createdAt } }
export const getWeekKey = (date = new Date()) => {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = d.getDate() - day; // Sunday of this week
  const sunday = new Date(d.getFullYear(), d.getMonth(), diff);
  const y = sunday.getFullYear();
  const m = String(sunday.getMonth() + 1).padStart(2, '0');
  const dd = String(sunday.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

export const getAllWeeklyIntentions = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_INTENTIONS);
    if (!data) return {};
    const all = JSON.parse(data);

    // One-time migration: move any Monday-keyed weeks to their correct Sunday key
    let migrated = false;
    for (const key of Object.keys(all)) {
      const d = new Date(key + 'T00:00:00');
      const correctKey = getWeekKey(d);
      if (correctKey !== key) {
        if (all[correctKey]) {
          // Merge areas, avoiding duplicates by id
          const existingIds = new Set(all[correctKey].areas.map(a => a.id));
          const newAreas = (all[key].areas || []).filter(a => !existingIds.has(a.id));
          all[correctKey].areas = [...all[correctKey].areas, ...newAreas];
        } else {
          all[correctKey] = all[key];
        }
        delete all[key];
        migrated = true;
      }
    }
    if (migrated) {
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
    }
    return all;
  } catch (e) {
    return {};
  }
};

export const getWeeklyIntention = async (weekKey) => {
  const all = await getAllWeeklyIntentions();
  return all[weekKey] || null;
};

export const saveWeeklyIntention = async (weekKey, intention) => {
  const all = await getAllWeeklyIntentions();
  all[weekKey] = { ...intention, updatedAt: new Date().toISOString() };
  await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
  return all[weekKey];
};

export const addWeeklyArea = async (weekKey, areaName) => {
  const all = await getAllWeeklyIntentions();
  if (!all[weekKey]) {
    all[weekKey] = { areas: [], createdAt: new Date().toISOString() };
  }
  const area = { id: generateId(), name: areaName, tasks: [] };
  all[weekKey].areas.push(area);
  all[weekKey].updatedAt = new Date().toISOString();
  await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
  return area;
};

export const removeWeeklyArea = async (weekKey, areaId) => {
  const all = await getAllWeeklyIntentions();
  if (all[weekKey]) {
    all[weekKey].areas = all[weekKey].areas.filter(a => a.id !== areaId);
    all[weekKey].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
  }
};

export const addWeeklyTask = async (weekKey, areaId, taskText) => {
  const all = await getAllWeeklyIntentions();
  const area = all[weekKey]?.areas?.find(a => a.id === areaId);
  if (area) {
    const task = { id: generateId(), text: taskText, done: false };
    area.tasks.push(task);
    all[weekKey].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
    return task;
  }
  return null;
};

export const updateWeeklyTask = async (weekKey, areaId, taskId, updates) => {
  const all = await getAllWeeklyIntentions();
  const area = all[weekKey]?.areas?.find(a => a.id === areaId);
  if (area) {
    const task = area.tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      all[weekKey].updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
    }
  }
};

export const removeWeeklyTask = async (weekKey, areaId, taskId) => {
  const all = await getAllWeeklyIntentions();
  const area = all[weekKey]?.areas?.find(a => a.id === areaId);
  if (area) {
    area.tasks = area.tasks.filter(t => t.id !== taskId);
    all[weekKey].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
  }
};

export const reorderWeeklyTasks = async (weekKey, areaId, orderedTaskIds) => {
  const all = await getAllWeeklyIntentions();
  const area = all[weekKey]?.areas?.find(a => a.id === areaId);
  if (area) {
    const reordered = orderedTaskIds
      .map(id => area.tasks.find(t => t.id === id))
      .filter(Boolean);
    area.tasks = reordered;
    all[weekKey].updatedAt = new Date().toISOString();
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
  }
};

export const moveWeeklyTask = async (weekKey, fromAreaId, toAreaId, taskId) => {
  const all = await getAllWeeklyIntentions();
  const fromArea = all[weekKey]?.areas?.find(a => a.id === fromAreaId);
  const toArea = all[weekKey]?.areas?.find(a => a.id === toAreaId);
  if (fromArea && toArea) {
    const taskIdx = fromArea.tasks.findIndex(t => t.id === taskId);
    if (taskIdx >= 0) {
      const [task] = fromArea.tasks.splice(taskIdx, 1);
      toArea.tasks.push(task);
      all[weekKey].updatedAt = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_INTENTIONS, JSON.stringify(all));
    }
  }
};

// Export all data (for backup)
export const exportAllData = async () => {
  const entries = await getAllEntries();
  const collections = await getCollections();
  const habits = await getHabits();
  const reflections = await getReflections();
  const habitReflections = await getHabitReflections();
  const futureLog = await getFutureLog();
  return { entries, collections, habits, reflections, habitReflections, futureLog, exportedAt: new Date().toISOString() };
};

// Import all data (for restore)
export const importAllData = async (data) => {
  if (data.entries) await saveAllEntries(data.entries);
  if (data.collections) await saveCollections(data.collections);
  if (data.habits) await saveHabits(data.habits);
  if (data.reflections) await AsyncStorage.setItem(STORAGE_KEYS.REFLECTIONS, JSON.stringify(data.reflections));
  if (data.futureLog) await AsyncStorage.setItem(STORAGE_KEYS.FUTURE_LOG, JSON.stringify(data.futureLog));
};

// Projects CRUD
export const getProjects = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveProjects = async (projects) => {
  await AsyncStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

export const addProject = async (project) => {
  const projects = await getProjects();
  const newProject = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    title: '',
    emoji: '🎯',
    color: '#6C5CE7',
    startDate: getDateKey(),
    endDate: '',
    tasks: [], // { id, text, column: 'todo'|'progress'|'done', createdAt, order }
    ...project,
  };
  projects.push(newProject);
  await saveProjects(projects);
  return newProject;
};

export const updateProject = async (id, updates) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === id);
  if (idx !== -1) {
    projects[idx] = { ...projects[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveProjects(projects);
    return projects[idx];
  }
  return null;
};

export const deleteProject = async (id) => {
  const projects = await getProjects();
  await saveProjects(projects.filter(p => p.id !== id));
};

export const reorderProjects = async (orderedIds) => {
  const projects = await getProjects();
  const sorted = orderedIds.map(id => projects.find(p => p.id === id)).filter(Boolean);
  const remaining = projects.filter(p => !orderedIds.includes(p.id));
  await saveProjects([...sorted, ...remaining]);
};

export const addProjectTask = async (projectId, task) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    const newTask = {
      id: generateId(),
      text: '',
      column: 'todo',
      createdAt: new Date().toISOString(),
      ...task,
    };
    projects[idx].tasks.push(newTask);
    await saveProjects(projects);
    return newTask;
  }
  return null;
};

export const moveProjectTask = async (projectId, taskId, toColumn) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    const taskIdx = projects[idx].tasks.findIndex(t => t.id === taskId);
    if (taskIdx !== -1) {
      projects[idx].tasks[taskIdx].column = toColumn;
      projects[idx].tasks[taskIdx].movedAt = new Date().toISOString();
      await saveProjects(projects);
    }
  }
};

export const deleteProjectTask = async (projectId, taskId) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    projects[idx].tasks = projects[idx].tasks.filter(t => t.id !== taskId);
    await saveProjects(projects);
  }
};

export const updateProjectTask = async (projectId, taskId, updates) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx !== -1) {
    const taskIdx = projects[idx].tasks.findIndex(t => t.id === taskId);
    if (taskIdx !== -1) {
      projects[idx].tasks[taskIdx] = { ...projects[idx].tasks[taskIdx], ...updates };
      await saveProjects(projects);
    }
  }
};

export const reorderProjectTasks = async (projectId, column, orderedTaskIds) => {
  const projects = await getProjects();
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) return;
  const colTasks = projects[idx].tasks.filter(t => t.column === column);
  const otherTasks = projects[idx].tasks.filter(t => t.column !== column);
  const sorted = orderedTaskIds
    .map(id => colTasks.find(t => t.id === id))
    .filter(Boolean);
  projects[idx].tasks = [...otherTasks, ...sorted];
  await saveProjects(projects);
};

// ─── Goals ──────────────────────────────────────────────

export const getGoals = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveGoals = async (goals) => {
  await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(goals));
};

export const addGoal = async (goal) => {
  const goals = await getGoals();
  const newGoal = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    title: '',
    description: '',
    ninetyDayTarget: '',
    isPriority: true,
    linkedProjectIds: [],
    dailyDisciplines: [],
    weeklyTasks: [],
    standards: [],
    ...goal,
  };
  goals.push(newGoal);
  await saveGoals(goals);
  return newGoal;
};

export const toggleGoalPriority = async (id) => {
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  goals[idx].isPriority = !goals[idx].isPriority;
  goals[idx].updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const linkProjectToGoal = async (goalId, projectId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  if (!goal.linkedProjectIds) goal.linkedProjectIds = [];
  if (!goal.linkedProjectIds.includes(projectId)) {
    goal.linkedProjectIds.push(projectId);
    goal.updatedAt = new Date().toISOString();
    await saveGoals(goals);
  }
};

export const unlinkProjectFromGoal = async (goalId, projectId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.linkedProjectIds = (goal.linkedProjectIds || []).filter(id => id !== projectId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const updateGoal = async (id, updates) => {
  const goals = await getGoals();
  const idx = goals.findIndex(g => g.id === id);
  if (idx === -1) return;
  goals[idx] = { ...goals[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveGoals(goals);
};

export const deleteGoal = async (id) => {
  const goals = await getGoals();
  await saveGoals(goals.filter(g => g.id !== id));
};

export const addMonthlyFocus = async (goalId, monthKey, text) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return null;
  if (!goal.monthlyFocuses) goal.monthlyFocuses = [];
  const focus = { id: generateId(), monthKey, text, createdAt: new Date().toISOString() };
  goal.monthlyFocuses.push(focus);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
  return focus;
};

export const updateMonthlyFocus = async (goalId, focusId, updates) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const focus = (goal.monthlyFocuses || []).find(f => f.id === focusId);
  if (!focus) return;
  Object.assign(focus, updates, { updatedAt: new Date().toISOString() });
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const deleteMonthlyFocus = async (goalId, focusId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.monthlyFocuses = (goal.monthlyFocuses || []).filter(f => f.id !== focusId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

// ─── Goal Sub-Items (Disciplines, Weekly Tasks, Standards) ──────

export const addGoalDiscipline = async (goalId, text) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return null;
  if (!goal.dailyDisciplines) goal.dailyDisciplines = [];
  const item = { id: generateId(), text, createdAt: new Date().toISOString(), routineId: null };
  goal.dailyDisciplines.push(item);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
  return item;
};

export const updateGoalDiscipline = async (goalId, disciplineId, updates) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const item = (goal.dailyDisciplines || []).find(d => d.id === disciplineId);
  if (!item) return;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const deleteGoalDiscipline = async (goalId, disciplineId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.dailyDisciplines = (goal.dailyDisciplines || []).filter(d => d.id !== disciplineId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const addGoalWeeklyTask = async (goalId, text) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return null;
  if (!goal.weeklyTasks) goal.weeklyTasks = [];
  const item = { id: generateId(), text, createdAt: new Date().toISOString() };
  goal.weeklyTasks.push(item);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
  return item;
};

export const updateGoalWeeklyTask = async (goalId, taskId, updates) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const item = (goal.weeklyTasks || []).find(t => t.id === taskId);
  if (!item) return;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const deleteGoalWeeklyTask = async (goalId, taskId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.weeklyTasks = (goal.weeklyTasks || []).filter(t => t.id !== taskId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const addGoalStandard = async (goalId, text) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return null;
  if (!goal.standards) goal.standards = [];
  const item = { id: generateId(), text, createdAt: new Date().toISOString() };
  goal.standards.push(item);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
  return item;
};

export const updateGoalStandard = async (goalId, standardId, updates) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  const item = (goal.standards || []).find(s => s.id === standardId);
  if (!item) return;
  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const deleteGoalStandard = async (goalId, standardId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.standards = (goal.standards || []).filter(s => s.id !== standardId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const addGoalHabit = async (goalId, habitId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  if (!goal.habitIds) goal.habitIds = [];
  if (!goal.habitIds.includes(habitId)) goal.habitIds.push(habitId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

export const updateGoalHabit = async (goalId, habitId, updates) => {
  // Not needed for linked habits — update via habit system directly
};

export const deleteGoalHabit = async (goalId, habitId) => {
  const goals = await getGoals();
  const goal = goals.find(g => g.id === goalId);
  if (!goal) return;
  goal.habitIds = (goal.habitIds || []).filter(id => id !== habitId);
  goal.updatedAt = new Date().toISOString();
  await saveGoals(goals);
};

// ─── Routines ───────────────────────────────────────────

export const getRoutines = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ROUTINES);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveRoutines = async (routines) => {
  await AsyncStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(routines));
};

export const addRoutine = async (routine) => {
  const routines = await getRoutines();
  const newRoutine = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    text: '',
    timeBlock: null,
    signifier: null,
    pomodoros: 0,
    enabled: true,
    repeatDays: null, // null = every day, or array of day numbers [0=Sun,1=Mon,...6=Sat]
    category: null,   // category key e.g. 'launch', 'deepwork'
    sortOrder: routines.length,
    ...routine,
  };
  routines.push(newRoutine);
  await saveRoutines(routines);
  return newRoutine;
};

export const updateRoutine = async (id, updates) => {
  const routines = await getRoutines();
  const idx = routines.findIndex(r => r.id === id);
  if (idx !== -1) {
    routines[idx] = { ...routines[idx], ...updates, updatedAt: new Date().toISOString() };
    await saveRoutines(routines);
    return routines[idx];
  }
  return null;
};

export const deleteRoutine = async (id) => {
  const routines = await getRoutines();
  await saveRoutines(routines.filter(r => r.id !== id));
};

// Generate daily entries from routine templates (idempotent per day)
export const generateRoutineEntries = async (dateKey) => {
  const routines = await getRoutines();
  const entries = await getAllEntries();
  const enabled = routines.filter(r => r.enabled);
  // Get day of week for this dateKey (format: YYYY-MM-DD)
  const dayOfWeek = new Date(dateKey + 'T12:00:00').getDay(); // 0=Sun,1=Mon,...6=Sat
  let added = 0;
  for (const routine of enabled) {
    // Skip if routine is day-specific and today isn't one of those days
    if (routine.repeatDays && routine.repeatDays.length > 0) {
      if (!routine.repeatDays.includes(dayOfWeek)) continue;
    }
    const exists = entries.some(e => e.routineId === routine.id && e.date === dateKey);
    if (!exists) {
      await addEntry({
        text: routine.text,
        type: 'task',
        state: 'open',
        date: dateKey,
        signifier: routine.signifier,
        pomodoros: routine.pomodoros,
        timeBlock: routine.timeBlock,
        source: 'routine',
        routineId: routine.id,
        category: routine.category || null,
      });
      added++;
    }
  }
  return added;
};

// ─── Wellness ───────────────────────────────────────────

const DEFAULT_WELLNESS_TEMPLATES = {
  nutrition: [],
  exercise: [
    { id: 'ex_walking', name: 'Walking', type: 'walking', value: '', sortOrder: 0 },
    { id: 'ex_gym', name: 'Gym', type: 'gym', value: '', sortOrder: 1 },
    { id: 'ex_cardio', name: 'Cardio', type: 'cardio', value: '', sortOrder: 2 },
  ],
  meditation: { enabled: true },
};

export const getWellnessTemplates = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WELLNESS_TEMPLATES);
    return data ? JSON.parse(data) : DEFAULT_WELLNESS_TEMPLATES;
  } catch (e) {
    return DEFAULT_WELLNESS_TEMPLATES;
  }
};

export const saveWellnessTemplates = async (templates) => {
  await AsyncStorage.setItem(STORAGE_KEYS.WELLNESS_TEMPLATES, JSON.stringify(templates));
};

const wellnessDayKey = (dateKey) => `nell_wellness_day_${dateKey}`;

export const getWellnessDay = async (dateKey) => {
  try {
    const data = await AsyncStorage.getItem(wellnessDayKey(dateKey));
    if (data) return JSON.parse(data);
    // Generate fresh day from templates
    const templates = await getWellnessTemplates();
    const day = {
      nutrition: {},
      exercise: {},
      meditation: { am: false, pm: false, eve: false },
    };
    templates.nutrition.forEach(item => {
      day.nutrition[item.id] = { done: false, value: item.value || '' };
    });
    templates.exercise.forEach(item => {
      day.exercise[item.id] = { done: false, value: item.value || '' };
    });
    await AsyncStorage.setItem(wellnessDayKey(dateKey), JSON.stringify(day));
    return day;
  } catch (e) {
    return { nutrition: {}, exercise: {}, meditation: { am: false, pm: false, eve: false } };
  }
};

export const saveWellnessDay = async (dateKey, dayData) => {
  await AsyncStorage.setItem(wellnessDayKey(dateKey), JSON.stringify(dayData));
};

// Track which wellness items the user has added to a specific day's Daily Log
const dailyWellnessSelKey = (dateKey) => `nell_daily_wellness_sel_${dateKey}`;

export const getDailyWellnessSelection = async (dateKey) => {
  try {
    const data = await AsyncStorage.getItem(dailyWellnessSelKey(dateKey));
    return data ? JSON.parse(data) : []; // array of wellness entry ids
  } catch { return []; }
};

export const saveDailyWellnessSelection = async (dateKey, ids) => {
  await AsyncStorage.setItem(dailyWellnessSelKey(dateKey), JSON.stringify(ids));
};

// ─── Morning Launch Sequence ────────────────────────────

export const getMorningSteps = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.MORNING_STEPS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveMorningSteps = async (steps) => {
  await AsyncStorage.setItem(STORAGE_KEYS.MORNING_STEPS, JSON.stringify(steps));
};

export const addMorningStep = async (step) => {
  const steps = await getMorningSteps();
  const newStep = {
    id: generateId(),
    text: '',
    icon: '☀️',
    sortOrder: steps.length,
    enabled: true,
    ...step,
  };
  steps.push(newStep);
  await saveMorningSteps(steps);
  return newStep;
};

export const updateMorningStep = async (id, updates) => {
  const steps = await getMorningSteps();
  const idx = steps.findIndex(s => s.id === id);
  if (idx === -1) return;
  steps[idx] = { ...steps[idx], ...updates };
  await saveMorningSteps(steps);
};

export const deleteMorningStep = async (id) => {
  const steps = await getMorningSteps();
  await saveMorningSteps(steps.filter(s => s.id !== id));
};

export const reorderMorningSteps = async (orderedIds) => {
  const steps = await getMorningSteps();
  const sorted = orderedIds.map((id, i) => {
    const s = steps.find(st => st.id === id);
    return s ? { ...s, sortOrder: i } : null;
  }).filter(Boolean);
  await saveMorningSteps(sorted);
};

const morningDoneKey = (dateKey) => `nell_morning_done_${dateKey}`;

export const isMorningComplete = async (dateKey) => {
  try {
    const val = await AsyncStorage.getItem(morningDoneKey(dateKey));
    return val === 'true';
  } catch { return false; }
};

export const completeMorning = async (dateKey) => {
  await AsyncStorage.setItem(morningDoneKey(dateKey), 'true');
};

// ─── Daily Commitment ───────────────────────────────────

const commitmentKey = (dateKey) => `nell_commitment_${dateKey}`;
const commitmentCheckKey = (dateKey) => `nell_commitment_check_${dateKey}`;

export const getCommitment = async (dateKey) => {
  try {
    const data = await AsyncStorage.getItem(commitmentKey(dateKey));
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const saveCommitment = async (dateKey, text) => {
  await AsyncStorage.setItem(commitmentKey(dateKey), JSON.stringify({
    text,
    createdAt: new Date().toISOString(),
  }));
};

export const getCommitmentCheck = async (dateKey) => {
  try {
    const data = await AsyncStorage.getItem(commitmentCheckKey(dateKey));
    return data ? JSON.parse(data) : null;
  } catch { return null; }
};

export const saveCommitmentCheck = async (dateKey, honoured) => {
  await AsyncStorage.setItem(commitmentCheckKey(dateKey), JSON.stringify({
    honoured,
    checkedAt: new Date().toISOString(),
  }));
};

// ─── Job Search Applications ────────────────────────────

const JOB_STAGES = ['identified', 'applied', 'interviewing', 'offered'];
export { JOB_STAGES };

export const getJobApplications = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.JOB_APPLICATIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
};

export const saveJobApplications = async (apps) => {
  await AsyncStorage.setItem(STORAGE_KEYS.JOB_APPLICATIONS, JSON.stringify(apps));
};

export const addJobApplication = async (app) => {
  const apps = await getJobApplications();
  const newApp = {
    id: generateId(),
    createdAt: new Date().toISOString(),
    company: '',
    role: '',
    dayRate: '',
    recruiter: '',
    nextAction: '',
    nextActionDate: '',
    stage: 'identified',
    notes: '',
    isContract: true,
    ...app,
  };
  apps.push(newApp);
  await saveJobApplications(apps);
  return newApp;
};

export const updateJobApplication = async (id, updates) => {
  const apps = await getJobApplications();
  const idx = apps.findIndex(a => a.id === id);
  if (idx === -1) return;
  apps[idx] = { ...apps[idx], ...updates, updatedAt: new Date().toISOString() };
  await saveJobApplications(apps);
};

export const deleteJobApplication = async (id) => {
  const apps = await getJobApplications();
  await saveJobApplications(apps.filter(a => a.id !== id));
};

export const moveJobApplication = async (id, newStage) => {
  await updateJobApplication(id, { stage: newStage });
};

// ─── Seed Data (first-launch defaults) ──────────────────

export const hasBeenSeeded = async () => {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.SEEDED);
    return val === 'true';
  } catch { return false; }
};

export const markSeeded = async () => {
  await AsyncStorage.setItem(STORAGE_KEYS.SEEDED, 'true');
};

export const seedDefaultData = async () => {
  const seeded = await hasBeenSeeded();
  if (seeded) return false;

  // Only seed if no goals exist yet
  const existingGoals = await getGoals();
  if (existingGoals.length > 0) {
    await markSeeded();
    return false;
  }

  // ── Habits ──
  const habitSupplements = await addHabit({ name: 'Take supplements', icon: '💊', timeOfDay: 'morning', twoMinVersion: 'Set them out on the counter' });
  const habitWalk = await addHabit({ name: '20-minute walk', icon: '🚶', timeOfDay: 'morning', twoMinVersion: 'Put shoes on and step outside for 2 mins' });
  const habitPhoneDown = await addHabit({ name: 'Phone-down time with wife', icon: '📱', timeOfDay: 'evening', twoMinVersion: 'Put phone in another room for 5 mins' });
  const habitYNAB = await addHabit({ name: 'Log expenses in YNAB', icon: '💰', timeOfDay: 'evening', twoMinVersion: 'Open YNAB and log one transaction' });
  const habitFlyLady = await addHabit({ name: 'FlyLady daily task', icon: '🏠', timeOfDay: 'morning', twoMinVersion: 'Wipe one surface' });

  // ── Priority Goal 1: Secure Contract Role ──
  const goal1 = await addGoal({
    title: 'Secure a Contract Role',
    description: 'Find and sign a contract role to stabilise income and demonstrate action.',
    ninetyDayTarget: 'Signed a contract at a competitive day rate',
    isPriority: true,
  });
  await addGoalDiscipline(goal1.id, 'Apply to 3 contract roles');
  await addGoalDiscipline(goal1.id, 'Contact 2 recruiters or connections');
  await addGoalWeeklyTask(goal1.id, 'Review and refine CV/LinkedIn');
  await addGoalWeeklyTask(goal1.id, 'Update job search tracker');
  await addGoalStandard(goal1.id, 'CV always up to date');
  await addGoalStandard(goal1.id, 'Respond to recruiters within 24 hours');

  // ── Priority Goal 2: Build Kynd ──
  const goal2 = await addGoal({
    title: 'Build Kynd',
    description: 'Progress the Kynd software company with co-founder — gaining traction.',
    ninetyDayTarget: 'Kynd MVP launched with first users onboarded',
    isPriority: true,
  });
  await addGoalDiscipline(goal2.id, '2 hours focused Kynd development');
  await addGoalWeeklyTask(goal2.id, 'Weekly sync with co-founder');
  await addGoalWeeklyTask(goal2.id, 'Ship one feature or deliverable');
  await addGoalStandard(goal2.id, 'Review Kynd roadmap priorities weekly');

  // ── Priority Goal 3: Rebuild Trust ──
  const goal3 = await addGoal({
    title: 'Rebuild Trust & Be Present',
    description: 'Show up for wife consistently through daily actions, not words.',
    ninetyDayTarget: 'Wife feels consistently supported — demonstrated through daily actions',
    isPriority: true,
  });
  await addGoalDiscipline(goal3.id, 'Phone-down time with wife (20+ mins)');
  await addGoalDiscipline(goal3.id, 'Honour daily commitment');
  await addGoalStandard(goal3.id, 'No inappropriate messaging — zero tolerance');
  await addGoalStandard(goal3.id, 'Be honest and transparent');
  await addGoalHabit(goal3.id, habitPhoneDown.id);

  // ── Parked Goal: Health Foundation ──
  await addGoal({
    title: 'Health Foundation',
    description: 'Build basic health habits — not trying to transform, just lay foundations.',
    ninetyDayTarget: 'Lost 1 stone, taking supplements daily, walking regularly',
    isPriority: false,
  });

  // ── Morning Launch Steps ──
  const defaultSteps = [
    { text: 'Take supplements', icon: '💊' },
    { text: 'Glass of water', icon: '💧' },
    { text: 'Set daily intention', icon: '🎯' },
    { text: 'Morning commitment', icon: '🤝' },
    { text: 'Review today\'s top 3', icon: '📋' },
    { text: 'Check FlyLady zone', icon: '🏠' },
    { text: 'First focus block (25 min)', icon: '⏱️' },
  ];
  for (const step of defaultSteps) {
    await addMorningStep(step);
  }

  await markSeeded();
  return true;
};

