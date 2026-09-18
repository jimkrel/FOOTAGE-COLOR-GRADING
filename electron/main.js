import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { scanFolder } from './ipc/scanFolder.js';
import { analyzeClip } from './ipc/analyzeClip.js';
import { generateThumbnail, generateScrubFrames } from './ipc/thumbnail.js';
import { getAllCachedClips } from './ipc/cacheDB.js';
import { PRESETS, DEFAULT_THRESHOLDS } from '../analysis-engine/thresholdConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let mainWindow = null;

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
    backgroundColor: '#0f172a',
    title: 'Footage Color Analyzer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

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
  if (process.platform !== 'darwin') {
    app.quit();
  }
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

// IPC: Scan folder
ipcMain.handle('folder:scan', async (_event, dirPath, options) => {
  return await scanFolder(dirPath, options);
});

// IPC: Analyze clip
ipcMain.handle('clip:analyze', async (event, filePath, options = {}) => {
  return await analyzeClip(filePath, {
    ...options,
    eventSender: (channel, data) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
      }
    }
  });
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

// IPC: Threshold config & presets
ipcMain.handle('config:presets', () => {
  return {
    presets: PRESETS,
    defaultThresholds: DEFAULT_THRESHOLDS
  };
});
