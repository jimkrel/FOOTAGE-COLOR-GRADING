import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('folder:select'),
  scanFolder: (dirPath, options) => ipcRenderer.invoke('folder:scan', dirPath, options),
  analyzeClip: (filePath, options) => ipcRenderer.invoke('clip:analyze', filePath, options),
  getThumbnail: (videoPath, timestamp, fileHash) => ipcRenderer.invoke('clip:thumbnail', videoPath, timestamp, fileHash),
  getScrubFrames: (videoPath, duration, fileHash) => ipcRenderer.invoke('clip:scrub', videoPath, duration, fileHash),
  getAllCachedClips: () => ipcRenderer.invoke('cache:list'),
  getPresets: () => ipcRenderer.invoke('config:presets'),

  // Event listener for progress
  onProgress: (callback) => {
    const subscription = (_event, value) => callback(value);
    ipcRenderer.on('analysis:progress', subscription);
    return () => ipcRenderer.removeListener('analysis:progress', subscription);
  }
});
