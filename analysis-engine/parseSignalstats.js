/**
 * Convert YUV (BT.601 / Rec.709 approximation) to RGB (0-255).
 * @param {number} y - Luminance (0 - 255)
 * @param {number} u - U chroma (0 - 255, neutral = 128)
 * @param {number} v - V chroma (0 - 255, neutral = 128)
 * @returns {{ r: number, g: number, b: number }}
 */
export function yuvToRgb(y, u, v) {
  const d = u - 128;
  const e = v - 128;

  const r = Math.max(0, Math.min(255, Math.round(y + 1.402 * e)));
  const g = Math.max(0, Math.min(255, Math.round(y - 0.344136 * d - 0.714136 * e)));
  const b = Math.max(0, Math.min(255, Math.round(y + 1.772 * d)));

  return { r, g, b };
}

/**
 * Parses FFmpeg metadata print output from signalstats filter.
 * Expected text block pattern per frame:
 *   frame:0 pts:0 pts_time:0.000000
 *   lavfi.signalstats.YAVG=124.52
 *   lavfi.signalstats.UAVG=128.12
 *   lavfi.signalstats.VAVG=130.40
 *   lavfi.signalstats.YMIN=10
 *   lavfi.signalstats.YMAX=240
 *   lavfi.signalstats.SATAVG=22.1
 *
 * @param {string} rawOutput - Full stdout/stderr text stream from FFmpeg
 * @returns {Array<Object>} Array of frame samples [{ timestamp, Y, U, V, R, G, B, yMin, yMax, satAvg }]
 */
export function parseSignalstatsOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return [];
  }

  const lines = rawOutput.split(/\r?\n/);
  const frames = [];

  let currentFrame = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect frame header: "frame:0    pts:0       pts_time:0.000000"
    if (line.startsWith('frame:') && line.includes('pts_time:')) {
      if (currentFrame && currentFrame.Y !== undefined) {
        frames.push(finalizeFrame(currentFrame));
      }

      const matchTime = line.match(/pts_time:([0-9.]+)/);
      const timestamp = matchTime ? parseFloat(matchTime[1]) : frames.length;

      currentFrame = {
        timestamp: Number(timestamp.toFixed(2)),
        Y: undefined,
        U: 128,
        V: 128,
        yMin: 0,
        yMax: 255,
        satAvg: 0
      };
      continue;
    }

    if (!currentFrame) {
      // Fallback: check if line is signalstats property before frame header
      currentFrame = {
        timestamp: frames.length,
        Y: undefined,
        U: 128,
        V: 128,
        yMin: 0,
        yMax: 255,
        satAvg: 0
      };
    }

    // Parse signalstats tags
    if (line.includes('signalstats.YAVG=')) {
      currentFrame.Y = parseFloat(line.split('signalstats.YAVG=')[1]);
    } else if (line.includes('signalstats.UAVG=')) {
      currentFrame.U = parseFloat(line.split('signalstats.UAVG=')[1]);
    } else if (line.includes('signalstats.VAVG=')) {
      currentFrame.V = parseFloat(line.split('signalstats.VAVG=')[1]);
    } else if (line.includes('signalstats.YMIN=')) {
      currentFrame.yMin = parseFloat(line.split('signalstats.YMIN=')[1]);
    } else if (line.includes('signalstats.YMAX=')) {
      currentFrame.yMax = parseFloat(line.split('signalstats.YMAX=')[1]);
    } else if (line.includes('signalstats.SATAVG=')) {
      currentFrame.satAvg = parseFloat(line.split('signalstats.SATAVG=')[1]);
    }
  }

  if (currentFrame && currentFrame.Y !== undefined) {
    frames.push(finalizeFrame(currentFrame));
  }

  return frames;
}

function finalizeFrame(raw) {
  const y = Number((raw.Y || 0).toFixed(1));
  const u = Number((raw.U ?? 128).toFixed(1));
  const v = Number((raw.V ?? 128).toFixed(1));
  const rgb = yuvToRgb(y, u, v);

  return {
    timestamp: raw.timestamp,
    Y: y,
    U: u,
    V: v,
    R: rgb.r,
    G: rgb.g,
    B: rgb.b,
    yMin: raw.yMin,
    yMax: raw.yMax,
    satAvg: Number((raw.satAvg || 0).toFixed(1))
  };
}
