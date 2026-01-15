import { VisualSource, FacelessNiche } from '@/types/video';
import { GAMEPLAY_OPTIONS } from '@/config/videoTemplates';
import { 
  Image, 
  Gamepad2, 
  Sparkles, 
  Upload, 
  Play,
  Info
} from 'lucide-react';
import { useState } from 'react';
import { ReactNode } from 'react';

interface VisualSourceSelectorProps {
  selected: VisualSource;
  niche: FacelessNiche;
  onChange: (source: VisualSource) => void;
}

const SOURCE_OPTIONS: { id: VisualSource; name: string; icon: ReactNode; description: string }[] = [
  { id: 'stock', name: 'Stock Footage', icon: <Image className="w-5 h-5" />, description: 'Auto-matched from Pexels' },
  { id: 'gameplay', name: 'Gameplay', icon: <Gamepad2 className="w-5 h-5" />, description: 'Satisfying background gameplay' },
  { id: 'ai-images', name: 'AI Generated', icon: <Sparkles className="w-5 h-5" />, description: 'Generate visuals with AI' },
  { id: 'upload', name: 'Upload', icon: <Upload className="w-5 h-5" />, description: 'Use your own footage' },
];

export function VisualSourceSelector({ selected, niche, onChange }: VisualSourceSelectorProps) {
  const [selectedGameplay, setSelectedGameplay] = useState('minecraft-parkour');

  return (
    <div className="space-y-4">
      {/* Source Type Selection */}
      <div className="grid grid-cols-2 gap-3">
        {SOURCE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={`
              p-3 rounded-lg border transition-all text-left
              ${selected === option.id 
                ? 'border-video bg-video/10' 
                : 'border-border bg-card hover:border-muted-foreground'
              }
            `}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${selected === option.id ? 'bg-video text-video-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {option.icon}
            </div>
            <p className="font-medium text-sm text-foreground">{option.name}</p>
            <p className="text-xs text-muted-foreground">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Gameplay Sub-options */}
      {selected === 'gameplay' && (
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <p className="text-sm font-medium text-foreground mb-3">Select Gameplay Style</p>
          <div className="flex flex-wrap gap-2">
            {GAMEPLAY_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedGameplay(option.id)}
                className={`
                  px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-all
                  ${selectedGameplay === option.id 
                    ? 'bg-video text-video-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }
                `}
              >
                <Play className="w-3 h-3" />
                {option.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stock Footage Preview */}
      {selected === 'stock' && (
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              AI will automatically find matching stock footage based on your script content.
              <br />
              <span className="text-foreground">Keywords detected:</span> Based on niche "{niche}"
            </p>
          </div>
        </div>
      )}

      {/* AI Images Info */}
      {selected === 'ai-images' && (
        <div className="p-4 rounded-lg bg-secondary border border-border">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-video" />
            <p>
              Generate unique images for each scene using AI. 
              <span className="text-video"> Requires additional credits.</span>
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {selected === 'upload' && (
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-video/50 transition-colors cursor-pointer">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-foreground mb-1">
            Drag and drop video files or browse
          </p>
          <p className="text-xs text-muted-foreground">MP4, MOV, WEBM up to 500MB</p>
        </div>
      )}
    </div>
  );
}
