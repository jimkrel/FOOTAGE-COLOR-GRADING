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

  // Thresholds state
  const [thresholds, setThresholds] = useState({
    yOver: 200,
    yUnder: 40,
    castThresholdPercent: 0.15
  });
  const [activePreset, setActivePreset] = useState('standard');

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Listen to IPC analysis progress events
  useEffect(() => {
    if (!isElectron) return;
    const unsubscribe = window.electronAPI.onProgress((data) => {
      setProgressMap(prev => ({
        ...prev,
        [data.filePath]: data.percent
      }));
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
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

      // Update clips list with analysis result
      setClips(prev => prev.map(c => {
        if (c.filePath === clip.filePath) {
          return {
            ...c,
            isAnalyzed: true,
            duration: result.duration,
            stats: result.stats,
            segments: result.segments
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
          segments: result.segments
        }));
      }
    } catch (err) {
      console.error('Lỗi phân tích clip:', err);
    } finally {
      setAnalyzingClipPath(null);
      setProgressMap(prev => ({ ...prev, [clip.filePath]: 100 }));
    }
  }, [isElectron, thresholds, selectedClip]);

  // Analyze all unanalyzed clips sequentially
  const handleAnalyzeAll = useCallback(async () => {
    const unanalyzed = clips.filter(c => !c.isAnalyzed);
    for (const clip of unanalyzed) {
      await handleAnalyzeClip(clip);
    }
  }, [clips, handleAnalyzeClip]);

  // Filtered clips list
  const filteredClips = clips.filter(clip => {
    if (filterIssue === 'all') return true;
    if (filterIssue === 'unanalyzed') return !clip.isAnalyzed;
    if (!clip.isAnalyzed || !clip.segments) return false;
    return clip.segments.some(seg => seg.issueType === filterIssue);
  });

  return {
    folderPath,
    clips: filteredClips,
    rawClipsCount: clips.length,
    selectedClip,
    setSelectedClip,
    isScanning,
    analyzingClipPath,
    progressMap,
    filterIssue,
    setFilterIssue,
    thresholds,
    setThresholds,
    activePreset,
    setActivePreset,
    handleSelectFolder,
    handleRefreshFolder,
    handleAnalyzeClip,
    handleAnalyzeAll,
    isElectron
  };
}
