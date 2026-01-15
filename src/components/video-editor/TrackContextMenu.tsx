import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Volume2 } from 'lucide-react';

interface TrackContextMenuProps {
  trackIndex: number;
  trackVolume: number;
  trackSpeed: number;
  position: { x: number; y: number };
  onClose: () => void;
  onVolumeChange: (trackIndex: number, volume: number) => void;
  onSpeedChange: (trackIndex: number, speed: number) => void;
}

export function TrackContextMenu({
  trackIndex,
  trackVolume,
  trackSpeed,
  position,
  onClose,
  onVolumeChange,
  onSpeedChange,
}: TrackContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[240px] bg-card border border-border rounded-lg shadow-2xl py-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Track info header */}
      <div className="px-4 py-2 border-b border-border/50">
        <div className="text-sm font-medium">Track {trackIndex + 1} Controls</div>
        <div className="text-xs text-muted-foreground">Applies to all clips on this track</div>
      </div>

      {/* Volume control */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-2">
              Volume: {Math.round(trackVolume * 100)}%
            </div>
            <Slider
              value={[trackVolume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => {
                onVolumeChange(trackIndex, values[0] / 100);
              }}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Speed control */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-2">
              Speed: {trackSpeed.toFixed(2)}x
            </div>
            <Slider
              value={[trackSpeed * 100]}
              min={25}
              max={400}
              step={5}
              onValueChange={(values) => {
                onSpeedChange(trackIndex, values[0] / 100);
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
    </div>
  );
}
