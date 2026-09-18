import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { usePlayer } from './hooks/usePlayer.js';
import FolderTree from './components/FolderTree.jsx';
import ClipList from './components/ClipList.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import ColorTimeline from './components/ColorTimeline.jsx';
import ColorInspector from './components/ColorInspector.jsx';
import ThresholdSettings from './components/ThresholdSettings.jsx';
import { Film, FolderOpen, Bell } from 'lucide-react';

function MainLayout() {
  const {
    folderScan,
    clipCache,
    analysisQueue,
    tags,
    selectedClip,
    setSelectedClip,
    toastMessage
  } = useApp();

  const [selectedSegment, setSelectedSegment] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Video player domain hook
  const player = usePlayer({ selectedClip });

  // Active segment at current playback head
  const activeSegment = selectedClip?.segments?.find(
    s => player.currentTime >= s.start && player.currentTime <= s.end
  ) || selectedSegment;

  // Handle batch analyze all unanalyzed clips
  const handleAnalyzeAll = async () => {
    const unanalyzed = folderScan.clips.filter(c => !c.isAnalyzed);
    if (unanalyzed.length === 0) return;
    const filePaths = unanalyzed.map(c => c.filePath);
    await analysisQueue.startBatch(filePaths, { thresholds: clipCache.thresholds });
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#080b12] text-slate-100 select-none">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/50 text-xs text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <Bell size={14} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar Header */}
      <FolderTree
        folderPath={folderScan.folderPath}
        clipsCount={folderScan.clips.length}
        onSelectFolder={folderScan.selectFolder}
        onRefresh={folderScan.refreshFolder}
        onAnalyzeAll={handleAnalyzeAll}
        onCancelBatch={analysisQueue.cancelBatch}
        batchProgress={analysisQueue.batchProgress}
        isScanning={folderScan.isScanning}
        isAnalyzingAny={analysisQueue.isAnalyzingAny}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Layout (3-Panel Architecture) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Footage Library */}
        <ClipList
          clips={tags.filteredClips}
          selectedClip={selectedClip}
          onSelectClip={(clip) => {
            setSelectedClip(clip);
            setSelectedSegment(null);
          }}
          onAnalyze={(clip) => {
            analysisQueue.analyzeSingle(clip, {
              forceReanalyze: true,
              thresholds: clipCache.thresholds
            });
          }}
          analyzingClipPath={analysisQueue.analyzingClipPath}
          progressMap={analysisQueue.progressMap}
          selectedTag={tags.selectedTag}
          onSelectTag={tags.setSelectedTag}
          availableTags={tags.availableTags}
          filterIssue={tags.filterIssue}
          onFilterChange={tags.setFilterIssue}
          isScanning={folderScan.isScanning}
          scanError={folderScan.scanError}
          onRefresh={folderScan.refreshFolder}
        />

        {/* Center Panel: Video Monitor & Color Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#080b12] overflow-hidden">
          {folderScan.clips.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4 shadow-xl shadow-cyan-500/10">
                <Film size={32} />
              </div>
              <h2 className="text-lg font-bold text-slate-200 tracking-wide">Chào mừng đến với Footage Color Studio</h2>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 mb-6 leading-relaxed">
                Hệ thống tự động phát hiện lỗi phơi sáng (cháy sáng / thiếu sáng) và quang phổ lệch màu (ám xanh / ám vàng) cho toàn bộ kho footage.
              </p>
              <button
                onClick={folderScan.selectFolder}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
              >
                <FolderOpen size={15} />
                <span>Chọn Thư Mục Footage</span>
              </button>
            </div>
          ) : (
            <>
              {/* Center Top: Player Area */}
              <div className="flex-1 flex min-h-0 overflow-hidden">
                <PlayerPanel
                  selectedClip={selectedClip}
                  onAnalyze={(clip) => {
                    analysisQueue.analyzeSingle(clip, {
                      forceReanalyze: true,
                      thresholds: clipCache.thresholds
                    });
                  }}
                  isAnalyzing={analysisQueue.analyzingClipPath === selectedClip?.filePath}
                  player={player}
                  onOpenFolder={folderScan.selectFolder}
                  isInspectorOpen={isInspectorOpen}
                  onToggleInspector={() => setIsInspectorOpen(prev => !prev)}
                />
              </div>

              {/* Center Bottom: Docked Color Timeline */}
              <div className="p-2.5 bg-[#080b12] border-t border-[#1c263c] shrink-0">
                <ColorTimeline
                  segments={selectedClip?.segments || []}
                  duration={selectedClip?.duration || 0}
                  currentTime={player.currentTime}
                  onSeek={player.seek}
                  selectedSegment={selectedSegment}
                  onSelectSegment={(seg) => {
                    setSelectedSegment(seg);
                    player.seek(seg.start);
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Right Panel: Color Inspector & Scopes (Collapsible) */}
        {folderScan.clips.length > 0 && isInspectorOpen && (
          <ColorInspector
            selectedClip={selectedClip}
            activeSegment={activeSegment}
            onSeek={player.seek}
            videoRef={player.videoRef}
            isPlaying={player.isPlaying}
            currentTime={player.currentTime}
            onAnalyze={(clip) => {
              analysisQueue.analyzeSingle(clip, {
                forceReanalyze: true,
                thresholds: clipCache.thresholds
              });
            }}
            isAnalyzing={analysisQueue.analyzingClipPath === selectedClip?.filePath}
          />
        )}
      </div>

      {/* Threshold & Presets Settings Modal */}
      <ThresholdSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        thresholds={clipCache.thresholds}
        onChangeThresholds={clipCache.updateThresholds}
        activePreset={clipCache.activePreset}
        onSelectPreset={clipCache.updatePreset}
        onReanalyzeCurrent={() => {
          if (selectedClip) {
            analysisQueue.analyzeSingle(selectedClip, {
              forceReanalyze: true,
              thresholds: clipCache.thresholds
            });
          }
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
