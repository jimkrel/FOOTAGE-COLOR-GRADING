import os from 'os';
import { analyzeClip } from './analyzeClip.js';

/**
 * Batch analysis worker pool with concurrency control.
 * Limits simultaneous FFmpeg processes to (os.cpus().length / 2) to ensure
 * smooth UI performance even with large footage directories.
 */

// Optimal concurrency: half of logical CPU cores (minimum 1, maximum 8 to avoid disk I/O thrashing)
const DEFAULT_CONCURRENCY = Math.max(1, Math.min(8, Math.floor(os.cpus().length / 2)));

class BatchAnalyzerQueue {
  constructor() {
    this.concurrency = DEFAULT_CONCURRENCY;
    this.queue = [];
    this.activeWorkers = 0;
    this.isRunning = false;
    this.isCancelled = false;
    this.total = 0;
    this.completed = 0;
    this.eventSender = null;
    this.results = [];
  }

  /**
   * Start batch analysis on a list of file paths.
   *
   * @param {Array<string>} filePaths - Array of absolute file paths to analyze
   * @param {Object} options - { thresholds, forceReanalyze, concurrency }
   * @param {Function} eventSender - Callback to send IPC events to renderer
   * @returns {Promise<Array<Object>>} All completed clip analysis results
   */
  async startBatch(filePaths, options = {}, eventSender = null) {
    if (this.isRunning) {
      this.cancel();
    }

    this.isRunning = true;
    this.isCancelled = false;
    this.concurrency = options.concurrency || DEFAULT_CONCURRENCY;
    this.total = filePaths.length;
    this.completed = 0;
    this.eventSender = eventSender;
    this.results = [];
    this.queue = [...filePaths];

    // Emit initial batch start progress
    this._notifyProgress(null, 'running');

    return new Promise((resolve) => {
      this._resolvePromise = resolve;

      if (this.total === 0) {
        this.isRunning = false;
        this._notifyProgress(null, 'completed');
        return resolve([]);
      }

      // Spawn initial worker slots up to concurrency limit
      const initialSpawns = Math.min(this.concurrency, this.queue.length);
      for (let i = 0; i < initialSpawns; i++) {
        this._nextWorker(options);
      }
    });
  }

  /**
   * Pulls next file from the queue and processes it.
   */
  async _nextWorker(options) {
    if (this.isCancelled) {
      this._checkFinished();
      return;
    }

    if (this.queue.length === 0) {
      this._checkFinished();
      return;
    }

    const filePath = this.queue.shift();
    this.activeWorkers++;

    try {
      this._notifyProgress(filePath, 'running');

      const result = await analyzeClip(filePath, {
        thresholds: options.thresholds,
        forceReanalyze: options.forceReanalyze,
        eventSender: this.eventSender
      });

      this.results.push(result);
      this.completed++;

      // Send immediate clip completed notification for live UI updates
      if (this.eventSender) {
        this.eventSender('batch:clipDone', {
          filePath,
          result,
          completed: this.completed,
          total: this.total
        });
      }
    } catch (err) {
      console.error(`Batch analyze failed for ${filePath}:`, err);
      this.completed++;
      this.results.push({
        filePath,
        error: err.message,
        isFailed: true
      });
    } finally {
      this.activeWorkers--;
      this._notifyProgress(filePath, this.queue.length > 0 ? 'running' : 'draining');

      // Continue processing remaining items in queue
      if (this.queue.length > 0 && !this.isCancelled) {
        this._nextWorker(options);
      } else {
        this._checkFinished();
      }
    }
  }

  /**
   * Check if all items are finished or queue has drained.
   */
  _checkFinished() {
    if (this.activeWorkers === 0 && (this.queue.length === 0 || this.isCancelled)) {
      this.isRunning = false;
      const finalStatus = this.isCancelled ? 'cancelled' : 'completed';
      this._notifyProgress(null, finalStatus);

      if (this._resolvePromise) {
        const resolve = this._resolvePromise;
        this._resolvePromise = null;
        resolve(this.results);
      }
    }
  }

  /**
   * Cancel ongoing batch analysis.
   */
  cancel() {
    this.isCancelled = true;
    this.queue = [];
    this._checkFinished();
  }

  /**
   * Notify renderer of current progress.
   */
  _notifyProgress(currentFile, status) {
    if (!this.eventSender) return;

    const percent = this.total > 0
      ? Math.round((this.completed / this.total) * 100)
      : 100;

    this.eventSender('batch:progress', {
      completed: this.completed,
      total: this.total,
      percent,
      currentFile,
      status,
      concurrency: this.concurrency,
      activeWorkers: this.activeWorkers,
      remaining: this.queue.length
    });
  }
}

export const batchAnalyzer = new BatchAnalyzerQueue();
