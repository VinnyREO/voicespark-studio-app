# API Integrations

## xAI Grok Voice API

### Endpoint
- WebSocket: `wss://api.x.ai/v1/realtime`
- REST (token): `https://api.x.ai/v1/realtime/client_secrets`

### Authentication
1. User provides API key via UI (stored in localStorage)
2. Frontend calls Supabase Edge Function
3. Edge Function gets ephemeral token from xAI
4. Edge Function opens WebSocket to xAI
5. Audio chunks streamed back to browser

### Token Lifetime
- 5 minutes (300 seconds)
- Generated per request

### Pricing
- ~$0.05 per minute of audio

### Style Tags Supported
```
[whisper]...[/whisper]     - Whispered speech
[excited]...[/excited]     - Excited tone
[serious]...[/serious]     - Serious tone
[slow]...[/slow]           - Slower speech
[fast]...[/fast]           - Faster speech
[pause:2s]                 - Pause for N seconds
[emphasis]...[/emphasis]   - Emphasized text
```

### Voice Options
- Rex (Male, confident)
- River (Female, warm)
- Ripley (Female, energetic)
- Echo (Male, deep)
- Nova (Female, professional)
- Sage (Male, wise)

## Supabase

### Edge Functions

#### get-voice-token
**Purpose**: Get ephemeral token from xAI
**Method**: POST
**Body**: `{ apiKey: string }`
**Response**: `{ client_secret: { value: string, expires_at: number } }`

#### generate-voice
**Purpose**: Generate voice from script
**Method**: POST
**Body**: `{ apiKey: string, script: string, voice: string }`
**Response**: `{ audio: string (base64), transcript: string }`

### CORS Configuration
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
```

### Environment Variables
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key

## FFmpeg.wasm

### CDNs
1. Primary: `https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd`
2. Fallback: `https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd`

### Loading Strategy
```typescript
// Try multiple approaches with 20s timeout each
1. Direct URLs (fastest)
2. jsDelivr CDN (fallback)
3. Blob URLs from unpkg (last resort)
```

### Requirements
```typescript
// vite.config.ts
headers: {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless'
}
```

### Supported Formats
- **MP4**: H.264 video + AAC audio
- **WebM**: VP9 video + Opus audio
- **MOV**: H.264 video + AAC audio (ProRes variant)

### Export Quality Presets
- **Low (480p)**: 854x480 @ 1.5 Mbps
- **Medium (720p)**: 1280x720 @ 5 Mbps
- **High (1080p)**: 1920x1080 @ 8 Mbps
- **Ultra (4K)**: 3840x2160 @ 40 Mbps

## Future: Google Drive API (Phase 1)

### OAuth Flow
1. User clicks "Connect Google Drive"
2. OAuth popup opens
3. User grants permissions
4. Token stored securely
5. API calls use token

### Scopes Needed
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.readonly
```

### API Operations
- Upload media files
- Download media files
- List files in project folder
- Delete files
- Share project links
