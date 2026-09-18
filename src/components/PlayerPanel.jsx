import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Zap, Activity } from 'lucide-react';
import { ISSUE_COLORS } from '../hooks/useClipAnalysis.js';
import VectorscopeMini from './VectorscopeMini.jsx';

export default function PlayerPanel({
  selectedClip,
  onAnalyze,
  isAnalyzing,
  currentTime,
  onTimeUpdate,
  videoRef
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVectorscope, setShowVectorscope] = useState(true);
  const containerRef = useRef(null);

  const videoSrc = selectedClip
    ? `media://${encodeURIComponent(selectedClip.filePath)}`
    : null;

  // Toggle Play / Pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Keyboard shortcut listener for Space (play/pause) and Left/Right arrows
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 1);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Find active segment at currentTime
  const activeSegment = selectedClip?.segments?.find(
    s => currentTime >= s.start && currentTime <= s.end
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19] overflow-hidden">
      {/* Top Header bar */}
      <div className="h-10 px-4 flex items-center justify-between border-b border-slate-800/80 bg-[#0d121f] text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="font-semibold text-slate-200 truncate">
            {selectedClip ? selectedClip.fileName : 'Chưa chọn video'}
          </span>
          {activeSegment && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium border border-current/20 ${
                ISSUE_COLORS[activeSegment.issueType]?.text || 'text-white'
              }`}
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
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition shadow-xs"
            >
              <Zap size={12} />
              <span>Phân tích ngay</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        ref={containerRef}
        className="flex-1 relative bg-black flex items-center justify-center overflow-hidden group"
      >
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="w-full h-full object-contain"
            onTimeUpdate={(e) => onTimeUpdate(e.target.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onClick={togglePlay}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-600 gap-2">
            <p className="text-sm">Chọn một video trong danh sách bên trái để phát và xem timeline</p>
          </div>
        )}

        {/* Current Segment Live Overlay HUD */}
        {activeSegment && activeSegment.issueType !== 'normal' && (
          <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-3 py-2 rounded-lg text-xs pointer-events-none shadow-lg z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className={`font-semibold ${ISSUE_COLORS[activeSegment.issueType]?.text}`}>
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
        {showVectorscope && videoSrc && (
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
            disabled={!videoSrc}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-cyan-600 hover:text-white flex items-center justify-center transition border border-slate-700"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>

          <button
            onClick={() => {
              if (videoRef.current) videoRef.current.currentTime = 0;
            }}
            disabled={!videoSrc}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
            title="Quay lại từ đầu"
          >
            <RotateCcw size={15} />
          </button>

          <button
            onClick={() => {
              if (videoRef.current) {
                videoRef.current.muted = !videoRef.current.muted;
                setIsMuted(videoRef.current.muted);
              }
            }}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
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
