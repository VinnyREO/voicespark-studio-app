# Styling & Design System

## Color System

### VoiceForge Theme (Cyan/Teal)
```css
--primary: #06b6d4 (cyan-500)
--secondary: #22d3ee (cyan-400)
--glow: rgba(6, 182, 212, 0.4)
```

### VideoForge Theme (Purple/Pink)
```css
--primary: #a855f7 (purple-500)
--hover: #9333ea (purple-600)
--glow: rgba(168, 85, 247, 0.4)
```

### Base Colors (Dark Theme)
```css
--background: hsl(222.2 84% 4.9%)
--foreground: hsl(210 40% 98%)
--card: hsl(222.2 84% 4.9%)
--card-foreground: hsl(210 40% 98%)
--popover: hsl(222.2 84% 4.9%)
--primary: hsl(210 40% 98%)
--muted: hsl(217.2 32.6% 17.5%)
--destructive: hsl(0 62.8% 30.6%)
--border: hsl(217.2 32.6% 17.5%)
```

## Typography

### Font Families
- **Primary**: Plus Jakarta Sans (sans-serif)
- **Monospace**: JetBrains Mono

### Font Sizes (Tailwind Scale)
- `text-xs`: 0.75rem (12px)
- `text-sm`: 0.875rem (14px)
- `text-base`: 1rem (16px)
- `text-lg`: 1.125rem (18px)
- `text-xl`: 1.25rem (20px)
- `text-2xl`: 1.5rem (24px)
- `text-3xl`: 1.875rem (30px)
- `text-4xl`: 2.25rem (36px)

## Spacing & Layout

### Container
```typescript
container: {
  center: true,
  padding: '2rem',
  screens: { '2xl': '1400px' }
}
```

### Common Spacing
- `p-4`: 1rem (16px)
- `gap-3`: 0.75rem (12px)
- `space-y-6`: 1.5rem (24px) vertical spacing

## Component Styling Patterns

### Cards
```tsx
<div className="rounded-xl border border-border bg-card p-5">
  {/* Card content */}
</div>
```

### Buttons (Primary)
```tsx
<button className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md">
  Click Me
</button>
```

### Gradients
```tsx
<div className="bg-gradient-to-br from-primary to-cyan-400" />
```

### Glow Effects
```tsx
<div className="shadow-lg shadow-primary/20">
  Glowing element
</div>
```

## Tailwind Configuration

Key customizations in `tailwind.config.ts`:
- Custom fonts
- Extended color palette
- Custom animations (shimmer, float)
- Gradient utilities
