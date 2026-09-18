import { spawn } from 'child_process';
import ffmpegPath from 'ffmpeg-static';
import { parseSignalstatsOutput } from './parseSignalstats.js';
import { detectAllIssues } from './detectIssues.js';
import { buildSegments, calculateClipStats } from './segmentBuilder.js';

/**
 * Extracts video duration from ffmpeg stderr output
 * @param {string} stderrText
 * @returns {number|null} Duration in seconds
 */
export function extractDuration(stderrText) {
  const match = stderrText.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
  if (!match) return null;
  const hours = parseFloat(match[1]);
  const minutes = parseFloat(match[2]);
  const seconds = parseFloat(match[3]);
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Runs FFmpeg with signalstats filter to sample the video at specified fps and resolution.
 *
 * @param {string} filePath - Absolute path to video file
 * @param {Object} [options]
 * @param {number} [options.fps=1] - Sampling rate (default: 1 frame/sec)
 * @param {number} [options.scaleWidth=128] - Downscale width for speed (default: 128)
 * @param {number} [options.scaleHeight=72] - Downscale height (default: 72)
 * @param {Object} [options.thresholds] - Custom thresholds for detectIssues
 * @param {Function} [options.onProgress] - Callback on progress: ({ percent, currentSec, totalSec })
 * @returns {Promise<Object>} Result containing frames, segments, stats, duration
 */
export function analyzeVideo(filePath, options = {}) {
  const {
    fps = 1,
    scaleWidth = 128,
    scaleHeight = 72,
    thresholds = {},
    onProgress
  } = options;

  return new Promise((resolve, reject) => {
    // Construct filter: sample at fps=1, downscale to 128:72, calculate signalstats, print metadata
    const filter = `fps=${fps},scale=${scaleWidth}:${scaleHeight},signalstats,metadata=print:file=-`;

    const args = [
      '-nostats',
      '-hide_banner',
      '-i', filePath,
      '-vf', filter,
      '-f', 'null',
      '-'
    ];

    const child = spawn(ffmpegPath, args);

    let stdoutBuffer = '';
    let stderrBuffer = '';
    let totalDuration = null;
    let lastReportedSec = -1;

    // Handle stdout (metadata prints can appear here or stderr depending on stream redirect)
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdoutBuffer += text;
      checkProgress(text);
    });

    // Handle stderr (ffmpeg banner, duration, and sometimes metadata prints)
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      stderrBuffer += text;

      if (!totalDuration) {
        totalDuration = extractDuration(stderrBuffer);
      }

      checkProgress(text);
    });

    function checkProgress(text) {
      if (!onProgress || !totalDuration || totalDuration <= 0) return;

      const ptsMatches = text.match(/pts_time:([0-9.]+)/g);
      if (ptsMatches && ptsMatches.length > 0) {
        const lastPts = ptsMatches[ptsMatches.length - 1];
        const currentSec = parseFloat(lastPts.replace('pts_time:', ''));
        if (currentSec > lastReportedSec) {
          lastReportedSec = currentSec;
          const percent = Math.min(100, Math.round((currentSec / totalDuration) * 100));
          onProgress({ percent, currentSec, totalSec: totalDuration, totalDuration });
        }
      }
    }

    child.on('error', (err) => {
      reject(new Error(`Failed to spawn FFmpeg: ${err.message}`));
    });

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(`FFmpeg exited with error code ${code}.\nDetails: ${stderrBuffer.slice(-500)}`)
        );
      }

      try {
        const combinedOutput = stdoutBuffer + '\n' + stderrBuffer;
        const rawFrames = parseSignalstatsOutput(combinedOutput);

        if (rawFrames.length === 0) {
          return reject(new Error('No frames were parsed from video. File may be empty or corrupted.'));
        }

        const analyzedFrames = detectAllIssues(rawFrames, thresholds);
        const segments = buildSegments(analyzedFrames, fps);

        const calculatedDuration = totalDuration || (rawFrames.length / fps);
        const stats = calculateClipStats(segments, calculatedDuration);

        if (onProgress) {
          onProgress({ percent: 100, currentSec: calculatedDuration, totalSec: calculatedDuration, totalDuration: calculatedDuration });
        }

        resolve({
          filePath,
          duration: Number(calculatedDuration.toFixed(2)),
          sampleCount: rawFrames.length,
          frames: analyzedFrames,
          segments,
          stats
        });
      } catch (err) {
        reject(new Error(`Failed to process video analysis: ${err.message}`));
      }
    });
  });
}
