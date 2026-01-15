import { useState, useCallback, useRef, useEffect } from 'react';
import {
  MediaAsset,
  TimelineClip,
  EditorState,
  AspectRatio,
  ClipboardData,
} from '@/types/video-editor';

const INITIAL_STATE: EditorState = {
  assets: [],
  clips: [],
  playheadPosition: 0,
  isPlaying: false,
  selectedClipIds: [],
  zoomLevel: 50, // pixels per second
  aspectRatio: '16:9',
  volume: 1,
  duration: 0,
  trackSettings: {},
  seekVersion: 0, // Increments on explicit user seeks to trigger media sync
};

interface UseVideoEditorResult {
  // State
  state: EditorState;

  // Assets
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (assetId: string) => void;
  getAsset: (assetId: string) => MediaAsset | undefined;

  // Clips
  addClip: (clip: Omit<TimelineClip, 'id'>) => string;
  removeClip: (clipId: string) => void;
  updateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  updateMultipleClips: (clipIds: string[], getUpdates: (clip: TimelineClip) => Partial<TimelineClip>) => void;
  getClip: (clipId: string) => TimelineClip | undefined;
  getClipsAtTime: (time: number) => TimelineClip[];

  // Selection
  selectClip: (clipId: string, multiSelect?: boolean) => void;
  deselectAll: () => void;
  deleteSelected: () => void;

  // Playback
  setPlayheadPosition: (position: number) => void;
  seekTo: (position: number) => void; // Explicit seek that resets playback timing
  play: () => void;
  pause: () => void;
  togglePlayPause: () => void;
  seekToStart: () => void;
  seekToEnd: () => void;

  // Timeline
  setZoomLevel: (level: number) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setVolume: (volume: number) => void;

  // Track settings
  setTrackVolume: (trackIndex: number, volume: number) => void;
  setTrackSpeed: (trackIndex: number, speed: number) => void;
  setTrackVisible: (trackIndex: number, visible: boolean) => void;
  setTrackMuted: (trackIndex: number, muted: boolean) => void;
  getTrackSettings: (trackIndex: number) => { volume: number; speed: number; visible: boolean; muted: boolean };

  // Clipboard
  copySelected: () => void;
  paste: () => void;
  splitClipAtPlayhead: () => void;
  duplicateClip: (clipId: string) => void;
  splitAudioFromVideo: (clipId: string) => void;

  // Undo/Redo
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Project management
  loadState: (newState: EditorState) => void;
  replaceAssets: (assets: MediaAsset[]) => void;
  getCurrentState: () => EditorState;
}

export function useVideoEditor(): UseVideoEditorResult {
  const [state, setState] = useState<EditorState>(INITIAL_STATE);
  const [history, setHistory] = useState<EditorState[]>([INITIAL_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const clipboard = useRef<ClipboardData>({ clips: [] });
  const playbackInterval = useRef<number | null>(null);

  // Generate unique ID
  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Add to history for undo/redo
  const addToHistory = useCallback((newState: EditorState) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, newState];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Update duration based on clips
  const calculateDuration = useCallback((clips: TimelineClip[]): number => {
    if (clips.length === 0) return 0;
    return Math.max(...clips.map(clip => clip.startTime + clip.duration));
  }, []);

  // Assets
  const addAsset = useCallback((asset: MediaAsset) => {
    setState(prev => {
      const newState = {
        ...prev,
        assets: [...prev.assets, asset],
      };
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  const removeAsset = useCallback((assetId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        assets: prev.assets.filter(a => a.id !== assetId),
        clips: prev.clips.filter(c => c.assetId !== assetId),
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const getAsset = useCallback((assetId: string) => {
    return state.assets.find(a => a.id === assetId);
  }, [state.assets]);

  // Clips
  const addClip = useCallback((clip: Omit<TimelineClip, 'id'>): string => {
    const id = generateId();
    const newClip: TimelineClip = { ...clip, id };

    setState(prev => {
      const newState = {
        ...prev,
        clips: [...prev.clips, newClip],
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });

    return id;
  }, [addToHistory, calculateDuration]);

  const removeClip = useCallback((clipId: string) => {
    setState(prev => {
      const newState = {
        ...prev,
        clips: prev.clips.filter(c => c.id !== clipId),
        selectedClipIds: prev.selectedClipIds.filter(id => id !== clipId),
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const updateClip = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
    setState(prev => {
      const newState = {
        ...prev,
        clips: prev.clips.map(c => c.id === clipId ? { ...c, ...updates } : c),
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const updateMultipleClips = useCallback((clipIds: string[], getUpdates: (clip: TimelineClip) => Partial<TimelineClip>) => {
    setState(prev => {
      const newState = {
        ...prev,
        clips: prev.clips.map(c => {
          if (clipIds.includes(c.id)) {
            const updates = getUpdates(c);
            return { ...c, ...updates };
          }
          return c;
        }),
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const getClip = useCallback((clipId: string) => {
    return state.clips.find(c => c.id === clipId);
  }, [state.clips]);

  const getClipsAtTime = useCallback((time: number) => {
    return state.clips.filter(clip =>
      time >= clip.startTime && time < clip.startTime + clip.duration
    );
  }, [state.clips]);

  // Selection
  const selectClip = useCallback((clipId: string, multiSelect = false) => {
    setState(prev => ({
      ...prev,
      selectedClipIds: multiSelect
        ? prev.selectedClipIds.includes(clipId)
          ? prev.selectedClipIds.filter(id => id !== clipId)
          : [...prev.selectedClipIds, clipId]
        : [clipId],
    }));
  }, []);

  const deselectAll = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedClipIds: [],
    }));
  }, []);

  const deleteSelected = useCallback(() => {
    setState(prev => {
      const newState = {
        ...prev,
        clips: prev.clips.filter(c => !prev.selectedClipIds.includes(c.id)),
        selectedClipIds: [],
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  // Track the playback start state to avoid restarting on every position change
  const playbackStartRef = useRef<{ startTime: number; startPosition: number; version: number } | null>(null);
  const seekVersionRef = useRef(0); // Track seek version to detect user intervention

  // Playback
  const setPlayheadPosition = useCallback((position: number) => {
    setState(prev => ({
      ...prev,
      playheadPosition: Math.max(0, Math.min(position, prev.duration)),
    }));
  }, []);

  // Seek to a specific position (resets playback timing if playing)
  // Use this when user explicitly seeks (clicking timeline, dragging playhead)
  const seekTo = useCallback((position: number) => {
    // Increment version to signal a new seek operation
    seekVersionRef.current += 1;
    const currentVersion = seekVersionRef.current;

    // Reset playback reference to start from new position with current version
    playbackStartRef.current = {
      startTime: performance.now(),
      startPosition: Math.max(0, position),
      version: currentVersion,
    };
    setState(prev => ({
      ...prev,
      playheadPosition: Math.max(0, Math.min(position, prev.duration)),
      seekVersion: (prev.seekVersion ?? 0) + 1, // Signal explicit seek to PreviewCanvas
    }));
  }, []);

  const play = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: true }));
  }, []);

  const pause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const togglePlayPause = useCallback(() => {
    setState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const seekToStart = useCallback(() => {
    setPlayheadPosition(0);
  }, [setPlayheadPosition]);

  const seekToEnd = useCallback(() => {
    setPlayheadPosition(state.duration);
  }, [setPlayheadPosition, state.duration]);

  // Handle playback animation - ONLY restart when isPlaying changes, not on every position update
  useEffect(() => {
    if (state.isPlaying) {
      // Only capture start state when playback begins, not on every render
      if (!playbackStartRef.current) {
        seekVersionRef.current += 1;
        playbackStartRef.current = {
          startTime: performance.now(),
          startPosition: state.playheadPosition,
          version: seekVersionRef.current,
        };
      }

      const animate = () => {
        // Re-read from ref on EVERY frame to pick up seek changes
        const ref = playbackStartRef.current;
        if (!ref) return;

        const { startTime, startPosition, version } = ref;

        // Check if a seek happened since we started this animation frame
        // If the version changed, another seekTo() was called - skip this frame
        if (version !== seekVersionRef.current) {
          // A new seek happened - reschedule and let the next frame use updated values
          playbackInterval.current = requestAnimationFrame(animate);
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;
        const newPosition = startPosition + elapsed;

        if (newPosition >= state.duration) {
          pause();
          setPlayheadPosition(state.duration);
          playbackStartRef.current = null;
        } else {
          setPlayheadPosition(newPosition);
          playbackInterval.current = requestAnimationFrame(animate);
        }
      };

      playbackInterval.current = requestAnimationFrame(animate);

      return () => {
        if (playbackInterval.current !== null) {
          cancelAnimationFrame(playbackInterval.current);
        }
      };
    } else {
      // Clear the ref when paused
      playbackStartRef.current = null;
    }
  }, [state.isPlaying, state.duration, pause, setPlayheadPosition]); // REMOVED state.playheadPosition dependency

  // Timeline
  // Zoom levels: pixels per second
  // At 0.1: ~2.8 hours visible in 1000px viewport
  // At 1: ~16 minutes visible
  // At 10: ~1.6 minutes visible
  // At 50: ~20 seconds visible
  const setZoomLevel = useCallback((level: number) => {
    setState(prev => ({
      ...prev,
      zoomLevel: Math.max(0.1, Math.min(level, 200)), // Allow extreme zoom out (0.1 = see hours)
    }));
  }, []);

  const setAspectRatio = useCallback((ratio: AspectRatio) => {
    setState(prev => ({
      ...prev,
      aspectRatio: ratio,
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({
      ...prev,
      volume: Math.max(0, Math.min(volume, 1)),
    }));
  }, []);

  // Track settings
  const setTrackVolume = useCallback((trackIndex: number, volume: number) => {
    setState(prev => ({
      ...prev,
      trackSettings: {
        ...prev.trackSettings,
        [trackIndex]: {
          ...(prev.trackSettings[trackIndex] || { volume: 1, speed: 1, visible: true, muted: false }),
          volume: Math.max(0, Math.min(volume, 1)),
        },
      },
    }));
  }, []);

  const setTrackSpeed = useCallback((trackIndex: number, speed: number) => {
    setState(prev => ({
      ...prev,
      trackSettings: {
        ...prev.trackSettings,
        [trackIndex]: {
          ...(prev.trackSettings[trackIndex] || { volume: 1, speed: 1, visible: true, muted: false }),
          speed: Math.max(0.25, Math.min(speed, 4)),
        },
      },
    }));
  }, []);

  const setTrackVisible = useCallback((trackIndex: number, visible: boolean) => {
    setState(prev => ({
      ...prev,
      trackSettings: {
        ...prev.trackSettings,
        [trackIndex]: {
          ...(prev.trackSettings[trackIndex] || { volume: 1, speed: 1, visible: true, muted: false }),
          visible,
        },
      },
    }));
  }, []);

  const setTrackMuted = useCallback((trackIndex: number, muted: boolean) => {
    setState(prev => ({
      ...prev,
      trackSettings: {
        ...prev.trackSettings,
        [trackIndex]: {
          ...(prev.trackSettings[trackIndex] || { volume: 1, speed: 1, visible: true, muted: false }),
          muted,
        },
      },
    }));
  }, []);

  const getTrackSettings = useCallback((trackIndex: number) => {
    return state.trackSettings[trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
  }, [state.trackSettings]);

  // Clipboard
  const copySelected = useCallback(() => {
    const selectedClips = state.clips.filter(c =>
      state.selectedClipIds.includes(c.id)
    );
    clipboard.current = { clips: selectedClips };
  }, [state.clips, state.selectedClipIds]);

  const paste = useCallback(() => {
    if (clipboard.current.clips.length === 0) return;

    setState(prev => {
      const newClips = clipboard.current.clips.map(clip => ({
        ...clip,
        id: generateId(),
        startTime: prev.playheadPosition,
      }));

      const newState = {
        ...prev,
        clips: [...prev.clips, ...newClips],
        selectedClipIds: newClips.map(c => c.id),
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const splitClipAtPlayhead = useCallback(() => {
    setState(prev => {
      const playhead = prev.playheadPosition;

      // Find clips at playhead position
      const clipsAtPlayhead = prev.clips.filter(clip =>
        playhead >= clip.startTime &&
        playhead < clip.startTime + clip.duration
      );

      if (clipsAtPlayhead.length === 0) {
        return prev; // No clips to split
      }

      // If there are selected clips, only split those that are both selected AND at playhead
      // Otherwise, split all clips at playhead (legacy behavior)
      const clipsToSplit = prev.selectedClipIds.length > 0
        ? clipsAtPlayhead.filter(clip => prev.selectedClipIds.includes(clip.id))
        : clipsAtPlayhead;

      if (clipsToSplit.length === 0) {
        return prev; // No selected clips at playhead to split
      }

      let newClips = [...prev.clips];
      const newRightClipIds: string[] = []; // Track IDs of newly created right-side clips

      clipsToSplit.forEach(clip => {
        const clipEndTime = clip.startTime + clip.duration;

        // Only split if playhead is actually within the clip (not at edges)
        if (playhead > clip.startTime && playhead < clipEndTime) {
          // Remove original clip
          newClips = newClips.filter(c => c.id !== clip.id);

          // Create left part
          const leftDuration = playhead - clip.startTime;
          newClips.push({
            ...clip,
            id: generateId(),
            duration: leftDuration,
          });

          // Create right part
          const rightDuration = clip.duration - leftDuration;
          const rightClipId = generateId();
          newRightClipIds.push(rightClipId);
          newClips.push({
            ...clip,
            id: rightClipId,
            startTime: playhead,
            duration: rightDuration,
            trimStart: clip.trimStart + leftDuration,
          });
        }
      });

      const newState = {
        ...prev,
        clips: newClips,
        // Select the right-side clips after split for easy manipulation
        selectedClipIds: newRightClipIds.length > 0 ? newRightClipIds : prev.selectedClipIds,
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const duplicateClip = useCallback((clipId: string) => {
    setState(prev => {
      const clip = prev.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      // Create duplicate slightly offset to the right
      const newClip: TimelineClip = {
        ...clip,
        id: generateId(),
        startTime: clip.startTime + clip.duration,
      };

      const newState = {
        ...prev,
        clips: [...prev.clips, newClip],
        selectedClipIds: [newClip.id],
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  const splitAudioFromVideo = useCallback((clipId: string) => {
    setState(prev => {
      const clip = prev.clips.find(c => c.id === clipId);
      if (!clip) return prev;

      const videoAsset = prev.assets.find(a => a.id === clip.assetId);
      if (!videoAsset || videoAsset.type !== 'video') return prev;

      // Create a new audio asset from the video
      const audioAsset: MediaAsset = {
        id: generateId(),
        type: 'audio',
        name: `${videoAsset.name} (Audio)`,
        src: videoAsset.src, // Same source, but will be rendered as audio-only
        duration: videoAsset.duration,
        file: videoAsset.file,
      };

      // Create a new audio-only clip on the track below
      const audioClip: TimelineClip = {
        ...clip,
        id: generateId(),
        assetId: audioAsset.id, // Reference the new audio asset
        trackIndex: clip.trackIndex + 1,
      };

      // Mute the original video clip
      const updatedClips = prev.clips.map(c =>
        c.id === clipId ? { ...c, volume: 0 } : c
      );

      const newState = {
        ...prev,
        assets: [...prev.assets, audioAsset], // Add the new audio asset
        clips: [...updatedClips, audioClip],
        selectedClipIds: [audioClip.id],
      };
      newState.duration = calculateDuration(newState.clips);
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory, calculateDuration]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setState(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setState(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  // Load a complete state (for project loading)
  const loadState = useCallback((newState: EditorState) => {
    setState(newState);
    addToHistory(newState);
  }, [addToHistory]);

  // Replace assets (for project loading)
  const replaceAssets = useCallback((assets: MediaAsset[]) => {
    setState(prev => {
      const newState = { ...prev, assets };
      addToHistory(newState);
      return newState;
    });
  }, [addToHistory]);

  // Get current state (for project saving)
  const getCurrentState = useCallback(() => {
    return state;
  }, [state]);

  return {
    state,
    addAsset,
    removeAsset,
    getAsset,
    addClip,
    removeClip,
    updateClip,
    updateMultipleClips,
    getClip,
    getClipsAtTime,
    selectClip,
    deselectAll,
    deleteSelected,
    setPlayheadPosition,
    seekTo,
    play,
    pause,
    togglePlayPause,
    seekToStart,
    seekToEnd,
    setZoomLevel,
    setAspectRatio,
    setVolume,
    setTrackVolume,
    setTrackSpeed,
    setTrackVisible,
    setTrackMuted,
    getTrackSettings,
    copySelected,
    paste,
    splitClipAtPlayhead,
    duplicateClip,
    splitAudioFromVideo,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    loadState,
    replaceAssets,
    getCurrentState,
  };
}
