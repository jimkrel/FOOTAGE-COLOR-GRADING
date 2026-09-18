import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_THRESHOLDS } from '../../analysis-engine/thresholdConfig.js';

/**
 * Domain Hook: useClipCache
 * Exclusively manages cached analysis records and persistent app settings in SQLite.
 */
export function useClipCache() {
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS);
  const [activePreset, setActivePreset] = useState('standard');
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

  // Load persistent settings on mount
  useEffect(() => {
    if (!isElectron) {
      setIsSettingsLoaded(true);
      return;
    }

    async function fetchSettings() {
      try {
        const savedThresholds = await window.electronAPI.getSetting('thresholds', null);
        const savedPreset = await window.electronAPI.getSetting('activePreset', null);

        if (savedThresholds) {
          setThresholds(savedThresholds);
        }
        if (savedPreset) {
          setActivePreset(savedPreset);
        }
      } catch (err) {
        console.error('[useClipCache] Error loading settings:', err);
      } finally {
        setIsSettingsLoaded(true);
      }
    }

    fetchSettings();
  }, [isElectron]);

  // Update and persist thresholds
  const updateThresholds = useCallback(async (newThresholds) => {
    setThresholds(newThresholds);
    if (isElectron) {
      try {
        await window.electronAPI.setSetting('thresholds', newThresholds);
      } catch (err) {
        console.error('[useClipCache] Error persisting thresholds:', err);
      }
    }
  }, [isElectron]);

  // Update and persist active preset
  const updatePreset = useCallback(async (newPreset) => {
    setActivePreset(newPreset);
    if (isElectron) {
      try {
        await window.electronAPI.setSetting('activePreset', newPreset);
      } catch (err) {
        console.error('[useClipCache] Error persisting preset:', err);
      }
    }
  }, [isElectron]);

  return {
    thresholds,
    updateThresholds,
    activePreset,
    updatePreset,
    isSettingsLoaded
  };
}
