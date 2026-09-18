import React, { useState, useRef } from 'react';
import { getIssueTheme } from '../theme/tokens.js';
import { EmptyView } from './common/StateView.jsx';

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

  if (!duration || duration <= 0 || !segments || segments.length === 0) {
    return (
      <div className="w-full h-20 bg-slate-900/50 border border-slate-800 rounded-lg flex items-center justify-center text-xs text-slate-500">
        Chưa có dữ liệu timeline (Cần phân tích video để xem phân bố phơi sáng và ám màu)
      </div>
    );
  }

  const handleMouseMove = (e) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    const hoverTime = ratio * duration;

    // Find corresponding segment at hoverTime
    const found = segments.find(s => hoverTime >= s.start && hoverTime <= s.end);
    setHoverSegment(found || null);
    setHoverPos({ x: e.clientX, y: rect.top - 8 });
  };

  const handleMouseLeave = () => {
    setHoverSegment(null);
  };

  // Precise click seeking
  const handleTimelineClick = (e) => {
    if (!timelineRef.current || !onSeek) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const seekTime = Number(((x / rect.width) * duration).toFixed(2));
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

  // Generate ruler tick marks (e.g. 5 intervals)
  const tickCount = 5;
  const tickMarks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const time = (duration / tickCount) * i;
    const percent = (i / tickCount) * 100;
    return { time, percent };
  });

  return (
    <div className="flex flex-col gap-1.5 select-none w-full bg-[#0d121f] p-3 rounded-lg border border-[#1c263c]">
      {/* Timeline Header Info */}
      <div className="flex items-center justify-between text-xs pb-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
            Timeline Phân Tích Màu Sắc
          </span>
          <span className="text-[11px] text-slate-400 font-mono">({segments.length} đoạn phân đoạn)</span>
        </div>
        <div className="font-mono text-xs text-cyan-400 font-semibold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          {formatTime(currentTime)} <span className="text-slate-500">/</span> {formatTime(duration)}
        </div>
      </div>

      {/* Ruler ticks */}
      <div className="relative w-full h-3 flex text-[9px] font-mono text-slate-500 select-none">
        {tickMarks.map((tick, idx) => (
          <div
            key={idx}
            className="absolute transform -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${tick.percent}%` }}
          >
            <div className="w-px h-1.5 bg-slate-700" />
            <span>{formatTime(tick.time)}</span>
          </div>
        ))}
      </div>

      {/* Main Timeline Bar */}
      <div
        ref={timelineRef}
        onClick={handleTimelineClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative w-full h-10 bg-slate-950 rounded-md overflow-hidden cursor-pointer border border-slate-800/80 flex shadow-inner"
      >
        {/* Segments */}
        {segments.map((seg, idx) => {
          const segDuration = seg.duration || (seg.end - seg.start);
          const widthPercent = (segDuration / duration) * 100;
          const theme = getIssueTheme(seg.issueType);
          const isCurrentHover = hoverSegment === seg;
          const isSelected = selectedSegment === seg;

          return (
            <div
              key={idx}
              style={{
                width: `${widthPercent}%`,
                backgroundColor: theme.bg
              }}
              onClick={(e) => {
                e.stopPropagation();
                onSeek(seg.start);
                if (onSelectSegment) onSelectSegment(seg);
              }}
              className={`h-full relative group transition-opacity border-r border-black/25 ${
                isCurrentHover ? 'brightness-125' : 'hover:brightness-110'
              } ${isSelected ? 'ring-2 ring-white z-10' : ''}`}
            >
              {/* Segment Label for wide segments */}
              {widthPercent > 7 && (
                <span className="absolute left-1.5 top-1 text-[10px] font-semibold text-black/80 truncate pointer-events-none drop-shadow-xs">
                  {seg.issueType === 'normal' ? 'Normal' : seg.label.split(' ')[0]}
                </span>
              )}
            </div>
          );
        })}

        {/* Playhead Marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl pointer-events-none z-20 transition-all duration-75"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="w-2.5 h-2.5 bg-white rounded-full -ml-1 -top-0.5 absolute shadow-md border border-slate-950" />
        </div>
      </div>

      {/* Segment Legend & Breakdown */}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-400 border-t border-slate-800/60">
        <span className="text-slate-500 font-medium">Chú thích:</span>
        {segments.length > 0 && Array.from(new Set(segments.map(s => s.issueType))).map(issueType => {
          const theme = getIssueTheme(issueType);
          const totalSec = segments
            .filter(s => s.issueType === issueType)
            .reduce((acc, s) => acc + (s.duration || 0), 0);

          return (
            <div key={issueType} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: theme.bg }} />
              <span className="text-slate-300">{theme.label}</span>
              <span className="text-[10px] font-mono text-slate-500">
                ({totalSec.toFixed(1)}s)
              </span>
            </div>
          );
        })}
      </div>

      {/* Floating Hover Tooltip */}
      {hoverSegment && (
        <div
          className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-slate-900/95 border border-slate-700 text-slate-100 rounded-lg p-2.5 shadow-2xl backdrop-blur-md text-xs w-56"
          style={{ left: `${hoverPos.x}px`, top: `${hoverPos.y}px` }}
        >
          <div className="flex items-center justify-between font-semibold border-b border-slate-800 pb-1 mb-1.5">
            <span className={getIssueTheme(hoverSegment.issueType).text}>
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
