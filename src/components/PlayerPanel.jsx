import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Activity, Film, AlertCircle } from 'lucide-react';
import { getIssueTheme } from '../theme/tokens.js';
import VectorscopeMini from './VectorscopeMini.jsx';
import { EmptyView, ErrorView } from './common/StateView.jsx';

export default function PlayerPanel({
  selectedClip,
  onAnalyze,
  isAnalyzing,
  player, // from usePlayer()
  onOpenFolder
}) {
  const [showVectorscope, setShowVectorscope] = useState(true);
  const containerRef = useRef(null);

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

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19] overflow-hidden select-none">
      {/* Top Header bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800/80 bg-[#0d121f] text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-200 truncate">
            {selectedClip ? selectedClip.fileName : 'Chưa chọn video'}
          </span>
          {activeSegment && activeTheme && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium border ${activeTheme.badgeBg} ${activeTheme.badgeText} ${activeTheme.badgeBorder}`}
            >
              {activeSegment.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Vectorscope Toggle Button */}
          <button
            onClick={() => setShowVectorscope(prev => !prev)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition border ${
              showVectorscope
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
            }`}
            title="Bật/Tắt Vectorscope Mini"
          >
            <Activity size={12} className={showVectorscope ? 'text-cyan-400' : 'text-slate-400'} />
            <span>Vectorscope</span>
          </button>

          {selectedClip && !selectedClip.isAnalyzed && (
            <button
              onClick={() => onAnalyze(selectedClip)}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition shadow-xs disabled:opacity-50"
            >
              <Zap size={12} />
              <span>Phân tích ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport (Handles 3 states: Empty, Codec Error, Live Video) */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group"
      >
        {!selectedClip ? (
          <EmptyView
            icon={Film}
            title="Chưa chọn video"
            description="Chọn một clip trong danh sách bên trái để phát và xem dòng thời gian timeline."
          />
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
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-lg text-xs pointer-events-none shadow-lg z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-semibold ${activeTheme.text}`}>
                {activeSegment.label}
              </span>
              <span className="text-[10px] text-amber-400 font-mono">
                {Math.round((activeSegment.severity || 0) * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono">
              <span>Luma Y: <b className="text-white">{activeSegment.avgY}</b></span>
              <span>R: <b className="text-red-400">{activeSegment.avgR}</b></span>
              <span>G: <b className="text-green-400">{activeSegment.avgG}</b></span>
              <span>B: <b className="text-blue-400">{activeSegment.avgB}</b></span>
            </div>
          </div>
        )}

        {/* Vectorscope Mini Live Overlay */}
        {showVectorscope && videoSrc && !playerError && (
          <div className="absolute top-4 right-4 z-10 transition-all duration-200">
            <VectorscopeMini
              videoRef={videoRef}
              activeSegment={activeSegment}
              isPlaying={isPlaying}
              currentTime={currentTime}
            />
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="h-12 bg-[#0f1523] border-t border-slate-800/80 px-4 flex items-center justify-between text-slate-300">
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!videoSrc || !!playerError}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-cyan-600 hover:text-white flex items-center justify-center transition border border-slate-700 disabled:opacity-40"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>

          <button
            onClick={() => seek(0)}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
            title="Quay lại từ đầu"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={toggleMute}
            disabled={!videoSrc || !!playerError}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition disabled:opacity-40"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className="text-xs text-slate-400">
          <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
            Phím tắt: Space (Play/Pause), Phím mũi tên ← → (Tua 1s)
          </span>
        </div>
      </div>
    </div>
  );
}
