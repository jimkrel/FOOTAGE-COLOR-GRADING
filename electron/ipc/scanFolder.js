import fs from 'fs';
import path from 'path';
import { computeQuickHash, getCachedAnalysis } from './cacheDB.js';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v']);

/**
 * Scan a directory for supported video files.
 * @param {string} dirPath - Folder path to scan
 * @param {Object} [options]
 * @param {boolean} [options.recursive=false] - Whether to scan subdirectories
 * @returns {Promise<Array<Object>>}
 */
export async function scanFolder(dirPath, options = { recursive: false }) {
  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  const results = [];

  function walk(currentDir, currentDepth = 0) {
    if (currentDepth > 3) return; // Prevent excessive recursion

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        if (options.recursive && !entry.name.startsWith('.')) {
          walk(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (VIDEO_EXTENSIONS.has(ext)) {
          try {
            const stats = fs.statSync(fullPath);
            const fileHash = computeQuickHash(fullPath);
            const cached = getCachedAnalysis(fileHash);

            results.push({
              filePath: fullPath,
              fileName: entry.name,
              fileSize: stats.size,
              mtimeMs: stats.mtimeMs,
              fileHash,
              isAnalyzed: !!cached,
              duration: cached?.duration || null,
              stats: cached?.stats || null,
              segments: cached?.segments || null,
              tags: cached?.tags || []
            });
          } catch (err) {
            console.error(`Error processing file ${fullPath}:`, err);
          }
        }
      }
    }
  }

  walk(dirPath);
  return results;
}
