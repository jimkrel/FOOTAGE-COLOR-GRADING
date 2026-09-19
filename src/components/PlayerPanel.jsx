import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  Film,
  AlertCircle,
  SkipBack,
  SkipForward,
  Sidebar,
  FolderOpen
} from 'lucide-react';
import { getIssueTheme } from '../theme/tokens.js';
import { EmptyView, ErrorView } from './common/StateView.jsx';

export default function PlayerPanel({
  selectedClip,
  onAnalyze,
  isAnalyzing,
  player, // from usePlayer()
  onOpenFolder,
  onOpenFiles,
  clipsCount = 0,
  isInspectorOpen = true,
  onToggleInspector
}) {
  const containerRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const {
    videoRef,
    isPlaying,
    isMuted,
    currentTime,
    setCurrentTime,
    playerError,
    togglePlay,
    seek,
    toggleMute,
    handleVideoError
  } = player;

  const videoSrc = selectedClip
    ? `media://${encodeURIComponent(selectedClip.filePath)}`
    : null;

  // Active segment at current playback head
  const activeSegment = selectedClip?.segments?.find(
    s => currentTime >= s.start && currentTime <= s.end
  );

  const activeTheme = activeSegment ? getIssueTheme(activeSegment.issueType) : null;

  // Format professional timecode: MM:SS.ms
  const formatTimecode = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (videoRef?.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#080b12] overflow-hidden select-none">
      {/* Top Header bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-[#1c263c] bg-[#0d121f] text-xs shrink-0">
        <div className="flex items-center gap-2.5 truncate">
          <span className="font-semibold text-slate-200 truncate">
            {selectedClip ? selectedClip.fileName : 'Chưa chọn video'}
          </span>
          {activeSegment && activeTheme && (
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${activeTheme.badgeBg} ${activeTheme.badgeText} ${activeTheme.badgeBorder}`}
            >
              {activeSegment.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedClip && !selectedClip.isAnalyzed && (
            <button
              onClick={() => onAnalyze(selectedClip)}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition shadow-xs disabled:opacity-50"
            >
              <Zap size={11} />
              <span>Phân tích</span>
            </button>
          )}

          {/* Toggle Inspector Panel button */}
          {onToggleInspector && (
            <button
              onClick={onToggleInspector}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition border ${
                isInspectorOpen
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
              }`}
              title="Mở/Đóng Bảng Thống Kê & Scopes"
            >
              <Sidebar size={12} />
              <span className="hidden sm:inline">Inspector</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport (Cinema Letterbox Container) */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group min-h-0"
      >
        {!selectedClip ? (
          <div className="w-full h-full flex items-center justify-center p-6 select-none">
            {/* 16:9 Cinema Monitor Screen Frame */}
            <div className="w-full max-w-xl aspect-video rounded-xl bg-gradient-to-b from-[#0d1424] to-[#060911] border border-[#1c263c] shadow-2xl relative flex flex-col items-center justify-center p-6 overflow-hidden group">
              {/* Cinema Framing Guide Crosshairs in 4 corners */}
              <div className="absolute top-3 left-3 font-mono text-[10px] text-slate-600 select-none">┌ 16:9 DCI</div>
              <div className="absolute top-3 right-3 font-mono text-[10px] text-slate-600 select-none">┐</div>
              <div className="absolute bottom-3 left-3 font-mono text-[10px] text-slate-600 select-none">└</div>
              <div className="absolute bottom-3 right-3 font-mono text-[10px] text-slate-600 select-none">COLOR STUDIO ┘</div>

              {/* Center status badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-cyan-400 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>MONITOR STANDBY • SẴN SÀNG</span>
              </div>

              {/* Title & guidance */}
              <h3 className="text-sm sm:text-base font-bold text-slate-100 tracking-wide mb-1 text-center">
                {clipsCount === 0 ? 'Kéo Thả Video Hoặc Thư Mục Vào Đây' : 'Chọn Một Clip Để Phát & Xem Màu'}
              </h3>
              <p className="text-[11px] text-slate-400 max-w-md text-center mb-5 leading-relaxed">
                {clipsCount === 0
                  ? 'Hỗ trợ thẻ nhớ máy quay Sony, RED, BMPCC, Canon và 25+ định dạng video (.mp4, .mov, .mxf, .braw...)'
                  : 'Nhấp vào clip ở danh sách bên trái để phát lại, xem timeline và biểu đồ Vectorscope.'}
              </p>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5">
                {onOpenFolder && (
                  <button
                    onClick={onOpenFolder}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 transition active:scale-95 cursor-pointer"
                  >
                    <FolderOpen size={13} />
                    <span>Chọn Thư Mục</span>
                  </button>
                )}
                {onOpenFiles && (
                  <button
                    onClick={onOpenFiles}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition active:scale-95 cursor-pointer"
                  >
                    <Film size={13} className="text-cyan-400" />
                    <span>Chọn File Video</span>
                  </button>
                )}
              </div>

              {/* Subtle Spectrum Bar at bottom */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-sky-500 opacity-30" />
            </div>
          </div>
        ) : playerError ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
              <AlertCircle size={24} />
            </div>
            <div className="text-sm font-semibold text-slate-200">Không thể xem trực tiếp video này</div>
            <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">{playerError}</p>
            <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-slate-400">
              Lưu ý: Bộ giải mã Chromium trên Electron không hỗ trợ một số codec chuyên dụng (như ProRes 422 10-bit). Tuy nhiên <b>FFmpeg Analysis Engine</b> vẫn phân tích màu sắc và trích xuất thumbnail hoàn toàn bình thường!
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
            onPlay={() => {}}
            onPause={() => {}}
            onError={handleVideoError}
            onClick={togglePlay}
          />
        )}

        {/* Current Segment Live Overlay HUD */}
        {activeSegment && activeTheme && activeSegment.issueType !== 'normal' && !playerError && (
          <div className="absolute top-4 left-4 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-lg text-xs pointer-events-none shadow-2xl z-10 transition-all">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-semibold ${activeTheme.text}`}>
                {activeSegment.label}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {Math.round((activeSegment.severity || 0) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-2.5 text-[10px] text-slate-400 font-mono">
              <span>Y: <b className="text-white">{activeSegment.avgY}</b></span>
              <span>R: <b className="text-red-400">{activeSegment.avgR}</b></span>
              <span>G: <b className="text-green-400">{activeSegment.avgG}</b></span>
              <span>B: <b className="text-blue-400">{activeSegment.avgB}</b></span>
            </div>
          </div>
        )}
      </div>

      {/* Professional Transport Bar */}
      <div className="h-12 bg-[#0d121f] border-t border-[#1c263c] px-4 flex items-center justify-between text-slate-300 shrink-0">
        {/* Left: Timecode */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="bg-slate-950/90 px-2.5 py-1 rounded border border-slate-800/80 font-mono text-xs font-semibold text-cyan-400 shadow-inner">
            {formatTimecode(currentTime)}
          </div>
          <span className="text-slate-600 font-mono text-xs">/</span>
          <div className="text-slate-400 font-mono text-xs">
            {formatTimecode(selectedClip?.duration || 0)}
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Seek start */}
          <button
            onClick={() => seek(0)}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
            title="Về đầu video (0s)"
          >
            <RotateCcw size={14} />
          </button>

          {/* Jump -1s */}
          <button
            onClick={() => seek(Math.max(0, currentTime - 1))}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
            title="Lùi 1 giây (Phím mũi tên ←)"
          >
            <SkipBack size={15} />
          </button>

          {/* Large Main Play/Pause Button */}
          <button
            onClick={togglePlay}
            disabled={!videoSrc || !!playerError}
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white flex items-center justify-center transition shadow-lg shadow-cyan-500/25 active:scale-95 disabled:opacity-30 cursor-pointer"
            title="Phát/Tạm dừng (Phím Space)"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          {/* Jump +1s */}
          <button
            onClick={() => seek(currentTime + 1)}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
            title="Tiến 1 giây (Phím mũi tên →)"
          >
            <SkipForward size={15} />
          </button>
        </div>

        {/* Right: Audio, Speed & Info */}
        <div className="flex items-center gap-3 min-w-[140px] justify-end">
          {/* Speed Selector */}
          <div className="flex items-center bg-slate-900/90 rounded px-1.5 py-0.5 border border-slate-800 text-[11px] font-mono text-slate-300">
            <select
              value={playbackRate}
              onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
              disabled={!videoSrc || !!playerError}
              className="bg-transparent border-none text-[11px] text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="0.5" className="bg-slate-900">0.5x</option>
              <option value="1" className="bg-slate-900">1.0x</option>
              <option value="1.25" className="bg-slate-900">1.25x</option>
              <option value="1.5" className="bg-slate-900">1.5x</option>
              <option value="2" className="bg-slate-900">2.0x</option>
            </select>
          </div>

          {/* Volume toggle */}
          <button
            onClick={toggleMute}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-30 cursor-pointer"
            title={isMuted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)'}
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
