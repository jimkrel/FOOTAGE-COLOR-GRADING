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
  onRefresh,
  style = {},
  className = ''
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('card'); // 'card' | 'list'
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name' | 'duration' | 'issues'

  const handleAnalyze = onAnalyze || onAnalyzeClip;

  const hasActiveFilters = searchQuery !== '' || (filterIssue && filterIssue !== 'all') || (selectedTag && selectedTag !== 'all');

  const handleClearFilters = () => {
    setSearchQuery('');
    if (onFilterChange) onFilterChange('all');
    if (onSelectTag) onSelectTag('all');
  };

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

  const hasClips = clips.length > 0;

  return (
    <div
      style={style}
      className={`h-full flex flex-col bg-[#0d121f] border-r border-[#1c263c] shrink-0 select-none ${className}`}
    >
      {/* Top Header Section */}
      <div className="p-3 border-b border-[#1c263c] bg-[#0f1526]/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Film size={14} className="text-cyan-400 shrink-0" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider truncate">
              Thư viện Footage
            </span>
            {hasClips && (
              <span
                className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 shrink-0"
                title={displayClips.length !== clips.length ? `Đang hiển thị ${displayClips.length} trên tổng số ${clips.length} clip` : `${clips.length} clip`}
              >
                {displayClips.length === clips.length ? clips.length : `${displayClips.length}/${clips.length}`}
              </span>
            )}
          </div>

          {/* View mode toggle: List / Card (Only show when library has items) */}
          {hasClips && (
            <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800 shrink-0">
              <button
                onClick={() => setViewMode('card')}
                className={`p-1 rounded transition cursor-pointer ${
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
                className={`p-1 rounded transition cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Xem dạng bảng rút gọn (List View)"
              >
                <List size={13} />
              </button>
            </div>
          )}
        </div>

        {/* Search Bar & Filters (Only visible when library has footage) */}
        {hasClips && (
          <>
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
                  className="absolute right-2 top-2 text-slate-500 hover:text-slate-300 cursor-pointer"
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
                    <option value="cool_cast" className="bg-slate-900 text-cyan-400">Ám xanh</option>
                    <option value="warm_cast" className="bg-slate-900 text-amber-400">Ám vàng</option>
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
          </>
        )}
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
        ) : !hasClips ? (
          /* Trạng thái 1: Thư viện hoàn toàn trống (First-time empty state) - Thân thiện, êm dịu, không báo lỗi */
          <div className="h-full flex flex-col items-center justify-center py-12 px-4 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-center text-slate-600 mb-3 shadow-inner">
              <Film size={22} className="opacity-60" />
            </div>
            <div className="text-xs font-medium text-slate-400">Chưa có footage nào</div>
            <p className="text-[11px] text-slate-600 mt-1 max-w-[200px] leading-relaxed">
              Mời chọn thư mục chứa video hoặc kéo thả trực tiếp file vào đây.
            </p>
          </div>
        ) : displayClips.length === 0 ? (
          /* Trạng thái 2: Đã có video trong thư viện nhưng bị bộ lọc/tìm kiếm loại hết */
          <div className="py-8 px-4 flex flex-col items-center text-center">
            <EmptyView
              icon={Filter}
              title="Không tìm thấy video phù hợp"
              description="Không có clip nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại."
            />
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="mt-2 px-3 py-1.5 rounded-md bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-medium border border-cyan-800/50 transition cursor-pointer active:scale-95"
              >
                Xóa tất cả bộ lọc
              </button>
            )}
          </div>
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

      {/* Footer Stats Counter (Only show when library has clips) */}
      {hasClips && (
        <div className="px-3 py-2 bg-[#0a0e1a] border-t border-[#1c263c] flex items-center justify-between text-[11px] text-slate-400 font-mono overflow-hidden shrink-0">
          <span className="truncate mr-2">Hiển thị: {displayClips.length}/{clips.length}</span>
          <span className="shrink-0 whitespace-nowrap">
            Đã phân tích: {clips.filter(c => c.isAnalyzed).length}
          </span>
        </div>
      )}
    </div>
  );
}
