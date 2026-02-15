// CrushedIT Dark Theme with Bold Accents
export const COLORS = {
  // Backgrounds
  bg: '#0D0D0F',
  bgCard: '#1A1A1F',
  bgElevated: '#242429',
  bgInput: '#2A2A30',

  // Accents
  accent: '#6C5CE7',       // Primary purple
  accentLight: '#A29BFE',  // Light purple
  accentSecondary: '#00CEC9', // Teal
  accentWarm: '#FD79A8',   // Pink
  accentGold: '#FDCB6E',   // Gold
  accentGreen: '#00B894',  // Green (completed)
  accentRed: '#FF6B6B',    // Red (cancelled/delete)
  accentOrange: '#E17055', // Orange (migrated)

  // Text
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  textMuted: '#636366',
  textInverse: '#0D0D0F',

  // Borders
  border: '#2C2C2E',
  borderLight: '#3A3A3C',

  // Status
  success: '#00B894',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  info: '#6C5CE7',
};

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
  card: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  glow: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Bullet Journal Signifiers
export const BULLET_TYPES = {
  task: { symbol: '•', label: 'Task', color: COLORS.text },
  event: { symbol: '○', label: 'Event', color: COLORS.accentSecondary },
  note: { symbol: '—', label: 'Note', color: COLORS.textSecondary },
};

export const TASK_STATES = {
  open: { symbol: '•', label: 'Open', color: COLORS.text },
  complete: { symbol: '✕', label: 'Done', color: COLORS.accentGreen },
  migrated: { symbol: '>', label: 'Migrated', color: COLORS.accentOrange },
  scheduled: { symbol: '<', label: 'Scheduled', color: COLORS.accent },
  cancelled: { symbol: '—', label: 'Cancelled', color: COLORS.textMuted },
};

export const SIGNIFIERS = {
  priority: { symbol: '!', label: 'Priority', color: COLORS.accentRed },
  inspiration: { symbol: '★', label: 'Inspiration', color: COLORS.accentGold },
  explore: { symbol: '?', label: 'Explore', color: COLORS.accentSecondary },
};
