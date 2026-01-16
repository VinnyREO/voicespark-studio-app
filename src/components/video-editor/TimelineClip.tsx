import { useRef, useState, useCallback, useEffect } from 'react';
import { TimelineClip as TimelineClipType, MediaAsset, TransitionType } from '@/types/video-editor';
import { cn } from '@/lib/utils';
import { Video, Music, Image as ImageIcon, Sparkles } from 'lucide-react';
import { ClipContextMenu } from './ClipContextMenu';

interface TimelineClipProps {
  clip: TimelineClipType;
  asset: MediaAsset | undefined;
  isSelected: boolean;
  pixelsPerSecond: number;
  allClips?: TimelineClipType[];
  selectedClipIds?: string[];
  snapEnabled?: boolean;
  onSelect: (shiftKey: boolean) => void;
  onUpdate: (updates: Partial<TimelineClipType>) => void;
  onUpdateMultiple?: (clipIds: string[], getUpdates: (clip: TimelineClipType) => Partial<TimelineClipType>) => void;
  onDragStart: (e: React.DragEvent) => void;
  onSplitAudio?: (clipId: string) => void;
  onDuplicate?: (clipId: string) => void;
  onDelete?: (clipId: string) => void;
  onSplitAtPlayhead?: (clipId: string) => void;
}

export function TimelineClip({
  clip,
  asset,
  isSelected,
  pixelsPerSecond,
  allClips = [],
  selectedClipIds = [],
  snapEnabled = true,
  onSelect,
  onUpdate,
  onUpdateMultiple,
  onDragStart,
  onSplitAudio,
  onDuplicate,
  onDelete,
  onSplitAtPlayhead,
}: TimelineClipProps) {
  const clipRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'left' | 'right' | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);
  const dragStartTrack = useRef(0);
  const dragStartDuration = useRef(0);
  // Store initial positions of all selected clips when multi-drag starts
  const multiDragStartPositions = useRef<Map<string, { startTime: number; trackIndex: number }>>(new Map());

  const widthPx = clip.duration * pixelsPerSecond;
  const leftPx = clip.startTime * pixelsPerSecond;

  const getIcon = () => {
    if (!asset) return null;
    const iconClass = 'w-3 h-3 opacity-50';
    switch (asset.type) {
      case 'video':
        return <Video className={iconClass} />;
      case 'audio':
        return <Music className={iconClass} />;
      case 'image':
        return <ImageIcon className={iconClass} />;
    }
  };

  const getClipColor = () => {
    if (!asset) return 'bg-muted';
    switch (asset.type) {
      case 'video':
        return 'bg-purple-500/30 border-purple-500/50';
      case 'audio':
        return 'bg-blue-500/30 border-blue-500/50';
      case 'image':
        return 'bg-purple-400/30 border-purple-400/50';
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
    onSelect(false);
  }, [onSelect]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click

    // Prevent text selection during drag
    e.preventDefault();

    const rect = clipRef.current?.getBoundingClientRect();
    if (!rect) return;

    const relativeX = e.clientX - rect.left;
    const handleWidth = 6; // Smaller handle zone for cleaner look

    // Check if clicking on resize handles (edges only)
    if (relativeX < handleWidth) {
      setIsResizing('left');
      dragStartX.current = e.clientX;
      dragStartTime.current = clip.startTime;
      dragStartDuration.current = clip.duration;
      e.stopPropagation();
    } else if (relativeX > rect.width - handleWidth) {
      setIsResizing('right');
      dragStartX.current = e.clientX;
      dragStartTime.current = clip.startTime;
      dragStartDuration.current = clip.duration;
      e.stopPropagation();
    } else {
      setIsDragging(true);
      dragStartX.current = e.clientX;
      dragStartY.current = e.clientY;
      dragStartTime.current = clip.startTime;
      dragStartTrack.current = clip.trackIndex;

      // Store initial positions of all selected clips for multi-drag
      // Always include the current clip (it will be selected after onSelect)
      // Also include all already-selected clips
      multiDragStartPositions.current.clear();

      // Always store the clicked clip's position
      multiDragStartPositions.current.set(clip.id, {
        startTime: clip.startTime,
        trackIndex: clip.trackIndex,
      });

      // Store positions for all other selected clips
      allClips.forEach(c => {
        if (selectedClipIds.includes(c.id) && c.id !== clip.id) {
          multiDragStartPositions.current.set(c.id, {
            startTime: c.startTime,
            trackIndex: c.trackIndex,
          });
        }
      });
    }

    onSelect(e.shiftKey);
  }, [clip.id, clip.startTime, clip.trackIndex, clip.duration, onSelect, selectedClipIds, allClips]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStartX.current;
      const deltaTime = deltaX / pixelsPerSecond;
      let newStartTime = Math.max(0, dragStartTime.current + deltaTime);

      // Calculate track change based on vertical movement
      const deltaY = e.clientY - dragStartY.current;
      const trackHeight = 64; // Height of each track in pixels
      const trackDelta = Math.round(deltaY / trackHeight);
      const newTrackIndex = Math.max(0, dragStartTrack.current + trackDelta); // No upper limit - tracks expand dynamically

      // SNAPPING: Snap to other clip edges and grid when enabled
      if (snapEnabled) {
        const snapThreshold = 0.15; // seconds - generous threshold for easy snapping
        const clipEndTime = newStartTime + clip.duration;

        // Collect all clip edges from other clips (excluding current clip and other selected clips)
        const clipEdges: number[] = [];
        allClips.forEach(otherClip => {
          if (otherClip.id !== clip.id && !selectedClipIds.includes(otherClip.id)) {
            clipEdges.push(otherClip.startTime); // Start edge
            clipEdges.push(otherClip.startTime + otherClip.duration); // End edge
          }
        });

        // Also add time 0 as a snap point
        clipEdges.push(0);

        // Find closest edge for clip start
        let bestSnapStart: number | null = null;
        let bestSnapStartDist = Infinity;

        // Find closest edge for clip end
        let bestSnapEnd: number | null = null;
        let bestSnapEndDist = Infinity;

        clipEdges.forEach(edge => {
          const distToStart = Math.abs(newStartTime - edge);
          const distToEnd = Math.abs(clipEndTime - edge);

          if (distToStart < bestSnapStartDist && distToStart < snapThreshold) {
            bestSnapStart = edge;
            bestSnapStartDist = distToStart;
          }

          if (distToEnd < bestSnapEndDist && distToEnd < snapThreshold) {
            bestSnapEnd = edge;
            bestSnapEndDist = distToEnd;
          }
        });

        // Apply snapping - prefer end snapping over start snapping
        if (bestSnapEnd !== null && bestSnapEndDist < bestSnapStartDist) {
          newStartTime = bestSnapEnd - clip.duration;
        } else if (bestSnapStart !== null) {
          newStartTime = bestSnapStart;
        }

        // Ensure we never go below 0
        newStartTime = Math.max(0, newStartTime);
      }

      // If multiple clips are being dragged, move them all together
      // Use multiDragStartPositions.size to determine if we're doing a multi-drag
      // (it was populated at drag start with all selected clips + the clicked clip)
      if (multiDragStartPositions.current.size > 1 && onUpdateMultiple) {
        // Calculate delta from the dragged clip's original position
        const timeDelta = newStartTime - dragStartTime.current;
        const trackIndexDelta = newTrackIndex - dragStartTrack.current;

        // Get all clip IDs that should be moved (from our stored positions)
        const clipIdsToMove = Array.from(multiDragStartPositions.current.keys());

        // Update all clips using their stored initial positions + delta
        onUpdateMultiple(clipIdsToMove, (clipToUpdate) => {
          const initialPos = multiDragStartPositions.current.get(clipToUpdate.id);
          if (initialPos) {
            return {
              startTime: Math.max(0, initialPos.startTime + timeDelta),
              trackIndex: Math.max(0, initialPos.trackIndex + trackIndexDelta),
            };
          }
          // Fallback if initial position not found (shouldn't happen)
          return {
            startTime: Math.max(0, clipToUpdate.startTime + timeDelta),
            trackIndex: Math.max(0, clipToUpdate.trackIndex + trackIndexDelta),
          };
        });
      } else {
        onUpdate({
          startTime: newStartTime,
          trackIndex: newTrackIndex
        });
      }
    } else if (isResizing) {
      const deltaX = e.clientX - dragStartX.current;
      const deltaTime = deltaX / pixelsPerSecond;

      if (isResizing === 'left') {
        const newStartTime = Math.max(0, dragStartTime.current + deltaTime);
        const newDuration = dragStartDuration.current - (newStartTime - dragStartTime.current);
        const newTrimStart = clip.trimStart + (newStartTime - dragStartTime.current);

        if (newDuration > 0.1 && newTrimStart >= 0) {
          onUpdate({
            startTime: newStartTime,
            duration: newDuration,
            trimStart: newTrimStart,
          });
        }
      } else {
        const newDuration = Math.max(0.1, dragStartDuration.current + deltaTime);
        const maxDuration = (asset?.duration || 0) - clip.trimStart - clip.trimEnd;

        if (newDuration <= maxDuration) {
          onUpdate({ duration: newDuration });
        }
      }
    }
  }, [isDragging, isResizing, pixelsPerSecond, clip, asset, allClips, selectedClipIds, snapEnabled, onUpdate, onUpdateMultiple]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(null);
    multiDragStartPositions.current.clear();
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      // Prevent text selection globally while dragging
      document.body.style.userSelect = 'none';
      document.body.style.webkitUserSelect = 'none';

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Re-enable text selection when done
        document.body.style.userSelect = '';
        document.body.style.webkitUserSelect = '';
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <>
      <div
        ref={clipRef}
        draggable={!isDragging && !isResizing}
        onDragStart={onDragStart}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        className={cn(
          'absolute h-12 rounded-sm border overflow-hidden select-none',
          getClipColor(),
          isSelected && 'ring-2 ring-primary border-primary',
          isDragging && 'opacity-70 cursor-move z-50',
          isResizing === 'left' && 'cursor-ew-resize',
          isResizing === 'right' && 'cursor-ew-resize',
          !isDragging && !isResizing && 'cursor-grab hover:brightness-110',
        )}
        style={{
          left: `${leftPx}px`,
          width: `${widthPx}px`,
        }}
      >
      {/* Invisible left resize handle - only active on edge */}
      <div
        className="absolute left-0 top-0 w-1 h-full cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizing('left');
          dragStartX.current = e.clientX;
          dragStartTime.current = clip.startTime;
          dragStartDuration.current = clip.duration;
        }}
      />

      {/* Transition indicator */}
      {clip.transitionIn && clip.transitionIn !== 'none' && (
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-purple-500/40 to-transparent flex items-center justify-center pointer-events-none">
          <Sparkles className="w-3 h-3 text-purple-300" />
        </div>
      )}

      {/* Content */}
      <div className={cn(
        "flex items-center gap-2 px-2 h-full pointer-events-none",
        clip.transitionIn && clip.transitionIn !== 'none' && "pl-7"
      )}>
        {getIcon()}
        {asset?.thumbnail && widthPx > 60 && (
          <img
            src={asset.thumbnail}
            alt=""
            className="w-8 h-8 rounded object-cover"
          />
        )}
        <span className="text-xs font-medium truncate flex-1">
          {asset?.name || 'Unknown'}
        </span>
      </div>

      {/* Invisible right resize handle - only active on edge */}
      <div
        className="absolute right-0 top-0 w-1 h-full cursor-ew-resize"
        onMouseDown={(e) => {
          e.stopPropagation();
          setIsResizing('right');
          dragStartX.current = e.clientX;
          dragStartTime.current = clip.startTime;
          dragStartDuration.current = clip.duration;
        }}
      />
    </div>

    {/* Context Menu */}
    {contextMenu && (
      <ClipContextMenu
        clip={clip}
        asset={asset}
        position={contextMenu}
        onClose={() => setContextMenu(null)}
        onSplitAudio={onSplitAudio}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onVolumeChange={(clipId, volume, speed) => {
          const updates: Partial<TimelineClipType> = {};
          if (volume !== undefined) updates.volume = volume;
          if (speed !== undefined) updates.speed = speed;
          onUpdate(updates);
        }}
        onSplitAtPlayhead={onSplitAtPlayhead}
        onTransitionChange={(clipId, transition, duration) => {
          onUpdate({
            transitionIn: transition,
            transitionDuration: duration,
          });
        }}
      />
    )}
    </>
  );
}
