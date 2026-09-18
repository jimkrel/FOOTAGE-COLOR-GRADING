import { useState, useEffect, useCallback } from 'react';

// Color map helper
export const ISSUE_COLORS = {
  normal: { bg: '#10b981', border: '#059669', text: 'text-emerald-400', label: 'Cân bằng tốt' },
  overexposed: { bg: '#f97316', border: '#ea580c', text: 'text-orange-400', label: 'Cháy sáng (Over)' },
  underexposed: { bg: '#6366f1', border: '#4f46e5', text: 'text-indigo-400', label: 'Thiếu sáng (Under)' },
  cool_cast: { bg: '#0ea5e9', border: '#0284c7', text: 'text-sky-400', label: 'Ám xanh (Cool)' },
  warm_cast: { bg: '#eab308', border: '#ca8a04', text: 'text-yellow-400', label: 'Ám vàng (Warm)' },
  magenta_cast: { bg: '#ec4899', border: '#db2777', text: 'text-pink-400', label: 'Ám hồng/đỏ' },
  green_cast: { bg: '#84cc16', border: '#65a30d', text: 'text-lime-400', label: 'Ám xanh lá' }
};

export function useClipAnalysis() {
  const [folderPath, setFolderPath] = useState('');
  const [clips, setClips] = useState([]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [analyzingClipPath, setAnalyzingClipPath] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [filterIssue, setFilterIssue] = useState('all');
  const [selectedTag, setSelectedTag] = useState('all');

  // Batch progress state for multi-threaded queue
  const [batchProgress, setBatchProgress] = useState({
    isRunning: false,
    completed: 0,
    total: 0,
    percent: 0,
    currentFile: null,
    status: 'idle'
  });

  // Thresholds state
  const [thresholds, setThresholds] = useState({
    yOver: 200,
    yUnder: 40,
    castThresholdPercent: 0.15
  });
  const [activePreset, setActivePreset] = useState('standard');

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Listen to single-clip IPC progress events
  useEffect(() => {
    if (!isElectron) return;
    const unsubProgress = window.electronAPI.onProgress((data) => {
      setProgressMap(prev => ({
        ...prev,
        [data.filePath]: data.percent
      }));
    });

    // Listen to batch queue overall progress
    const unsubBatch = window.electronAPI.onBatchProgress((data) => {
      setBatchProgress({
        isRunning: data.status === 'running' || data.status === 'draining',
        completed: data.completed,
        total: data.total,
        percent: data.percent,
        currentFile: data.currentFile,
        status: data.status
      });

      if (data.status === 'completed' || data.status === 'cancelled') {
        setTimeout(() => {
          setBatchProgress(prev => ({ ...prev, isRunning: false, currentFile: null }));
        }, 1500);
      }
    });

    // Listen to individual clip completion inside batch queue for instant UI updates
    const unsubClipDone = window.electronAPI.onBatchClipDone((data) => {
      const { filePath, result } = data;
      setClips(prev => prev.map(c => {
        if (c.filePath === filePath) {
          return {
            ...c,
            isAnalyzed: true,
            duration: result.duration,
            stats: result.stats,
            segments: result.segments,
            tags: result.tags || []
          };
        }
        return c;
      }));

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
    });

    // Listen to automatic folder watcher events (file added, removed, changed)
    const unsubWatcher = window.electronAPI.onFolderWatchEvent((event) => {
      if (event.type === 'add' && event.clip) {
        setClips(prev => {
          if (prev.some(c => c.filePath === event.clip.filePath)) return prev;
          return [event.clip, ...prev];
        });
      } else if (event.type === 'unlink' && event.filePath) {
        setClips(prev => prev.filter(c => c.filePath !== event.filePath));
        setSelectedClip(prev => prev?.filePath === event.filePath ? null : prev);
      } else if (event.type === 'change' && event.filePath) {
        setClips(prev => prev.map(c => {
          if (c.filePath === event.filePath) {
            return { ...c, fileSize: event.fileSize, isAnalyzed: false };
          }
          return c;
        }));
      }
    });

    return () => {
      if (typeof unsubProgress === 'function') unsubProgress();
      if (typeof unsubBatch === 'function') unsubBatch();
      if (typeof unsubClipDone === 'function') unsubClipDone();
      if (typeof unsubWatcher === 'function') unsubWatcher();
    };
  }, [isElectron]);

  // Select folder via native dialog
  const handleSelectFolder = useCallback(async () => {
    if (!isElectron) {
      alert('Vui lòng chạy trong Electron để mở hộp thoại chọn thư mục gốc của hệ thống.');
      return;
    }

    try {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        setFolderPath(selected);
        setIsScanning(true);
        const scannedClips = await window.electronAPI.scanFolder(selected);
        setClips(scannedClips);
        setIsScanning(false);
        if (scannedClips.length > 0) {
          setSelectedClip(scannedClips[0]);
        }
      }
    } catch (err) {
      console.error('Lỗi chọn thư mục:', err);
      setIsScanning(false);
    }
  }, [isElectron]);

  // Scan or reload current folder
  const handleRefreshFolder = useCallback(async () => {
    if (!isElectron || !folderPath) return;
    setIsScanning(true);
    try {
      const scannedClips = await window.electronAPI.scanFolder(folderPath);
      setClips(scannedClips);
      if (selectedClip) {
        const updated = scannedClips.find(c => c.filePath === selectedClip.filePath);
        if (updated) setSelectedClip(updated);
      }
    } catch (err) {
      console.error('Lỗi làm mới thư mục:', err);
    } finally {
      setIsScanning(false);
    }
  }, [isElectron, folderPath, selectedClip]);

  // Analyze a single clip
  const handleAnalyzeClip = useCallback(async (clip, forceReanalyze = false) => {
    if (!isElectron) return;
    setAnalyzingClipPath(clip.filePath);

    try {
      const result = await window.electronAPI.analyzeClip(clip.filePath, {
        forceReanalyze,
        thresholds
      });

      // Update clips list with analysis result & auto-tags
      setClips(prev => prev.map(c => {
        if (c.filePath === clip.filePath) {
          return {
            ...c,
            isAnalyzed: true,
            duration: result.duration,
            stats: result.stats,
            segments: result.segments,
            tags: result.tags || []
          };
        }
        return c;
      }));

      // Update selected clip if active
      if (selectedClip && selectedClip.filePath === clip.filePath) {
        setSelectedClip(prev => ({
          ...prev,
          isAnalyzed: true,
          duration: result.duration,
          stats: result.stats,
          segments: result.segments,
          tags: result.tags || []
        }));
      }
    } catch (err) {
      console.error('Lỗi phân tích clip:', err);
    } finally {
      setAnalyzingClipPath(null);
      setProgressMap(prev => ({ ...prev, [clip.filePath]: 100 }));
    }
  }, [isElectron, thresholds, selectedClip]);

  // Multi-threaded batch analysis of all unanalyzed clips
  const handleAnalyzeAll = useCallback(async () => {
    if (!isElectron) return;
    const unanalyzed = clips.filter(c => !c.isAnalyzed);
    if (unanalyzed.length === 0) return;

    const filePaths = unanalyzed.map(c => c.filePath);
    await window.electronAPI.batchAnalyze(filePaths, { thresholds });
  }, [isElectron, clips, thresholds]);

  // Cancel multi-threaded batch analysis
  const handleCancelBatch = useCallback(async () => {
    if (!isElectron) return;
    await window.electronAPI.cancelBatch();
  }, [isElectron]);

  // Collect available tags and usage counts from analyzed clips
  const availableTags = useCallback(() => {
    const counts = {};
    for (const clip of clips) {
      if (clip.tags && Array.isArray(clip.tags)) {
        for (const tag of clip.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
    return counts;
  }, [clips])();

  // Filtered clips list applying both issue category & tag filters
  const filteredClips = clips.filter(clip => {
    // 1. Tag filter
    if (selectedTag !== 'all') {
      if (!clip.tags || !clip.tags.includes(selectedTag)) {
        return false;
      }
    }

    // 2. Issue type filter
    if (filterIssue === 'all') return true;
    if (filterIssue === 'unanalyzed') return !clip.isAnalyzed;
    if (!clip.isAnalyzed || !clip.segments) return false;
    return clip.segments.some(seg => seg.issueType === filterIssue);
  });

  return {
    folderPath,
    clips: filteredClips,
    rawClips: clips,
    rawClipsCount: clips.length,
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
    handleCancelBatch,
    isElectron
  };
}
