/**
 * Tag generation logic based on analysis segments and clip statistics.
 * Standard tags: 'clean', 'overexposed', 'underexposed', 'cool-cast', 'warm-cast', 'magenta-cast', 'green-cast'
 */

// Issue type to standardized tag name mapping
export const ISSUE_TO_TAG_MAP = {
  overexposed: 'overexposed',
  underexposed: 'underexposed',
  cool_cast: 'cool-cast',
  warm_cast: 'warm-cast',
  magenta_cast: 'magenta-cast',
  green_cast: 'green-cast'
};

/**
 * Automatically derives library tags from video segments.
 * Logic:
 * - Clips with no issues (or issuePercentage == 0) are tagged 'clean'.
 * - Any detected issue segment with duration >= 0.5s adds its corresponding issue tag.
 * - If only minor transient issues (<0.5s) exist and issuePercentage < 3%, also tagged 'clean'.
 *
 * @param {Array<Object>} segments - Array of timeline segments
 * @param {Object} [stats] - Overall clip stats
 * @returns {Array<string>} Array of unique tag strings
 */
export function generateTagsFromSegments(segments = [], stats = {}) {
  const tags = new Set();

  if (!segments || segments.length === 0) {
    tags.add('clean');
    return Array.from(tags);
  }

  let totalIssueDuration = 0;
  const issueDurationMap = {};

  for (const seg of segments) {
    if (seg.issueType && seg.issueType !== 'normal') {
      const mapped = ISSUE_TO_TAG_MAP[seg.issueType];
      if (mapped) {
        const dur = seg.duration || (seg.end - seg.start) || 1;
        issueDurationMap[mapped] = (issueDurationMap[mapped] || 0) + dur;
        totalIssueDuration += dur;
      }
    }
  }

  // Add tags for issues that meet the significance threshold (at least 0.5s of footage)
  for (const [tag, duration] of Object.entries(issueDurationMap)) {
    if (duration >= 0.5) {
      tags.add(tag);
    }
  }

  // If no significant issue tags were added or overall issuePercentage is near zero, tag as clean
  const issuePercentage = stats?.issuePercentage ?? 0;
  if (tags.size === 0 || (totalIssueDuration < 1 && issuePercentage < 3)) {
    tags.add('clean');
  }

  return Array.from(tags);
}
