import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Sliders,
  Sparkles,
  Film,
  Play,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Zap,
  List,
  LayoutGrid,
  FolderOpen,
  Plus,
  X,
  ChevronDown
} from 'lucide-react';
import { getIssueTheme, getTagTheme } from '../theme/tokens.js';
import ScanProgressBar from './ScanProgressBar.jsx';
import ClipCard from './ClipCard.jsx';

export default function FootageTable({
  clips = [],
  selectedClip,
  onSelectClip,
  onAnalyzeClip,
  onAnalyzeAll,
  isAnalyzingAny = false,
  analyzingClipPath,
  progressMap = {},
  onOpenSettings,
  batchProgress,
  onCancelBatch,
  onSelectFolder,
  onSelectFiles,
  activeNavFilter = 'all',
  onSelectNavFilter
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryTab, setActiveCategoryTab] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const searchInputRef = useRef(null);

  // Keyboard shortcut: Press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Format helper functions
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  const getRelativeFolder = (fullPath) => {
    if (!fullPath) return '';
    const parts = fullPath.split(/[/\\]/);
    if (parts.length > 1) {
      return parts[parts.length - 2];
    }
    return '';
  };

  // Filter clips based on activeNavFilter, activeCategoryTab, and searchQuery
  const filteredClips = useMemo(() => {
    return clips.filter(clip => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = clip.fileName.toLowerCase().includes(query);
        const matchesTags = clip.tags?.some(t => t.toLowerCase().includes(query));
        const matchesIssue = clip.dominantIssue?.toLowerCase().includes(query);
        if (!matchesName && !matchesTags && !matchesIssue) return false;
      }

      // 2. Active Nav Filter (from Sidebar)
      if (activeNavFilter === 'analyzed' && !clip.isAnalyzed) return false;
      if (activeNavFilter === 'unanalyzed' && clip.isAnalyzed) return false;
      if (activeNavFilter === 'warning' && (!clip.isAnalyzed || (clip.stats?.issuePercentage || 0) <= 15)) return false;
      if (['normal', 'overexposed', 'underexposed', 'cool_cast', 'warm_cast'].includes(activeNavFilter)) {
        if (!clip.isAnalyzed) return false;
        const dominant = clip.dominantIssue || clip.segments?.find(s => s.issueType !== 'normal')?.issueType || 'normal';
        if (dominant !== activeNavFilter) return false;
      }

      // 3. Category Filter Tab (from top bar)
      if (activeCategoryTab !== 'all') {
        if (activeCategoryTab === 'unanalyzed' && clip.isAnalyzed) return false;
        if (activeCategoryTab !== 'unanalyzed') {
          if (!clip.isAnalyzed) return false;
          const dominant = clip.dominantIssue || clip.segments?.find(s => s.issueType !== 'normal')?.issueType || 'normal';
          if (dominant !== activeCategoryTab) return false;
        }
      }

      return true;
    });
  }, [clips, searchQuery, activeNavFilter, activeCategoryTab]);

  // Sort clips
  const sortedClips = useMemo(() => {
    const list = [...filteredClips];
    if (sortBy === 'name') {
      return list.sort((a, b) => a.fileName.localeCompare(b.fileName));
    }
    if (sortBy === 'duration') {
      return list.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    }
    if (sortBy === 'issues') {
      return list.sort((a, b) => (b.stats?.issuePercentage || 0) - (a.stats?.issuePercentage || 0));
    }
    return list;
  }, [filteredClips, sortBy]);

  // Multi-select helpers
  const handleToggleSelectAll = () => {
    if (selectedIds.size === sortedClips.length && sortedClips.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedClips.map(c => c.filePath)));
    }
  };

  const handleToggleRowSelect = (filePath, e) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const unanalyzedCount = clips.filter(c => !c.isAnalyzed).length;

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0c101a] select-none overflow-hidden">
      {/* 1. TOP BREADCRUMB & STUDIO ACTION HEADER */}
      <div className="h-12 px-4 border-b border-[#1c263c] bg-[#090d16] flex items-center justify-between gap-3 shrink-0">
        {/* Left: Tab Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#131d2e] border border-cyan-500/40 text-cyan-300 text-xs font-semibold shadow-xs">
            <Film size={13} className="text-cyan-400" />
            <span>Thư Viện Footage</span>
          </div>
          {activeNavFilter !== 'all' && (
            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
              <span>/</span>
              <span className="text-slate-200">
                {activeNavFilter === 'analyzed' ? 'Đã phân tích' :
                 activeNavFilter === 'unanalyzed' ? 'Chưa phân tích' :
                 activeNavFilter === 'warning' ? 'Có cảnh báo' :
                 getIssueTheme(activeNavFilter).label}
              </span>
              <button
                onClick={() => onSelectNavFilter && onSelectNavFilter('all')}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-300"
                title="Bỏ lọc"
              >
                <X size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Center: Realtime Batch Progress Bar */}
        {batchProgress?.isRunning && (
          <div className="flex-1 max-w-sm mx-2">
            <ScanProgressBar
              batchProgress={batchProgress}
              onCancel={onCancelBatch}
            />
          </div>
        )}

        {/* Right: Studio Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {unanalyzedCount > 0 && (
            <button
              onClick={onAnalyzeAll}
              disabled={isAnalyzingAny || batchProgress?.isRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-40 cursor-pointer"
              title="Phân tích đa luồng tất cả các clip chưa quét"
            >
              <Sparkles size={12} />
              <span>Phân tích tất cả ({unanalyzedCount})</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 text-xs font-medium transition cursor-pointer shadow-xs"
            title="Cấu hình ngưỡng màu và preset"
          >
            <Sliders size={13} className="text-cyan-400" />
            <span>Cài đặt</span>
          </button>

          <span className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 text-slate-400 border border-slate-800">
            {clips.length} mục
          </span>
        </div>
      </div>

      {/* 2. SEARCH BAR WITH SHORTCUT HINT */}
      <div className="p-3 pb-2 border-b border-[#1c263c]/60 bg-[#0a0e18]">
        <div className="relative flex items-center">
          <Search size={14} className="absolute left-3 text-slate-500 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Tìm kiếm tên file, tag, thể loại lỗi màu (nhấn / để tìm)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-14 py-2 bg-[#060810] border border-slate-800 focus:border-cyan-500/70 focus:ring-1 focus:ring-cyan-500/25 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner font-sans"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X size={12} />
            </button>
          ) : (
            <span className="absolute right-3 px-1.5 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-[10px] font-mono text-slate-400 pointer-events-none">
              /
            </span>
          )}
        </div>
      </div>

      {/* 3. CATEGORY PILLS FILTER & CONTROLS ROW */}
      <div className="px-4 py-2 flex items-center justify-between gap-3 border-b border-[#1c263c]/60 bg-[#0a0e18]/80 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'normal', label: 'Cân bằng tốt' },
            { id: 'overexposed', label: 'Cháy sáng' },
            { id: 'underexposed', label: 'Thiếu sáng' },
            { id: 'cool_cast', label: 'Ám xanh' },
            { id: 'warm_cast', label: 'Ám vàng' },
            { id: 'unanalyzed', label: 'Chưa quét' }
          ].map(tab => {
            const isActive = activeCategoryTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer select-none ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Controls: Sort & View Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 bg-slate-900/90 px-2.5 py-1 rounded-md border border-slate-800 text-[11px] text-slate-300">
            <span className="text-slate-500">Sắp xếp:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none text-[11px] text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="default" className="bg-slate-900">Mới nhất</option>
              <option value="name" className="bg-slate-900">Tên A-Z</option>
              <option value="duration" className="bg-slate-900">Thời lượng</option>
              <option value="issues" className="bg-slate-900">% Lỗi màu</option>
            </select>
          </div>

          <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1 rounded transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem dạng bảng (Table View)"
            >
              <List size={13} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1 rounded transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Xem dạng thẻ (Grid View)"
            >
              <LayoutGrid size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 4. MAIN CONTENT AREA (TABLE OR EMPTY STATE) */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {clips.length === 0 ? (
          /* EMPTY LIBRARY DROPZONE STATE */
          <div className="h-full flex flex-col items-center justify-center p-8 select-none">
            <div className="w-full max-w-lg p-8 rounded-2xl border-2 border-dashed border-[#1c263c] hover:border-cyan-500/50 bg-[#080c16]/50 flex flex-col items-center text-center transition-colors">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 mb-4 shadow-xl">
                <Film size={28} />
              </div>
              <h3 className="text-base font-bold text-slate-100 mb-1">
                Kéo thả file video hoặc thư mục vào đây
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                Hỗ trợ thẻ nhớ máy quay Sony, RED, BMPCC, Canon và hơn 25 định dạng video (.mp4, .mov, .mxf, .braw...)
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={onSelectFolder}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
                >
                  <FolderOpen size={14} />
                  <span>Chọn Thư Mục</span>
                </button>
                <button
                  onClick={onSelectFiles}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  <Plus size={14} className="text-cyan-400" />
                  <span>Thêm File Video</span>
                </button>
              </div>
            </div>
          </div>
        ) : sortedClips.length === 0 ? (
          /* FILTER ZERO MATCHES */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
              <Search size={22} />
            </div>
            <div className="text-sm font-semibold text-slate-200">Không tìm thấy footage phù hợp</div>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Thử xóa từ khóa tìm kiếm hoặc chọn bộ lọc phân loại khác.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategoryTab('all');
                if (onSelectNavFilter) onSelectNavFilter('all');
              }}
              className="px-3.5 py-1.5 rounded-md bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-300 text-xs font-medium border border-cyan-800/50 transition cursor-pointer active:scale-95"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {sortedClips.map((clip) => (
              <ClipCard
                key={clip.filePath}
                clip={clip}
                isSelected={selectedClip?.filePath === clip.filePath}
                onSelect={onSelectClip}
                onAnalyze={onAnalyzeClip}
                isAnalyzing={analyzingClipPath === clip.filePath}
                progress={progressMap[clip.filePath]}
                viewMode="card"
              />
            ))}
          </div>
        ) : (
          /* TABLE VIEW (SFX MANAGER STYLE) */
          <div className="w-full">
            {/* Table Header */}
            <div className="sticky top-0 z-10 grid grid-cols-12 gap-3 px-4 py-2.5 bg-[#090d16] border-b border-[#1c263c] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <div className="col-span-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedIds.size === sortedClips.length && sortedClips.length > 0}
                  onChange={handleToggleSelectAll}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
                />
              </div>
              <div className="col-span-5 truncate">Tên File & Thư Mục</div>
              <div className="col-span-2 text-center">Phân Loại</div>
              <div className="col-span-2 text-center">Dải Màu Sắc</div>
              <div className="col-span-1 text-right">Thời Lượng</div>
              <div className="col-span-1 text-center">Tác Vụ</div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-800/40">
              {sortedClips.map((clip) => {
                const isSelected = selectedClip?.filePath === clip.filePath;
                const isChecked = selectedIds.has(clip.filePath);
                const isAnalyzing = analyzingClipPath === clip.filePath;
                const progress = progressMap[clip.filePath] || 0;
                const dominantIssue = clip.dominantIssue || clip.segments?.find(s => s.issueType !== 'normal')?.issueType || 'normal';
                const theme = clip.isAnalyzed ? getIssueTheme(dominantIssue) : null;

                return (
                  <div
                    key={clip.filePath}
                    onClick={() => onSelectClip(clip)}
                    className={`grid grid-cols-12 gap-3 px-4 py-2 items-center cursor-pointer transition select-none group ${
                      isSelected
                        ? 'bg-[#131d2e] border-l-3 border-cyan-400 shadow-sm'
                        : 'hover:bg-[#0f1422] border-l-3 border-transparent'
                    }`}
                  >
                    {/* 1. Checkbox + Mini Play icon */}
                    <div className="col-span-1 flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleToggleRowSelect(clip.filePath, e)}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0 cursor-pointer accent-cyan-500"
                      />
                      <div className="w-6 h-6 rounded-md bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition">
                        <Play size={10} className="ml-0.5" />
                      </div>
                    </div>

                    {/* 2. File Name & Folder */}
                    <div className="col-span-5 min-w-0 pr-2">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isSelected ? 'text-cyan-300' : 'text-slate-100 group-hover:text-white'
                        }`}
                        title={clip.fileName}
                      >
                        {clip.fileName}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono truncate">
                        {getRelativeFolder(clip.filePath) || 'Thư mục gốc'}
                      </div>
                    </div>

                    {/* 3. Classification Pill Badge */}
                    <div className="col-span-2 flex justify-center">
                      {clip.isAnalyzed && theme ? (
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder} whitespace-nowrap truncate`}
                        >
                          {theme.label.split(' ')[0]}
                          {clip.stats?.issuePercentage > 15 ? ` (${clip.stats.issuePercentage}%)` : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-900 text-slate-500 border border-slate-800">
                          Chưa quét
                        </span>
                      )}
                    </div>

                    {/* 4. Mini Color Spectrum / Distribution Bar */}
                    <div className="col-span-2 flex items-center justify-center px-2">
                      {clip.isAnalyzed && clip.segments && clip.segments.length > 0 ? (
                        <div className="w-full max-w-[130px] h-2 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 shadow-inner">
                          {clip.segments.map((seg, idx) => {
                            const segDuration = seg.duration || (seg.end - seg.start);
                            const total = clip.duration || 1;
                            const pct = Math.max(1, (segDuration / total) * 100);
                            const segTheme = getIssueTheme(seg.issueType);
                            return (
                              <div
                                key={idx}
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: segTheme.bg
                                }}
                                className="h-full"
                                title={`${segTheme.label}: ${seg.start}s - ${seg.end}s`}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="w-full max-w-[130px] h-2 bg-slate-900/60 rounded-full border border-dashed border-slate-800" />
                      )}
                    </div>

                    {/* 5. Duration */}
                    <div className="col-span-1 text-right text-[11px] font-mono text-slate-300">
                      {formatDuration(clip.duration)}
                    </div>

                    {/* 6. Quick Action / Status */}
                    <div className="col-span-1 flex items-center justify-center">
                      {isAnalyzing ? (
                        <div className="flex items-center gap-1 text-[10px] font-mono text-cyan-400">
                          <RefreshCw size={11} className="animate-spin" />
                          <span>{progress}%</span>
                        </div>
                      ) : clip.isAnalyzed ? (
                        clip.stats?.issuePercentage > 15 ? (
                          <AlertTriangle size={13} className="text-amber-400" title="Phát hiện lệch màu" />
                        ) : (
                          <CheckCircle2 size={13} className="text-emerald-400" title="Màu sắc cân bằng tốt" />
                        )
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnalyzeClip(clip);
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900 hover:bg-cyan-600 hover:text-white text-slate-300 border border-slate-800 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Zap size={9} />
                          <span>Quét</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 5. TABLE FOOTER STATS */}
      {clips.length > 0 && (
        <div className="h-8 px-4 bg-[#080c16] border-t border-[#1c263c] flex items-center justify-between text-[11px] text-slate-500 font-mono shrink-0">
          <span>Hiển thị: {sortedClips.length} / {clips.length} footage</span>
          <span>Đã chọn: {selectedIds.size} clip</span>
        </div>
      )}
    </div>
  );
}
