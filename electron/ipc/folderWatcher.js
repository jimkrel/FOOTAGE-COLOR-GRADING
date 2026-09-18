import chokidar from 'chokidar';
import path from 'path';
import fs from 'fs';
import { computeQuickHash, getCachedAnalysis } from './cacheDB.js';
import { batchAnalyzer } from './batchQueue.js';

import { isVideoFile } from './scanFolder.js';

class FolderWatcherService {
  constructor() {
    this.watcher = null;
    this.watchedPath = null;
    this.eventSender = null;
    this.autoAnalyze = true;
  }

  /**
   * Start watching a folder for new, renamed, or deleted footage files.
   *
   * @param {string} dirPath - Folder path to monitor
   * @param {Object} options - { autoAnalyze, eventSender }
   */
  watch(dirPath, options = {}) {
    this.stop();

    this.watchedPath = dirPath;
    this.eventSender = options.eventSender || null;
    this.autoAnalyze = options.autoAnalyze !== false;

    // Configure chokidar with awaitWriteFinish to ensure videos are fully copied before analyzing
    this.watcher = chokidar.watch(dirPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles/hidden folders
      persistent: true,
      ignoreInitial: true, // initial scan handled by folder:scan
      depth: 3,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 200
      }
    });

    this.watcher.on('add', (filePath) => this._handleFileAdd(filePath));
    this.watcher.on('unlink', (filePath) => this._handleFileUnlink(filePath));
    this.watcher.on('change', (filePath) => this._handleFileChange(filePath));

    this.watcher.on('error', (err) => {
      console.error(`Folder watcher error for ${dirPath}:`, err);
    });

    console.log(`[FolderWatcher] Now watching: ${dirPath}`);
  }

  /**
   * Stop current watcher
   */
  stop() {
    if (this.watcher) {
      this.watcher.close().catch(() => {});
      this.watcher = null;
    }
    this.watchedPath = null;
  }

  _isVideoFile(filePath) {
    return isVideoFile(filePath);
  }

  async _handleFileAdd(filePath) {
    if (!this._isVideoFile(filePath)) return;

    try {
      // Wait slightly for Windows file locks to release
      await new Promise(r => setTimeout(r, 500));
      if (!fs.existsSync(filePath)) return;

      const stats = fs.statSync(filePath);
      const fileHash = computeQuickHash(filePath);
      const cached = getCachedAnalysis(fileHash);

      const clip = {
        filePath,
        fileName: path.basename(filePath),
        fileSize: stats.size,
        mtimeMs: stats.mtimeMs,
        fileHash,
        isAnalyzed: !!cached,
        duration: cached?.duration || null,
        stats: cached?.stats || null,
        segments: cached?.segments || null,
        tags: cached?.tags || []
      };

      // Notify renderer of newly discovered clip
      if (this.eventSender) {
        this.eventSender('watcher:event', {
          type: 'add',
          clip
        });
      }

      // Automatically queue for analysis if not yet cached
      if (this.autoAnalyze && !cached) {
        console.log(`[FolderWatcher] Auto-queuing new footage for analysis: ${filePath}`);
        batchAnalyzer.startBatch([filePath], {}, this.eventSender);
      }
    } catch (err) {
      console.error(`[FolderWatcher] Error handling added file ${filePath}:`, err);
    }
  }

  _handleFileUnlink(filePath) {
    if (!this._isVideoFile(filePath)) return;

    if (this.eventSender) {
      this.eventSender('watcher:event', {
        type: 'unlink',
        filePath
      });
    }
  }

  async _handleFileChange(filePath) {
    if (!this._isVideoFile(filePath)) return;

    try {
      const stats = fs.statSync(filePath);
      const fileHash = computeQuickHash(filePath);

      if (this.eventSender) {
        this.eventSender('watcher:event', {
          type: 'change',
          filePath,
          fileHash,
          fileSize: stats.size
        });
      }

      // Re-queue changed file for analysis
      if (this.autoAnalyze) {
        batchAnalyzer.startBatch([filePath], { forceReanalyze: true }, this.eventSender);
      }
    } catch (err) {
      console.error(`[FolderWatcher] Error handling modified file ${filePath}:`, err);
    }
  }
}

export const folderWatcher = new FolderWatcherService();
