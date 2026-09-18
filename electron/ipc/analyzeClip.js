import { analyzeVideo } from '../../analysis-engine/ffmpegSampler.js';
import { computeQuickHash, getCachedAnalysis, saveAnalysis, saveClipTags } from './cacheDB.js';
import { generateTagsFromSegments } from '../../analysis-engine/tagGenerator.js';

/**
 * Analyze a single clip or return cached result.
 * Automatically generates and persists tags (e.g. 'clean', 'overexposed', 'cool-cast') from segments.
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
      // If legacy cache without tags, backfill auto-tags
      if (!cached.tags || cached.tags.length === 0) {
        cached.tags = generateTagsFromSegments(cached.segments || [], cached.stats || {});
        saveClipTags(fileHash, cached.tags);
      }

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

  // 3. Auto-generate tags from segments (e.g. 'clean', 'overexposed', 'cool-cast')
  const tags = generateTagsFromSegments(result.segments, result.stats);

  // 4. Save to SQLite cache and clip_tags table
  saveAnalysis({
    filePath,
    fileHash,
    duration: result.duration,
    sampleCount: result.sampleCount,
    stats: result.stats,
    segments: result.segments,
    tags
  });

  return {
    ...result,
    fileHash,
    tags,
    isCached: false
  };
}
