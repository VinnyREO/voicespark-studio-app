import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface WaveformProps {
  isPlaying: boolean;
  progress: number; // 0 to 1
  onClick?: (progress: number) => void;
}

export function Waveform({ isPlaying, progress, onClick }: WaveformProps) {
  // Generate pseudo-random waveform bars
  const bars = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => {
      const seed = Math.sin(i * 12.9898) * 43758.5453;
      const height = 20 + (seed - Math.floor(seed)) * 80;
      return height;
    });
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newProgress = x / rect.width;
    onClick(Math.max(0, Math.min(1, newProgress)));
  };

  return (
    <div
      onClick={handleClick}
      className="relative h-16 flex items-center gap-[2px] cursor-pointer group"
    >
      {bars.map((height, i) => {
        const barProgress = i / bars.length;
        const isPast = barProgress < progress;
        
        return (
          <div
            key={i}
            className={cn(
              'flex-1 rounded-full transition-all duration-150',
              isPast ? 'bg-primary' : 'bg-muted-foreground/30',
              isPlaying && isPast && 'waveform-bar'
            )}
            style={{
              height: `${height}%`,
              animationDelay: `${i * 0.02}s`,
            }}
          />
        );
      })}

      {/* Progress indicator */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_hsl(var(--primary))] transition-all duration-100"
        style={{ left: `${progress * 100}%` }}
      />

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
    </div>
  );
}
