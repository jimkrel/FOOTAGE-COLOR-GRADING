import { analyzeVideo } from '../../analysis-engine/ffmpegSampler.js';
import { computeQuickHash, getCachedAnalysis, saveAnalysis } from './cacheDB.js';

/**
 * Analyze a single clip or return cached result.
 *
 * @param {string} filePath - Absolute path to video
 * @param {Object} [options] - { forceReanalyze, thresholds, eventSender }
 * @returns {Promise<Object>}
 */
export async function analyzeClip(filePath, options = {}) {
  const { forceReanalyze = false, thresholds = {}, eventSender } = options;

  const fileHash = computeQuickHash(filePath);

  // 1. Check cache first unless forced
  if (!forceReanalyze) {
    const cached = getCachedAnalysis(fileHash);
    if (cached) {
      if (eventSender) {
        eventSender('analysis:progress', { filePath, percent: 100, isCached: true });
      }
      return cached;
    }
  }

  // 2. Run analysis engine
  const result = await analyzeVideo(filePath, {
    thresholds,
    onProgress: (progress) => {
      if (eventSender) {
        eventSender('analysis:progress', {
          filePath,
          percent: progress.percent,
          currentSec: progress.currentSec,
          totalDuration: progress.totalDuration
        });
      }
    }
  });

  // 3. Save to SQLite cache
  saveAnalysis({
    filePath,
    fileHash,
    duration: result.duration,
    sampleCount: result.sampleCount,
    stats: result.stats,
    segments: result.segments
  });

  return {
    ...result,
    fileHash,
    isCached: false
  };
}
