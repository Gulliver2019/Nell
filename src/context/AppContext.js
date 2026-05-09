import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Storage from '../utils/storage';

const ENABLED_FEATURES_KEY = '@enabled_features';
const PERSONALITY_KEY = '@personality_enabled';
const DEFAULT_FEATURES = {
  logging: true,
  shopping: true,
  projects: true,
  collections: true,
  habits: true,
  reflections: true,
};

const AppContext = createContext();

const initialState = {
  entries: [],
  collections: [],
  habits: [],
  reflections: [],
  habitReflections: [],
  futureLog: {},
  weeklyIntentions: {},
  projects: [],
  goals: [],
  routines: [],
  wellnessTemplates: { nutrition: [], exercise: [], meditation: { enabled: true } },
  enabledFeatures: DEFAULT_FEATURES,
  personalityEnabled: true,
  selectedDate: Storage.getDateKey(),
  loading: true,
  searchQuery: '',
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOAD_ALL':
      return { ...state, ...action.payload, loading: false };
    case 'SET_ENTRIES':
      return { ...state, entries: action.payload };
    case 'SET_COLLECTIONS':
      return { ...state, collections: action.payload };
    case 'SET_HABITS':
      return { ...state, habits: action.payload };
    case 'SET_REFLECTIONS':
      return { ...state, reflections: action.payload };
    case 'SET_HABIT_REFLECTIONS':
      return { ...state, habitReflections: action.payload };
    case 'SET_FUTURE_LOG':
      return { ...state, futureLog: action.payload };
    case 'SET_WEEKLY_INTENTIONS':
      return { ...state, weeklyIntentions: action.payload };
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    case 'SET_GOALS':
      return { ...state, goals: action.payload };
    case 'SET_ROUTINES':
      return { ...state, routines: action.payload };
    case 'SET_WELLNESS_TEMPLATES':
      return { ...state, wellnessTemplates: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    case 'SET_ENABLED_FEATURES':
      return { ...state, enabledFeatures: action.payload };
    case 'SET_PERSONALITY':
      return { ...state, personalityEnabled: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const [entries, collections, habits, reflections, habitReflections, futureLog, projects, goals, routines, wellnessTemplates, weeklyIntentions, featuresJson, personalityJson] = await Promise.all([
      Storage.getAllEntries(),
      Storage.getCollections(),
      Storage.getHabits(),
      Storage.getReflections(),
      Storage.getHabitReflections(),
      Storage.getFutureLog(),
      Storage.getProjects(),
      Storage.getGoals(),
      Storage.getRoutines(),
      Storage.getWellnessTemplates(),
      Storage.getAllWeeklyIntentions(),
      AsyncStorage.getItem(ENABLED_FEATURES_KEY),
      AsyncStorage.getItem(PERSONALITY_KEY),
    ]);
    const enabledFeatures = featuresJson ? { ...DEFAULT_FEATURES, ...JSON.parse(featuresJson) } : DEFAULT_FEATURES;
    const personalityEnabled = personalityJson !== null ? personalityJson === 'true' : true;
    dispatch({ type: 'LOAD_ALL', payload: { entries, collections, habits, reflections, habitReflections, futureLog, projects, goals, routines, wellnessTemplates, weeklyIntentions, enabledFeatures, personalityEnabled } });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-migrate: on load, move any open or migrated entries from past days to today
  useEffect(() => {
    if (state.loading) return;
    const today = Storage.getDateKey();
    const toMigrate = state.entries.filter(
      e => e.type === 'task'
        && (e.state === 'open' || (e.state === 'migrated' && !e._migratedToToday))
        && e.date && e.date < today
        && !e.collection
        && !e.routineId
    );
    if (toMigrate.length === 0) return;

    (async () => {
      const allEntries = await Storage.getAllEntries();
      for (const entry of toMigrate) {
        const alreadyCopied = allEntries.some(
          e => e.migratedFrom === entry.id && e.date === today
        );
        if (!alreadyCopied) {
          await Storage.addEntry({
            text: entry.text,
            type: entry.type,
            signifier: entry.signifier || null,
            pomodoros: entry.pomodoros || 0,
            date: today,
            state: 'open',
            migratedFrom: entry.id,
          });
        }
        // Remove original from its old day
        await Storage.deleteEntry(entry.id);
      }
      const entries = await Storage.getAllEntries();
      dispatch({ type: 'SET_ENTRIES', payload: entries });
    })();
  }, [state.loading]);

  // Entry actions
  const addEntry = useCallback(async (entry) => {
    const newEntry = await Storage.addEntry(entry);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
    return newEntry;
  }, []);

  const updateEntry = useCallback(async (id, updates) => {
    await Storage.updateEntry(id, updates);
    // Sync completion back to collection source
    if (updates.state === 'complete') {
      const allEntries = await Storage.getAllEntries();
      const entry = allEntries.find(e => e.id === id);
      if (entry?.scheduledFrom) {
        await Storage.updateEntry(entry.scheduledFrom, { state: 'complete' });
      }
      // Sync completion to weekly intention task
      if (entry?.weeklyRef) {
        const [wk, areaId, taskId] = entry.weeklyRef.split('|');
        await Storage.updateWeeklyTask(wk, areaId, taskId, { done: true });
        const wi = await Storage.getAllWeeklyIntentions();
        dispatch({ type: 'SET_WEEKLY_INTENTIONS', payload: wi });
      }
    }
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const deleteEntry = useCallback(async (id) => {
    await Storage.deleteEntry(id);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const reorderEntries = useCallback(async (orderedIds) => {
    await Storage.reorderEntries(orderedIds);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const migrateEntry = useCallback(async (id) => {
    await Storage.migrateEntry(id);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  // Manual migrate: move all open/migrated tasks from past days to today
  const migratePastEntries = useCallback(async () => {
    const today = Storage.getDateKey();
    const allEntries = await Storage.getAllEntries();
    const toMigrate = allEntries.filter(
      e => e.type === 'task'
        && (e.state === 'open' || (e.state === 'migrated' && !e._migratedToToday))
        && e.date && e.date < today
        && !e.collection
        && !e.routineId
    );
    if (toMigrate.length === 0) return 0;

    let count = 0;
    for (const entry of toMigrate) {
      const alreadyCopied = allEntries.some(
        e => e.migratedFrom === entry.id && e.date === today
      );
      if (!alreadyCopied) {
        await Storage.addEntry({
          text: entry.text,
          type: entry.type,
          signifier: entry.signifier || null,
          pomodoros: entry.pomodoros || 0,
          date: today,
          state: 'open',
          migratedFrom: entry.id,
        });
        count++;
      }
      // Remove original from its old day
      await Storage.deleteEntry(entry.id);
    }
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
    return count;
  }, []);

  // Complete day: migrate today's open tasks to tomorrow and save a reflection
  const completeDayAndMigrate = useCallback(async (reflection) => {
    const today = Storage.getDateKey();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = Storage.getDateKey(tomorrow);

    const allEntries = await Storage.getAllEntries();
    const tasksToMigrate = allEntries.filter(
      e => e.type === 'task'
        && (e.state === 'open' || e.state === 'migrated')
        && e.date === today
        && !e.collection
        && !e.routineId
    );

    let count = 0;
    for (const entry of tasksToMigrate) {
      const alreadyCopied = allEntries.some(
        e => e.migratedFrom === entry.id && e.date === tomorrowKey
      );
      if (!alreadyCopied) {
        await Storage.addEntry({
          text: entry.text,
          type: entry.type,
          signifier: entry.signifier || null,
          pomodoros: entry.pomodoros || 0,
          date: tomorrowKey,
          state: 'open',
          migratedFrom: entry.id,
        });
        count++;
      }
      // Mark the original as migrated (if it was open) then remove
      await Storage.deleteEntry(entry.id);
    }

    // Save the reflection if provided
    if (reflection) {
      await Storage.saveReflection(reflection);
      const reflections = await Storage.getReflections();
      dispatch({ type: 'SET_REFLECTIONS', payload: reflections });
    }

    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
    return count;
  }, []);

  const scheduleEntry = useCallback(async (id, date) => {
    await Storage.scheduleEntry(id, date);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  // Collection actions
  const addCollection = useCallback(async (col) => {
    await Storage.addCollection(col);
    const collections = await Storage.getCollections();
    dispatch({ type: 'SET_COLLECTIONS', payload: collections });
  }, []);

  const deleteCollection = useCallback(async (id) => {
    await Storage.deleteCollection(id);
    const [collections, entries] = await Promise.all([
      Storage.getCollections(),
      Storage.getAllEntries(),
    ]);
    dispatch({ type: 'SET_COLLECTIONS', payload: collections });
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  // Habit actions
  const addHabit = useCallback(async (habit) => {
    await Storage.addHabit(habit);
    const habits = await Storage.getHabits();
    dispatch({ type: 'SET_HABITS', payload: habits });
  }, []);

  const toggleHabitDay = useCallback(async (habitId, dateKey) => {
    await Storage.toggleHabitDay(habitId, dateKey);
    const habits = await Storage.getHabits();
    dispatch({ type: 'SET_HABITS', payload: habits });
  }, []);

  const deleteHabit = useCallback(async (id) => {
    await Storage.deleteHabit(id);
    const habits = await Storage.getHabits();
    dispatch({ type: 'SET_HABITS', payload: habits });
  }, []);

  // Reflection actions
  const saveReflection = useCallback(async (ref) => {
    await Storage.saveReflection(ref);
    const reflections = await Storage.getReflections();
    dispatch({ type: 'SET_REFLECTIONS', payload: reflections });
  }, []);

  const saveHabitReflection = useCallback(async (ref) => {
    await Storage.saveHabitReflection(ref);
    const habitReflections = await Storage.getHabitReflections();
    dispatch({ type: 'SET_HABIT_REFLECTIONS', payload: habitReflections });
  }, []);

  // Future Log
  const addFutureLogEntry = useCallback(async (monthKey, entry) => {
    await Storage.addFutureLogEntry(monthKey, entry);
    const futureLog = await Storage.getFutureLog();
    dispatch({ type: 'SET_FUTURE_LOG', payload: futureLog });
  }, []);

  const removeFutureLogEntry = useCallback(async (monthKey, entryId) => {
    await Storage.removeFutureLogEntry(monthKey, entryId);
    const futureLog = await Storage.getFutureLog();
    dispatch({ type: 'SET_FUTURE_LOG', payload: futureLog });
  }, []);

  // Weekly Intentions
  const refreshWeeklyIntentions = useCallback(async () => {
    const data = await Storage.getAllWeeklyIntentions();
    dispatch({ type: 'SET_WEEKLY_INTENTIONS', payload: data });
  }, []);

  const addWeeklyArea = useCallback(async (weekKey, areaName) => {
    const area = await Storage.addWeeklyArea(weekKey, areaName);
    await refreshWeeklyIntentions();
    return area;
  }, [refreshWeeklyIntentions]);

  const removeWeeklyArea = useCallback(async (weekKey, areaId) => {
    await Storage.removeWeeklyArea(weekKey, areaId);
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  const addWeeklyTask = useCallback(async (weekKey, areaId, taskText) => {
    await Storage.addWeeklyTask(weekKey, areaId, taskText);
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  const updateWeeklyTask = useCallback(async (wk, areaId, taskId, updates) => {
    await Storage.updateWeeklyTask(wk, areaId, taskId, updates);
    // Sync completion to any linked daily entries
    if (updates.done === true) {
      const allEntries = await Storage.getAllEntries();
      const ref = `${wk}|${areaId}|${taskId}`;
      const linked = allEntries.filter(e => e.weeklyRef === ref && e.state !== 'complete');
      for (const e of linked) {
        await Storage.updateEntry(e.id, { state: 'complete' });
      }
      if (linked.length > 0) {
        const entries = await Storage.getAllEntries();
        dispatch({ type: 'SET_ENTRIES', payload: entries });
      }
    }
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  const removeWeeklyTask = useCallback(async (weekKey, areaId, taskId) => {
    await Storage.removeWeeklyTask(weekKey, areaId, taskId);
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  const reorderWeeklyTasks = useCallback(async (weekKey, areaId, orderedTaskIds) => {
    await Storage.reorderWeeklyTasks(weekKey, areaId, orderedTaskIds);
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  const moveWeeklyTask = useCallback(async (weekKey, fromAreaId, toAreaId, taskId) => {
    await Storage.moveWeeklyTask(weekKey, fromAreaId, toAreaId, taskId);
    await refreshWeeklyIntentions();
  }, [refreshWeeklyIntentions]);

  // Project actions
  const addProject = useCallback(async (project) => {
    await Storage.addProject(project);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const updateProject = useCallback(async (id, updates) => {
    await Storage.updateProject(id, updates);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const deleteProject = useCallback(async (id) => {
    await Storage.deleteProject(id);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const addProjectTask = useCallback(async (projectId, task) => {
    await Storage.addProjectTask(projectId, task);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const moveProjectTask = useCallback(async (projectId, taskId, toColumn) => {
    await Storage.moveProjectTask(projectId, taskId, toColumn);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const deleteProjectTask = useCallback(async (projectId, taskId) => {
    await Storage.deleteProjectTask(projectId, taskId);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const updateProjectTask = useCallback(async (projectId, taskId, updates) => {
    await Storage.updateProjectTask(projectId, taskId, updates);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const reorderProjectTasks = useCallback(async (projectId, column, orderedTaskIds) => {
    await Storage.reorderProjectTasks(projectId, column, orderedTaskIds);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  const reorderProjects = useCallback(async (orderedIds) => {
    await Storage.reorderProjects(orderedIds);
    const projects = await Storage.getProjects();
    dispatch({ type: 'SET_PROJECTS', payload: projects });
  }, []);

  // Goal actions
  const addGoal = useCallback(async (goal) => {
    await Storage.addGoal(goal);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const updateGoal = useCallback(async (id, updates) => {
    await Storage.updateGoal(id, updates);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const deleteGoal = useCallback(async (id) => {
    await Storage.deleteGoal(id);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const toggleGoalPriority = useCallback(async (id) => {
    await Storage.toggleGoalPriority(id);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const linkProjectToGoal = useCallback(async (goalId, projectId) => {
    await Storage.linkProjectToGoal(goalId, projectId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const unlinkProjectFromGoal = useCallback(async (goalId, projectId) => {
    await Storage.unlinkProjectFromGoal(goalId, projectId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const addMonthlyFocus = useCallback(async (goalId, monthKey, text) => {
    const focus = await Storage.addMonthlyFocus(goalId, monthKey, text);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
    return focus;
  }, []);

  const updateMonthlyFocus = useCallback(async (goalId, focusId, updates) => {
    await Storage.updateMonthlyFocus(goalId, focusId, updates);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const deleteMonthlyFocus = useCallback(async (goalId, focusId) => {
    await Storage.deleteMonthlyFocus(goalId, focusId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  // Goal sub-item actions
  const addGoalDiscipline = useCallback(async (goalId, text) => {
    const item = await Storage.addGoalDiscipline(goalId, text);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
    return item;
  }, []);

  const updateGoalDiscipline = useCallback(async (goalId, disciplineId, updates) => {
    await Storage.updateGoalDiscipline(goalId, disciplineId, updates);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const deleteGoalDiscipline = useCallback(async (goalId, disciplineId) => {
    await Storage.deleteGoalDiscipline(goalId, disciplineId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const addGoalWeeklyTask = useCallback(async (goalId, text) => {
    const item = await Storage.addGoalWeeklyTask(goalId, text);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
    return item;
  }, []);

  const updateGoalWeeklyTask = useCallback(async (goalId, taskId, updates) => {
    await Storage.updateGoalWeeklyTask(goalId, taskId, updates);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const deleteGoalWeeklyTask = useCallback(async (goalId, taskId) => {
    await Storage.deleteGoalWeeklyTask(goalId, taskId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const addGoalStandard = useCallback(async (goalId, text) => {
    const item = await Storage.addGoalStandard(goalId, text);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
    return item;
  }, []);

  const updateGoalStandard = useCallback(async (goalId, standardId, updates) => {
    await Storage.updateGoalStandard(goalId, standardId, updates);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  const deleteGoalStandard = useCallback(async (goalId, standardId) => {
    await Storage.deleteGoalStandard(goalId, standardId);
    const goals = await Storage.getGoals();
    dispatch({ type: 'SET_GOALS', payload: goals });
  }, []);

  // Routine actions
  const addRoutine = useCallback(async (routine) => {
    const newRoutine = await Storage.addRoutine(routine);
    const routines = await Storage.getRoutines();
    dispatch({ type: 'SET_ROUTINES', payload: routines });
    return newRoutine;
  }, []);

  const updateRoutine = useCallback(async (id, updates) => {
    await Storage.updateRoutine(id, updates);
    const routines = await Storage.getRoutines();
    dispatch({ type: 'SET_ROUTINES', payload: routines });
  }, []);

  const deleteRoutine = useCallback(async (id) => {
    await Storage.deleteRoutine(id);
    const routines = await Storage.getRoutines();
    dispatch({ type: 'SET_ROUTINES', payload: routines });
  }, []);

  const generateRoutineEntries = useCallback(async (dateKey) => {
    const added = await Storage.generateRoutineEntries(dateKey);
    if (added > 0) {
      const entries = await Storage.getAllEntries();
      dispatch({ type: 'SET_ENTRIES', payload: entries });
    }
    return added;
  }, []);

  // Wellness actions
  const saveWellnessTemplates = useCallback(async (templates) => {
    await Storage.saveWellnessTemplates(templates);
    dispatch({ type: 'SET_WELLNESS_TEMPLATES', payload: templates });
  }, []);

  const setSelectedDate = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  }, []);

  const setSearchQuery = useCallback((q) => {
    dispatch({ type: 'SET_SEARCH', payload: q });
  }, []);

  const toggleFeature = useCallback(async (key) => {
    const updated = { ...state.enabledFeatures, [key]: !state.enabledFeatures[key] };
    dispatch({ type: 'SET_ENABLED_FEATURES', payload: updated });
    await AsyncStorage.setItem(ENABLED_FEATURES_KEY, JSON.stringify(updated));
  }, [state.enabledFeatures]);

  const togglePersonality = useCallback(async () => {
    const next = !state.personalityEnabled;
    dispatch({ type: 'SET_PERSONALITY', payload: next });
    await AsyncStorage.setItem(PERSONALITY_KEY, String(next));
  }, [state.personalityEnabled]);

  const value = {
    ...state,
    loadAll,
    addEntry,
    updateEntry,
    deleteEntry,
    reorderEntries,
    migrateEntry,
    migratePastEntries,
    scheduleEntry,
    addCollection,
    deleteCollection,
    addHabit,
    toggleHabitDay,
    deleteHabit,
    saveReflection,
    saveHabitReflection,
    addFutureLogEntry,
    removeFutureLogEntry,
    addWeeklyArea,
    removeWeeklyArea,
    addWeeklyTask,
    updateWeeklyTask,
    removeWeeklyTask,
    reorderWeeklyTasks,
    moveWeeklyTask,
    refreshWeeklyIntentions,
    addProject,
    updateProject,
    deleteProject,
    addProjectTask,
    moveProjectTask,
    deleteProjectTask,
    updateProjectTask,
    reorderProjectTasks,
    reorderProjects,
    addGoal,
    updateGoal,
    deleteGoal,
    toggleGoalPriority,
    linkProjectToGoal,
    unlinkProjectFromGoal,
    addMonthlyFocus,
    updateMonthlyFocus,
    deleteMonthlyFocus,
    addGoalDiscipline,
    updateGoalDiscipline,
    deleteGoalDiscipline,
    addGoalWeeklyTask,
    updateGoalWeeklyTask,
    deleteGoalWeeklyTask,
    addGoalStandard,
    updateGoalStandard,
    deleteGoalStandard,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    generateRoutineEntries,
    saveWellnessTemplates,
    completeDayAndMigrate,
    setSelectedDate,
    setSearchQuery,
    toggleFeature,
    togglePersonality,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
