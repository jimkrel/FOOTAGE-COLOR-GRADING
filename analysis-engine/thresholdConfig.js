/**
 * Default threshold configuration for Footage Color Analyzer
 */
export const DEFAULT_THRESHOLDS = {
  // Luminance (0 - 255 scale)
  yOver: 200,          // Overexposed if Y > yOver
  yUnder: 40,          // Underexposed if Y < yUnder

  // Color cast sensitivity (ratio difference threshold, e.g. 0.15 = 15%)
  castThresholdPercent: 0.15,

  // Minimum duration in seconds to form a distinct segment (avoids micro-segments)
  minSegmentDuration: 1,

  // Severity thresholds
  severityHighDeviation: 0.35, // >35% deviation is considered high severity
};

export const PRESETS = {
  standard: {
    id: 'standard',
    name: 'Standard Rec.709',
    description: 'Dành cho footage quay thông thường Rec.709',
    yOver: 200,
    yUnder: 40,
    castThresholdPercent: 0.15
  },
  lowLight: {
    id: 'lowLight',
    name: 'Night / Low Light',
    description: 'Dành cho cảnh quay ban đêm hoặc thiếu sáng có chủ đích',
    yOver: 220,
    yUnder: 20,
    castThresholdPercent: 0.20
  },
  slog: {
    id: 'slog',
    name: 'Flat / Log Profile (S-Log, C-Log, D-Log)',
    description: 'Dành cho video quay phẳng chưa color grade (Log gamma)',
    yOver: 235,
    yUnder: 30,
    castThresholdPercent: 0.22
  },
  highKey: {
    id: 'highKey',
    name: 'High Key / Bright Interior',
    description: 'Dành cho không gian studio, studio áo cưới, sáng tự nhiên',
    yOver: 225,
    yUnder: 50,
    castThresholdPercent: 0.15
  }
};
