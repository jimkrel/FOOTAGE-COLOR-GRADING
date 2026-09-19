import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { usePlayer } from './hooks/usePlayer.js';
import SidebarNav from './components/SidebarNav.jsx';
import FootageTable from './components/FootageTable.jsx';
import DetailPanel from './components/DetailPanel.jsx';
import ThresholdSettings from './components/ThresholdSettings.jsx';
import { UploadCloud, Bell } from 'lucide-react';

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

  const [activeNavFilter, setActiveNavFilter] = useState('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Drag & Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Video player domain hook
  const player = usePlayer({ selectedClip });

  // Handle batch analyze all unanalyzed clips
  const handleAnalyzeAll = async () => {
    const unanalyzed = folderScan.clips.filter(c => !c.isAnalyzed);
    if (unanalyzed.length === 0) return;
    const filePaths = unanalyzed.map(c => c.filePath);
    await analysisQueue.startBatch(filePaths, { thresholds: clipCache.thresholds });
  };

  // Global Drag & Drop handlers for folders and video files
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const paths = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = window.electronAPI?.getPathForFile
        ? window.electronAPI.getPathForFile(file)
        : (file.path || '');
      if (filePath) paths.push(filePath);
    }

    if (paths.length > 0 && folderScan.importDroppedPaths) {
      await folderScan.importDroppedPaths(paths);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="relative flex h-screen w-screen overflow-hidden bg-[#080b12] text-slate-100 select-none font-sans"
    >
      {/* 1. FULL-SCREEN DRAG & DROP OVERLAY */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#080b12]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-dashed border-cyan-500/80 pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-2xl shadow-cyan-500/30 animate-bounce">
            <UploadCloud size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">Thả thư mục hoặc file video vào đây</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md text-center">
            Hỗ trợ tự động quét đệ quy các thư mục thẻ nhớ máy quay (Sony, Canon, Panasonic, Blackmagic) và hơn 25 định dạng video (.mp4, .mov, .mxf, .mts, .braw, .r3d...)
          </p>
        </div>
      )}

      {/* 2. TOAST NOTIFICATION BANNER */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900/95 border border-cyan-500/50 text-xs text-slate-200 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <Bell size={14} className="text-cyan-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 3. LEFT SIDEBAR NAVIGATION (SFX-MANAGER STYLE) */}
      <SidebarNav
        clips={folderScan.clips}
        folderPath={folderScan.folderPath}
        activeFilter={activeNavFilter}
        onSelectFilter={setActiveNavFilter}
        onSelectFolder={folderScan.selectFolder}
        onSelectFiles={folderScan.selectFiles}
        onRefresh={folderScan.refreshFolder}
        isScanning={folderScan.isScanning}
      />

      {/* 4. CENTER WORKSPACE: FOOTAGE MEDIA TABLE (SFX-MANAGER STYLE) */}
      <FootageTable
        clips={folderScan.clips}
        selectedClip={selectedClip}
        onSelectClip={(clip) => setSelectedClip(clip)}
        onAnalyzeClip={(clip) => {
          analysisQueue.analyzeSingle(clip, {
            forceReanalyze: true,
            thresholds: clipCache.thresholds
          });
        }}
        onAnalyzeAll={handleAnalyzeAll}
        isAnalyzingAny={analysisQueue.isAnalyzingAny}
        analyzingClipPath={analysisQueue.analyzingClipPath}
        progressMap={analysisQueue.progressMap}
        onOpenSettings={() => setIsSettingsOpen(true)}
        batchProgress={analysisQueue.batchProgress}
        onCancelBatch={analysisQueue.cancelBatch}
        onSelectFolder={folderScan.selectFolder}
        onSelectFiles={folderScan.selectFiles}
        activeNavFilter={activeNavFilter}
        onSelectNavFilter={setActiveNavFilter}
      />

      {/* 5. RIGHT SIDEBAR: FOOTAGE DETAIL PANEL (SFX-MANAGER STYLE) */}
      <DetailPanel
        selectedClip={selectedClip}
        player={player}
        onAnalyzeClip={(clip) => {
          analysisQueue.analyzeSingle(clip, {
            forceReanalyze: true,
            thresholds: clipCache.thresholds
          });
        }}
        isAnalyzing={analysisQueue.analyzingClipPath === selectedClip?.filePath}
      />

      {/* 6. THRESHOLD & PRESET SETTINGS MODAL */}
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
