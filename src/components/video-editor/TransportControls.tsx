import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface TransportControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  onPlayPause: () => void;
  onSeekToStart: () => void;
  onSeekToEnd: () => void;
  onVolumeChange: (volume: number) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function TransportControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  onPlayPause,
  onSeekToStart,
  onSeekToEnd,
  onVolumeChange,
}: TransportControlsProps) {
  const isMuted = volume === 0;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card/30">
      {/* Left - Playback Controls */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onSeekToStart}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipBack className="w-5 h-5" />
        </Button>

        <Button
          onClick={onPlayPause}
          size="icon"
          className={cn(
            'w-12 h-12 rounded-full glow-button',
            'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {isPlaying ? (
            <Pause className="w-6 h-6" />
          ) : (
            <Play className="w-6 h-6 ml-0.5" />
          )}
        </Button>

        <Button
          onClick={onSeekToEnd}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground"
        >
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>

      {/* Center - Time Display */}
      <div className="flex items-center gap-3 font-mono text-sm">
        <span className="text-foreground tabular-nums">{formatTime(currentTime)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground tabular-nums">{formatTime(duration)}</span>
      </div>

      {/* Right - Volume Control */}
      <div className="flex items-center gap-3 w-40">
        <Button
          onClick={() => onVolumeChange(isMuted ? 1 : 0)}
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground shrink-0"
        >
          {isMuted ? (
            <VolumeX className="w-5 h-5" />
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </Button>

        <Slider
          value={[volume * 100]}
          min={0}
          max={100}
          step={1}
          onValueChange={(values) => onVolumeChange(values[0] / 100)}
          className="flex-1"
        />
      </div>
    </div>
  );
}
