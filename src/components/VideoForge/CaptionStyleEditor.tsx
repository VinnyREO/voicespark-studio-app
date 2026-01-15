import { CaptionStyle, CaptionPreset } from '@/types/video';
import { CAPTION_PRESETS } from '@/config/videoTemplates';
import { Type, Palette, Sparkles } from 'lucide-react';

interface CaptionStyleEditorProps {
  style: CaptionStyle;
  onChange: (style: CaptionStyle) => void;
}

const PRESET_OPTIONS: { id: CaptionPreset; name: string; preview: string }[] = [
  { id: 'hormozi', name: 'Hormozi', preview: 'BOLD & PUNCHY' },
  { id: 'mrbeast', name: 'MrBeast', preview: 'COLORFUL!' },
  { id: 'documentary', name: 'Documentary', preview: 'Clean and professional' },
  { id: 'horror', name: 'Horror', preview: 'dark and creepy' },
  { id: 'minimal', name: 'Minimal', preview: 'Simple and elegant' },
];

export function CaptionStyleEditor({ style, onChange }: CaptionStyleEditorProps) {
  const handlePresetChange = (presetId: CaptionPreset) => {
    const preset = CAPTION_PRESETS[presetId];
    if (preset) {
      onChange(preset);
    }
  };

  return (
    <div className="space-y-4">
      {/* Preset Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2 text-foreground">
          <Type className="w-4 h-4" />
          Caption Style Preset
        </label>
        <div className="grid grid-cols-1 gap-2">
          {PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetChange(preset.id)}
              className={`
                p-3 rounded-lg border text-left transition-all
                ${style.preset === preset.id 
                  ? 'border-video bg-video/10' 
                  : 'border-border hover:border-muted-foreground'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm text-foreground">{preset.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${style.preset === preset.id ? 'bg-video/20 text-video' : 'bg-secondary text-muted-foreground'}`}>
                  {preset.preview}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Animation Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium flex items-center gap-2 text-foreground">
          <Sparkles className="w-4 h-4" />
          Animation
        </label>
        <div className="flex flex-wrap gap-2">
          {(['none', 'fade', 'pop', 'typewriter', 'bounce', 'shake'] as const).map((anim) => (
            <button
              key={anim}
              onClick={() => onChange({ ...style, animation: anim })}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize
                ${style.animation === anim 
                  ? 'bg-video text-video-foreground' 
                  : 'bg-secondary text-muted-foreground hover:bg-muted'
                }
              `}
            >
              {anim}
            </button>
          ))}
        </div>
      </div>

      {/* Position Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Position</label>
        <div className="flex gap-2">
          {(['top', 'center', 'bottom'] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => onChange({ ...style, position: pos })}
              className={`
                flex-1 py-2 rounded-lg text-xs font-medium transition-all capitalize
                ${style.position === pos 
                  ? 'bg-video text-video-foreground' 
                  : 'bg-secondary text-muted-foreground hover:bg-muted'
                }
              `}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Preview Box */}
      <div className="mt-4 aspect-video bg-background rounded-lg relative overflow-hidden border border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-transparent" />
        <div className={`absolute inset-x-0 px-4 flex items-center justify-center ${
          style.position === 'top' ? 'top-4' : 
          style.position === 'bottom' ? 'bottom-4' : 
          'top-1/2 -translate-y-1/2'
        }`}>
          <span 
            className="text-lg font-bold px-2 py-1 rounded"
            style={{
              color: style.color,
              backgroundColor: style.backgroundColor,
              textShadow: style.outline ? `2px 2px 0 ${style.outlineColor}` : 'none'
            }}
          >
            Preview Text
          </span>
        </div>
      </div>
    </div>
  );
}
