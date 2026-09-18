import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';
import os from 'os';

const THUMBNAIL_DIR = path.join(os.tmpdir(), 'footage-color-analyzer-thumbs');

if (!fs.existsSync(THUMBNAIL_DIR)) {
  fs.mkdirSync(THUMBNAIL_DIR, { recursive: true });
}

/**
 * Generate a single frame thumbnail at a given timestamp.
 * @param {string} videoPath
 * @param {number} [timestamp=1]
 * @param {string} [fileHash]
 * @returns {Promise<string>} Path to generated JPEG thumbnail
 */
export function generateThumbnail(videoPath, timestamp = 1, fileHash = '') {
  return new Promise((resolve, reject) => {
    const safeName = fileHash || path.basename(videoPath).replace(/[^a-zA-Z0-9_-]/g, '_');
    const outPath = path.join(THUMBNAIL_DIR, `thumb_${safeName}_${Math.floor(timestamp)}.jpg`);

    if (fs.existsSync(outPath)) {
      return resolve(outPath);
    }

    const child = spawn(ffmpegPath, [
      '-nostats',
      '-hide_banner',
      '-ss', timestamp.toString(),
      '-i', videoPath,
      '-vframes', '1',
      '-vf', 'scale=320:-1',
      '-q:v', '3',
      '-y',
      outPath
    ]);

    child.on('close', (code) => {
      if (code === 0 && fs.existsSync(outPath)) {
        resolve(outPath);
      } else {
        // Fallback to timestamp 0 if seeking to 1s failed on short clips
        const fallbackChild = spawn(ffmpegPath, [
          '-nostats',
          '-hide_banner',
          '-ss', '0',
          '-i', videoPath,
          '-vframes', '1',
          '-vf', 'scale=320:-1',
          '-q:v', '3',
          '-y',
          outPath
        ]);

        fallbackChild.on('close', (fCode) => {
          if (fCode === 0 && fs.existsSync(outPath)) {
            resolve(outPath);
          } else {
            reject(new Error(`Failed to generate thumbnail for ${videoPath}`));
          }
        });
      }
    });

    child.on('error', (err) => reject(err));
  });
}

/**
 * Generate hover scrub preview frames (e.g. 5 frames evenly spaced)
 * @param {string} videoPath
 * @param {number} duration
 * @param {string} fileHash
 * @param {number} [count=5]
 * @returns {Promise<Array<{ time: number, path: string }>>}
 */
export async function generateScrubFrames(videoPath, duration, fileHash, count = 5) {
  const frames = [];
  const step = duration / (count + 1);

  for (let i = 1; i <= count; i++) {
    const time = Number((i * step).toFixed(1));
    try {
      const thumbPath = await generateThumbnail(videoPath, time, `${fileHash}_scrub_${i}`);
      frames.push({ time, path: thumbPath });
    } catch (e) {
      // Continue even if one frame fails
    }
  }

  return frames;
}
