# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm))
- npm or bun
- Git

### Installation
```bash
# Clone repository
git clone <repository-url>
cd voicespark-studio

# Install dependencies
npm install

# Start dev server
npm run dev
# App runs on http://localhost:8080
```

### Available Commands
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run build:dev  # Build with source maps
npm run preview    # Preview production build
npm run lint       # Lint code
```

## Project Structure

```
voicespark-studio/
├── src/
│   ├── components/           # React components
│   │   ├── video-editor/    # VideoForge components
│   │   ├── ui/              # shadcn/ui components
│   │   └── *.tsx            # Voice/shared components
│   ├── pages/               # Route pages
│   │   ├── VideoForge.tsx   # Video editor page
│   │   ├── VoiceForge.tsx   # Voice generation page
│   │   └── NotFound.tsx     # 404 page
│   ├── hooks/               # Custom React hooks
│   │   ├── useVideoEditor.ts
│   │   ├── useVoiceGeneration.ts
│   │   └── ...
│   ├── services/            # API services
│   │   ├── videoExporter.ts
│   │   ├── voiceService.ts
│   │   └── ...
│   ├── types/               # TypeScript types
│   ├── utils/               # Utility functions
│   ├── integrations/        # External integrations
│   │   └── supabase/
│   ├── lib/                 # Library code
│   ├── App.tsx              # Root component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── supabase/
│   └── functions/           # Edge functions
├── public/                  # Static assets
├── docs/                    # Documentation
├── vite.config.ts           # Vite configuration
├── tailwind.config.ts       # Tailwind configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## Adding a New Feature

### 1. Plan the Feature
- Read `/docs/PROJECT_CONTEXT.md` for overall context
- Read `/docs/ARCHITECTURE.md` for system design
- Identify which section (VoiceForge, VideoForge, Shared)
- Sketch component hierarchy
- Identify state management needs

### 2. Create Components
```bash
# Create new component file
touch src/components/NewComponent.tsx
```

```typescript
// Template
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface NewComponentProps {
  prop1: string;
  prop2: number;
  onAction: () => void;
}

export function NewComponent({ prop1, prop2, onAction }: NewComponentProps) {
  const [localState, setLocalState] = useState(false);

  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">{prop1}</h3>
      <p>Value: {prop2}</p>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
}
```

### 3. Add State Management (if needed)
```bash
# Create custom hook
touch src/hooks/useFeatureName.ts
```

```typescript
// Template
import { useState, useCallback } from 'react';

export function useFeatureName() {
  const [state, setState] = useState(initialState);

  const action = useCallback(() => {
    // Action logic
    setState(newState);
  }, []);

  return {
    state,
    action,
  };
}
```

### 4. Add Routes (if needed)
```typescript
// src/App.tsx
<Route path="/new-feature" element={<NewFeature />} />
```

### 5. Add Types (if needed)
```typescript
// src/types/feature.ts
export interface FeatureData {
  id: string;
  name: string;
  // ... other fields
}
```

### 6. Add Services (if needed)
```typescript
// src/services/featureService.ts
export async function fetchFeatureData(): Promise<FeatureData> {
  const response = await fetch('/api/feature');
  return response.json();
}
```

## Code Style Guide

### TypeScript
- **Strict mode enabled** - No `any` types
- Use interfaces for props and state
- Use type aliases for unions/intersections
- Export types from component files or centralize in `/types`

```typescript
// ✅ Good
interface UserProps {
  name: string;
  age: number;
}

// ❌ Bad
function User(props: any) { }
```

### React Components
- **Functional components only** - No class components
- **Named exports** - Prefer named over default exports
- **Props interfaces** - Define inline or at top of file
- **useCallback/useMemo** - For optimization, not by default

```typescript
// ✅ Good
export function MyComponent({ prop1, prop2 }: MyComponentProps) {
  // ...
}

// ❌ Bad
export default class MyComponent extends React.Component {
  // ...
}
```

### State Management
- **No global state libraries** - Use custom hooks
- **Local state first** - Only lift state when needed
- **Immutable updates** - Always create new objects/arrays
- **Refs for non-reactive** - Use refs for values that don't trigger renders

```typescript
// ✅ Good
setState(prev => ({ ...prev, newField: value }));

// ❌ Bad
state.newField = value;
setState(state);
```

### Styling
- **Tailwind utilities first** - Prefer utilities over custom CSS
- **cn() for conditionals** - Use cn() utility for conditional classes
- **Inline styles rarely** - Only when absolutely necessary
- **CSS variables for theme** - Defined in index.css

```typescript
// ✅ Good
<div className={cn("p-4 rounded-lg", isActive && "bg-primary")} />

// ❌ Bad
<div style={{ padding: '1rem', borderRadius: '0.5rem' }} />
```

### File Organization
- One component per file
- File name matches component name
- Group related components in folders
- Co-locate tests with components (when added)

```
components/
├── video-editor/
│   ├── Timeline.tsx
│   ├── TimelineClip.tsx
│   └── TimelineTrack.tsx
└── VoiceSelector.tsx
```

### Imports
- Absolute imports with @ alias
- Group imports: React, third-party, internal
- Sort alphabetically within groups

```typescript
// ✅ Good
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useVideoEditor } from '@/hooks/useVideoEditor';

// ❌ Bad
import { Button } from '../../../components/ui/button';
```

## Common Tasks

### Add a shadcn/ui Component
```bash
# Install a new component
npx shadcn-ui@latest add button

# Component added to src/components/ui/button.tsx
```

### Add a New Page
1. Create page file: `src/pages/NewPage.tsx`
2. Add route in `src/App.tsx`:
```typescript
<Route path="/new-page" element={<NewPage />} />
```
3. Add navigation in `Header.tsx` (if needed)

### Add Global Styles
Edit `src/index.css`:
```css
@layer base {
  :root {
    --new-variable: 255 100% 50%;
  }
}
```

### Add a Utility Function
```typescript
// src/utils/newUtil.ts
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Add Environment Variable
1. Add to `.env` (create if doesn't exist):
```
VITE_NEW_VARIABLE=value
```
2. Access in code:
```typescript
const value = import.meta.env.VITE_NEW_VARIABLE;
```
3. Add type definition (if needed):
```typescript
// src/vite-env.d.ts
interface ImportMetaEnv {
  readonly VITE_NEW_VARIABLE: string;
}
```

## Testing (Not Yet Implemented)

When tests are added, use this structure:
```typescript
// Component.test.tsx
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Debugging

### React DevTools
1. Install React DevTools browser extension
2. Open DevTools → React tab
3. Inspect component state and props

### Console Logging
```typescript
// Add detailed logging
console.log('[Component] Action:', data);

// Use prefixes for filtering
console.log('[VideoEditor] Clip added:', clip);
console.log('[Export] FFmpeg initialized');
```

### Breakpoints
1. Add `debugger;` statement in code
2. Open browser DevTools
3. Code will pause at breakpoint

### Network Tab
- View API requests
- Check request/response payloads
- Monitor WebSocket connections

## Performance Optimization

### React Performance
- Use `React.memo` for pure components
- Use `useCallback` for event handlers passed as props
- Use `useMemo` for expensive computations
- Avoid inline object/array literals in JSX

### Bundle Size
```bash
# Analyze bundle
npm run build
# Check dist folder size
```

### Lazy Loading
```typescript
// Lazy load heavy components
const VideoForge = lazy(() => import('./pages/VideoForge'));

<Suspense fallback={<Loading />}>
  <VideoForge />
</Suspense>
```

## Deployment

### Build for Production
```bash
npm run build
# Output in dist/
```

### Environment Variables
Set in production environment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Deploy to Lovable
```bash
# Commit and push changes
git add .
git commit -m "Your changes"
git push

# Lovable auto-deploys on push
```

## Troubleshooting

### FFmpeg Not Loading
- Restart dev server (COEP headers)
- Check browser console for errors
- Try different browser

### Types Not Working
```bash
# Restart TypeScript server in VSCode
Cmd+Shift+P → TypeScript: Restart TS Server
```

### Hot Reload Not Working
```bash
# Clear cache and restart
rm -rf node_modules/.vite
npm run dev
```

### Build Errors
```bash
# Clear and rebuild
rm -rf dist node_modules/.vite
npm run build
```
