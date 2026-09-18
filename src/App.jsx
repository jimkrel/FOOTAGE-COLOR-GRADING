import React, { useState, useRef } from 'react';
import { useClipAnalysis } from './hooks/useClipAnalysis.js';
import FolderTree from './components/FolderTree.jsx';
import ClipList from './components/ClipList.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import ColorTimeline from './components/ColorTimeline.jsx';
import ThresholdSettings from './components/ThresholdSettings.jsx';
import { FolderOpen, Film, Sparkles } from 'lucide-react';

export default function App() {
  const {
    folderPath,
    clips,
    rawClipsCount,
    selectedClip,
    setSelectedClip,
    isScanning,
    analyzingClipPath,
    progressMap,
    batchProgress,
    filterIssue,
    setFilterIssue,
    selectedTag,
    setSelectedTag,
    availableTags,
    thresholds,
    setThresholds,
    activePreset,
    setActivePreset,
    handleSelectFolder,
    handleRefreshFolder,
    handleAnalyzeClip,
    handleAnalyzeAll,
    handleCancelBatch
  } = useClipAnalysis();

  const [currentTime, setCurrentTime] = useState(0);
  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const videoRef = useRef(null);

  const handleSeek = (timeInSeconds) => {
    setCurrentTime(timeInSeconds);
    if (videoRef.current) {
      videoRef.current.currentTime = timeInSeconds;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 select-none">
      {/* Top Bar */}
      <FolderTree
        folderPath={folderPath}
        clipsCount={rawClipsCount}
        onSelectFolder={handleSelectFolder}
        onRefresh={handleRefreshFolder}
        onAnalyzeAll={handleAnalyzeAll}
        onCancelBatch={handleCancelBatch}
        batchProgress={batchProgress}
        filterIssue={filterIssue}
        onFilterChange={setFilterIssue}
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        availableTags={availableTags}
        isScanning={isScanning}
        isAnalyzingAny={!!analyzingClipPath || batchProgress.isRunning}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left: Clips Sidebar */}
        <ClipList
          clips={clips}
          selectedClip={selectedClip}
          onSelectClip={(clip) => {
            setSelectedClip(clip);
            setSelectedSegment(null);
            setCurrentTime(0);
            if (videoRef.current) videoRef.current.currentTime = 0;
          }}
          onAnalyze={(clip) => handleAnalyzeClip(clip, true)}
          analyzingClipPath={analyzingClipPath}
          progressMap={progressMap}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          availableTags={availableTags}
        />

        {/* Right: Player & Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b0f19]">
          {rawClipsCount === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-xl shadow-cyan-500/10">
                <Film size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-200">Chào mừng đến với Footage Color Analyzer</h2>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 mb-6">
                Công cụ tự động phân tích độ phơi sáng (cháy sáng / thiếu sáng) và cân bằng màu (ám xanh / ám vàng) cho toàn bộ thư mục footage video.
              </p>
              <button
                onClick={handleSelectFolder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition active:scale-95"
              >
                <FolderOpen size={16} />
                <span>Chọn Thư Mục Footage</span>
              </button>
            </div>
          ) : (
            <>
              {/* Player Area */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <PlayerPanel
                  selectedClip={selectedClip}
                  onAnalyze={(clip) => handleAnalyzeClip(clip, true)}
                  isAnalyzing={analyzingClipPath === selectedClip?.filePath}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  videoRef={videoRef}
                />
              </div>

              {/* Bottom Interactive Timeline */}
              <div className="p-3 bg-[#0d121f] border-t border-slate-800/80 shrink-0">
                <ColorTimeline
                  segments={selectedClip?.segments || []}
                  duration={selectedClip?.duration || 0}
                  currentTime={currentTime}
                  onSeek={handleSeek}
                  selectedSegment={selectedSegment}
                  onSelectSegment={setSelectedSegment}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Threshold & Presets Settings Modal */}
      <ThresholdSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        thresholds={thresholds}
        onChangeThresholds={setThresholds}
        activePreset={activePreset}
        onSelectPreset={setActivePreset}
        onReanalyzeCurrent={() => {
          if (selectedClip) handleAnalyzeClip(selectedClip, true);
        }}
      />
    </div>
  );
}
