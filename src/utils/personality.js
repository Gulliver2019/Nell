// Fun flavour text generators for Nell personality mode

const PROJECT_VERBS = [
  'Smash', 'Crush', 'Tackle', 'Power through', 'Nail',
  'Boss', 'Own', 'Dominate', 'Conquer', 'Blast through',
];

const TASK_PREFIXES = [
  'Time to crush it →',
  'Let\'s go →',
  'You got this →',
  'Lock in →',
  'Focus mode →',
];

const COMPLETE_DAY_LINES = [
  'Another day crushed! 💪',
  'You absolutely smashed it today!',
  'Day = dominated. Nice work.',
  'That\'s a wrap — well played!',
  'Boom. Day complete. You legend.',
];

const EMPTY_DAY_LINES = [
  'Fresh day, fresh start — let\'s crush it',
  'A blank canvas. What are you going to smash today?',
  'New day, who dis? Time to get after it.',
  'The day is yours. Go get it.',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a fun entry text for adding a project task to the daily.
 * @param {string} taskText - The task text
 * @param {string} projectTitle - The project title
 * @param {boolean} personalityEnabled - Whether personality mode is on
 */
export function projectTaskText(taskText, projectTitle, personalityEnabled) {
  if (!personalityEnabled) return taskText;
  const verb = pick(PROJECT_VERBS);
  return `${verb} the ${projectTitle} project → ${taskText}`;
}

/**
 * Get a fun confirmation message after adding to daily.
 */
export function addedToDailyMessage(personalityEnabled) {
  if (!personalityEnabled) return 'Added to daily';
  return pick([
    'Locked in! Time to crush it 🔥',
    'Added — now go smash it! 💪',
    'On the schedule. You got this! ⚡',
    'Boom, it\'s on your daily! 🎯',
    'Scheduled for destruction 💥',
  ]);
}

/**
 * Get a fun empty state line.
 */
export function emptyDayLine(personalityEnabled) {
  if (!personalityEnabled) return 'Fresh day, fresh start';
  return pick(EMPTY_DAY_LINES);
}

/**
 * Get a fun day complete message.
 */
export function completeDayLine(personalityEnabled) {
  if (!personalityEnabled) return 'Day completed';
  return pick(COMPLETE_DAY_LINES);
}
