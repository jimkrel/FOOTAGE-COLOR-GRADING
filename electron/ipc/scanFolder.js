import fs from 'fs';
import path from 'path';
import { computeQuickHash, getCachedAnalysis } from './cacheDB.js';

export const SUPPORTED_VIDEO_EXTENSIONS = new Set([
  // Popular containers
  '.mp4', '.mov', '.mkv', '.webm', '.avi', '.m4v',
  // Broadcast & Camera Cinema formats (Sony, Canon, Panasonic, Arri, Blackmagic, RED)
  '.mxf', '.ts', '.mts', '.m2ts', '.braw', '.r3d', '.crm', '.cine', '.prores',
  // Legacy / Web / Windows formats
  '.wmv', '.asf', '.flv', '.f4v', '.vob', '.3gp', '.3g2', '.ogv', '.divx',
  // MPEG formats
  '.mpg', '.mpeg', '.m2v', '.mp4v'
]);

const IGNORED_FOLDERS = new Set([
  '.git', '.svn', '.hg', 'node_modules', '$recycle.bin',
  'system volume information', '.trash', '.tmp', '.idea', '.vscode'
]);

/**
 * Check if a file path has a supported video extension (case-insensitive)
 * @param {string} filePath
 * @returns {boolean}
 */
export function isVideoFile(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  const ext = path.extname(filePath).toLowerCase();
  return SUPPORTED_VIDEO_EXTENSIONS.has(ext);
}

/**
 * Process a single video file into a standardized Clip object
 * @param {string} filePath
 * @returns {Object|null}
 */
export function processVideoFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) return null;

    const fileHash = computeQuickHash(filePath);
    const cached = getCachedAnalysis(fileHash);

    return {
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
  } catch (err) {
    console.error(`Error processing video file ${filePath}:`, err);
    return null;
  }
}

/**
 * Scan a directory for supported video files.
 * Defaults to recursive scanning (up to maxDepth 5) to discover camera subfolders (DCIM, M4ROOT, etc.).
 *
 * @param {string} dirPath - Folder path to scan
 * @param {Object} [options]
 * @param {boolean} [options.recursive=true] - Whether to scan subdirectories
 * @param {number} [options.maxDepth=5] - Maximum recursion depth
 * @returns {Promise<Array<Object>>}
 */
export async function scanFolder(dirPath, options = {}) {
  const { recursive = true, maxDepth = 5 } = options;

  if (!fs.existsSync(dirPath)) {
    throw new Error(`Directory does not exist: ${dirPath}`);
  }

  const results = [];
  const visitedPaths = new Set();

  function walk(currentDir, currentDepth = 0) {
    if (currentDepth > maxDepth) return;

    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch (err) {
      console.warn(`Cannot read directory ${currentDir}:`, err.message);
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();
        if (recursive && !IGNORED_FOLDERS.has(lowerName) && !entry.name.startsWith('.')) {
          walk(fullPath, currentDepth + 1);
        }
      } else if (entry.isFile()) {
        if (isVideoFile(entry.name) && !visitedPaths.has(fullPath)) {
          visitedPaths.add(fullPath);
          const clip = processVideoFile(fullPath);
          if (clip) {
            results.push(clip);
          }
        }
      }
    }
  }

  walk(dirPath);
  return results;
}

/**
 * Import a list of arbitrary file or directory paths (e.g. from Drag & Drop or multi-file picker).
 * Expands any directory paths recursively and processes all video files.
 *
 * @param {Array<string>} targetPaths
 * @returns {Promise<Array<Object>>}
 */
export async function importPaths(targetPaths = []) {
  const clips = [];
  const visited = new Set();

  for (const itemPath of targetPaths) {
    if (!itemPath || typeof itemPath !== 'string') continue;
    if (!fs.existsSync(itemPath)) continue;

    try {
      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        const dirClips = await scanFolder(itemPath, { recursive: true });
        for (const clip of dirClips) {
          if (!visited.has(clip.filePath)) {
            visited.add(clip.filePath);
            clips.push(clip);
          }
        }
      } else if (stats.isFile() && isVideoFile(itemPath)) {
        if (!visited.has(itemPath)) {
          visited.add(itemPath);
          const clip = processVideoFile(itemPath);
          if (clip) {
            clips.push(clip);
          }
        }
      }
    } catch (err) {
      console.error(`Error importing path ${itemPath}:`, err);
    }
  }

  return clips;
}
