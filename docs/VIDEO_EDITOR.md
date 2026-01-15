# Video Editor (VideoForge) - Deep Dive

## Architecture Overview

VideoForge is a browser-based timeline video editor with multi-track support, real-time preview, and professional editing features.

### Core Components
1. **ToolPanel** - Media library and settings (left sidebar)
2. **PreviewCanvas** - Real-time video preview (center top)
3. **Timeline** - Multi-track timeline editor (center bottom)
4. **ExportDialog** - Video export with quality options (modal)

## Timeline System

### Tracks
- Infinite number of tracks
- Each track = horizontal row
- Tracks indexed from 0 (top) to N (bottom)
- Track settings: volume, speed, visibility, mute

### Clips
- Clips placed on tracks at specific times
- Properties:
  - `startTime`: Position on timeline (seconds)
  - `duration`: Visible length (seconds)
  - `trimStart`: Trim from beginning (seconds)
  - `trimEnd`: Trim from end (seconds)
  - `trackIndex`: Which track (0-N)
  - `assetId`: Reference to MediaAsset

### Playhead
- Red vertical line showing current time
- Click timeline to move playhead
- Scrubbing: drag playhead to scrub
- Keyboard: arrow keys for frame-by-frame

### Snap to Grid
- When enabled, clips snap to nearest second
- Toggle with toolbar button
- Visual feedback on snap

### Zoom
- Pixels per second (10-200)
- Default: 50px per second
- Zoom in: more detail, wider timeline
- Zoom out: less detail, compact timeline

## Media Management

### Asset Upload
1. User clicks Upload or drags file
2. File processed:
   - Create blob URL
   - Extract duration (video/audio)
   - Generate thumbnail (video/image)
3. Asset added to media library
4. Asset can be dragged to timeline

### Supported File Types
- **Video**: MP4, WebM, MOV, AVI
- **Audio**: MP3, WAV, M4A, OGG
- **Images**: JPG, PNG, GIF, WebP

### Asset Storage
- Blob URLs in browser memory
- Not persisted across refresh
- Phase 1: Will store in Google Drive

### Thumbnail Generation
```typescript
// Video thumbnail at 0.5 seconds
video.currentTime = 0.5;
video.onseeked = () => {
  canvas.width = 160;
  canvas.height = 90;
  ctx.drawImage(video, 0, 0, 160, 90);
  thumbnail = canvas.toDataURL();
};
```

## Video Preview

### Canvas-Based Rendering
- HTML canvas element
- Renders clips at current playhead position
- Handles aspect ratio (16:9, 9:16, 1:1)
- Black bars for letterboxing/pillarboxing

### Playback Engine
```typescript
// RequestAnimationFrame for smooth playback
const animate = () => {
  const elapsed = (performance.now() - startTime) / 1000;
  const newPosition = startPosition + elapsed;
  
  if (newPosition >= duration) {
    pause();
  } else {
    setPlayheadPosition(newPosition);
    playbackInterval.current = requestAnimationFrame(animate);
  }
};
```

### Clip Layering
- Higher tracks overlay lower tracks
- Z-index determined by track index
- Video clips can overlay other videos

### Audio Mixing
- All audio tracks play simultaneously
- Volume controlled per-clip and per-track
- Global master volume

## Export System

### Quick Export
- **Purpose**: Guaranteed to work, instant download
- **How**: Downloads original file without re-encoding
- **Speed**: Instant (just fetch and download)
- **Quality**: Original quality preserved
- **Limitation**: Exports first clip only

### Advanced Export (FFmpeg.wasm)
- **Purpose**: Re-encode with custom quality/format
- **How**: FFmpeg.wasm in browser
- **Speed**: Slower (encoding takes time)
- **Quality**: Configurable (480p - 4K)
- **Formats**: MP4, WebM, MOV

### Export Process
1. User selects quality and format
2. Click "Advanced Export"
3. FFmpeg loads from CDN (first time only)
4. Clips fetched and written to FFmpeg filesystem
5. FFmpeg encodes video with settings
6. Output file downloaded

### FFmpeg Command (Single Clip)
```bash
ffmpeg -i input0.mp4 \
  -ss 0 -t 10 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -r 30 \
  -c:v libx264 -preset fast -crf 23 \
  -c:a aac -b:a 128k \
  output.mp4
```

### Multi-Clip Concatenation
```bash
# Create concat file
file 'input0.mp4'
file 'input1.mp4'

# Concatenate
ffmpeg -f concat -safe 0 -i concat.txt \
  -vf "scale=1920:1080..." \
  -c:v libx264 \
  output.mp4
```

## Editing Features

### Drag & Drop
- Drag assets from media library to timeline
- Drag files from desktop to timeline
- Drag clips to reposition
- Multi-select and drag multiple clips

### Trim Clips
- Drag left edge: trim start
- Drag right edge: trim end
- Trim doesn't delete source, just hides it

### Split Clips
- Press 'S' or use toolbar button
- Splits all clips at playhead position
- Creates two separate clips

### Delete Clips
- Select clip(s)
- Press Delete key or use toolbar
- Multi-delete: select multiple, press Delete

### Duplicate Clips
- Right-click clip → Duplicate
- Creates copy immediately after original

### Undo/Redo
- Cmd+Z: Undo
- Cmd+Shift+Z: Redo
- Full history stored

### Copy/Paste
- Cmd+C: Copy selected clips
- Cmd+V: Paste at playhead position

### Split Audio from Video
- Right-click video clip → Split Audio
- Creates audio clip on track below
- Mutes original video

### Track Controls
- Volume slider (0-100%)
- Speed control (0.25x - 4x)
- Mute toggle
- Visibility toggle

## Keyboard Shortcuts

### Playback
- **Space**: Play/Pause
- **Home**: Seek to start
- **End**: Seek to end
- **Left Arrow**: Previous frame
- **Right Arrow**: Next frame

### Editing
- **S**: Split clip at playhead
- **Delete/Backspace**: Delete selected clips
- **Cmd+C**: Copy selected clips
- **Cmd+V**: Paste clips
- **Cmd+Z**: Undo
- **Cmd+Shift+Z**: Redo
- **Cmd+A**: Select all clips (not implemented)

### Selection
- **Click**: Select single clip
- **Cmd+Click**: Add/remove from selection
- **Click background**: Deselect all

## Common Issues & Solutions

### Export Timeout
**Problem**: FFmpeg loading times out
**Solution**: Use Quick Export or restart dev server

### Clips Not Showing
**Problem**: Clips added but not visible
**Solution**: Check track visibility, check clip position

### Audio Not Playing
**Problem**: No audio during playback
**Solution**: Check track mute, check clip volume, check master volume

### Performance Issues
**Problem**: Laggy timeline or preview
**Solution**: Reduce zoom level, close other tabs, use smaller files
