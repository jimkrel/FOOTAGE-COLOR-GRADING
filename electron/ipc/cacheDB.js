import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

let dbInstance = null;

/**
 * Computes a fast and reliable cache hash based on file size, modification time, and sample header bytes.
 * @param {string} filePath
 * @returns {string} SHA-256 hash string
 */
export function computeQuickHash(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const hash = crypto.createHash('sha256');

    // Feed size and mtime
    hash.update(`path:${filePath}|size:${stats.size}|mtime:${stats.mtimeMs}|`);

    // Feed first 16KB of file header (where container metadata and moov atoms reside)
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(Math.min(16384, stats.size));
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    hash.update(buffer);
    return hash.digest('hex');
  } catch (err) {
    // Fallback: simple path hash
    return crypto.createHash('sha256').update(filePath).digest('hex');
  }
}

/**
 * Initialize SQLite database and tables.
 * @param {string} [customDbPath]
 * @returns {Database.Database}
 */
export function initDB(customDbPath) {
  if (dbInstance) return dbInstance;

  const dbPath = customDbPath || path.join(process.cwd(), 'color_analyzer_cache.db');
  dbInstance = new Database(dbPath);

  // WAL mode for high performance concurrency
  dbInstance.pragma('journal_mode = WAL');

  // Schema creation
  dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS clips (
      id TEXT PRIMARY KEY,
      filePath TEXT UNIQUE,
      fileName TEXT,
      fileHash TEXT NOT NULL,
      fileSize INTEGER,
      mtimeMs INTEGER,
      duration REAL,
      sampleCount INTEGER,
      statsJson TEXT,
      analyzedAt INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_clips_hash ON clips(fileHash);
    CREATE INDEX IF NOT EXISTS idx_clips_path ON clips(filePath);

    CREATE TABLE IF NOT EXISTS segments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clipId TEXT NOT NULL,
      start REAL,
      end REAL,
      duration REAL,
      issueType TEXT,
      label TEXT,
      severity REAL,
      avgY REAL,
      avgR REAL,
      avgG REAL,
      avgB REAL,
      FOREIGN KEY (clipId) REFERENCES clips(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_segments_clipId ON segments(clipId);

    CREATE TABLE IF NOT EXISTS clip_tags (
      file_hash TEXT NOT NULL,
      tag TEXT NOT NULL,
      PRIMARY KEY (file_hash, tag)
    );

    CREATE INDEX IF NOT EXISTS idx_clip_tags_hash ON clip_tags(file_hash);
    CREATE INDEX IF NOT EXISTS idx_clip_tags_tag ON clip_tags(tag);
  `);

  return dbInstance;
}

/**
 * Retrieve cached analysis for a file by hash.
 * @param {string} fileHash
 * @returns {Object|null}
 */
export function getCachedAnalysis(fileHash) {
  const db = initDB();
  const clip = db.prepare(`SELECT * FROM clips WHERE fileHash = ?`).get(fileHash);
  if (!clip) return null;

  const segments = db.prepare(`
    SELECT start, end, duration, issueType, label, severity, avgY, avgR, avgG, avgB
    FROM segments WHERE clipId = ? ORDER BY start ASC
  `).all(clip.id);

  const tags = getClipTags(fileHash);

  return {
    id: clip.id,
    filePath: clip.filePath,
    fileName: clip.fileName,
    fileHash: clip.fileHash,
    duration: clip.duration,
    sampleCount: clip.sampleCount,
    stats: JSON.parse(clip.statsJson || '{}'),
    analyzedAt: clip.analyzedAt,
    segments,
    tags,
    isCached: true
  };
}

/**
 * Save tags for a clip into clip_tags table.
 * @param {string} fileHash
 * @param {Array<string>} tags
 */
export function saveClipTags(fileHash, tags = []) {
  const db = initDB();
  const deleteOld = db.prepare(`DELETE FROM clip_tags WHERE file_hash = ?`);
  const insertTag = db.prepare(`INSERT OR IGNORE INTO clip_tags (file_hash, tag) VALUES (?, ?)`);

  const tx = db.transaction(() => {
    deleteOld.run(fileHash);
    for (const tag of tags) {
      if (typeof tag === 'string' && tag.trim()) {
        insertTag.run(fileHash, tag.trim().toLowerCase());
      }
    }
  });

  tx();
}

/**
 * Retrieve tags for a clip by its file_hash.
 * @param {string} fileHash
 * @returns {Array<string>}
 */
export function getClipTags(fileHash) {
  const db = initDB();
  const rows = db.prepare(`SELECT tag FROM clip_tags WHERE file_hash = ? ORDER BY tag ASC`).all(fileHash);
  return rows.map(r => r.tag);
}

/**
 * Retrieve distinct tags across the entire library with usage count.
 * @returns {Array<{ tag: string, count: number }>}
 */
export function getAllTagsWithCounts() {
  const db = initDB();
  return db.prepare(`SELECT tag, count(*) as count FROM clip_tags GROUP BY tag ORDER BY count DESC, tag ASC`).all();
}

/**
 * Save analysis results into the SQLite cache.
 * @param {Object} data - { filePath, fileHash, duration, sampleCount, stats, segments, tags }
 */
export function saveAnalysis(data) {
  const db = initDB();
  const { filePath, fileHash, duration, sampleCount, stats, segments, tags } = data;

  const statsJson = JSON.stringify(stats || {});
  const fileName = path.basename(filePath);
  const clipId = fileHash;
  const analyzedAt = Date.now();

  const deleteOldSegments = db.prepare(`DELETE FROM segments WHERE clipId = ?`);
  const deleteOldClip = db.prepare(`DELETE FROM clips WHERE filePath = ? OR id = ?`);
  const insertClip = db.prepare(`
    INSERT INTO clips (id, filePath, fileName, fileHash, duration, sampleCount, statsJson, analyzedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertSegment = db.prepare(`
    INSERT INTO segments (clipId, start, end, duration, issueType, label, severity, avgY, avgR, avgG, avgB)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    deleteOldSegments.run(clipId);
    deleteOldClip.run(filePath, clipId);
    insertClip.run(clipId, filePath, fileName, fileHash, duration, sampleCount, statsJson, analyzedAt);

    for (const seg of segments) {
      insertSegment.run(
        clipId,
        seg.start,
        seg.end,
        seg.duration,
        seg.issueType,
        seg.label,
        seg.severity,
        seg.avgY,
        seg.avgR,
        seg.avgG,
        seg.avgB
      );
    }
  });

  transaction();

  if (Array.isArray(tags)) {
    saveClipTags(fileHash, tags);
  }

  return { clipId, savedAt: analyzedAt };
}

/**
 * List all analyzed clips in cache
 */
export function getAllCachedClips() {
  const db = initDB();
  const clips = db.prepare(`SELECT id, filePath, fileName, fileHash, duration, analyzedAt FROM clips ORDER BY analyzedAt DESC`).all();
  return clips.map(clip => ({
    ...clip,
    tags: getClipTags(clip.fileHash)
  }));
}
