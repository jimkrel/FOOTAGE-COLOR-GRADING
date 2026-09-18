import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('folder:select'),
  scanFolder: (dirPath, options) => ipcRenderer.invoke('folder:scan', dirPath, options),
  analyzeClip: (filePath, options) => ipcRenderer.invoke('clip:analyze', filePath, options),
  getThumbnail: (videoPath, timestamp, fileHash) => ipcRenderer.invoke('clip:thumbnail', videoPath, timestamp, fileHash),
  getScrubFrames: (videoPath, duration, fileHash) => ipcRenderer.invoke('clip:scrub', videoPath, duration, fileHash),
  getAllCachedClips: () => ipcRenderer.invoke('cache:list'),
  getPresets: () => ipcRenderer.invoke('config:presets'),

  // Batch analyze & worker pool
  batchAnalyze: (filePaths, options) => ipcRenderer.invoke('batch:analyze', filePaths, options),
  cancelBatch: () => ipcRenderer.invoke('batch:cancel'),

  // Watch folder controls
  watchFolder: (dirPath, options) => ipcRenderer.invoke('folder:watch', dirPath, options),
  unwatchFolder: () => ipcRenderer.invoke('folder:unwatch'),

  // Tags list
  getTags: () => ipcRenderer.invoke('tags:list'),

  // App settings persistence (thresholds, presets)
  getSetting: (key, defaultValue) => ipcRenderer.invoke('settings:get', key, defaultValue),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:all'),

  // Single clip progress listener
  onProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('analysis:progress', subscription);
    return () => ipcRenderer.removeListener('analysis:progress', subscription);
  },

  // Batch overall progress listener
  onBatchProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('batch:progress', subscription);
    return () => ipcRenderer.removeListener('batch:progress', subscription);
  },

  // Batch clip done listener (for immediate live card updates)
  onBatchClipDone: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('batch:clipDone', subscription);
    return () => ipcRenderer.removeListener('batch:clipDone', subscription);
  },

  // Folder watch event listener (file added, removed, changed)
  onFolderWatchEvent: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('watcher:event', subscription);
    return () => ipcRenderer.removeListener('watcher:event', subscription);
  }
});
