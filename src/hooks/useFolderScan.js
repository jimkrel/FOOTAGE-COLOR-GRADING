import { useState, useCallback, useEffect } from 'react';

/**
 * Domain Hook: useFolderScan
 * Exclusively manages folder selection, file discovery, and watch events.
 * Only hook that calls window.electronAPI.selectFolder / scanFolder.
 */
export function useFolderScan() {
  const [folderPath, setFolderPath] = useState('');
  const [clips, setClips] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState(null);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Scan a directory path
  const scanDirectory = useCallback(async (dirPath) => {
    if (!isElectron || !dirPath) return;

    setIsScanning(true);
    setScanError(null);

    try {
      const scannedClips = await window.electronAPI.scanFolder(dirPath);
      setClips(scannedClips || []);
      setFolderPath(dirPath);
    } catch (err) {
      console.error('[useFolderScan] Error scanning folder:', err);
      setScanError(err.message || 'Không thể đọc thư mục đã chọn.');
    } finally {
      setIsScanning(false);
    }
  }, [isElectron]);

  // Open native folder dialog
  const selectFolder = useCallback(async () => {
    if (!isElectron) {
      setScanError('Ứng dụng cần chạy trong Electron để mở hộp thoại chọn thư mục.');
      return;
    }

    try {
      const selected = await window.electronAPI.selectFolder();
      if (selected) {
        await scanDirectory(selected);
      }
    } catch (err) {
      console.error('[useFolderScan] Error selecting folder:', err);
      setScanError('Không thể mở hộp thoại chọn thư mục.');
    }
  }, [isElectron, scanDirectory]);

  // Reload current folder
  const refreshFolder = useCallback(async () => {
    if (folderPath) {
      await scanDirectory(folderPath);
    }
  }, [folderPath, scanDirectory]);

  // Update a specific clip by path
  const updateClip = useCallback((filePath, patchOrFn) => {
    setClips(prev => prev.map(c => {
      if (c.filePath === filePath) {
        const patch = typeof patchOrFn === 'function' ? patchOrFn(c) : patchOrFn;
        return { ...c, ...patch };
      }
      return c;
    }));
  }, []);

  // Listen to automatic folder watcher events
  useEffect(() => {
    if (!isElectron) return;

    const unsubscribe = window.electronAPI.onFolderWatchEvent((event) => {
      if (event.type === 'add' && event.clip) {
        setClips(prev => {
          if (prev.some(c => c.filePath === event.clip.filePath)) return prev;
          return [event.clip, ...prev];
        });
      } else if (event.type === 'unlink' && event.filePath) {
        setClips(prev => prev.filter(c => c.filePath !== event.filePath));
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
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [isElectron]);

  return {
    folderPath,
    clips,
    setClips,
    updateClip,
    isScanning,
    scanError,
    selectFolder,
    refreshFolder,
    scanDirectory
  };
}
