import { useState, useCallback } from 'react';
import { TimelineClip as TimelineClipType, MediaAsset } from '@/types/video-editor';
import { TimelineClip } from './TimelineClip';
import { TrackContextMenu } from './TrackContextMenu';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';

interface TimelineTrackProps {
  trackIndex: number;
  clips: TimelineClipType[];
  assets: MediaAsset[];
  selectedClipIds: string[];
  pixelsPerSecond: number;
  snapEnabled?: boolean;
  onSelectClip: (clipId: string, shiftKey: boolean) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClipType>) => void;
  onUpdateMultipleClips?: (clipIds: string[], getUpdates: (clip: TimelineClipType) => Partial<TimelineClipType>) => void;
  onDropAsset?: (asset: MediaAsset, trackIndex: number, timePosition: number) => void;
  onDropExternalFile?: (file: File, trackIndex: number, timePosition: number) => void;
  onDeselectAll?: () => void;
  onSplitAudio?: (clipId: string) => void;
  onDuplicate?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  onSplitClipAtPlayhead?: (clipId: string) => void;
  trackVolume?: number;
  trackSpeed?: number;
  trackVisible?: boolean;
  trackMuted?: boolean;
  onTrackVolumeChange?: (trackIndex: number, volume: number) => void;
  onTrackSpeedChange?: (trackIndex: number, speed: number) => void;
  onTrackVisibleChange?: (trackIndex: number, visible: boolean) => void;
  onTrackMutedChange?: (trackIndex: number, muted: boolean) => void;
}

export function TimelineTrack({
  trackIndex,
  clips,
  assets,
  selectedClipIds,
  pixelsPerSecond,
  snapEnabled = true,
  onSelectClip,
  onUpdateClip,
  onUpdateMultipleClips,
  onDropAsset,
  onDropExternalFile,
  onDeselectAll,
  onSplitAudio,
  onDuplicate,
  onDeleteClip,
  onSplitClipAtPlayhead,
  trackVolume = 1,
  trackSpeed = 1,
  trackVisible = true,
  trackMuted = false,
  onTrackVolumeChange,
  onTrackSpeedChange,
  onTrackVisibleChange,
  onTrackMutedChange,
}: TimelineTrackProps) {
  const trackClips = clips.filter(c => c.trackIndex === trackIndex);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleTrackClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on the track (not on a clip)
    if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('clips-container')) {
      onDeselectAll?.();
    }
  };

  const handleTrackLabelContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent global handler from also processing this

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left;
    const timePosition = relativeX / pixelsPerSecond;

    // Check for external file drop
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (onDropExternalFile) {
        const file = e.dataTransfer.files[0];
        await onDropExternalFile(file, trackIndex, timePosition);
      }
      return;
    }

    // Check for internal asset drop (from media panel)
    const assetData = e.dataTransfer.getData('application/json');
    if (assetData && onDropAsset) {
      try {
        const asset = JSON.parse(assetData) as MediaAsset;
        onDropAsset(asset, trackIndex, timePosition);
      } catch (error) {
        console.error('Failed to parse dropped asset:', error);
      }
    }
  };

  return (
    <div
      data-drop-zone="timeline-track"
      className={cn(
        'relative h-16 border-b border-border/40 bg-card/20',
        'hover:bg-card/30 transition-colors'
      )}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleTrackClick}
    >
      {/* Track label */}
      <div
        className="absolute left-0 top-0 h-full w-20 flex flex-col items-center justify-center gap-1 border-r border-border/60 bg-card/60 text-xs font-medium text-muted-foreground z-10"
        onContextMenu={handleTrackLabelContextMenu}
        title="Right-click for track settings"
      >
        <div className="text-xs font-medium">Track {trackIndex + 1}</div>
        <div className="flex items-center gap-1">
          {/* Visibility toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrackVisibleChange?.(trackIndex, !trackVisible);
            }}
            className="p-0.5 rounded hover:bg-accent transition-colors"
            title={trackVisible ? "Hide track" : "Show track"}
          >
            {trackVisible ? (
              <Eye className="w-3 h-3" />
            ) : (
              <EyeOff className="w-3 h-3 opacity-50" />
            )}
          </button>

          {/* Mute toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onTrackMutedChange?.(trackIndex, !trackMuted);
            }}
            className="p-0.5 rounded hover:bg-accent transition-colors"
            title={trackMuted ? "Unmute track" : "Mute track"}
          >
            {trackMuted ? (
              <VolumeX className="w-3 h-3 opacity-50" />
            ) : (
              <Volume2 className="w-3 h-3" />
            )}
          </button>
        </div>
      </div>

      {/* Clips container - extends full timeline width */}
      <div className={cn(
        "clips-container absolute left-20 right-0 top-2 h-12",
        !trackVisible && "opacity-30"
      )}>
        {trackClips.map(clip => {
          const asset = assets.find(a => a.id === clip.assetId);
          return (
            <TimelineClip
              key={clip.id}
              clip={clip}
              asset={asset}
              isSelected={selectedClipIds.includes(clip.id)}
              pixelsPerSecond={pixelsPerSecond}
              allClips={clips}
              selectedClipIds={selectedClipIds}
              snapEnabled={snapEnabled}
              onSelect={(shiftKey) => onSelectClip(clip.id, shiftKey)}
              onUpdate={(updates) => onUpdateClip(clip.id, updates)}
              onUpdateMultiple={onUpdateMultipleClips}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', clip.id);
              }}
              onSplitAudio={onSplitAudio}
              onDuplicate={onDuplicate}
              onDelete={onDeleteClip}
              onSplitAtPlayhead={onSplitClipAtPlayhead}
            />
          );
        })}
      </div>

      {/* Track Context Menu */}
      {contextMenu && onTrackVolumeChange && onTrackSpeedChange && (
        <TrackContextMenu
          trackIndex={trackIndex}
          trackVolume={trackVolume}
          trackSpeed={trackSpeed}
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          onVolumeChange={onTrackVolumeChange}
          onSpeedChange={onTrackSpeedChange}
        />
      )}
    </div>
  );
}
