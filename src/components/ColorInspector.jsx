import React, { useState } from 'react';
import { Activity, BarChart2, Layers, AlertTriangle, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import { getIssueTheme } from '../theme/tokens.js';
import VectorscopeMini from './VectorscopeMini.jsx';

export default function ColorInspector({
  selectedClip,
  activeSegment,
  onSeek,
  videoRef,
  isPlaying,
  currentTime,
  onAnalyze,
  isAnalyzing,
  style = {},
  className = ''
}) {
  const [activeTab, setActiveTab] = useState('scopes'); // 'scopes' | 'metrics'

  if (!selectedClip) {
    return (
      <div
        style={style}
        className={`h-full bg-[#0d121f] border-l border-[#1c263c] flex flex-col items-center justify-center p-6 text-center text-slate-500 select-none ${className}`}
      >
        <Activity size={32} className="text-slate-600 mb-2 opacity-60" />
        <div className="text-xs font-semibold text-slate-400">Color Inspector</div>
        <p className="text-[11px] text-slate-500 mt-1 max-w-[200px]">
          Chọn một video từ danh sách để xem chi tiết Vectorscope và thông số quang phổ.
        </p>
      </div>
    );
  }

  const segments = selectedClip.segments || [];
  const stats = selectedClip.stats;

  return (
    <div
      style={style}
      className={`h-full bg-[#0d121f] border-l border-[#1c263c] flex flex-col select-none shrink-0 overflow-hidden ${className}`}
    >
      {/* Inspector Header & Tab switcher */}
      <div className="p-3 border-b border-[#1c263c] bg-[#0f1526]/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Color Inspector
          </span>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-900/90 rounded-md p-0.5 border border-slate-800 text-[11px]">
          <button
            onClick={() => setActiveTab('scopes')}
            className={`px-2 py-0.5 rounded transition font-medium ${
              activeTab === 'scopes'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scopes
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-2 py-0.5 rounded transition font-medium ${
              activeTab === 'metrics'
                ? 'bg-cyan-500/20 text-cyan-300 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Phân đoạn ({segments.length})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {/* TAB 1: SCOPES */}
        {activeTab === 'scopes' && (
          <div className="space-y-3">
            {/* Embedded Vectorscope */}
            <div className="bg-slate-950/60 rounded-lg p-2 border border-slate-800/80 flex flex-col items-center">
              <VectorscopeMini
                videoRef={videoRef}
                activeSegment={activeSegment}
                isPlaying={isPlaying}
                currentTime={currentTime}
                className="w-full bg-transparent border-0 p-0 shadow-none"
              />
            </div>

            {/* Current Frame Live Color Reading */}
            <div className="bg-[#121828] rounded-lg p-3 border border-[#1c263c]">
              <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                <span>Vị Trí Hiện Tại ({currentTime.toFixed(1)}s)</span>
                {activeSegment && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                    getIssueTheme(activeSegment.issueType).badgeBg
                  } ${getIssueTheme(activeSegment.issueType).badgeText} ${
                    getIssueTheme(activeSegment.issueType).badgeBorder
                  }`}>
                    {activeSegment.label}
                  </span>
                )}
              </div>

              {/* Luma Exposure Bar */}
              <div className="space-y-1.5 mb-3">
                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                  <span>Luma Y (Độ sáng)</span>
                  <span className="text-white font-bold">{activeSegment?.avgY ?? '--'} / 255</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative">
                  {/* Under threshold marker */}
                  <div className="absolute left-[12%] top-0 bottom-0 w-0.5 bg-indigo-500/50 z-10" title="Ngưỡng thiếu sáng" />
                  {/* Over threshold marker */}
                  <div className="absolute left-[88%] top-0 bottom-0 w-0.5 bg-orange-500/50 z-10" title="Ngưỡng cháy sáng" />
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-orange-500 transition-all duration-150"
                    style={{ width: `${Math.min(100, Math.max(0, ((activeSegment?.avgY || 0) / 255) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                  <span>0 (Đen)</span>
                  <span>128 (Trung tính)</span>
                  <span>255 (Trắng)</span>
                </div>
              </div>

              {/* RGB Channel Breakdown */}
              <div className="space-y-1 pt-2 border-t border-slate-800">
                <div className="text-[10px] text-slate-400 font-mono mb-1">Cân bằng kênh RGB:</div>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                  <div className="bg-red-500/10 border border-red-500/20 p-1 rounded">
                    <div className="text-red-400 font-semibold">R</div>
                    <div className="text-white font-bold">{activeSegment?.avgR ?? '--'}</div>
                  </div>
                  <div className="bg-green-500/10 border border-green-500/20 p-1 rounded">
                    <div className="text-green-400 font-semibold">G</div>
                    <div className="text-white font-bold">{activeSegment?.avgG ?? '--'}</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-1 rounded">
                    <div className="text-blue-400 font-semibold">B</div>
                    <div className="text-white font-bold">{activeSegment?.avgB ?? '--'}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Health Score Card */}
            {selectedClip.isAnalyzed && stats && (
              <div className="bg-[#121828] rounded-lg p-3 border border-[#1c263c]">
                <div className="text-[11px] font-semibold text-slate-300 mb-2 flex items-center justify-between">
                  <span>Tổng Thể Clip</span>
                  <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded ${
                    stats.issuePercentage > 15
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {stats.issuePercentage}% lệch chuẩn
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                  <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Thời lượng chuẩn</span>
                    <span className="text-emerald-400 font-bold">{stats.normalDuration}s</span>
                  </div>
                  <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Cháy sáng (Over)</span>
                    <span className="text-orange-400 font-bold">{stats.overexposedDuration}s</span>
                  </div>
                  <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Thiếu sáng (Under)</span>
                    <span className="text-indigo-400 font-bold">{stats.underexposedDuration}s</span>
                  </div>
                  <div className="bg-slate-900/70 p-1.5 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[9px]">Ám xanh (Cool)</span>
                    <span className="text-sky-400 font-bold">{stats.coolCastDuration}s</span>
                  </div>
                </div>
              </div>
            )}

            {!selectedClip.isAnalyzed && (
              <div className="p-3 bg-slate-900/70 rounded-lg border border-slate-800 text-center">
                <p className="text-xs text-slate-400 mb-2">Video này chưa được phân tích màu sắc.</p>
                <button
                  onClick={() => onAnalyze(selectedClip)}
                  disabled={isAnalyzing}
                  className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap size={12} />
                  <span>Phân tích ngay</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: METRICS & SEGMENTS LIST */}
        {activeTab === 'metrics' && (
          <div className="space-y-2">
            <div className="text-[11px] text-slate-400 flex items-center justify-between mb-1 px-1">
              <span>Nhấp vào đoạn để nhảy tới:</span>
              <span className="font-mono">{segments.length} đoạn</span>
            </div>

            {segments.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
                Chưa có dữ liệu phân đoạn
              </div>
            ) : (
              <div className="space-y-1.5">
                {segments.map((seg, idx) => {
                  const theme = getIssueTheme(seg.issueType);
                  const isCurrent = activeSegment === seg;

                  return (
                    <div
                      key={idx}
                      onClick={() => onSeek && onSeek(seg.start)}
                      className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition border text-xs ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500/70 shadow-xs'
                          : 'bg-[#121828]/70 hover:bg-[#161f33] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: theme.bg }}
                        />
                        <div className="min-w-0">
                          <div className={`font-medium text-[11px] truncate ${theme.text}`}>
                            {seg.label}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {seg.start.toFixed(1)}s - {seg.end.toFixed(1)}s ({seg.duration}s)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {seg.severity > 0 && (
                          <span className="text-[10px] font-mono text-amber-400 font-bold">
                            {Math.round(seg.severity * 100)}%
                          </span>
                        )}
                        <ChevronRight size={13} className="text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
