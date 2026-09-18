import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { scanFolder } from './ipc/scanFolder.js';
import { analyzeClip } from './ipc/analyzeClip.js';
import { generateThumbnail, generateScrubFrames } from './ipc/thumbnail.js';
import { getAllCachedClips, getAllTagsWithCounts, saveSetting, getSetting, getAllSettings } from './ipc/cacheDB.js';
import { batchAnalyzer } from './ipc/batchQueue.js';
import { folderWatcher } from './ipc/folderWatcher.js';
import { PRESETS, DEFAULT_THRESHOLDS } from '../analysis-engine/thresholdConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

const sendToRenderer = (channel, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, data);
  }
};

// Register custom protocol 'media' to stream local files safely
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    center: true,
    show: true,
    backgroundColor: '#080b12',
    title: 'Footage Color Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    console.log(`[Renderer Console] ${message} (${sourceId}:${line})`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[did-fail-load] ${errorDescription} (${errorCode}) at ${validatedURL}`);
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    mainWindow.setAlwaysOnTop(true);
    mainWindow.setAlwaysOnTop(false);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Handle custom 'media://' protocol for seamless local video streaming with range headers
  protocol.handle('media', (request) => {
    // Example: media:///path/to/video.mp4 -> file:///path/to/video.mp4
    const url = request.url.replace(/^media:\/\//, '');
    const decodedPath = decodeURIComponent(url);
    const fileUrl = pathToFileURL(decodedPath).toString();
    return net.fetch(fileUrl);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  folderWatcher.stop();
  batchAnalyzer.cancel();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  folderWatcher.stop();
  batchAnalyzer.cancel();
});

// IPC: Open folder selection dialog
ipcMain.handle('folder:select', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Chọn thư mục chứa Footage Video'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// IPC: Scan folder and automatically begin watch folder monitoring
ipcMain.handle('folder:scan', async (_event, dirPath, options) => {
  const clips = await scanFolder(dirPath, options);
  // Auto-start chokidar folder watcher
  folderWatcher.watch(dirPath, { eventSender: sendToRenderer });
  return clips;
});

// IPC: Analyze single clip
ipcMain.handle('clip:analyze', async (event, filePath, options = {}) => {
  return await analyzeClip(filePath, {
    ...options,
    eventSender: sendToRenderer
  });
});

// IPC: Batch analyze with worker pool queue & concurrency limits
ipcMain.handle('batch:analyze', async (_event, filePaths, options = {}) => {
  return await batchAnalyzer.startBatch(filePaths, options, sendToRenderer);
});

// IPC: Cancel ongoing batch analysis
ipcMain.handle('batch:cancel', () => {
  batchAnalyzer.cancel();
  return true;
});

// IPC: Watch folder manually
ipcMain.handle('folder:watch', (_event, dirPath, options = {}) => {
  folderWatcher.watch(dirPath, { ...options, eventSender: sendToRenderer });
  return true;
});

// IPC: Unwatch folder
ipcMain.handle('folder:unwatch', () => {
  folderWatcher.stop();
  return true;
});

// IPC: Generate thumbnail
ipcMain.handle('clip:thumbnail', async (_event, videoPath, timestamp, fileHash) => {
  try {
    const thumbPath = await generateThumbnail(videoPath, timestamp, fileHash);
    return thumbPath;
  } catch (err) {
    console.error('Thumbnail generation error:', err);
    return null;
  }
});

// IPC: Generate scrub preview frames
ipcMain.handle('clip:scrub', async (_event, videoPath, duration, fileHash) => {
  try {
    return await generateScrubFrames(videoPath, duration, fileHash);
  } catch (err) {
    console.error('Scrub generation error:', err);
    return [];
  }
});

// IPC: Cached clips
ipcMain.handle('cache:list', () => {
  return getAllCachedClips();
});

// IPC: Get distinct tags with counts across library
ipcMain.handle('tags:list', () => {
  return getAllTagsWithCounts();
});

// IPC: Threshold config & presets
ipcMain.handle('config:presets', () => {
  return {
    presets: PRESETS,
    defaultThresholds: DEFAULT_THRESHOLDS
  };
});

// IPC: App persistent settings (thresholds, active preset, preferences)
ipcMain.handle('settings:get', (_event, key, defaultValue) => {
  return getSetting(key, defaultValue);
});

ipcMain.handle('settings:set', (_event, key, value) => {
  return saveSetting(key, value);
});

ipcMain.handle('settings:all', () => {
  return getAllSettings();
});
