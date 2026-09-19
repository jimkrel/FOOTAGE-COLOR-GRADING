import React from 'react';
import { FolderOpen, RefreshCw, Sparkles, Sliders, Film, Layers } from 'lucide-react';
import ScanProgressBar from './ScanProgressBar.jsx';

export default function FolderTree({
  folderPath,
  clipsCount = 0,
  onSelectFolder,
  onSelectFiles,
  onRefresh,
  onAnalyzeAll,
  onCancelBatch,
  batchProgress,
  isScanning = false,
  isAnalyzingAny = false,
  onOpenSettings
}) {
  const isBatchRunning = batchProgress?.isRunning;

  return (
    <header className="h-14 border-b border-[#1c263c] bg-[#0d121f] px-3 sm:px-4 flex items-center justify-between gap-3 select-none shrink-0 z-30">
      {/* Left: Brand Logo & Folder/File Selectors */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="flex items-center gap-2 font-bold text-slate-100 tracking-wide text-xs md:text-sm shrink-0">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-teal-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Layers size={13} />
          </div>
          <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-200 bg-clip-text text-transparent font-extrabold tracking-wider">
            FOOTAGE COLOR STUDIO
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

        {/* Select Folder Button - Subtle when empty to keep focus on center welcome drop zone */}
        <button
          onClick={onSelectFolder}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer active:scale-95 shrink-0 ${
            folderPath
              ? 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border-slate-700/60 shadow-xs hover:border-cyan-500/50'
              : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800 hover:border-slate-700'
          }`}
          title="Chọn thư mục chứa video (tự động quét đệ quy các thư mục con)"
        >
          <FolderOpen size={13} className={folderPath ? 'text-cyan-400' : 'text-slate-400'} />
          <span>{folderPath ? 'Đổi Thư Mục' : 'Chọn Thư Mục'}</span>
        </button>

        {/* Select Files Button */}
        {onSelectFiles && (
          <button
            onClick={onSelectFiles}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition cursor-pointer active:scale-95 shrink-0 ${
              folderPath
                ? 'bg-slate-800/60 hover:bg-slate-700 text-slate-300 border-slate-700/50 hover:border-cyan-500/40 hover:text-white'
                : 'bg-slate-900/40 hover:bg-slate-800 text-slate-400 hover:text-slate-300 border-slate-800/60 hover:border-slate-700'
            }`}
            title="Chọn trực tiếp một hoặc nhiều file video riêng lẻ"
          >
            <Film size={13} className="text-cyan-400" />
            <span>Thêm File</span>
          </button>
        )}

        {folderPath && (
          <div className="hidden md:flex items-center gap-2 min-w-0">
            <div className="text-xs text-slate-400 truncate max-w-xs bg-slate-950/60 px-2.5 py-1 rounded border border-slate-800/80 font-mono" title={folderPath}>
              {folderPath}
            </div>

            {/* Auto-watch active badge */}
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-[10px] text-emerald-400 font-medium whitespace-nowrap shrink-0" title="Chokidar đang tự động theo dõi thư mục: clip mới sẽ tự động nạp">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-Watch</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Live Batch Progress Bar */}
      {isBatchRunning && (
        <div className="flex-1 max-w-sm mx-2 shrink-0">
          <ScanProgressBar
            batchProgress={batchProgress}
            onCancel={onCancelBatch}
          />
        </div>
      )}

      {/* Right: Actions & Settings */}
      <div className="flex items-center gap-2 shrink-0 pl-1">
        {/* Refresh button */}
        {folderPath && (
          <button
            onClick={onRefresh}
            disabled={isScanning || isBatchRunning}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition border border-transparent hover:border-slate-700 disabled:opacity-40 cursor-pointer shrink-0"
            title="Quét lại thư mục"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin text-cyan-400' : ''} />
          </button>
        )}

        {/* Batch Analyze Button */}
        {folderPath && clipsCount > 0 && !isBatchRunning && (
          <button
            onClick={onAnalyzeAll}
            disabled={isAnalyzingAny}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 whitespace-nowrap"
            title="Phân tích đa luồng song song các clip chưa phân tích"
          >
            <Sparkles size={13} />
            <span>Phân Tích Hàng Loạt</span>
          </button>
        )}

        {/* Settings button - Explicit whitespace-nowrap to never truncate "Cấu Hình" */}
        <button
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 transition hover:text-white cursor-pointer shrink-0 whitespace-nowrap"
          title="Tùy chỉnh ngưỡng màu Threshold"
        >
          <Sliders size={13} className="text-cyan-400 shrink-0" />
          <span>Cấu Hình</span>
        </button>
      </div>
    </header>
  );
}
