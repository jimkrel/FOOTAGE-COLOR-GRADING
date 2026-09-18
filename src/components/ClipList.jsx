import React, { useState } from 'react';
import { Search, Film } from 'lucide-react';
import ClipCard from './ClipCard.jsx';

export default function ClipList({
  clips,
  selectedClip,
  onSelectClip,
  onAnalyzeClip,
  analyzingClipPath,
  progressMap,
  selectedTag = 'all',
  onSelectTag,
  availableTags = {}
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayClips = clips.filter(clip =>
    clip.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tagKeys = Object.keys(availableTags);

  return (
    <div className="w-80 md:w-88 h-full flex flex-col bg-[#0d121f] border-r border-slate-800/80 shrink-0 select-none">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800/70">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm tên clip..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-900/90 border border-slate-800 focus:border-cyan-500/70 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition"
          />
        </div>

        {/* Tag quick filter chips */}
        {tagKeys.length > 0 && onSelectTag && (
          <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => onSelectTag('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition border ${
                selectedTag === 'all'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              Tất cả
            </button>
            {tagKeys.map(tag => (
              <button
                key={tag}
                onClick={() => onSelectTag(selectedTag === tag ? 'all' : tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap transition border ${
                  selectedTag === tag
                    ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-slate-800'
                }`}
              >
                #{tag} <span className="opacity-60 text-[9px]">({availableTags[tag]})</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
          <span>{displayClips.length} video</span>
          <span>
            {clips.filter(c => c.isAnalyzed).length}/{clips.length} đã phân tích
          </span>
        </div>
      </div>

      {/* Clips Scroll List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {displayClips.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <Film size={36} className="mb-2 stroke-1 text-slate-600" />
            <div className="text-xs font-medium">Không tìm thấy footage nào</div>
            <div className="text-[11px] text-slate-600 mt-1">
              Chọn thư mục video hoặc điều chỉnh bộ lọc
            </div>
          </div>
        ) : (
          displayClips.map((clip) => (
            <ClipCard
              key={clip.filePath}
              clip={clip}
              isSelected={selectedClip?.filePath === clip.filePath}
              onSelect={onSelectClip}
              onAnalyze={onAnalyzeClip}
              isAnalyzing={analyzingClipPath === clip.filePath}
              progress={progressMap[clip.filePath]}
            />
          ))
        )}
      </div>
    </div>
  );
}
