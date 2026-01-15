# VoiceSpark Studio - Architecture Overview

## System Overview

VoiceSpark Studio is a single-page application (SPA) built with React and TypeScript. It follows a feature-based architecture with three main sections (VoiceForge, ScriptForge, VideoForge) that share common infrastructure but maintain independent state and functionality.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              React Application (SPA)                 │  │
│  │                                                       │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │  VoiceForge  │  │ ScriptForge  │  │VideoForge │ │  │
│  │  │   (Active)   │  │  (Planned)   │  │  (Active) │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                                                       │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         Shared Infrastructure                 │   │  │
│  │  │  - Header/Navigation                          │   │  │
│  │  │  - shadcn/ui Components                       │   │  │
│  │  │  - Hooks (localStorage, keyboard, etc.)      │   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  FFmpeg.wasm                          │  │
│  │        (Browser-based Video Encoding)                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│                                                              │
│  ┌──────────────────┐      ┌─────────────────────────────┐ │
│  │    Supabase      │      │      xAI Grok Voice API     │ │
│  │  Edge Functions  │──────│   wss://api.x.ai/v1/...     │ │
│  │                  │      │                              │ │
│  │  - Voice Proxy   │      │  - Real-time voice synth     │ │
│  │  - Token Manager │      │  - WebSocket connection      │ │
│  └──────────────────┘      └─────────────────────────────┘ │
│                                                              │
│  ┌──────────────────┐      ┌─────────────────────────────┐ │
│  │   Google Drive   │      │      FFmpeg CDN             │ │
│  │   (Phase 1)      │      │  unpkg.com / jsDelivr       │ │
│  │   Not Implemented│      │                              │ │
│  └──────────────────┘      └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

### Frontend Framework
- **React 18.3.1**: Modern React with hooks, concurrent features
- **TypeScript 5.8.3**: Strict type checking, no `any` types
- **Vite 5.4.19**: Fast build tool with HMR, replaces CRA

### Routing & Navigation
- **React Router DOM 6.30.1**: Client-side routing
- **Routes**:
  - `/` → Redirects to `/voiceforge`
  - `/voiceforge` → VoiceForge page
  - `/videoforge` → VideoForge page
  - `*` → 404 NotFound page

### State Management Strategy
**No Global State Library** - Custom hooks pattern:

```typescript
// Feature-specific state hooks
useVideoEditor()      // Video editor state (clips, assets, playback)
useVoiceGeneration()  // Voice generation state
useLocalStorage()     // Persistent storage
useAudioPlayer()      // Audio playback

// No Redux, Zustand, or React Context for state
// Each page manages its own state independently
```

**Why no global state?**
1. Pages are independent - no shared state needed between VoiceForge/VideoForge
2. Simpler mental model - state lives where it's used
3. Better performance - no unnecessary re-renders
4. Easier to reason about - clear data flow

### UI Components
- **shadcn/ui**: Radix UI primitives with Tailwind styling
  - 40+ pre-built components (Button, Dialog, Dropdown, etc.)
  - Fully customizable, no NPM package
  - Source code in `src/components/ui/`
- **Lucide React**: Icon library (tree-shakeable)
- **Sonner**: Toast notifications

### Styling
- **Tailwind CSS 3.4.17**: Utility-first CSS
- **CSS Variables**: Theme colors defined in `index.css`
- **Responsive Design**: Mobile-first with breakpoints
- **Dark Theme**: Default and primary theme
- **Custom Animations**: Shimmer, float, accordion (in tailwind.config.ts)

### Backend (Supabase)
- **Edge Functions** (Deno runtime):
  - `generate-voice`: WebSocket proxy for xAI voice generation
  - `get-voice-token`: Ephemeral token retrieval
- **No Database Yet**: Planned for Phase 1 (Google Drive integration)
- **No Auth Yet**: Planned for Phase 1

### Video Processing
- **FFmpeg.wasm 0.12.15**: WebAssembly port of FFmpeg
- **Browser-based**: No server-side processing required
- **SharedArrayBuffer**: Requires COEP/COOP headers
- **Multi-threaded**: Uses Web Workers when available

## Application Structure

### Three-Section Architecture

#### 1. VoiceForge (Fully Functional)
**Purpose**: AI voice generation from text scripts

**Components**:
- `VoiceForge.tsx` - Main page
- `ScriptEditor.tsx` - Text input with style tags
- `VoiceSelector.tsx` - Voice picker (Rex, River, etc.)
- `AudioPlayer.tsx` - Playback with waveform
- `GenerateButton.tsx` - Generate action

**State Management**:
- `useVoiceGeneration()` hook manages:
  - Generation progress
  - Audio blob/URL
  - Errors and transcript
  - WebSocket connection state

**Data Flow**:
```
User Input → Edge Function → xAI WebSocket → Audio Chunks → Browser Blob → AudioPlayer
```

#### 2. ScriptForge (Planned)
**Purpose**: Script-to-visual workflow

**Status**: Not yet implemented
**Planned Features**:
- Script parsing and scene detection
- AI-powered asset suggestions
- Automatic timeline composition
- Visual storyboard generation

#### 3. VideoForge (Fully Functional)
**Purpose**: Timeline-based video editing

**Components** (11 files in `src/components/video-editor/`):
- `VideoForge.tsx` - Main page (540 lines)
- `ToolPanel.tsx` - Left sidebar (media library, settings)
- `PreviewCanvas.tsx` - Video preview with playback
- `Timeline.tsx` - Timeline container with tracks
- `TimelineTrack.tsx` - Individual track rows
- `TimelineClip.tsx` - Draggable/resizable clips
- `Toolbar.tsx` - Top toolbar (undo, redo, split, etc.)
- `TransportControls.tsx` - Play, pause, seek
- `ExportDialog.tsx` - Export settings and progress
- `ClipContextMenu.tsx` - Right-click menu for clips
- `TrackContextMenu.tsx` - Right-click menu for tracks

**State Management**:
- `useVideoEditor()` hook (575 lines) manages:
  - Assets array (uploaded media)
  - Clips array (timeline clips)
  - Playhead position and playback state
  - Selection state
  - Zoom level and aspect ratio
  - Track settings (volume, speed, visibility, mute)
  - Undo/redo history

**Data Flow**:
```
File Upload → Blob URL → Asset → Timeline Clip → Preview Canvas → FFmpeg Export
```

### Shared Infrastructure

**Header Component**:
- Navigation tabs (VoiceForge / VideoForge)
- API key input (xAI)
- Help tooltip

**Utility Hooks**:
- `useLocalStorage()` - Persistent key-value storage
- `useKeyboardShortcuts()` - Global keyboard shortcuts
- `useAudioPlayer()` - Audio playback control

**UI Components**:
- 40+ shadcn/ui components in `src/components/ui/`
- Shared across all features
- Consistent design system

## Data Flow

### VoiceForge Data Flow

```
┌──────────────┐
│    User      │
│  Types Script│
└──────┬───────┘
       │
       ▼
┌─────────────────┐
│  ScriptEditor   │  ← React Component
│  (Local State)  │
└──────┬──────────┘
       │ Submit
       ▼
┌───────────────────────┐
│ useVoiceGeneration()  │  ← Custom Hook
│   - Calls API         │
│   - Manages state     │
└──────┬────────────────┘
       │
       ▼
┌─────────────────────────────┐
│   Supabase Edge Function    │
│   (generate-voice)           │
│   - Gets ephemeral token     │
│   - Opens WebSocket to xAI   │
│   - Streams audio chunks     │
└──────┬──────────────────────┘
       │
       ▼
┌──────────────────────┐
│   xAI Grok Voice     │
│   WebSocket API      │
│   - Synthesizes voice│
│   - Returns PCM audio│
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   Browser            │
│   - Receives chunks  │
│   - Creates blob     │
│   - Creates blob URL │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│   AudioPlayer        │  ← React Component
│   - Plays audio      │
│   - Shows waveform   │
│   - Download option  │
└──────────────────────┘
```

### VideoForge Data Flow

```
┌──────────────────┐
│  User Uploads    │
│  Media File      │
└────────┬─────────┘
         │
         ▼
┌────────────────────────────┐
│   processSingleFile()      │
│   - Create blob URL        │
│   - Extract duration       │
│   - Generate thumbnail     │
└────────┬───────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   useVideoEditor()          │
│   state.assets.push(asset)  │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   ToolPanel (Media Library) │
│   - Shows thumbnails        │
│   - Drag to timeline        │
└────────┬────────────────────┘
         │ Drag & Drop
         ▼
┌─────────────────────────────┐
│   Timeline                  │
│   - addClip()               │
│   - Creates TimelineClip    │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   useVideoEditor()          │
│   state.clips.push(clip)    │
│   - Updates duration        │
│   - Adds to history         │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   PreviewCanvas             │
│   - Renders visible clips   │
│   - Plays audio/video       │
│   - Updates on playhead move│
└─────────────────────────────┘
         │
         │ Export
         ▼
┌─────────────────────────────┐
│   ExportDialog              │
│   - Quick Export (instant)  │
│   - Advanced Export (FFmpeg)│
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   videoExporter.ts          │
│   - initFFmpeg()            │
│   - Load from CDN           │
│   - Process clips           │
│   - Encode video            │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   FFmpeg.wasm               │
│   - H.264/VP9 encoding      │
│   - Audio mixing            │
│   - Resolution scaling      │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│   Download Blob             │
│   - MP4/WebM/MOV file       │
└─────────────────────────────┘
```

## Key Architectural Decisions

### 1. No Backend Database (Yet)
**Decision**: Store everything in browser memory using blob URLs
**Rationale**:
- Faster development - no backend infrastructure needed
- Privacy-first - no data leaves user's machine
- Zero storage costs

**Limitation**:
- Data lost on page refresh
- No cross-device sync
- No collaboration

**Future**: Google Drive integration (Phase 1) solves this

### 2. Custom State Management (No Redux/Zustand)
**Decision**: Use custom React hooks for state
**Rationale**:
- Features are independent - no shared state
- Simpler codebase - less boilerplate
- Easier to understand data flow
- Better performance - granular re-renders

**Pattern**:
```typescript
// Each feature has its own hook
const editor = useVideoEditor(); // VideoForge state
const voice = useVoiceGeneration(); // VoiceForge state

// State stays local to the page
// No prop drilling - pass down only what's needed
```

### 3. Browser-Based Video Processing (FFmpeg.wasm)
**Decision**: Use FFmpeg.wasm for export instead of server-side
**Rationale**:
- No server costs - processing happens client-side
- Privacy-first - video never leaves user's machine
- Scalability - no server load limits
- Works offline - no network dependency

**Tradeoffs**:
- Slower than native FFmpeg
- Requires modern browser
- Large WebAssembly download (~30MB)
- SharedArrayBuffer security requirements

**Fallback**: Quick Export downloads original files without re-encoding

### 4. Component-Based UI (shadcn/ui over npm packages)
**Decision**: Use shadcn/ui (copy-paste components) over npm packages
**Rationale**:
- Full control - own the code, modify as needed
- No version conflicts - no dependency hell
- Customizable - tailored to our design system
- Better tree-shaking - only include what's used

**Pattern**:
```bash
# shadcn/ui approach (NOT npm install)
npx shadcn-ui@latest add button
# Copies source code to src/components/ui/button.tsx
```

### 5. Supabase Edge Functions for Voice Proxy
**Decision**: Use Supabase Edge Functions instead of direct xAI calls
**Rationale**:
- Hide API key - token generated server-side
- CORS handling - edge function handles CORS
- Error handling - better error messages
- Rate limiting - centralized control

**Pattern**:
```
Browser → Edge Function → xAI WebSocket → Edge Function → Browser
```

### 6. History-Based Undo/Redo
**Decision**: Store entire state snapshots for undo/redo
**Rationale**:
- Simple implementation - just array of states
- Reliable - always works, no edge cases
- Fast enough - state objects are small

**Tradeoff**:
- Memory usage grows with actions
- No action compression

**Pattern**:
```typescript
const [history, setHistory] = useState<EditorState[]>([INITIAL_STATE]);
const [historyIndex, setHistoryIndex] = useState(0);

// On any state change
setHistory(prev => [...prev.slice(0, historyIndex + 1), newState]);
setHistoryIndex(prev => prev + 1);

// Undo
setState(history[historyIndex - 1]);

// Redo
setState(history[historyIndex + 1]);
```

### 7. Blob URL Media Management
**Decision**: Store uploaded files as blob URLs in memory
**Rationale**:
- Fast - no network latency
- Simple - standard browser API
- Secure - URLs are not guessable

**Pattern**:
```typescript
const src = URL.createObjectURL(file);
// Store src in state
// ...later cleanup
URL.revokeObjectURL(src);
```

**Limitation**: Doesn't persist across page refresh (fixed in Phase 1 with Drive)

## Security Considerations

### COEP/COOP Headers
**Required for**: SharedArrayBuffer (FFmpeg.wasm)

```typescript
// vite.config.ts
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless', // Not 'require-corp'
}
```

**Why `credentialless`?**
- Allows loading CDN resources without CORS headers
- More permissive than `require-corp`
- Required for FFmpeg CDN loading

### API Key Storage
- xAI API key stored in localStorage (encrypted by browser)
- Never sent to Supabase - only to edge function
- Edge function proxies to xAI with ephemeral token
- Token expires after 5 minutes

### Blob URL Security
- Blob URLs are origin-bound
- Not guessable (cryptographically random)
- Automatically cleaned up on page close
- Manual cleanup with `URL.revokeObjectURL()`

## Performance Optimizations

### React Performance
- `useCallback` for event handlers (prevent re-renders)
- `useMemo` for expensive computations
- `React.memo` for pure components (sparingly)
- Refs for non-reactive values (intervals, DOM refs)

### Video Editor Performance
- Canvas-based rendering (not DOM elements)
- RequestAnimationFrame for smooth playback
- Throttled timeline updates during drag
- Lazy loading for thumbnails
- Virtual scrolling (not yet implemented)

### Asset Loading
- Parallel file processing
- Async thumbnail generation
- Progress feedback during uploads
- Blob URL caching

## Error Handling Strategy

### Voice Generation
```typescript
try {
  const result = await generateVoiceover(apiKey, script, voice);
  if (!result.success) {
    // Show user-friendly error
    setError(result.error);
  }
} catch (error) {
  // Handle network/unexpected errors
  setError(error.message);
}
```

### Video Export
```typescript
try {
  await initFFmpeg();
} catch (error) {
  // Fallback to Quick Export
  showError('FFmpeg failed. Please use Quick Export instead.');
}
```

### General Pattern
1. Try operation
2. Catch error
3. Log to console (for debugging)
4. Show user-friendly message
5. Offer alternative action (if available)

## Future Architecture Changes

### Phase 1: Google Drive Integration
**Impact**: Major architectural change
- Add OAuth authentication
- Store media in Google Drive
- Replace blob URLs with Drive file IDs
- Add project persistence
- Enable cross-device sync

### Phase 2: ScriptForge
**Impact**: New feature section
- Add AI scene generation
- New components and state management
- Integration with VideoForge timeline

### Phase 3: Real-time Collaboration
**Impact**: Requires backend rewrite
- Add Supabase Realtime
- Add user presence system
- Add conflict resolution
- Add activity feed

### Phase 4: Database Integration
**Impact**: Add persistence layer
- User accounts and auth
- Project storage in Supabase
- Asset metadata storage
- Share permissions
