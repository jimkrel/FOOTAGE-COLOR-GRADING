import React, { useState, useEffect, useRef } from 'react';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { usePlayer } from './hooks/usePlayer.js';
import FolderTree from './components/FolderTree.jsx';
import ClipList from './components/ClipList.jsx';
import PlayerPanel from './components/PlayerPanel.jsx';
import ColorTimeline from './components/ColorTimeline.jsx';
import ColorInspector from './components/ColorInspector.jsx';
import ThresholdSettings from './components/ThresholdSettings.jsx';
import { Film, FolderOpen, Bell, UploadCloud, Sun, Palette, HardDrive, Sparkles } from 'lucide-react';

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

  // Drag & Drop state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounterRef = useRef(0);

  // Resizable Panel Dimensions
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('layout_left_width');
    return saved ? Math.max(260, Math.min(550, parseInt(saved, 10))) : 320;
  });

  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('layout_right_width');
    return saved ? Math.max(260, Math.min(500, parseInt(saved, 10))) : 320;
  });

  const [timelineHeight, setTimelineHeight] = useState(() => {
    const saved = localStorage.getItem('layout_timeline_height');
    return saved ? Math.max(90, Math.min(280, parseInt(saved, 10))) : 140;
  });

  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);

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

  // Mouse drag handlers for resizing panels
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft) {
        const newWidth = Math.max(260, Math.min(550, e.clientX));
        setLeftWidth(newWidth);
        localStorage.setItem('layout_left_width', newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.max(260, Math.min(500, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
        localStorage.setItem('layout_right_width', newWidth);
      } else if (isResizingTimeline) {
        const newHeight = Math.max(90, Math.min(280, window.innerHeight - e.clientY));
        setTimelineHeight(newHeight);
        localStorage.setItem('layout_timeline_height', newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
      setIsResizingTimeline(false);
    };

    if (isResizingLeft || isResizingRight || isResizingTimeline) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isResizingTimeline ? 'row-resize' : 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight, isResizingTimeline]);

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
      className="relative flex flex-col h-screen w-screen overflow-hidden bg-[#080b12] text-slate-100 select-none"
    >
      {/* Full-screen Drag & Drop Overlay */}
      {isDraggingOver && (
        <div className="absolute inset-0 z-50 bg-[#080b12]/90 backdrop-blur-md flex flex-col items-center justify-center p-8 border-4 border-dashed border-cyan-500/80 pointer-events-none animate-in fade-in duration-150">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 mb-4 shadow-2xl shadow-cyan-500/30 animate-bounce">
            <UploadCloud size={40} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-wide">Thả thư mục hoặc file video vào đây</h2>
          <p className="text-xs text-slate-400 mt-2 max-w-md text-center">
            Hỗ trợ tự động quét đệ quy các thư mục thẻ nhớ máy quay (Sony, Canon, Panasonic, Blackmagic) và 25+ định dạng video (.mp4, .mov, .mxf, .mts, .braw, .r3d...)
          </p>
        </div>
      )}

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
        onSelectFiles={folderScan.selectFiles}
        onRefresh={folderScan.refreshFolder}
        onAnalyzeAll={handleAnalyzeAll}
        onCancelBatch={analysisQueue.cancelBatch}
        batchProgress={analysisQueue.batchProgress}
        isScanning={folderScan.isScanning}
        isAnalyzingAny={analysisQueue.isAnalyzingAny}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace Layout (3-Panel Architecture with Resizers) */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Panel: Footage Library */}
        <ClipList
          style={{ width: `${leftWidth}px` }}
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

        {/* Left Resizer Handle */}
        <div
          onMouseDown={() => setIsResizingLeft(true)}
          onDoubleClick={() => setLeftWidth(320)}
          className={`w-1.5 hover:w-2 bg-transparent hover:bg-cyan-500/60 transition-colors cursor-col-resize flex items-center justify-center group shrink-0 z-20 ${
            isResizingLeft ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' : ''
          }`}
          title="Kéo để thay đổi độ rộng Thư viện (Nhấp đúp để đặt lại)"
        >
          <div className="w-0.5 h-6 rounded-full bg-slate-700 group-hover:bg-cyan-300 transition-colors" />
        </div>

        {/* Center Panel: Video Monitor & Color Timeline */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#080b12] overflow-hidden">
          {folderScan.clips.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative overflow-hidden select-none">
              {/* Subtle background studio aura & color grading watermark */}
              <div className="absolute w-[500px] h-[500px] bg-gradient-to-tr from-cyan-500/5 via-teal-500/5 to-transparent rounded-full blur-3xl pointer-events-none -top-24 -left-24" />
              <div className="absolute w-[450px] h-[450px] bg-gradient-to-br from-indigo-500/5 via-cyan-500/5 to-transparent rounded-full blur-3xl pointer-events-none -bottom-24 -right-24" />

              {/* Central Interactive Dropzone Card */}
              <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center p-8 sm:p-10 rounded-2xl border-2 border-dashed border-slate-800/90 hover:border-cyan-500/50 bg-gradient-to-b from-[#0e1628]/60 via-[#0a0f1d]/40 to-[#080b12] shadow-2xl backdrop-blur-xs transition-all duration-300 group">
                {/* Visual Icon with subtle glow */}
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-teal-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/10 group-hover:scale-105 group-hover:border-cyan-400/60 transition-transform duration-300">
                    <UploadCloud size={32} />
                  </div>
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-[10px] text-cyan-300">
                    +
                  </span>
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-wide">
                  Kéo & Thả Footage Hoặc Thư Mục Vào Đây
                </h2>
                <p className="text-xs text-slate-400 max-w-md mt-2 mb-6 leading-relaxed">
                  Tự động quét đệ quy các thẻ nhớ máy quay, nhận diện phân cảnh và phát hiện tức thì lỗi phơi sáng hoặc lệch màu sắc.
                </p>

                {/* Primary CTA Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={folderScan.selectFolder}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/25 transition active:scale-95 cursor-pointer"
                  >
                    <FolderOpen size={15} />
                    <span>Chọn Thư Mục</span>
                  </button>
                  <button
                    onClick={folderScan.selectFiles}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 hover:border-cyan-500/40 transition active:scale-95 cursor-pointer"
                  >
                    <Film size={15} className="text-cyan-400" />
                    <span>Chọn File Video</span>
                  </button>
                </div>

                {/* Supported Formats Pills */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 w-full flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <span className="text-slate-400 font-sans mr-1">Hỗ trợ:</span>
                  {['MP4', 'MOV', 'MXF', 'BRAW', 'R3D', 'ProRes', 'MTS', 'MKV'].map(ext => (
                    <span key={ext} className="px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-slate-400">
                      .{ext}
                    </span>
                  ))}
                  <span className="text-slate-500">+20 định dạng</span>
                </div>
              </div>

              {/* 3 Studio Feature Highlight Badges below the dropzone */}
              <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-xl w-full mx-auto mt-6">
                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 shrink-0 mt-0.5">
                    <Sun size={14} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-300">Đo Quang Độ Luma</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Phát hiện chính xác vùng Cháy sáng và Thiếu sáng
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
                    <Palette size={14} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-300">Quang Phổ RGB</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Phát hiện dải màu Ám xanh (Cool) & Ám vàng (Warm)
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-start gap-2.5">
                  <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 shrink-0 mt-0.5">
                    <HardDrive size={14} />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-slate-300">Thẻ Nhớ Máy Quay</div>
                    <div className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                      Quét sâu đệ quy thẻ Sony, RED, BMPCC, Canon
                    </div>
                  </div>
                </div>
              </div>
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

              {/* Bottom Timeline Resizer Handle */}
              <div
                onMouseDown={() => setIsResizingTimeline(true)}
                onDoubleClick={() => setTimelineHeight(140)}
                className={`h-1.5 hover:h-2 bg-transparent hover:bg-cyan-500/60 transition-colors cursor-row-resize flex items-center justify-center group shrink-0 z-20 ${
                  isResizingTimeline ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' : ''
                }`}
                title="Kéo để thay đổi độ cao Timeline (Nhấp đúp để đặt lại)"
              >
                <div className="h-0.5 w-10 rounded-full bg-slate-700 group-hover:bg-cyan-300 transition-colors" />
              </div>

              {/* Center Bottom: Docked Color Timeline */}
              <div
                style={{ height: `${timelineHeight}px` }}
                className="p-2.5 bg-[#080b12] border-t border-[#1c263c] shrink-0 overflow-y-auto"
              >
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

        {/* Right Resizer Handle */}
        {folderScan.clips.length > 0 && isInspectorOpen && (
          <div
            onMouseDown={() => setIsResizingRight(true)}
            onDoubleClick={() => setRightWidth(320)}
            className={`w-1.5 hover:w-2 bg-transparent hover:bg-cyan-500/60 transition-colors cursor-col-resize flex items-center justify-center group shrink-0 z-20 ${
              isResizingRight ? 'bg-cyan-500 shadow-sm shadow-cyan-500/50' : ''
            }`}
            title="Kéo để thay đổi độ rộng Inspector (Nhấp đúp để đặt lại)"
          >
            <div className="w-0.5 h-6 rounded-full bg-slate-700 group-hover:bg-cyan-300 transition-colors" />
          </div>
        )}

        {/* Right Panel: Color Inspector & Scopes (Collapsible) */}
        {folderScan.clips.length > 0 && isInspectorOpen && (
          <ColorInspector
            style={{ width: `${rightWidth}px` }}
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
