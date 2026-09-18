import { DEFAULT_THRESHOLDS } from './thresholdConfig.js';

/**
 * Detect exposure and color cast issues for a single frame sample.
 * @param {Object} frame - { timestamp, Y, R, G, B }
 * @param {Object} [customThresholds] - Optional overrides for thresholds
 * @returns {Object} { timestamp, Y, R, G, B, issueType, severity, label }
 */
export function detectFrameIssue(frame, customThresholds = {}) {
  const config = { ...DEFAULT_THRESHOLDS, ...customThresholds };
  const { timestamp, Y, R, G, B } = frame;

  // 1. Check Exposure first (High priority)
  if (Y > config.yOver) {
    const severity = Math.min(1, Math.max(0.1, (Y - config.yOver) / (255 - config.yOver)));
    return {
      timestamp,
      Y, R, G, B,
      issueType: 'overexposed',
      severity: Number(severity.toFixed(2)),
      label: 'Cháy sáng (Overexposed)'
    };
  }

  if (Y < config.yUnder) {
    const severity = Math.min(1, Math.max(0.1, (config.yUnder - Y) / Math.max(1, config.yUnder)));
    return {
      timestamp,
      Y, R, G, B,
      issueType: 'underexposed',
      severity: Number(severity.toFixed(2)),
      label: 'Thiếu sáng (Underexposed)'
    };
  }

  // 2. Check Color Cast if luminance is within reasonable range (avoid pure black/white noise)
  const avgIntensity = (R + G + B) / 3;
  if (avgIntensity > 25 && avgIntensity < 235) {
    const th = config.castThresholdPercent;

    // Cool cast: Blue significantly dominates both Red and Green
    if (B > R * (1 + th) && B > G * (1 + th)) {
      const diffRatio = (B - Math.max(R, G)) / Math.max(1, avgIntensity);
      const severity = Math.min(1, Math.max(0.1, diffRatio / 0.5));
      return {
        timestamp,
        Y, R, G, B,
        issueType: 'cool_cast',
        severity: Number(severity.toFixed(2)),
        label: 'Ám xanh lạnh (Cool Cast)'
      };
    }

    // Warm cast: Red and Green both higher than Blue (Yellow/Warm tint)
    if (R > B * (1 + th) && G > B * (1 + th * 0.7)) {
      const diffRatio = (R - B) / Math.max(1, avgIntensity);
      const severity = Math.min(1, Math.max(0.1, diffRatio / 0.5));
      return {
        timestamp,
        Y, R, G, B,
        issueType: 'warm_cast',
        severity: Number(severity.toFixed(2)),
        label: 'Ám vàng ấm (Warm Cast)'
      };
    }

    // Green cast (Fluorescent light tint)
    if (G > R * (1 + th) && G > B * (1 + th)) {
      const diffRatio = (G - Math.max(R, B)) / Math.max(1, avgIntensity);
      const severity = Math.min(1, Math.max(0.1, diffRatio / 0.5));
      return {
        timestamp,
        Y, R, G, B,
        issueType: 'green_cast',
        severity: Number(severity.toFixed(2)),
        label: 'Ám xanh lá (Green Tint)'
      };
    }

    // Magenta / Red cast
    if (R > G * (1 + th) && R > B * (1 + th)) {
      const diffRatio = (R - Math.max(G, B)) / Math.max(1, avgIntensity);
      const severity = Math.min(1, Math.max(0.1, diffRatio / 0.5));
      return {
        timestamp,
        Y, R, G, B,
        issueType: 'magenta_cast',
        severity: Number(severity.toFixed(2)),
        label: 'Ám đỏ/hồng (Magenta Tint)'
      };
    }
  }

  // Normal frame
  return {
    timestamp,
    Y, R, G, B,
    issueType: 'normal',
    severity: 0,
    label: 'Cân bằng tốt (Normal)'
  };
}

/**
 * Detect issues for an array of sampled frames.
 * @param {Array<Object>} frames - [{ timestamp, Y, R, G, B }, ...]
 * @param {Object} [customThresholds]
 * @returns {Array<Object>}
 */
export function detectAllIssues(frames, customThresholds = {}) {
  return frames.map(frame => detectFrameIssue(frame, customThresholds));
}
