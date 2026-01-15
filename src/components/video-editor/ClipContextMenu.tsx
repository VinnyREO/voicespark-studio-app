import { useEffect, useRef } from 'react';
import { TimelineClip as TimelineClipType, MediaAsset, TransitionType } from '@/types/video-editor';
import { Scissors, Volume2, Copy, Trash2, Music, Film, Sparkles, Check, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, CircleDot } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

interface ClipContextMenuProps {
  clip: TimelineClipType;
  asset: MediaAsset | undefined;
  position: { x: number; y: number };
  onClose: () => void;
  onSplitAudio?: (clipId: string) => void;
  onDuplicate?: (clipId: string) => void;
  onDelete?: (clipId: string) => void;
  onVolumeChange?: (clipId: string, volume?: number, speed?: number) => void;
  onSplitAtPlayhead?: (clipId: string) => void;
  onTransitionChange?: (clipId: string, transition: TransitionType, duration?: number) => void;
}

export function ClipContextMenu({
  clip,
  asset,
  position,
  onClose,
  onSplitAudio,
  onDuplicate,
  onDelete,
  onVolumeChange,
  onSplitAtPlayhead,
  onTransitionChange,
}: ClipContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const hasAudio = asset?.type === 'video';
  const hasVolume = asset?.type === 'video' || asset?.type === 'audio';
  const hasVisual = asset?.type === 'video' || asset?.type === 'image';

  const transitionOptions: { type: TransitionType; label: string; icon: React.ReactNode }[] = [
    { type: 'none', label: 'No Transition', icon: <Scissors className="w-4 h-4" /> },
    { type: 'fade', label: 'Fade', icon: <CircleDot className="w-4 h-4" /> },
    { type: 'dissolve', label: 'Dissolve', icon: <Sparkles className="w-4 h-4" /> },
    { type: 'wipe-left', label: 'Wipe Left', icon: <ArrowLeft className="w-4 h-4" /> },
    { type: 'wipe-right', label: 'Wipe Right', icon: <ArrowRight className="w-4 h-4" /> },
    { type: 'zoom-in', label: 'Zoom In', icon: <ZoomIn className="w-4 h-4" /> },
    { type: 'zoom-out', label: 'Zoom Out', icon: <ZoomOut className="w-4 h-4" /> },
  ];

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const menu = menuRef.current;

      // Adjust horizontal position
      if (rect.right > window.innerWidth) {
        menu.style.left = `${position.x - rect.width}px`;
      }

      // Adjust vertical position
      if (rect.bottom > window.innerHeight) {
        menu.style.top = `${position.y - rect.height}px`;
      }
    }
  }, [position]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[240px] bg-card border border-border rounded-lg shadow-2xl py-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Clip info header */}
      <div className="px-4 py-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          {asset?.type === 'video' && <Film className="w-4 h-4 text-purple-500" />}
          {asset?.type === 'audio' && <Music className="w-4 h-4 text-pink-500" />}
          <span className="text-sm font-medium truncate">{asset?.name || 'Unknown'}</span>
        </div>
      </div>

      {/* Volume control (for video/audio clips) */}
      {hasVolume && (
        <div className="px-4 py-3 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-muted-foreground mb-2">
                Volume: {Math.round((clip.volume ?? 1) * 100)}%
              </div>
              <Slider
                value={[(clip.volume ?? 1) * 100]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) => {
                  onVolumeChange?.(clip.id, values[0] / 100);
                }}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Speed control (for all clip types) */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-2">
              Speed: {(clip.speed ?? 1).toFixed(2)}x
            </div>
            <Slider
              value={[(clip.speed ?? 1) * 100]}
              min={25}
              max={400}
              step={5}
              onValueChange={(values) => {
                onVolumeChange?.(clip.id, undefined, values[0] / 100);
              }}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground/60 mt-1">
              <span>0.25x</span>
              <span>1x</span>
              <span>4x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transitions (for video/image clips) */}
      {hasVisual && onTransitionChange && (
        <div className="border-b border-border/50">
          <div className="px-4 py-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-medium text-muted-foreground">Transition In</span>
          </div>
          <div className="px-2 pb-2 grid grid-cols-2 gap-1">
            {transitionOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => {
                  onTransitionChange(clip.id, option.type, option.type === 'none' ? 0 : 0.5);
                }}
                className={cn(
                  'px-3 py-1.5 text-xs rounded flex items-center gap-2 transition-colors',
                  clip.transitionIn === option.type || (!clip.transitionIn && option.type === 'none')
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent text-muted-foreground'
                )}
              >
                {option.icon}
                <span>{option.label}</span>
                {(clip.transitionIn === option.type || (!clip.transitionIn && option.type === 'none')) && (
                  <Check className="w-3 h-3 ml-auto" />
                )}
              </button>
            ))}
          </div>
          {/* Transition duration slider */}
          {clip.transitionIn && clip.transitionIn !== 'none' && (
            <div className="px-4 pb-3">
              <div className="text-xs text-muted-foreground mb-2">
                Duration: {(clip.transitionDuration ?? 0.5).toFixed(1)}s
              </div>
              <Slider
                value={[(clip.transitionDuration ?? 0.5) * 10]}
                min={1}
                max={20}
                step={1}
                onValueChange={(values) => {
                  onTransitionChange(clip.id, clip.transitionIn!, values[0] / 10);
                }}
                className="w-full"
              />
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="py-1">
        {/* Split audio (only for video clips) */}
        {hasAudio && onSplitAudio && (
          <button
            onClick={() => handleAction(() => onSplitAudio(clip.id))}
            className={cn(
              'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
              'hover:bg-accent transition-colors'
            )}
          >
            <Music className="w-4 h-4" />
            <span>Split Audio from Video</span>
          </button>
        )}

        {/* Split at playhead */}
        {onSplitAtPlayhead && (
          <button
            onClick={() => handleAction(() => onSplitAtPlayhead(clip.id))}
            className={cn(
              'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
              'hover:bg-accent transition-colors'
            )}
          >
            <Scissors className="w-4 h-4" />
            <span>Split Clip at Playhead</span>
          </button>
        )}

        {/* Duplicate */}
        {onDuplicate && (
          <button
            onClick={() => handleAction(() => onDuplicate(clip.id))}
            className={cn(
              'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
              'hover:bg-accent transition-colors'
            )}
          >
            <Copy className="w-4 h-4" />
            <span>Duplicate Clip</span>
          </button>
        )}

        {/* Delete */}
        {onDelete && (
          <>
            <div className="my-1 border-t border-border/50" />
            <button
              onClick={() => handleAction(() => onDelete(clip.id))}
              className={cn(
                'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
                'hover:bg-destructive/10 text-destructive transition-colors'
              )}
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Clip</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
