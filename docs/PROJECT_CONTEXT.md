# VoiceSpark Studio - Quick Context for AI Assistants

## What is VoiceSpark Studio?

VoiceSpark Studio is an AI-powered video creation platform designed for creating UGC-style ads and YouTube content at scale. It combines voice generation, script processing, and timeline-based video editing in a single integrated platform.

## Three Main Sections

1. **VoiceForge** ✅ **(Fully Functional)**
   - AI voice generation using xAI Grok Voice API
   - WebSocket-based real-time voice synthesis
   - Support for style tags ([whisper], [excited], [pause:2s], etc.)
   - Multiple voice options (Rex, River, Ripley, Echo, etc.)
   - WAV audio output with waveform visualization

2. **ScriptForge** 🔄 **(Planned - Not Implemented)**
   - Script-to-visual workflow
   - Automated scene generation from scripts
   - AI-powered asset suggestion
   - Timeline auto-composition

3. **VideoForge** ✅ **(Fully Functional)**
   - Professional timeline-based video editor
   - Multi-track editing with drag-and-drop
   - Real-time preview canvas with multiple aspect ratios
   - Two export options:
     - Quick Export: Instant original file download (guaranteed)
     - Advanced Export: FFmpeg.wasm re-encoding with quality options

## Current State

### ✅ Complete & Working
- VoiceForge voice generation with xAI integration
- VideoForge complete editor with export
- Multi-track timeline with snap-to-grid
- Keyboard shortcuts (space, arrows, cmd+z/y, etc.)
- Resizable panels and timeline
- Context menus for clips and tracks
- Track-level controls (volume, speed, visibility, mute)
- Undo/redo system with full history
- Quick Export (downloads original files instantly)

### ⚠️ Partially Working
- Advanced Export (FFmpeg.wasm)
  - May timeout on first load
  - COEP headers configured (`credentialless`)
  - Multiple CDN fallback strategies implemented
  - Works after server restart in most cases

### 🔄 Planned (Not Yet Implemented)
- Google Drive integration (Phase 1 - NEXT)
- ScriptForge section
- Project management system
- Real-time collaboration (Phase 3)
- Database persistence (using Supabase)

## Tech Stack Quick Reference

### Frontend
- **Framework**: React 18.3.1 with TypeScript 5.8.3
- **Build Tool**: Vite 5.4.19
- **Routing**: React Router DOM 6.30.1
- **State Management**: Custom React hooks (no Redux/Zustand)
- **UI Library**: shadcn/ui (Radix UI primitives + Tailwind)
- **Styling**: Tailwind CSS 3.4.17
- **Icons**: Lucide React
- **Notifications**: Sonner (toast library)

### Backend
- **BaaS**: Supabase (Edge Functions)
- **Voice API**: xAI Grok Voice API (WebSocket)
- **Video Processing**: FFmpeg.wasm 0.12.15 (browser-based)

### Key Dependencies
- `@ffmpeg/ffmpeg` & `@ffmpeg/util` - Video export
- `@supabase/supabase-js` - Backend integration
- `@tanstack/react-query` - Data fetching
- `react-resizable-panels` - Resizable UI
- `date-fns` - Date formatting
- `zod` - Schema validation

## File Structure Key Points

```
src/
├── components/
│   ├── video-editor/          # VideoForge components (11 files)
│   ├── ui/                     # shadcn/ui components (40+ files)
│   ├── AudioPlayer.tsx         # Audio playback with controls
│   ├── Header.tsx              # Top navigation
│   ├── ScriptEditor.tsx        # Voice script input
│   └── VoiceSelector.tsx       # Voice picker
├── hooks/
│   ├── useVideoEditor.ts       # 📌 CRITICAL: Main video editor state (575 lines)
│   ├── useVoiceGeneration.ts   # Voice generation state
│   ├── useKeyboardShortcuts.ts # Keyboard shortcut handler
│   └── useLocalStorage.ts      # Persistent storage
├── pages/
│   ├── VideoForge.tsx          # 📌 Main video editor page (540 lines)
│   ├── VoiceForge.tsx          # Voice generation page
│   └── NotFound.tsx            # 404 page
├── services/
│   ├── videoExporter.ts        # 📌 CRITICAL: FFmpeg export logic (388 lines)
│   ├── voiceService.ts         # Voice API calls
│   └── voiceGenerator.ts       # Voice generation logic
├── types/
│   ├── video-editor.ts         # Video editor types (MediaAsset, TimelineClip, etc.)
│   └── index.ts                # General types
├── utils/
│   ├── voices.ts               # Voice configurations
│   └── styleTagProcessor.ts    # Style tag parser
└── integrations/
    └── supabase/               # Supabase client & types

supabase/functions/
├── generate-voice/             # Voice generation edge function
└── get-voice-token/            # Voice token retrieval edge function
```

## Design System

### Color Palette
- **VoiceForge Theme**: Cyan/Teal accents
  - Primary: `#06b6d4` (cyan-500)
  - Secondary: `#22d3ee` (cyan-400)
  - Gradient backgrounds with cyan glow

- **VideoForge Theme**: Purple/Pink accents
  - Primary: `#a855f7` (purple-500)
  - Hover: `#9333ea` (purple-600)
  - Gradient backgrounds with purple/pink glow

- **Base Colors** (Dark Theme Default):
  - Background: Near-black with subtle gradients
  - Cards: Semi-transparent dark cards with backdrop blur
  - Borders: Subtle zinc-700 dividers
  - Text: White/zinc color scale

### Typography
- **Primary Font**: Plus Jakarta Sans (sans-serif)
- **Mono Font**: JetBrains Mono (code/technical)
- **Sizing**: Tailwind's default scale (text-xs to text-4xl)

### Layout Patterns
- Fixed header (73px height)
- Resizable sidebars (media panel 250-600px)
- Resizable timeline (200-600px height)
- Responsive with container-based layouts

## Development Patterns

### State Management
- **No global state libraries** (no Redux, Zustand, or Context providers)
- Custom hooks for feature-specific state:
  - `useVideoEditor` - Complete video editor state with undo/redo
  - `useVoiceGeneration` - Voice generation state
  - `useLocalStorage` - Persistent key-value storage
- History-based undo/redo (array of states)
- Refs for non-reactive values (clipboard, intervals)

### Component Patterns
- Functional components with hooks (no class components)
- Named exports for components
- Props interfaces defined inline or at top of file
- Compound components (e.g., Timeline + TimelineTrack + TimelineClip)
- Context menus using Radix UI primitives

### File Organization
- One component per file
- Co-located types with components
- Shared types in `/types` directory
- Services in `/services` directory
- Utilities in `/utils` directory

### Styling Approach
- Tailwind CSS utility classes (primary method)
- `cn()` utility for conditional classes (from lib/utils.ts)
- Inline `<style>` tags for theme-specific overrides
- CSS custom properties (CSS variables) for theme colors
- No CSS modules or styled-components

## Common Issues & Solutions

### FFmpeg.wasm Export Timeout
**Problem**: Advanced Export times out after 60 seconds
**Root Cause**: COEP headers block CDN resources
**Solution Implemented**:
- Changed COEP to `credentialless` (from `require-corp`)
- Multiple CDN fallbacks (unpkg, jsDelivr, blob URLs)
- 20-second timeout per attempt
- Quick Export as guaranteed fallback

**User Action Required**: Restart dev server after vite.config.ts changes

### Media Files Not Persisting
**Problem**: Uploaded media disappears on refresh
**Root Cause**: Files stored as blob URLs in memory
**Future Solution**: Google Drive integration (Phase 1)

### Blob URL Memory Management
**Pattern Used**: Create blob URLs, store in state, revoke on cleanup
```typescript
const src = URL.createObjectURL(file);
// ... use src ...
URL.revokeObjectURL(src); // cleanup
```

## API Integrations

### xAI Grok Voice API
- **Endpoint**: `wss://api.x.ai/v1/realtime`
- **Auth**: Bearer token (ephemeral via edge function)
- **Token Lifetime**: 5 minutes
- **Pricing**: ~$0.05/min
- **Style Tags**: `[whisper]`, `[excited]`, `[serious]`, `[slow]`, `[fast]`, `[pause:Ns]`, `[emphasis]`

### Supabase Edge Functions
- **generate-voice**: Proxy for voice generation (handles WebSocket)
- **get-voice-token**: Gets ephemeral token from xAI
- **CORS**: Configured for wildcard origin (development)

### FFmpeg.wasm
- **Version**: 0.12.6
- **CDNs**: unpkg.com, jsDelivr
- **Requirements**: COEP/COOP headers for SharedArrayBuffer
- **Formats**: MP4 (H.264), WebM (VP9), MOV (ProRes)

## Roadmap

### Phase 1: Google Drive Integration (NEXT)
- OAuth authentication
- File upload to Drive
- Browse Drive files in media panel
- Share projects via Drive links
- Persistent project storage

### Phase 2: ScriptForge
- Script-to-visual workflow
- AI scene generation
- Auto-timeline composition
- Asset suggestions

### Phase 3: Collaboration
- Real-time multi-user editing
- Comments and annotations
- Project sharing and permissions
- Activity feed

### Phase 4: Advanced Features
- Image-to-video generation
- AI scene transitions
- Voice cloning
- Advanced effects and filters

## Important: Always Check These Docs First

Before adding any new feature, read:
1. **`/docs/PROJECT_CONTEXT.md`** (this file) - Overall understanding
2. **`/docs/ARCHITECTURE.md`** - System design and data flow
3. **`/docs/COMPONENTS.md`** - Component structure and props
4. **`/docs/VIDEO_EDITOR.md`** - VideoForge deep dive (if working on video features)
5. **`/docs/DEVELOPMENT_GUIDE.md`** - Code patterns and conventions

## Quick Reference: Key Files

When working on specific features, these are the critical files:

- **Video Editor Core**: `src/hooks/useVideoEditor.ts` (575 lines)
- **Video Export**: `src/services/videoExporter.ts` (388 lines)
- **Video Editor UI**: `src/pages/VideoForge.tsx` (540 lines)
- **Timeline Component**: `src/components/video-editor/Timeline.tsx`
- **Preview Canvas**: `src/components/video-editor/PreviewCanvas.tsx`
- **Export Dialog**: `src/components/video-editor/ExportDialog.tsx`

## Development Commands

```bash
# Install dependencies
npm install

# Start dev server (runs on localhost:8080)
npm run dev

# Build for production
npm run build

# Build for development (with source maps)
npm run build:dev

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment Variables

Required for full functionality:
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

Optional:
- User provides xAI API key via UI (stored in localStorage)

## Browser Requirements

- Modern browser with WebAssembly support
- SharedArrayBuffer support (for FFmpeg.wasm)
- Chrome/Edge 92+, Firefox 79+, Safari 15.2+

## Notes for AI Assistants

- **Always preserve existing patterns** - Don't introduce new state management libraries
- **TypeScript strict mode** - All code must be properly typed
- **No prop-types** - Use TypeScript interfaces instead
- **Functional components only** - No class components
- **Named exports** - Prefer named exports over default exports for components
- **Tailwind-first** - Use Tailwind utilities, avoid custom CSS
- **Mobile-responsive** - Consider mobile layouts (though desktop-focused)
- **Accessibility** - Use semantic HTML and ARIA labels where appropriate
- **Performance** - Avoid unnecessary re-renders, use useCallback/useMemo appropriately
