import React, { useState, useEffect } from 'react';
import { Film, AlertTriangle, CheckCircle2, Play, RefreshCw, Zap } from 'lucide-react';
import { ISSUE_COLORS } from '../hooks/useClipAnalysis.js';

export default function ClipCard({
  clip,
  isSelected,
  onSelect,
  onAnalyze,
  isAnalyzing,
  progress
}) {
  const [thumbUrl, setThumbUrl] = useState(null);

  useEffect(() => {
    let isMounted = true;
    if (window.electronAPI && clip.filePath) {
      window.electronAPI.getThumbnail(clip.filePath, 1, clip.fileHash)
        .then((path) => {
          if (isMounted && path) {
            setThumbUrl(`media://${encodeURIComponent(path)}`);
          }
        })
        .catch(() => {});
    }
    return () => { isMounted = false; };
  }, [clip.filePath, clip.fileHash]);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div
      onClick={() => onSelect(clip)}
      className={`group relative flex flex-col p-2.5 rounded-lg cursor-pointer transition-all border select-none ${
        isSelected
          ? 'bg-slate-800/90 border-cyan-500/80 shadow-md shadow-cyan-500/10'
          : 'bg-[#121827]/70 hover:bg-slate-800/50 border-slate-800/80 hover:border-slate-700'
      }`}
    >
      {/* Thumbnail Area */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-md overflow-hidden flex items-center justify-center border border-slate-800/60 mb-2">
        {thumbUrl ? (
          <img
            src={thumbUrl}
            alt={clip.fileName}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-600">
            <Film size={28} />
          </div>
        )}

        {/* Duration badge */}
        {clip.duration && (
          <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[10px] font-mono text-slate-300 font-semibold">
            {formatDuration(clip.duration)}
          </div>
        )}

        {/* Analyzing progress overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-3 text-center">
            <RefreshCw size={20} className="animate-spin text-cyan-400 mb-1.5" />
            <div className="text-[11px] font-medium text-slate-200">Đang phân tích...</div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-200"
                style={{ width: `${progress || 0}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-cyan-400 mt-1">{progress || 0}%</div>
          </div>
        )}

        {/* Play indicator on hover */}
        {!isAnalyzing && (
          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-cyan-500/90 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play size={16} className="ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Info details */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-200 truncate" title={clip.fileName}>
            {clip.fileName}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
            <span>{formatFileSize(clip.fileSize)}</span>
            {clip.isAnalyzed && clip.stats && (
              <>
                <span>•</span>
                <span className={clip.stats.issuePercentage > 20 ? 'text-amber-400' : 'text-emerald-400'}>
                  {clip.stats.issuePercentage}% lỗi màu
                </span>
              </>
            )}
          </div>
        </div>

        {/* Quick status badge */}
        <div>
          {clip.isAnalyzed ? (
            clip.stats?.issuePercentage > 15 ? (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <AlertTriangle size={10} />
                Lỗi
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 size={10} />
                Tốt
              </span>
            )
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(clip);
              }}
              disabled={isAnalyzing}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-300 border border-slate-700 transition flex items-center gap-1"
            >
              <Zap size={10} />
              Quét
            </button>
          )}
        </div>
      </div>

      {/* Mini Color & Exposure Distribution Bar */}
      {clip.isAnalyzed && clip.segments && clip.segments.length > 0 && (
        <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden flex mt-1 border border-slate-800">
          {clip.segments.map((seg, idx) => {
            const segDuration = seg.duration || (seg.end - seg.start);
            const total = clip.duration || 1;
            const pct = Math.max(1, (segDuration / total) * 100);
            const colorDef = ISSUE_COLORS[seg.issueType] || ISSUE_COLORS.normal;

            return (
              <div
                key={idx}
                style={{
                  width: `${pct}%`,
                  backgroundColor: colorDef.bg
                }}
                className="h-full"
                title={`${seg.label}: ${seg.start}s - ${seg.end}s`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
