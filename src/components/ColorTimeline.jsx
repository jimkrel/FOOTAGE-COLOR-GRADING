import React, { useState, useRef } from 'react';
import { ISSUE_COLORS } from '../hooks/useClipAnalysis.js';

export default function ColorTimeline({
  segments = [],
  duration = 0,
  currentTime = 0,
  onSeek,
  selectedSegment,
  onSelectSegment
}) {
  const [hoverSegment, setHoverSegment] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const timelineRef = useRef(null);

  if (!duration || duration <= 0) {
    return (
      <div className="w-full h-24 bg-slate-900/60 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500">
        Chưa có dữ liệu timeline (Cần phân tích video trước)
      </div>
    );
  }

  const handleMouseMove = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const hoverTime = ratio * duration;

    // Find corresponding segment
    const found = segments.find(s => hoverTime >= s.start && hoverTime <= s.end);
    setHoverSegment(found || null);
    setHoverPos({ x: e.clientX, y: rect.top - 8 });
  };

  const handleMouseLeave = () => {
    setHoverSegment(null);
  };

  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !onSeek) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const seekTime = (x / rect.width) * duration;
    onSeek(seekTime);
  };

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / duration) * 100));

  const formatTime = (secs) => {
    if (secs === undefined || secs === null) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${s < 10 ? '0' : ''}${s}.${ms}`;
  };

  return (
    <div className="flex flex-col gap-2 select-none w-full bg-[#111726] p-3 rounded-lg border border-slate-800/80">
      {/* Timeline Header Info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200 uppercase tracking-wider text-[11px]">
            Timeline Phân Tích Màu Sắc
          </span>
          <span className="text-slate-500">({segments.length} đoạn phân đoạn)</span>
        </div>
        <div className="font-mono text-xs text-cyan-400">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* Main Timeline Bar */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-12 bg-slate-950 rounded-md overflow-hidden cursor-pointer border border-slate-800 flex"
      >
        {/* Segments */}
        {segments.map((seg, idx) => {
          const segDuration = seg.duration || (seg.end - seg.start);
          const widthPercent = (segDuration / duration) * 100;
          const colorDef = ISSUE_COLORS[seg.issueType] || ISSUE_COLORS.normal;
          const isCurrentHover = hoverSegment === seg;
          const isSelected = selectedSegment === seg;

          return (
            <div
              key={idx}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: colorDef.bg
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(seg.start);
                if (onSelectSegment) onSelectSegment(seg);
              }}
              className={`h-full relative group transition-opacity border-r border-black/20 ${
                isCurrentHover ? 'brightness-125' : 'hover:brightness-110'
              } ${isSelected ? 'ring-2 ring-white z-10' : ''}`}
            >
              {/* Segment Label for wide segments */}
              {widthPercent > 7 && (
                <span className="absolute left-1.5 top-1 text-[10px] font-medium text-black/75 truncate pointer-events-none drop-shadow-xs">
                  {seg.issueType === 'normal' ? 'Normal' : seg.label.split(' ')[0]}
                </span>
              )}
            </div>
          );
        })}

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full -ml-1 -top-1 absolute shadow-md border border-slate-900" />
        </div>
      </div>

      {/* Segment Legend & Breakdown */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
        <span className="text-slate-500 font-medium">Chú thích:</span>
        {Object.entries(ISSUE_COLORS).map(([key, item]) => {
          // Count total seconds of this issue
          const totalSec = segments
            .filter(s => s.issueType === key)
            .reduce((acc, s) => acc + (s.duration || 0), 0);

          if (totalSec <= 0 && key !== 'normal') return null;

          return (
            <div key={key} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: item.bg }} />
              <span className="text-slate-300">{item.label}</span>
              {totalSec > 0 && (
                <span className="text-[10px] font-mono text-slate-500">
                  ({totalSec.toFixed(1)}s)
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Hover Tooltip */}
      {hoverSegment && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 border border-slate-700 text-slate-100 rounded-lg p-2.5 shadow-xl backdrop-blur-md text-xs w-56"
          style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
        >
          <div className="flex items-center justify-between font-semibold border-b border-slate-800 pb-1 mb-1.5">
            <span className={ISSUE_COLORS[hoverSegment.issueType]?.text || 'text-white'}>
              {hoverSegment.label}
            </span>
            <span className="font-mono text-slate-400 text-[10px]">
              {hoverSegment.start.toFixed(1)}s - {hoverSegment.end.toFixed(1)}s
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-300">
            <div>Thời lượng: <span className="font-mono text-white">{hoverSegment.duration}s</span></div>
            <div>Mức độ: <span className="font-mono text-amber-400">{Math.round((hoverSegment.severity || 0) * 100)}%</span></div>
            <div>Độ sáng (Y): <span className="font-mono text-white">{hoverSegment.avgY}</span></div>
            <div>Kênh R: <span className="font-mono text-red-400">{hoverSegment.avgR}</span></div>
            <div>Kênh G: <span className="font-mono text-green-400">{hoverSegment.avgG}</span></div>
            <div>Kênh B: <span className="font-mono text-blue-400">{hoverSegment.avgB}</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
