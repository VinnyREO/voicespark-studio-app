# State Management Guide

## Overview

VoiceSpark Studio uses **custom React hooks** for state management instead of Redux, Zustand, or Context API. Each feature manages its own state independently.

## Video Editor State (useVideoEditor hook)

**Location**: `src/hooks/useVideoEditor.ts` (575 lines)

### EditorState Interface

```typescript
interface EditorState {
  assets: MediaAsset[];         // Uploaded media files
  clips: TimelineClip[];         // Clips on timeline
  playheadPosition: number;      // Current time in seconds
  isPlaying: boolean;            // Playback state
  selectedClipIds: string[];     // Currently selected clips
  zoomLevel: number;             // Timeline zoom (px per second)
  aspectRatio: AspectRatio;      // Video aspect ratio
  volume: number;                // Global volume (0-1)
  duration: number;              // Total timeline duration
  trackSettings: Record<number, TrackSettings>; // Per-track settings
}
```

### State Management Pattern

```typescript
// Single source of truth
const [state, setState] = useState<EditorState>(INITIAL_STATE);

// History for undo/redo
const [history, setHistory] = useState<EditorState[]>([INITIAL_STATE]);
const [historyIndex, setHistoryIndex] = useState(0);

// Update state and add to history
const updateState = (newState: EditorState) => {
  setState(newState);
  setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
  setHistoryIndex(prev => prev + 1);
};
```

### Key Methods

```typescript
// Assets
addAsset(asset: MediaAsset): void
removeAsset(assetId: string): void
getAsset(assetId: string): MediaAsset | undefined

// Clips
addClip(clip: Omit<TimelineClip, 'id'>): string
removeClip(clipId: string): void
updateClip(clipId: string, updates: Partial<TimelineClip>): void
updateMultipleClips(clipIds: string[], getUpdates: (clip) => Partial<TimelineClip>): void

// Selection
selectClip(clipId: string, multiSelect?: boolean): void
deselectAll(): void
deleteSelected(): void

// Playback
setPlayheadPosition(position: number): void
play(): void
pause(): void
togglePlayPause(): void

// Undo/Redo
undo(): void
redo(): void
canUndo: boolean
canRedo: boolean
```

### Undo/Redo Implementation

```typescript
// Store entire state snapshots
const [history, setHistory] = useState<EditorState[]>([INITIAL_STATE]);
const [historyIndex, setHistoryIndex] = useState(0);

// Add to history on any state change
const addToHistory = (newState: EditorState) => {
  // Truncate future history
  const newHistory = history.slice(0, historyIndex + 1);
  setHistory([...newHistory, newState]);
  setHistoryIndex(prev => prev + 1);
};

// Undo: go back in history
const undo = () => {
  if (historyIndex > 0) {
    setHistoryIndex(prev => prev - 1);
    setState(history[historyIndex - 1]);
  }
};

// Redo: go forward in history
const redo = () => {
  if (historyIndex < history.length - 1) {
    setHistoryIndex(prev => prev + 1);
    setState(history[historyIndex + 1]);
  }
};
```

### Playback Animation

```typescript
// Use requestAnimationFrame for smooth playback
useEffect(() => {
  if (state.isPlaying) {
    const startTime = performance.now();
    const startPosition = state.playheadPosition;

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const newPosition = startPosition + elapsed;

      if (newPosition >= state.duration) {
        pause();
        setPlayheadPosition(state.duration);
      } else {
        setPlayheadPosition(newPosition);
        playbackInterval.current = requestAnimationFrame(animate);
      }
    };

    playbackInterval.current = requestAnimationFrame(animate);

    return () => {
      if (playbackInterval.current) {
        cancelAnimationFrame(playbackInterval.current);
      }
    };
  }
}, [state.isPlaying]);
```

### Track Settings

```typescript
// Per-track settings (volume, speed, visibility, mute)
trackSettings: Record<number, {
  volume: number;    // 0-1
  speed: number;     // 0.25-4
  visible: boolean;  // Show/hide track
  muted: boolean;    // Mute audio
}>

// Set track settings
setTrackVolume(trackIndex: number, volume: number): void
setTrackSpeed(trackIndex: number, speed: number): void
setTrackVisible(trackIndex: number, visible: boolean): void
setTrackMuted(trackIndex: number, muted: boolean): void
```

## Voice Generation State (useVoiceGeneration hook)

**Location**: `src/hooks/useVoiceGeneration.ts`

### State Structure

```typescript
const [isGenerating, setIsGenerating] = useState(false);
const [progress, setProgress] = useState('');
const [error, setError] = useState<string | null>(null);
const [audioUrl, setAudioUrl] = useState<string | null>(null);
const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
const [transcript, setTranscript] = useState('');
```

### Generation Flow

```typescript
const generate = async (script: string, voice: VoiceId, apiKey: string) => {
  setIsGenerating(true);
  setError(null);
  setProgress('Connecting to xAI...');

  try {
    setProgress('Generating voiceover...');
    const result = await generateVoiceover(apiKey, script, voice);

    if (result.success) {
      setAudioUrl(result.audioUrl);
      setAudioBlob(result.audioBlob);
      setProgress('Complete!');
    } else {
      setError(result.error);
    }
  } catch (err) {
    setError(err.message);
  } finally {
    setIsGenerating(false);
  }
};
```

### Cleanup

```typescript
const reset = () => {
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl); // Important: cleanup blob URLs
  }
  setAudioUrl(null);
  setAudioBlob(null);
  setError(null);
  setProgress('');
};
```

## Local State Patterns

### Component-Level State

```typescript
// Simple UI state in components
const [isOpen, setIsOpen] = useState(false);
const [selectedTab, setSelectedTab] = useState('media');
const [draggedAsset, setDraggedAsset] = useState<MediaAsset | null>(null);
```

### Derived State

```typescript
// Calculate from existing state, don't store
const visibleClips = useMemo(() => {
  return clips.filter(clip => {
    const trackSetting = trackSettings[clip.trackIndex];
    return !trackSetting || trackSetting.visible !== false;
  });
}, [clips, trackSettings]);
```

### Refs for Non-Reactive Values

```typescript
// Use refs for values that don't trigger re-renders
const playbackInterval = useRef<number | null>(null);
const clipboard = useRef<ClipboardData>({ clips: [] });
const canvasRef = useRef<HTMLCanvasElement>(null);
```

## State Persistence (useLocalStorage hook)

**Location**: `src/hooks/useLocalStorage.ts`

### Usage

```typescript
const [apiKey, setApiKey] = useLocalStorage<string | null>('xai-api-key', null);

// Automatically syncs to localStorage
setApiKey('new-key'); // Saved to localStorage['xai-api-key']
```

### Implementation

```typescript
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  // Update localStorage when value changes
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue] as const;
}
```

### Stored Values

- `xai-api-key`: xAI API key for voice generation

## State Updates Best Practices

### Immutable Updates

```typescript
// ❌ Bad: Mutating state
state.clips.push(newClip);

// ✅ Good: Creating new array
setState({
  ...state,
  clips: [...state.clips, newClip]
});
```

### Batch Updates

```typescript
// Multiple related updates in one setState
setState(prev => ({
  ...prev,
  clips: updatedClips,
  selectedClipIds: [],
  duration: calculateDuration(updatedClips)
}));
```

### Functional Updates

```typescript
// Use functional update when depending on previous state
setCount(prev => prev + 1);

// Not just
setCount(count + 1); // Can cause stale closure issues
```

## Performance Optimization

### useCallback for Event Handlers

```typescript
const handleClipUpdate = useCallback((clipId: string, updates: Partial<TimelineClip>) => {
  editor.updateClip(clipId, updates);
}, [editor.updateClip]); // Only recreate if updateClip changes
```

### useMemo for Expensive Computations

```typescript
const clipWidth = useMemo(() => {
  return clip.duration * zoomLevel;
}, [clip.duration, zoomLevel]);
```

### React.memo for Pure Components

```typescript
// Only re-render if props change
export const TimelineClip = React.memo(({ clip, asset, ... }) => {
  // Component implementation
});
```

## State Debugging

### Console Logging

```typescript
// Add logging in development
const updateClip = (clipId: string, updates: Partial<TimelineClip>) => {
  console.log('[VideoEditor] Updating clip:', clipId, updates);
  setState(prev => ({
    ...prev,
    clips: prev.clips.map(c => c.id === clipId ? { ...c, ...updates } : c)
  }));
};
```

### React DevTools

- Install React DevTools browser extension
- Inspect component state and props
- Track state changes over time
- Profile component renders

### History Inspection

```typescript
// Log history for debugging undo/redo
console.log('History:', history);
console.log('Current index:', historyIndex);
console.log('Can undo:', historyIndex > 0);
console.log('Can redo:', historyIndex < history.length - 1);
```

## Common Patterns

### Loading State

```typescript
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState(null);
const [error, setError] = useState(null);

const fetchData = async () => {
  setIsLoading(true);
  setError(null);

  try {
    const result = await api.fetch();
    setData(result);
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### Toggle State

```typescript
const [isOpen, setIsOpen] = useState(false);
const toggle = () => setIsOpen(prev => !prev);
```

### Form State

```typescript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  message: ''
});

const handleChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }));
};
```
