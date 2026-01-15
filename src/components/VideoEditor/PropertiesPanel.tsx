import { CaptionStyle, CAPTION_STYLE_PRESETS, TimelineClip } from '@/types/editor';
import { Type, Palette, Sparkles, AlignCenter } from 'lucide-react';

interface PropertiesPanelProps {
  selectedClip: TimelineClip | null;
  captionStyle: CaptionStyle;
  onCaptionStyleChange: (style: CaptionStyle) => void;
}

const PRESET_OPTIONS: { id: string; name: string; preview: string; colors: string }[] = [
  { id: 'hormozi', name: 'Hormozi', preview: 'BOLD IMPACT', colors: 'bg-white text-black' },
  { id: 'mrbeast', name: 'MrBeast', preview: 'COLORFUL!', colors: 'bg-yellow-400 text-red-600' },
  { id: 'documentary', name: 'Documentary', preview: 'Clean & Pro', colors: 'bg-transparent text-white border' },
  { id: 'horror', name: 'Horror', preview: 'creepy...', colors: 'bg-black/70 text-white' },
  { id: 'minimal', name: 'Minimal', preview: 'Simple', colors: 'bg-transparent text-white' },
];

const ANIMATIONS = ['none', 'fade', 'pop', 'typewriter', 'karaoke'] as const;
const POSITIONS = ['top', 'center', 'bottom'] as const;

export function PropertiesPanel({
  selectedClip,
  captionStyle,
  onCaptionStyleChange
}: PropertiesPanelProps) {
  const handlePresetChange = (presetId: string) => {
    const preset = CAPTION_STYLE_PRESETS[presetId];
    if (preset) {
      onCaptionStyleChange(preset);
    }
  };

  return (
    <div className="w-72 bg-card border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-foreground">Properties</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {selectedClip ? `Editing: ${selectedClip.name}` : 'Caption Style Settings'}
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Caption Style Presets */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Type className="w-4 h-4 text-video" />
            <span className="text-sm font-medium text-foreground">Style Preset</span>
          </div>
          <div className="space-y-2">
            {PRESET_OPTIONS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`
                  w-full p-3 rounded-lg border text-left transition-all
                  ${captionStyle.preset === preset.id
                    ? 'border-video bg-video/10'
                    : 'border-border hover:border-video/50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{preset.name}</span>
                  <span className={`text-xs px-2 py-1 rounded ${preset.colors}`}>
                    {preset.preview}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Animation */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-video" />
            <span className="text-sm font-medium text-foreground">Animation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ANIMATIONS.map((anim) => (
              <button
                key={anim}
                onClick={() => onCaptionStyleChange({ ...captionStyle, animation: anim })}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all
                  ${captionStyle.animation === anim
                    ? 'bg-video text-video-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                {anim}
              </button>
            ))}
          </div>
        </div>

        {/* Position */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <AlignCenter className="w-4 h-4 text-video" />
            <span className="text-sm font-medium text-foreground">Position</span>
          </div>
          <div className="flex gap-2">
            {POSITIONS.map((pos) => (
              <button
                key={pos}
                onClick={() => onCaptionStyleChange({ ...captionStyle, position: pos })}
                className={`
                  flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all
                  ${captionStyle.position === pos
                    ? 'bg-video text-video-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Palette className="w-4 h-4 text-video" />
            <span className="text-sm font-medium text-foreground">Colors</span>
          </div>
          
          <div className="space-y-3">
            {/* Text Color */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Text Color</span>
              <div className="flex items-center gap-2">
                <div 
                  className="w-6 h-6 rounded border border-border"
                  style={{ backgroundColor: captionStyle.color }}
                />
                <input
                  type="color"
                  value={captionStyle.color}
                  onChange={(e) => onCaptionStyleChange({ ...captionStyle, color: e.target.value })}
                  className="w-8 h-6 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Outline Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Outline</span>
              <button
                onClick={() => onCaptionStyleChange({ ...captionStyle, outline: !captionStyle.outline })}
                className={`
                  w-10 h-5 rounded-full transition-colors relative
                  ${captionStyle.outline ? 'bg-video' : 'bg-muted'}
                `}
              >
                <div className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform
                  ${captionStyle.outline ? 'left-5' : 'left-0.5'}
                `} />
              </button>
            </div>

            {/* Outline Color */}
            {captionStyle.outline && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Outline Color</span>
                <div className="flex items-center gap-2">
                  <div 
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: captionStyle.outlineColor || '#000000' }}
                  />
                  <input
                    type="color"
                    value={captionStyle.outlineColor || '#000000'}
                    onChange={(e) => onCaptionStyleChange({ ...captionStyle, outlineColor: e.target.value })}
                    className="w-8 h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="p-4 border-t border-border">
        <div className="bg-black rounded-lg h-20 flex items-center justify-center relative overflow-hidden">
          <span
            style={{
              fontFamily: captionStyle.fontFamily,
              fontSize: '16px',
              fontWeight: captionStyle.fontWeight === 'black' ? 900 : captionStyle.fontWeight === 'bold' ? 700 : 400,
              color: captionStyle.color,
              textShadow: captionStyle.outline 
                ? `1px 1px 0 ${captionStyle.outlineColor}, -1px -1px 0 ${captionStyle.outlineColor}`
                : undefined
            }}
          >
            Preview Text
          </span>
        </div>
      </div>
    </div>
  );
}
