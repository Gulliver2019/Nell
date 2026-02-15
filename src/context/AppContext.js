import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import * as Storage from '../utils/storage';

const AppContext = createContext();

const initialState = {
  entries: [],
  collections: [],
  habits: [],
  reflections: [],
  futureLog: {},
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
    case 'SET_FUTURE_LOG':
      return { ...state, futureLog: action.payload };
    case 'SET_SELECTED_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_SEARCH':
      return { ...state, searchQuery: action.payload };
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const loadAll = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    const [entries, collections, habits, reflections, futureLog] = await Promise.all([
      Storage.getAllEntries(),
      Storage.getCollections(),
      Storage.getHabits(),
      Storage.getReflections(),
      Storage.getFutureLog(),
    ]);
    dispatch({ type: 'LOAD_ALL', payload: { entries, collections, habits, reflections, futureLog } });
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Entry actions
  const addEntry = useCallback(async (entry) => {
    const newEntry = await Storage.addEntry(entry);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
    return newEntry;
  }, []);

  const updateEntry = useCallback(async (id, updates) => {
    await Storage.updateEntry(id, updates);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const deleteEntry = useCallback(async (id) => {
    await Storage.deleteEntry(id);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
  }, []);

  const migrateEntry = useCallback(async (id) => {
    await Storage.migrateEntry(id);
    const entries = await Storage.getAllEntries();
    dispatch({ type: 'SET_ENTRIES', payload: entries });
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

  const setSelectedDate = useCallback((date) => {
    dispatch({ type: 'SET_SELECTED_DATE', payload: date });
  }, []);

  const setSearchQuery = useCallback((q) => {
    dispatch({ type: 'SET_SEARCH', payload: q });
  }, []);

  const value = {
    ...state,
    loadAll,
    addEntry,
    updateEntry,
    deleteEntry,
    migrateEntry,
    scheduleEntry,
    addCollection,
    deleteCollection,
    addHabit,
    toggleHabitDay,
    deleteHabit,
    saveReflection,
    addFutureLogEntry,
    removeFutureLogEntry,
    setSelectedDate,
    setSearchQuery,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
