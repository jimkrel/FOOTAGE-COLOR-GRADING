import React, { useState, useMemo } from 'react';
import { Search, Film, LayoutGrid, List, ArrowUpDown, Filter, X } from 'lucide-react';
import ClipCard from './ClipCard.jsx';
import TagFilterBar from './TagFilterBar.jsx';
import { LoadingView, EmptyView, ErrorView } from './common/StateView.jsx';

export default function ClipList({
  clips = [],
  selectedClip,
  onSelectClip,
  onAnalyze,
  onAnalyzeClip,
  analyzingClipPath,
  progressMap = {},
  selectedTag = 'all',
  onSelectTag,
  availableTags = {},
  filterIssue = 'all',
  onFilterChange,
  isScanning = false,
  scanError = null,
  onRefresh
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'duration' | 'issues'

  const handleAnalyze = onAnalyze || onAnalyzeClip;

  // Filter & Sort clips
  const displayClips = useMemo(() => {
    let result = clips.filter(clip => {
      const matchSearch = clip.fileName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });

    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.fileName.localeCompare(b.fileName));
    } else if (sortBy === 'duration') {
      result = [...result].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    } else if (sortBy === 'issues') {
      result = [...result].sort((a, b) => (b.stats?.issuePercentage || 0) - (a.stats?.issuePercentage || 0));
    }

    return result;
  }, [clips, searchQuery, sortBy]);

  return (
    <div className="w-80 lg:w-88 h-full flex flex-col bg-[#0d121f] border-r border-[#1c263c] shrink-0 select-none">
      {/* Top Header Section */}
      <div className="p-3 border-b border-[#1c263c] bg-[#0f1526]/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Thư viện Footage
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
              {clips.length}
            </span>
          </div>

          {/* View mode toggle: List / Card */}
          <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('card')}
              className={`p-1 rounded transition ${
                viewMode === 'card'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem dạng thẻ (Grid/Card View)"
            >
              <LayoutGrid size={13} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1 rounded transition ${
                viewMode === 'list'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem dạng bảng rút gọn (List View)"
            >
              <List size={13} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm kiếm footage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-slate-950/70 border border-slate-800 focus:border-cyan-500/70 rounded-md text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-500 hover:text-slate-300"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter Chips & Sort Controls */}
        <div className="flex items-center justify-between gap-1.5 text-[11px]">
          {/* Issue filter selector */}
          {onFilterChange && (
            <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 text-slate-300 flex-1 min-w-0">
              <Filter size={11} className="text-slate-400 shrink-0" />
              <select
                value={filterIssue}
                onChange={(e) => onFilterChange(e.target.value)}
                className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer w-full truncate"
              >
                <option value="all" className="bg-slate-900">Lỗi: Tất cả</option>
                <option value="overexposed" className="bg-slate-900 text-orange-400">Cháy sáng</option>
                <option value="underexposed" className="bg-slate-900 text-indigo-400">Thiếu sáng</option>
                <option value="cool_cast" className="bg-slate-900 text-sky-400">Ám xanh</option>
                <option value="warm_cast" className="bg-slate-900 text-yellow-400">Ám vàng</option>
                <option value="unanalyzed" className="bg-slate-900 text-slate-400">Chưa quét</option>
              </select>
            </div>
          )}

          {/* Sort selector */}
          <div className="flex items-center gap-1 bg-slate-900/90 px-2 py-1 rounded border border-slate-800 text-slate-300 shrink-0">
            <ArrowUpDown size={11} className="text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-slate-900">Mặc định</option>
              <option value="name" className="bg-slate-900">Tên A-Z</option>
              <option value="duration" className="bg-slate-900">Thời lượng</option>
              <option value="issues" className="bg-slate-900">% Lỗi màu</option>
            </select>
          </div>
        </div>

        {/* Dedicated Tag Filter Bar */}
        <TagFilterBar
          availableTags={availableTags}
          selectedTag={selectedTag}
          onSelectTag={onSelectTag}
        />
      </div>

      {/* 3-State Scroll List: Loading / Error / Empty / Content */}
      <div className={`flex-1 overflow-y-auto p-2.5 ${viewMode === 'list' ? 'space-y-1' : 'space-y-2.5'}`}>
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
            title="Không tìm thấy video nào"
            description="Thử xóa bộ lọc hoặc chọn một thư mục video khác."
          />
        ) : (
          displayClips.map((clip) => (
            <ClipCard
              key={clip.filePath}
              clip={clip}
              isSelected={selectedClip?.filePath === clip.filePath}
              onSelect={onSelectClip}
              onAnalyze={handleAnalyze}
              isAnalyzing={analyzingClipPath === clip.filePath}
              progress={progressMap[clip.filePath]}
              viewMode={viewMode}
            />
          ))
        )}
      </div>

      {/* Footer Stats Counter */}
      <div className="px-3 py-2 bg-[#0a0e1a] border-t border-[#1c263c] flex items-center justify-between text-[11px] text-slate-400 font-mono">
        <span>Hiển thị: {displayClips.length}/{clips.length}</span>
        <span>
          Đã phân tích: {clips.filter(c => c.isAnalyzed).length}
        </span>
      </div>
    </div>
  );
}
