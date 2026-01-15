import { Voice } from '@/types';
import { Play, Pause, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface VoiceCardProps {
  voice: Voice;
  isSelected: boolean;
  onSelect: () => void;
}

export function VoiceCard({ voice, isSelected, onSelect }: VoiceCardProps) {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPreviewPlaying(!isPreviewPlaying);
    // In a real app, this would play a voice sample
    setTimeout(() => setIsPreviewPlaying(false), 2000);
  };

  const typeIcon = voice.type === 'Male' ? '♂' : voice.type === 'Female' ? '♀' : '◎';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative w-full p-4 rounded-xl border text-left transition-all duration-200',
        'hover:bg-secondary/50',
        isSelected
          ? 'border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
          : 'border-border bg-card hover:border-primary/50'
      )}
    >
      {voice.popular && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-amber-400">
          <Star className="w-3 h-3 fill-current" />
          Popular
        </div>
      )}

      {isSelected && (
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{voice.name}</h3>
            <span className="text-xs text-muted-foreground">{typeIcon}</span>
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
              {voice.tone}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {voice.description}
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={handlePreview}
          className={cn(
            'shrink-0 w-9 h-9 rounded-full border-border',
            isPreviewPlaying && 'bg-primary text-primary-foreground border-primary'
          )}
        >
          {isPreviewPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </Button>
      </div>
    </button>
  );
}
