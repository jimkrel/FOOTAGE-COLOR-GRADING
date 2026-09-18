import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Domain Hook: usePlayer
 * Exclusively manages HTML5 video playback, seeking, keyboard shortcuts, and codec errors.
 */
export function usePlayer({ selectedClip } = {}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerError, setPlayerError] = useState(null);
  const videoRef = useRef(null);

  // Reset states when clip changes
  useEffect(() => {
    setCurrentTime(0);
    setIsPlaying(false);
    setPlayerError(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
  }, [selectedClip?.filePath]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(err => {
        console.warn('[usePlayer] Video play failed:', err);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, []);

  // Seek to specific timestamp
  const seek = useCallback((timeInSeconds) => {
    const time = Math.max(0, timeInSeconds || 0);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);

  // Toggle audio mute
  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  }, []);

  // Handle native HTML5 video errors (unsupported codec, file corrupt)
  const handleVideoError = useCallback((e) => {
    const mediaError = e?.target?.error;
    let message = 'Không thể phát file video này.';
    if (mediaError) {
      if (mediaError.code === 3) message = 'Lỗi decode video (Codec có thể không được hỗ trợ bởi trình phát HTML5).';
      else if (mediaError.code === 4) message = 'Định dạng hoặc codec video không được trình duyệt hỗ trợ.';
      else if (mediaError.code === 2) message = 'Lỗi kết nối tải media.';
    }
    setPlayerError(message);
    setIsPlaying(false);
  }, []);

  // Global keyboard shortcuts (Space, ArrowLeft, ArrowRight)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (videoRef.current) {
          seek(Math.max(0, videoRef.current.currentTime - 1));
        }
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (videoRef.current) {
          const maxDur = videoRef.current.duration || selectedClip?.duration || 0;
          seek(Math.min(maxDur, videoRef.current.currentTime + 1));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, seek, selectedClip?.duration]);

  return {
    videoRef,
    isPlaying,
    isMuted,
    currentTime,
    setCurrentTime,
    playerError,
    togglePlay,
    seek,
    toggleMute,
    handleVideoError
  };
}
