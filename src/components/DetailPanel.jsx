import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Zap,
  Activity,
  FolderOpen,
  ExternalLink,
  Film,
  AlertTriangle,
  CheckCircle2,
  SkipBack,
  SkipForward,
  Info
} from 'lucide-react';
import { getIssueTheme } from '../theme/tokens.js';
import VectorscopeMini from './VectorscopeMini.jsx';

export default function DetailPanel({
  selectedClip,
  player,
  onAnalyzeClip,
  isAnalyzing = false,
  onSeekSegment,
  className = ''
}) {
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
  } = player || {};

  const videoSrc = selectedClip?.filePath
    ? `media://${encodeURIComponent(selectedClip.filePath)}`
    : null;

  // Active segment at current playback head
  const activeSegment = selectedClip?.segments?.find(
    s => currentTime >= s.start && currentTime <= s.end
  );

  const dominantIssue = selectedClip?.dominantIssue || selectedClip?.segments?.find(s => s.issueType !== 'normal')?.issueType || 'normal';
  const dominantTheme = selectedClip?.isAnalyzed ? getIssueTheme(dominantIssue) : null;

  // Format professional timecode: MM:SS.ms
  const formatTimecode = (seconds) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return '00:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}.${ms}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
    return `${mb.toFixed(1)} MB`;
  };

  const handleSpeedChange = () => {
    const nextRates = [1, 1.5, 2, 0.5];
    const nextIdx = (nextRates.indexOf(playbackRate) + 1) % nextRates.length;
    const nextRate = nextRates[nextIdx];
    setPlaybackRate(nextRate);
    if (videoRef?.current) {
      videoRef.current.playbackRate = nextRate;
    }
  };

  const handleOpenExplorer = () => {
    if (selectedClip?.filePath && window.electronAPI?.showItemInFolder) {
      window.electronAPI.showItemInFolder(selectedClip.filePath);
    }
  };

  const getFileExtension = (filePath) => {
    if (!filePath) return 'VIDEO';
    return filePath.split('.').pop().toUpperCase();
  };

  const getFolderName = (filePath) => {
    if (!filePath) return '';
    const parts = filePath.split(/[/\\]/);
    return parts.length > 1 ? parts[parts.length - 2] : '';
  };

  return (
    <aside className={`w-80 h-full bg-[#0a0d16] border-l border-[#1a2337] flex flex-col justify-between shrink-0 select-none overflow-hidden ${className}`}>
      {/* SCROLLABLE TOP & BODY CONTENT */}
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar p-3.5 space-y-4">
        {/* Header Title */}
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            ĐANG CHỌN
          </div>
          <h2 className="text-sm font-bold text-slate-100 truncate">
            Chi tiết Footage
          </h2>
        </div>

        {/* 1. CINEMA VIDEO MONITOR / PREVIEW PLAYER */}
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-slate-800 shadow-lg group flex items-center justify-center">
          {selectedClip ? (
            playerError ? (
              <div className="p-3 text-center text-xs text-amber-400">
                <AlertTriangle size={18} className="mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 leading-tight block">
                  Codec chuyên dụng không thể phát trực tiếp trên Chromium. Scopes & FFmpeg vẫn phân tích bình thường!
                </span>
              </div>
            ) : (
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-contain cursor-pointer"
                onTimeUpdate={(e) => setCurrentTime && setCurrentTime(e.target.currentTime)}
                onError={handleVideoError}
                onClick={togglePlay}
              />
            )
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-600 gap-1.5 p-4 text-center">
              <Film size={24} className="text-slate-700" />
              <span className="text-[11px] font-mono text-slate-500">Chưa chọn footage</span>
            </div>
          )}

          {/* Corner frame guides */}
          <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-600 pointer-events-none">┌ 16:9</div>
          <div className="absolute bottom-2 right-2 text-[9px] font-mono text-slate-600 pointer-events-none">REC.709 ┘</div>
        </div>

        {/* 2. CLIP TITLE & PATH IDENTIFIER */}
        {selectedClip ? (
          <div>
            <div className="text-xs font-bold text-slate-100 truncate" title={selectedClip.fileName}>
              {selectedClip.fileName}
            </div>
            <div className="text-[10px] font-mono text-slate-500 truncate mt-0.5" title={selectedClip.filePath}>
              {selectedClip.filePath}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic">
            Nhấp vào bất kỳ video nào trong bảng để xem chi tiết
          </div>
        )}

        {/* 3. TIMELINE SCRUB BAR & TRANSPORT CONTROLS */}
        {selectedClip && (
          <div className="space-y-2 pt-1 border-t border-slate-800/60">
            {/* Color-coded scrub bar */}
            <div
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seek && seek(ratio * (selectedClip.duration || 0));
              }}
              className="relative w-full h-2.5 bg-slate-950 rounded-full overflow-hidden cursor-pointer border border-slate-800 flex shadow-inner"
            >
              {selectedClip.segments && selectedClip.segments.length > 0 ? (
                selectedClip.segments.map((seg, idx) => {
                  const segDuration = seg.duration || (seg.end - seg.start);
                  const total = selectedClip.duration || 1;
                  const pct = Math.max(1, (segDuration / total) * 100);
                  const theme = getIssueTheme(seg.issueType);
                  return (
                    <div
                      key={idx}
                      style={{ width: `${pct}%`, backgroundColor: theme.bg }}
                      className="h-full"
                    />
                  );
                })
              ) : (
                <div
                  className="bg-cyan-500 h-full transition-all duration-75"
                  style={{
                    width: `${Math.min(100, ((currentTime || 0) / (selectedClip.duration || 1)) * 100)}%`
                  }}
                />
              )}

              {/* Playhead marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md pointer-events-none"
                style={{
                  left: `${Math.min(99, ((currentTime || 0) / (selectedClip.duration || 1)) * 100)}%`
                }}
              />
            </div>

            {/* Transport buttons row */}
            <div className="flex items-center justify-between text-slate-300">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => seek && seek(0)}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Về đầu video (0s)"
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  onClick={() => seek && seek(Math.max(0, (currentTime || 0) - 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Lùi 1 giây"
                >
                  <SkipBack size={13} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white flex items-center justify-center transition shadow-md shadow-cyan-500/25 active:scale-95 cursor-pointer"
                  title="Phát/Tạm dừng"
                >
                  {isPlaying ? <Pause size={13} /> : <Play size={13} className="ml-0.5" />}
                </button>
                <button
                  onClick={() => seek && seek(Math.min(selectedClip.duration || 0, (currentTime || 0) + 1))}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                  title="Tiến 1 giây"
                >
                  <SkipForward size={13} />
                </button>
              </div>

              {/* Timecode */}
              <div className="font-mono text-[11px] text-cyan-400 font-semibold bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                {formatTimecode(currentTime)} <span className="text-slate-600">/</span> {formatTimecode(selectedClip.duration)}
              </div>

              {/* Speed & Volume */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSpeedChange}
                  className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300 hover:text-cyan-300 transition cursor-pointer"
                  title="Tốc độ phát lại"
                >
                  {playbackRate}x
                </button>
                <button
                  onClick={toggleMute}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 4. SECTION: THÔNG TIN FILE */}
        {selectedClip && (
          <div className="space-y-2 pt-2 border-t border-slate-800/60">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              THÔNG TIN FILE
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800 space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Phân loại màu:</span>
                {dominantTheme ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${dominantTheme.badgeBg} ${dominantTheme.badgeText} ${dominantTheme.badgeBorder}`}>
                    {dominantTheme.label}
                  </span>
                ) : (
                  <span className="text-slate-500">Chưa phân tích</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Định dạng:</span>
                <span className="font-mono text-slate-200">{getFileExtension(selectedClip.filePath)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Kích thước:</span>
                <span className="font-mono text-slate-200">{formatFileSize(selectedClip.fileSize)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thời lượng:</span>
                <span className="font-mono text-slate-200">{formatTimecode(selectedClip.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Thư mục:</span>
                <span className="font-mono text-slate-200 truncate max-w-[140px]" title={selectedClip.filePath}>
                  {getFolderName(selectedClip.filePath) || 'Gốc'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 5. SECTION: PHÂN TÍCH MÀU & VECTORSCOPE */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            <span>VECTORSCOPE REC.709</span>
            <span className="font-mono text-slate-500">{selectedClip?.isAnalyzed ? 'LIVE' : 'STANDBY'}</span>
          </div>

          <div className="bg-[#0b0f19] border border-slate-800 rounded-xl p-2.5 flex flex-col items-center">
            <VectorscopeMini
              videoRef={videoRef}
              activeSegment={activeSegment}
              isPlaying={isPlaying}
              currentTime={currentTime}
            />
          </div>

          {/* Luma Y gauge */}
          {selectedClip?.isAnalyzed && activeSegment && (
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800 text-[10px] font-mono space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Luma Y: <b className="text-white">{activeSegment.avgY}</b></span>
                <span>R: <b className="text-red-400">{activeSegment.avgR}</b></span>
                <span>G: <b className="text-green-400">{activeSegment.avgG}</b></span>
                <span>B: <b className="text-blue-400">{activeSegment.avgB}</b></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. BOTTOM ACTION BUTTONS */}
      {selectedClip && (
        <div className="p-3 border-t border-[#1a2337] bg-[#070910]/80 flex flex-col gap-2">
          <button
            onClick={() => onAnalyzeClip && onAnalyzeClip(selectedClip)}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition active:scale-95 cursor-pointer disabled:opacity-40"
          >
            <Zap size={13} className="text-cyan-400" />
            <span>{selectedClip.isAnalyzed ? 'Phân tích lại' : 'Phân tích footage này'}</span>
          </button>

          <button
            onClick={handleOpenExplorer}
            className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium transition cursor-pointer"
            title="Mở thư mục chứa file trong Windows Explorer"
          >
            <FolderOpen size={13} className="text-slate-400" />
            <span>Mở trong Explorer</span>
          </button>
        </div>
      )}
    </aside>
  );
}
