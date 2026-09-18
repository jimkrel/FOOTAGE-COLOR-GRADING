import { useState, useMemo, useCallback } from 'react';

/**
 * Domain Hook: useTags
 * Exclusively manages tag selection, tag usage counts, and clip filtering by tags and issues.
 */
export function useTags(clips = []) {
  const [selectedTag, setSelectedTag] = useState('all');
  const [filterIssue, setFilterIssue] = useState('all');

  // Compute available tags and frequencies across all clips
  const availableTags = useMemo(() => {
    const counts = {};
    for (const clip of clips) {
      if (clip.tags && Array.isArray(clip.tags)) {
        for (const tag of clip.tags) {
          counts[tag] = (counts[tag] || 0) + 1;
        }
      }
    }
    return counts;
  }, [clips]);

  // Filter clips based on active tag and issue criteria
  const filteredClips = useMemo(() => {
    return clips.filter(clip => {
      // 1. Tag filtering
      if (selectedTag !== 'all') {
        if (!clip.tags || !clip.tags.includes(selectedTag)) {
          return false;
        }
      }

      // 2. Issue type filtering
      if (filterIssue === 'all') return true;
      if (filterIssue === 'unanalyzed') return !clip.isAnalyzed;
      if (!clip.isAnalyzed || !clip.segments) return false;
      return clip.segments.some(seg => seg.issueType === filterIssue);
    });
  }, [clips, selectedTag, filterIssue]);

  return {
    selectedTag,
    setSelectedTag,
    filterIssue,
    setFilterIssue,
    availableTags,
    filteredClips
  };
}
