// Nell Theme Utilities
// Screens should use useTheme().colors for dynamic theming
import THEMES from './themes';

// Default fallback colors (midnight theme)
export const COLORS = THEMES.midnight.colors;

export const FONTS = {
  light: { fontWeight: '300' },
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  heavy: { fontWeight: '800' },
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  title: 40,
  radius: 12,
  radiusLg: 16,
  radiusXl: 24,
};

export const SHADOWS = {
  card: (accent = '#6C5CE7') => ({
    shadowColor: accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  }),
  glow: (accent = '#6C5CE7') => ({
    shadowColor: accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  }),
};

// Dynamic bullet types/states/signifiers based on current theme colors
export const getBulletTypes = (c) => ({
  task: { symbol: '\u2022', label: 'Task', color: c.text },
  event: { symbol: '\u25CB', label: 'Event', color: c.accentSecondary },
  note: { symbol: '\u2014', label: 'Note', color: c.textSecondary },
});

export const getTaskStates = (c) => ({
  open: { symbol: '\u2022', label: 'Open', color: c.text },
  complete: { symbol: '\u2715', label: 'Done', color: c.accentGreen },
  migrated: { symbol: '>', label: 'Migrated', color: c.accentOrange },
  scheduled: { symbol: '<', label: 'Scheduled', color: c.accent },
  cancelled: { symbol: '\u2014', label: 'Cancelled', color: c.textMuted },
});

export const getSignifiers = (c) => ({
  priority: { symbol: '!', label: 'Priority', color: c.accentRed },
  inspiration: { symbol: '\u2605', label: 'Inspiration', color: c.accentGold },
  explore: { symbol: '?', label: 'Explore', color: c.accentSecondary },
});

// Static versions for backward compat (use midnight defaults)
export const BULLET_TYPES = getBulletTypes(COLORS);
export const TASK_STATES = getTaskStates(COLORS);
export const SIGNIFIERS = getSignifiers(COLORS);
