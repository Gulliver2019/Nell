// Daily entry categories — ordered by typical day flow
const CATEGORIES = [
  { key: 'launch',   emoji: '🌅', label: 'Launch the Day', color: '#F5A623' },
  { key: 'deepwork', emoji: '🧠', label: 'Deep Work',      color: '#7B61FF' },
  { key: 'exercise', emoji: '💪', label: 'Exercise',        color: '#34C759' },
  { key: 'home',     emoji: '🏠', label: 'Home',            color: '#5AC8FA' },
  { key: 'admin',    emoji: '📋', label: 'Admin',           color: '#FF9500' },
  { key: 'quickwin', emoji: '⚡', label: 'Quick Wins',      color: '#30D158' },
  { key: 'winddown', emoji: '🌙', label: 'Wind Down',       color: '#AF52DE' },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

export const UNCATEGORISED = { key: null, emoji: '📝', label: 'Tasks', color: '#8E8E93' };

export default CATEGORIES;
