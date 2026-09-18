import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useFolderScan } from '../hooks/useFolderScan.js';
import { useClipCache } from '../hooks/useClipCache.js';
import { useAnalysisQueue } from '../hooks/useAnalysisQueue.js';
import { useTags } from '../hooks/useTags.js';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [selectedClip, setSelectedClip] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Folder Scanning Domain
  const folderScan = useFolderScan();

  // 2. Cache & Settings Domain
  const clipCache = useClipCache();

  // Callback when any clip analysis completes (single or from batch queue)
  const handleClipAnalyzed = useCallback((filePath, result) => {
    folderScan.updateClip(filePath, {
      isAnalyzed: true,
      duration: result.duration,
      stats: result.stats,
      segments: result.segments,
      tags: result.tags || []
    });

    setSelectedClip(prev => {
      if (prev && prev.filePath === filePath) {
        return {
          ...prev,
          isAnalyzed: true,
          duration: result.duration,
          stats: result.stats,
          segments: result.segments,
          tags: result.tags || []
        };
      }
      return prev;
    });
  }, [folderScan]);

  // 3. Analysis Queue Domain
  const analysisQueue = useAnalysisQueue({ onClipAnalyzed: handleClipAnalyzed });

  // 4. Tags & Filtering Domain
  const tags = useTags(folderScan.clips);

  // Select first clip when folder is scanned
  useEffect(() => {
    if (folderScan.clips.length > 0 && !selectedClip) {
      setSelectedClip(folderScan.clips[0]);
    } else if (folderScan.clips.length === 0) {
      setSelectedClip(null);
    }
  }, [folderScan.clips, selectedClip]);

  // Toast notification helper
  const showToast = useCallback((msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Listen to folder watcher to display subtle toast
  useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI) return;
    const unsubWatcher = window.electronAPI.onFolderWatchEvent((event) => {
      if (event.type === 'add' && event.clip) {
        showToast(`Đã phát hiện file mới: ${event.clip.fileName}`);
      }
    });
    return () => {
      if (typeof unsubWatcher === 'function') unsubWatcher();
    };
  }, [showToast]);

  const value = {
    folderScan,
    clipCache,
    analysisQueue,
    tags,
    selectedClip,
    setSelectedClip,
    toastMessage,
    showToast
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
}
