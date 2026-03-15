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
};

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
};

// Date helpers
export const getDateKey = (date = new Date()) => {
  return date.toISOString().split('T')[0];
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
  const day = d.getDay(); // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? 0 : 1); // Monday of this week
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
};

export const getAllWeeklyIntentions = async () => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_INTENTIONS);
    return data ? JSON.parse(data) : {};
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
  let added = 0;
  for (const routine of enabled) {
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
