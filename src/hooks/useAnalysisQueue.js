import { useState, useEffect, useCallback } from 'react';

/**
 * Domain Hook: useAnalysisQueue
 * Exclusively manages single clip analysis and multithreaded batch analysis queue.
 */
export function useAnalysisQueue({ onClipAnalyzed } = {}) {
  const [analyzingClipPath, setAnalyzingClipPath] = useState(null);
  const [progressMap, setProgressMap] = useState({});
  const [batchProgress, setBatchProgress] = useState({
    isRunning: false,
    completed: 0,
    total: 0,
    percent: 0,
    currentFile: null,
    status: 'idle'
  });

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Listen to single-clip analysis progress
  useEffect(() => {
    if (!isElectron) return;

    const unsubProgress = window.electronAPI.onProgress((data) => {
      setProgressMap(prev => ({
        ...prev,
        [data.filePath]: data.percent
      }));
    });

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

    const unsubClipDone = window.electronAPI.onBatchClipDone((data) => {
      if (onClipAnalyzed) {
        onClipAnalyzed(data.filePath, data.result);
      }
      setProgressMap(prev => ({ ...prev, [data.filePath]: 100 }));
    });

    return () => {
      if (typeof unsubProgress === 'function') unsubProgress();
      if (typeof unsubBatch === 'function') unsubBatch();
      if (typeof unsubClipDone === 'function') unsubClipDone();
    };
  }, [isElectron, onClipAnalyzed]);

  // Analyze a single clip
  const analyzeSingle = useCallback(async (clip, options = {}) => {
    if (!isElectron || !clip?.filePath) return null;

    setAnalyzingClipPath(clip.filePath);
    try {
      const result = await window.electronAPI.analyzeClip(clip.filePath, options);
      if (onClipAnalyzed) {
        onClipAnalyzed(clip.filePath, result);
      }
      return result;
    } catch (err) {
      console.error(`[useAnalysisQueue] Error analyzing clip ${clip.filePath}:`, err);
      throw err;
    } finally {
      setAnalyzingClipPath(null);
      setProgressMap(prev => ({ ...prev, [clip.filePath]: 100 }));
    }
  }, [isElectron, onClipAnalyzed]);

  // Start batch analysis with worker pool
  const startBatch = useCallback(async (filePaths, options = {}) => {
    if (!isElectron || !filePaths || filePaths.length === 0) return [];
    try {
      return await window.electronAPI.batchAnalyze(filePaths, options);
    } catch (err) {
      console.error('[useAnalysisQueue] Batch analysis error:', err);
      throw err;
    }
  }, [isElectron]);

  // Cancel ongoing batch analysis
  const cancelBatch = useCallback(async () => {
    if (!isElectron) return;
    try {
      await window.electronAPI.cancelBatch();
    } catch (err) {
      console.error('[useAnalysisQueue] Error canceling batch:', err);
    }
  }, [isElectron]);

  return {
    analyzingClipPath,
    progressMap,
    batchProgress,
    analyzeSingle,
    startBatch,
    cancelBatch,
    isAnalyzingAny: !!analyzingClipPath || batchProgress.isRunning
  };
}
