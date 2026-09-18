import React from 'react';
import { XCircle, Sparkles } from 'lucide-react';

/**
 * ScanProgressBar: Realtime batch progress bar component
 */
export default function ScanProgressBar({
  batchProgress,
  onCancel,
  className = ''
}) {
  if (!batchProgress?.isRunning) return null;

  const currentFileName = batchProgress.currentFile
    ? batchProgress.currentFile.split(/[/\\]/).pop()
    : 'Đang chuẩn bị...';

  return (
    <div className={`flex items-center gap-3 bg-slate-900/95 border border-cyan-500/40 px-3 py-1.5 rounded-lg shadow-md select-none ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-[11px] mb-1 font-medium text-slate-200">
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-cyan-400 animate-pulse" />
            <span>Đa luồng: <b className="text-cyan-400">{batchProgress.completed}/{batchProgress.total}</b> clip ({batchProgress.percent}%)</span>
          </span>
          <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={currentFileName}>
            {currentFileName}
          </span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
            style={{ width: `${batchProgress.percent}%` }}
          />
        </div>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="p-1 text-slate-400 hover:text-red-400 transition"
          title="Dừng phân tích hàng loạt"
        >
          <XCircle size={16} />
        </button>
      )}
    </div>
  );
}
