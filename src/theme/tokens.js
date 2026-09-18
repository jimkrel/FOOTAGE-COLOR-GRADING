/**
 * Centralized Design Tokens for Footage Color Analyzer
 * All components MUST reference color tokens, issue types, and badges from this file.
 * Do NOT use hardcoded hex codes across components.
 */

export const ISSUE_THEME = {
  normal: {
    bg: '#10b981',
    border: '#059669',
    text: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/15',
    badgeBorder: 'border-emerald-500/30',
    badgeText: 'text-emerald-400',
    label: 'Cân bằng tốt',
    tag: 'clean'
  },
  overexposed: {
    bg: '#f97316',
    border: '#ea580c',
    text: 'text-orange-400',
    badgeBg: 'bg-orange-500/15',
    badgeBorder: 'border-orange-500/30',
    badgeText: 'text-orange-400',
    label: 'Cháy sáng (Over)',
    tag: 'overexposed'
  },
  underexposed: {
    bg: '#6366f1',
    border: '#4f46e5',
    text: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/15',
    badgeBorder: 'border-indigo-500/30',
    badgeText: 'text-indigo-400',
    label: 'Thiếu sáng (Under)',
    tag: 'underexposed'
  },
  cool_cast: {
    bg: '#0ea5e9',
    border: '#0284c7',
    text: 'text-sky-400',
    badgeBg: 'bg-sky-500/15',
    badgeBorder: 'border-sky-500/30',
    badgeText: 'text-sky-400',
    label: 'Ám xanh (Cool)',
    tag: 'cool-cast'
  },
  warm_cast: {
    bg: '#eab308',
    border: '#ca8a04',
    text: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/15',
    badgeBorder: 'border-yellow-500/30',
    badgeText: 'text-yellow-400',
    label: 'Ám vàng (Warm)',
    tag: 'warm-cast'
  },
  magenta_cast: {
    bg: '#ec4899',
    border: '#db2777',
    text: 'text-pink-400',
    badgeBg: 'bg-pink-500/15',
    badgeBorder: 'border-pink-500/30',
    badgeText: 'text-pink-400',
    label: 'Ám hồng/đỏ',
    tag: 'magenta-cast'
  },
  green_cast: {
    bg: '#84cc16',
    border: '#65a30d',
    text: 'text-lime-400',
    badgeBg: 'bg-lime-500/15',
    badgeBorder: 'border-lime-500/30',
    badgeText: 'text-lime-400',
    label: 'Ám xanh lá',
    tag: 'green-cast'
  }
};

// Tag to theme mapping helper
export function getTagTheme(tag) {
  if (tag === 'clean') return ISSUE_THEME.normal;
  if (tag === 'overexposed') return ISSUE_THEME.overexposed;
  if (tag === 'underexposed') return ISSUE_THEME.underexposed;
  if (tag === 'cool-cast' || tag === 'cool_cast') return ISSUE_THEME.cool_cast;
  if (tag === 'warm-cast' || tag === 'warm_cast') return ISSUE_THEME.warm_cast;
  if (tag === 'magenta-cast' || tag === 'magenta_cast') return ISSUE_THEME.magenta_cast;
  if (tag === 'green-cast' || tag === 'green_cast') return ISSUE_THEME.green_cast;
  return {
    bg: '#64748b',
    border: '#475569',
    text: 'text-slate-400',
    badgeBg: 'bg-slate-800/80',
    badgeBorder: 'border-slate-700/60',
    badgeText: 'text-slate-400',
    label: tag,
    tag
  };
}

// Issue to theme mapping helper
export function getIssueTheme(issueType) {
  return ISSUE_THEME[issueType] || ISSUE_THEME.normal;
}
