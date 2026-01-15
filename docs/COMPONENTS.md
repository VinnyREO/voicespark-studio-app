# Component Architecture

## Component Hierarchy

```
App.tsx
├── Header
│   ├── APIKeyInput
│   └── Navigation (VoiceForge / VideoForge tabs)
│
├── VoiceForge (Route: /voiceforge)
│   ├── ScriptEditor
│   │   └── StyleTagBar
│   ├── VoiceSelector
│   │   └── VoiceCard (multiple)
│   ├── SettingsPanel
│   ├── GenerateButton
│   └── AudioPlayer
│       └── Waveform
│
├── VideoForge (Route: /videoforge)
│   ├── ToolPanel
│   │   ├── Media Upload
│   │   ├── MediaPanel (asset thumbnails)
│   │   ├── Aspect Ratio Selector
│   │   ├── Volume Control
│   │   └── Zoom Control
│   ├── PreviewCanvas
│   │   └── HTML5 Video/Audio Elements (rendered)
│   └── Timeline
│       ├── Toolbar
│       │   ├── Undo/Redo buttons
│       │   ├── Split/Delete buttons
│       │   └── Snap toggle
│       ├── TransportControls
│       │   ├── Play/Pause
│       │   ├── Seek to Start/End
│       │   └── Volume slider
│       ├── Playhead (vertical line)
│       ├── TimelineTrack (multiple)
│       │   ├── Track header (mute, solo, volume)
│       │   └── TimelineClip (multiple)
│       │       ├── Clip body (draggable)
│       │       ├── Resize handles (left/right)
│       │       └── ClipContextMenu (right-click)
│       └── TrackContextMenu (right-click on track)
│
└── ExportDialog (modal)
    ├── Quality Presets (480p, 720p, 1080p, 4K)
    ├── Format Selector (MP4, WebM, MOV)
    ├── Export Info (duration, clips, file size estimate)
    ├── Quick Export Button
    └── Advanced Export Button
```

## Video Editor Components (VideoForge)

### VideoForge.tsx (Main Page)
**Location**: `src/pages/VideoForge.tsx` (540 lines)

**Purpose**: Main video editor page, orchestrates all video editing components

**State Management**:
- Uses `useVideoEditor()` hook for core state
- Local UI state (drag state, panel sizes, etc.)
- Keyboard shortcuts via `useKeyboardShortcuts()`

**Key Features**:
- File upload and processing
- Drag & drop from desktop
- Panel resizing (media panel, timeline)
- Global drag overlay
- Theme-specific styling (purple theme)

**Props**: None (root page component)

**Key Methods**:
```typescript
processSingleFile(file: File): Promise<MediaAsset | null>
processFiles(files: FileList): Promise<void>
handleDropAsset(asset, trackIndex, timePosition): void
handleDropExternalFile(file, trackIndex, timePosition): void
handleAddToTimeline(asset): void
```

---

### ToolPanel.tsx
**Location**: `src/components/video-editor/ToolPanel.tsx`

**Purpose**: Left sidebar with media library and editor settings

**Props**:
```typescript
interface ToolPanelProps {
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onRemoveAsset: (assetId: string) => void;
  onDragStart: (asset: MediaAsset) => void;
  onAddToTimeline: (asset: MediaAsset) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;
  onClose?: () => void; // Close button callback
}
```

**Features**:
- File upload button
- Media library grid (thumbnails)
- Drag to timeline or quick-add button
- Aspect ratio selector (16:9, 9:16, 1:1)
- Global volume control
- Zoom level slider
- Close button (collapses panel)

**Layout**:
- Scrollable media grid
- Fixed controls at bottom
- Resizable via drag handle

---

### PreviewCanvas.tsx
**Location**: `src/components/video-editor/PreviewCanvas.tsx`

**Purpose**: Real-time video preview with playback

**Props**:
```typescript
interface PreviewCanvasProps {
  clips: TimelineClip[];
  assets: MediaAsset[];
  playheadPosition: number;
  isPlaying: boolean;
  aspectRatio: AspectRatio;
  volume: number;
  trackSettings: Record<number, TrackSettings>;
  onDropFile?: (file: File) => void;
}
```

**How it Works**:
1. Finds all visible clips at current playhead position
2. Renders video/audio/image elements with absolute positioning
3. Applies volume, trimming, and track settings
4. Centers content with black bars (letterboxing/pillarboxing)
5. Updates on playhead position change

**Performance**:
- Uses `useMemo` to cache visible clips
- Only renders clips within current time window
- Handles audio/video sync automatically

**Drop Zone**:
- Accepts file drops
- Adds file to timeline at playhead position

---

### Timeline.tsx
**Location**: `src/components/video-editor/Timeline.tsx`

**Purpose**: Container for timeline tracks, toolbar, and controls

**Props**:
```typescript
interface TimelineProps {
  clips: TimelineClip[];
  assets: MediaAsset[];
  selectedClipIds: string[];
  playheadPosition: number;
  duration: number;
  zoomLevel: number;
  aspectRatio: AspectRatio;
  snapEnabled: boolean;
  isPlaying: boolean;
  volume: number;
  trackSettings: Record<number, TrackSettings>;

  // Callbacks (20+ handlers)
  onSelectClip: (clipId: string, multiSelect?: boolean) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onSetPlayhead: (position: number) => void;
  // ... many more
}
```

**Layout**:
- Fixed toolbar at top
- Fixed transport controls at bottom
- Scrollable tracks in middle
- Playhead line overlays everything
- Time ruler at top

**Interactions**:
- Click timeline to move playhead
- Click background to deselect clips
- Drop assets from media panel
- Drop files from desktop

---

### TimelineTrack.tsx
**Location**: `src/components/video-editor/TimelineTrack.tsx`

**Purpose**: Individual track row with clips

**Props**:
```typescript
interface TimelineTrackProps {
  trackIndex: number;
  clips: TimelineClip[];
  assets: MediaAsset[];
  selectedClipIds: string[];
  zoomLevel: number;
  duration: number;
  trackSettings: TrackSettings;

  // Clip interactions
  onSelectClip: (clipId: string, multiSelect?: boolean) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onDropAsset: (asset: MediaAsset, trackIndex: number, time: number) => void;
  onDropExternalFile: (file: File, trackIndex: number, time: number) => void;

  // Track-level controls
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onMutedChange: (trackIndex: number, muted: boolean) => void;
  onVisibleChange: (trackIndex: number, visible: boolean) => void;
  onSpeedChange: (trackIndex: number, speed: number) => void;
}
```

**Features**:
- Track header with index label
- Track controls (volume, mute, visible, speed)
- Drop zone for assets and files
- Snap-to-grid support
- Horizontal scrolling

**Layout**:
- 80px track header (fixed left)
- Infinite timeline width (scrollable)
- 72px row height

---

### TimelineClip.tsx
**Location**: `src/components/video-editor/TimelineClip.tsx`

**Purpose**: Individual draggable/resizable clip

**Props**:
```typescript
interface TimelineClipProps {
  clip: TimelineClip;
  asset: MediaAsset;
  isSelected: boolean;
  zoomLevel: number;
  snapEnabled: boolean;

  onSelect: (clipId: string, multiSelect?: boolean) => void;
  onUpdate: (clipId: string, updates: Partial<TimelineClip>) => void;
  onContext: (clipId: string, event: React.MouseEvent) => void;
}
```

**Interactions**:
- Click to select (cmd+click for multi-select)
- Drag to move (with snap-to-grid)
- Drag edges to trim
- Right-click for context menu
- Visual feedback on hover/select

**Rendering**:
```typescript
// Width based on duration and zoom
const width = clip.duration * zoomLevel;

// Position based on start time and zoom
const left = clip.startTime * zoomLevel;
```

**Color Coding**:
- Video clips: Blue tint
- Audio clips: Green tint
- Image clips: Purple tint
- Selected: Yellow border

---

### Toolbar.tsx
**Location**: `src/components/video-editor/Toolbar.tsx`

**Purpose**: Top toolbar with editing actions

**Props**:
```typescript
interface ToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  selectedClipIds: string[];

  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onSplit: () => void;
  onToggleSnap: () => void;
}
```

**Buttons**:
- Undo (cmd+z)
- Redo (cmd+shift+z)
- Copy (cmd+c)
- Paste (cmd+v)
- Delete (delete key)
- Split at playhead (S)
- Snap to grid toggle
- Export button (opens ExportDialog)

**Layout**:
- Left-aligned editing buttons
- Right-aligned export button
- Tooltips on hover
- Disabled state when not applicable

---

### TransportControls.tsx
**Location**: `src/components/video-editor/TransportControls.tsx`

**Purpose**: Playback controls at bottom of timeline

**Props**:
```typescript
interface TransportControlsProps {
  isPlaying: boolean;
  playheadPosition: number;
  duration: number;
  volume: number;

  onPlayPause: () => void;
  onSeekToStart: () => void;
  onSeekToEnd: () => void;
  onVolumeChange: (volume: number) => void;
}
```

**Controls**:
- Play/Pause button (space)
- Seek to start (Home)
- Seek to end (End)
- Time display (current / duration)
- Volume slider (0-100%)

---

### ExportDialog.tsx
**Location**: `src/components/video-editor/ExportDialog.tsx`

**Purpose**: Export settings and progress modal

**Props**:
```typescript
interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: TimelineClip[];
  assets: MediaAsset[];
  aspectRatio: AspectRatio;
  duration: number;
  trackSettings: Record<number, TrackSettings>;
}
```

**Features**:
- Quality presets (Low 480p, Medium 720p, High 1080p, Ultra 4K)
- Format selector (MP4, WebM, MOV)
- File size estimate
- Two export options:
  - **Quick Export**: Downloads original file instantly
  - **Advanced Export**: FFmpeg.wasm re-encoding

**Export Flow**:
1. User selects quality and format
2. Clicks export button
3. Shows loading spinner and progress bar
4. On complete, auto-downloads file
5. Closes dialog after 2 seconds

**Error Handling**:
- Visible error banner with message
- "Dismiss" and "Try Again" buttons
- Suggests Quick Export if FFmpeg fails

---

### ClipContextMenu.tsx
**Location**: `src/components/video-editor/ClipContextMenu.tsx`

**Purpose**: Right-click menu for clips

**Props**:
```typescript
interface ClipContextMenuProps {
  clipId: string;
  assetType: MediaType;
  onDuplicate: (clipId: string) => void;
  onDelete: (clipId: string) => void;
  onSplit: () => void;
  onSplitAudio: (clipId: string) => void;
}
```

**Menu Items**:
- Duplicate Clip
- Split at Playhead (if playhead over clip)
- Split Audio from Video (video clips only)
- Delete Clip
- Keyboard shortcuts shown in menu

---

### TrackContextMenu.tsx
**Location**: `src/components/video-editor/TrackContextMenu.tsx`

**Purpose**: Right-click menu for tracks

**Props**:
```typescript
interface TrackContextMenuProps {
  trackIndex: number;
  trackSettings: TrackSettings;
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onMutedChange: (trackIndex: number, muted: boolean) => void;
  onVisibleChange: (trackIndex: number, visible: boolean) => void;
  onSpeedChange: (trackIndex: number, speed: number) => void;
}
```

**Menu Items**:
- Mute/Unmute Track
- Hide/Show Track
- Volume slider
- Speed slider (0.25x - 4x)

---

## Voice Components (VoiceForge)

### VoiceForge.tsx (Main Page)
**Location**: `src/pages/VoiceForge.tsx`

**Purpose**: Voice generation page

**State**:
```typescript
const [script, setScript] = useState(SAMPLE_SCRIPT);
const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Rex');
const [settings, setSettings] = useState({ speed: 1.0, format: 'wav' });
const { isGenerating, progress, error, audioUrl, audioBlob, generate, reset } = useVoiceGeneration();
```

**Layout**:
- Two-column layout (main + sidebar)
- Main: Script editor, generate button, audio player
- Sidebar: Voice selector, settings, API info

---

### ScriptEditor.tsx
**Location**: `src/components/ScriptEditor.tsx`

**Purpose**: Text input with style tag support

**Props**:
```typescript
interface ScriptEditorProps {
  script: string;
  onChange: (script: string) => void;
}
```

**Features**:
- Large textarea (12 rows)
- Syntax highlighting for style tags (visual only)
- Character/word count
- StyleTagBar below for quick insertion

---

### StyleTagBar.tsx
**Location**: `src/components/StyleTagBar.tsx`

**Purpose**: Quick insert buttons for voice style tags

**Tags Available**:
- `[whisper]...[/whisper]`
- `[excited]...[/excited]`
- `[serious]...[/serious]`
- `[slow]...[/slow]`
- `[fast]...[/fast]`
- `[pause:2s]`
- `[emphasis]...[/emphasis]`

**Interaction**:
- Click button to insert tag at cursor position
- Wrap selection if text is selected

---

### VoiceSelector.tsx
**Location**: `src/components/VoiceSelector.tsx`

**Purpose**: Voice picker with preview

**Props**:
```typescript
interface VoiceSelectorProps {
  selectedVoice: VoiceId;
  onSelectVoice: (voice: VoiceId) => void;
}
```

**Voices**:
- Rex (Male, confident)
- River (Female, warm)
- Ripley (Female, energetic)
- Echo (Male, deep)
- Nova (Female, professional)
- Sage (Male, wise)

**Layout**:
- Grid of VoiceCard components
- Selected voice has purple border
- Shows voice characteristics

---

### AudioPlayer.tsx
**Location**: `src/components/AudioPlayer.tsx`

**Purpose**: Audio playback with waveform

**Props**:
```typescript
interface AudioPlayerProps {
  audioUrl: string | null;
  onDownload: () => void;
  format: 'wav' | 'mp3';
}
```

**Features**:
- HTML5 audio element
- Waveform visualization
- Play/pause, seek, volume
- Download button
- Time display

---

## Shared Components

### Header.tsx
**Location**: `src/components/Header.tsx`

**Purpose**: Top navigation bar

**Props**:
```typescript
interface HeaderProps {
  apiKey: string | null;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
}
```

**Features**:
- Logo and title
- Navigation tabs (VoiceForge / VideoForge)
- API key input
- Help tooltip

---

### APIKeyInput.tsx
**Location**: `src/components/APIKeyInput.tsx`

**Purpose**: xAI API key input and storage

**Props**:
```typescript
interface APIKeyInputProps {
  apiKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
}
```

**Features**:
- Masked input (type="password")
- Save to localStorage
- Clear button
- Link to xAI console

---

## Component Patterns

### Compound Components
VideoForge uses compound component pattern:
```tsx
<Timeline>
  <Toolbar />
  <TransportControls />
  <TimelineTrack>
    <TimelineClip />
  </TimelineTrack>
</Timeline>
```

### Controlled Components
All form inputs are controlled:
```tsx
<input value={value} onChange={(e) => setValue(e.target.value)} />
```

### Context Menus
Using Radix UI primitives:
```tsx
<ContextMenu>
  <ContextMenuTrigger>{children}</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>...</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### Dialogs/Modals
Using Radix UI Dialog:
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>...</DialogContent>
</Dialog>
```

### Tooltips
Using Radix UI Tooltip:
```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger>Hover me</TooltipTrigger>
    <TooltipContent>Info</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

## Component Communication

### Props Down, Events Up
Standard React pattern:
```tsx
// Parent
<Child value={value} onChange={handleChange} />

// Child
<input value={value} onChange={(e) => onChange(e.target.value)} />
```

### Callback Composition
Multiple callbacks composed:
```tsx
// Parent combines multiple actions
const handleClipUpdate = (clipId, updates) => {
  editor.updateClip(clipId, updates);
  saveToHistory();
  showToast('Clip updated');
};

<Timeline onUpdateClip={handleClipUpdate} />
```

### Event Bubbling Control
Stop propagation to prevent multiple handlers:
```tsx
const handleClick = (e) => {
  e.stopPropagation(); // Don't trigger parent onClick
  selectClip(clip.id);
};
```
