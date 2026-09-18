import React, { useState } from 'react';
import { Search, Film } from 'lucide-react';
import ClipCard from './ClipCard.jsx';
import TagFilterBar from './TagFilterBar.jsx';
import { LoadingView, EmptyView, ErrorView } from './common/StateView.jsx';

export default function ClipList({
  clips = [],
  selectedClip,
  onSelectClip,
  onAnalyzeClip,
  analyzingClipPath,
  progressMap = {},
  selectedTag = 'all',
  onSelectTag,
  availableTags = {},
  isScanning = false,
  scanError = null,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const displayClips = clips.filter(clip =>
    clip.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

        {/* Dedicated Tag Filter Bar */}
        <TagFilterBar
          availableTags={availableTags}
          selectedTag={selectedTag}
          onSelectTag={onSelectTag}
          className="mt-2.5"
        />

        <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
          <span>{displayClips.length} video</span>
          <span>
            {clips.filter(c => c.isAnalyzed).length}/{clips.length} đã phân tích
          </span>
        </div>
      </div>

      {/* 3-State Scroll List: Loading / Error / Empty / Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {isScanning ? (
          <LoadingView message="Đang quét các file video trong thư mục..." />
        ) : scanError ? (
          <ErrorView
            title="Lỗi đọc thư mục"
            message={scanError}
            onRetry={onRefresh}
          />
        ) : displayClips.length === 0 ? (
          <EmptyView
            icon={Film}
            title="Không tìm thấy footage nào"
            description="Hãy chọn một thư mục chứa file video hoặc thử xóa bộ lọc tag/từ khóa tìm kiếm."
          />
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
