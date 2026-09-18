import React from 'react';
import { Tag } from 'lucide-react';
import { getTagTheme } from '../theme/tokens.js';

/**
 * TagFilterBar: Horizontal scrolling tag filter chips
 */
export default function TagFilterBar({
  availableTags = {},
  selectedTag = 'all',
  onSelectTag,
  className = ''
}) {
  const tagKeys = Object.keys(availableTags);
  if (tagKeys.length === 0) return null;

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar select-none ${className}`}>
      <button
        onClick={() => onSelectTag('all')}
        className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition border ${
          selectedTag === 'all'
            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-xs'
            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
        }`}
      >
        Tất cả
      </button>

      {tagKeys.map(tag => {
        const theme = getTagTheme(tag);
        const isSelected = selectedTag === tag;

        return (
          <button
            key={tag}
            onClick={() => onSelectTag(isSelected ? 'all' : tag)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition border flex items-center gap-1 ${
              isSelected
                ? `${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} ring-1 ring-cyan-500/30 font-semibold shadow-xs`
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
            }`}
          >
            <span>#{tag}</span>
            <span className="text-[9px] opacity-60">({availableTags[tag]})</span>
          </button>
        );
      })}
    </div>
  );
}
