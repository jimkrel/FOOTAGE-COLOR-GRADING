import React from 'react';
import { FolderOpen, RefreshCw, Sparkles, Filter, Sliders, PlayCircle } from 'lucide-react';

export default function FolderTree({
  folderPath,
  clipsCount,
  onSelectFolder,
  onRefresh,
  onAnalyzeAll,
  filterIssue,
  onFilterChange,
  isScanning,
  isAnalyzingAny,
  onOpenSettings
}) {
  return (
    <header className="h-14 border-b border-slate-800/80 bg-[#0f1523] px-4 flex items-center justify-between gap-4 select-none shrink-0">
      {/* Left: Brand & Folder selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 font-bold text-slate-100 tracking-wide text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs shadow-md shadow-cyan-500/20">
            ▲
          </div>
          FOOTAGE COLOR ANALYZER
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <button
          onClick={onSelectFolder}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700/60 transition shadow-sm hover:border-slate-600 active:scale-95"
        >
          <FolderOpen size={14} className="text-cyan-400" />
          <span>{folderPath ? 'Đổi Thư Mục' : 'Chọn Thư Mục Footage'}</span>
        </button>

        {folderPath && (
          <div className="text-xs text-slate-400 truncate max-w-md bg-slate-900/60 px-2.5 py-1 rounded border border-slate-800" title={folderPath}>
            {folderPath}
          </div>
        )}
      </div>

      {/* Right: Actions, Filters & Settings */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Filter */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-1 rounded border border-slate-800 text-xs text-slate-300">
          <Filter size={13} className="text-slate-400" />
          <select
            value={filterIssue}
            onChange={(e) => onFilterChange(e.target.value)}
            className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
          >
            <option value="all" className="bg-slate-900 text-slate-200">Tất cả ({clipsCount})</option>
            <option value="overexposed" className="bg-slate-900 text-orange-400">Cháy sáng (Overexposed)</option>
            <option value="underexposed" className="bg-slate-900 text-indigo-400">Thiếu sáng (Underexposed)</option>
            <option value="cool_cast" className="bg-slate-900 text-sky-400">Ám xanh (Cool Cast)</option>
            <option value="warm_cast" className="bg-slate-900 text-yellow-400">Ám vàng (Warm Cast)</option>
            <option value="unanalyzed" className="bg-slate-900 text-slate-400">Chưa phân tích</option>
          </select>
        </div>

        {/* Refresh button */}
        {folderPath && (
          <button
            onClick={onRefresh}
            disabled={isScanning}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-transparent hover:border-slate-700"
            title="Quét lại thư mục"
          >
            <RefreshCw size={15} className={isScanning ? 'animate-spin text-cyan-400' : ''} />
          </button>
        )}

        {/* Batch Analyze */}
        {folderPath && clipsCount > 0 && (
          <button
            onClick={onAnalyzeAll}
            disabled={isAnalyzingAny}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-medium shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-50"
          >
            <Sparkles size={14} />
            <span>Phân Tích Tất Cả</span>
          </button>
        )}

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/50 transition hover:text-white"
          title="Tùy chỉnh ngưỡng Threshold"
        >
          <Sliders size={14} className="text-cyan-400" />
          <span>Ngưỡng</span>
        </button>
      </div>
    </header>
  );
}
