/**
 * Groups consecutive frame issues into continuous timeline segments.
 *
 * @param {Array<Object>} analyzedFrames - Array of frames processed by detectFrameIssue
 * @param {number} [fps=1] - Sample rate (e.g. 1 sample per second)
 * @returns {Array<Object>} Array of segments: { start, end, duration, issueType, label, severity, avgY, avgR, avgG, avgB, frameCount }
 */
export function buildSegments(analyzedFrames, fps = 1) {
  if (!analyzedFrames || analyzedFrames.length === 0) {
    return [];
  }

  const sampleStep = 1 / fps;
  const segments = [];
  let currentSegment = null;

  for (let i = 0; i < analyzedFrames.length; i++) {
    const frame = analyzedFrames[i];
    const frameTime = frame.timestamp ?? (i * sampleStep);

    if (!currentSegment) {
      currentSegment = {
        start: frameTime,
        end: frameTime + sampleStep,
        issueType: frame.issueType,
        label: frame.label,
        maxSeverity: frame.severity || 0,
        sumSeverity: frame.severity || 0,
        sumY: frame.Y,
        sumR: frame.R,
        sumG: frame.G,
        sumB: frame.B,
        frameCount: 1
      };
      continue;
    }

    // Check if the issue type is identical and time is contiguous
    const isContiguous = Math.abs(frameTime - currentSegment.end) <= sampleStep * 1.5;
    const sameIssue = frame.issueType === currentSegment.issueType;

    if (sameIssue && isContiguous) {
      // Extend current segment
      currentSegment.end = frameTime + sampleStep;
      currentSegment.maxSeverity = Math.max(currentSegment.maxSeverity, frame.severity || 0);
      currentSegment.sumSeverity += (frame.severity || 0);
      currentSegment.sumY += frame.Y;
      currentSegment.sumR += frame.R;
      currentSegment.sumG += frame.G;
      currentSegment.sumB += frame.B;
      currentSegment.frameCount += 1;
    } else {
      // Finalize current segment
      segments.push(finalizeSegment(currentSegment));

      // Start new segment
      currentSegment = {
        start: frameTime,
        end: frameTime + sampleStep,
        issueType: frame.issueType,
        label: frame.label,
        maxSeverity: frame.severity || 0,
        sumSeverity: frame.severity || 0,
        sumY: frame.Y,
        sumR: frame.R,
        sumG: frame.G,
        sumB: frame.B,
        frameCount: 1
      };
    }
  }

  if (currentSegment) {
    segments.push(finalizeSegment(currentSegment));
  }

  return segments;
}

function finalizeSegment(raw) {
  const count = raw.frameCount || 1;
  const duration = Number((raw.end - raw.start).toFixed(2));
  return {
    start: Number(raw.start.toFixed(2)),
    end: Number(raw.end.toFixed(2)),
    duration,
    issueType: raw.issueType,
    label: raw.label,
    severity: Number((raw.sumSeverity / count).toFixed(2)),
    maxSeverity: Number(raw.maxSeverity.toFixed(2)),
    avgY: Number((raw.sumY / count).toFixed(1)),
    avgR: Number((raw.sumR / count).toFixed(1)),
    avgG: Number((raw.sumG / count).toFixed(1)),
    avgB: Number((raw.sumB / count).toFixed(1)),
    frameCount: count
  };
}

/**
 * Calculates summary statistics for the whole clip.
 * @param {Array<Object>} segments
 * @param {number} totalDuration
 */
export function calculateClipStats(segments, totalDuration) {
  const stats = {
    totalDuration: totalDuration || 0,
    normalDuration: 0,
    overexposedDuration: 0,
    underexposedDuration: 0,
    coolCastDuration: 0,
    warmCastDuration: 0,
    otherCastDuration: 0,
    issuePercentage: 0,
    dominantIssue: 'none'
  };

  if (!segments || segments.length === 0) return stats;

  let totalIssuesDuration = 0;
  const issueTotals = {};

  for (const seg of segments) {
    if (seg.issueType === 'normal') {
      stats.normalDuration += seg.duration;
    } else {
      totalIssuesDuration += seg.duration;
      issueTotals[seg.issueType] = (issueTotals[seg.issueType] || 0) + seg.duration;

      if (seg.issueType === 'overexposed') stats.overexposedDuration += seg.duration;
      else if (seg.issueType === 'underexposed') stats.underexposedDuration += seg.duration;
      else if (seg.issueType === 'cool_cast') stats.coolCastDuration += seg.duration;
      else if (seg.issueType === 'warm_cast') stats.warmCastDuration += seg.duration;
      else stats.otherCastDuration += seg.duration;
    }
  }

  const effectiveDuration = totalDuration > 0 ? totalDuration : (stats.normalDuration + totalIssuesDuration);
  if (effectiveDuration > 0) {
    stats.issuePercentage = Number(((totalIssuesDuration / effectiveDuration) * 100).toFixed(1));
  }

  // Find dominant issue
  let maxDuration = 0;
  for (const [issue, dur] of Object.entries(issueTotals)) {
    if (dur > maxDuration) {
      maxDuration = dur;
      stats.dominantIssue = issue;
    }
  }

  return stats;
}
