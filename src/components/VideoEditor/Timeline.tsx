import { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Film, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff,
  ZoomIn,
  ZoomOut,
  Plus,
  GripVertical
} from 'lucide-react';
import { EditorState, TimelineTrack, TimelineClip, MediaItem } from '@/types/editor';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

interface TimelineProps {
  editorState: EditorState;
  tracks: TimelineTrack[];
  onClipSelect: (clipId: string, trackId: string) => void;
  onClipMove: (clipId: string, trackId: string, newStartTime: number) => void;
  onClipMoveToTrack: (clipId: string, fromTrackId: string, toTrackId: string, newStartTime: number) => void;
  onClipResize: (clipId: string, trackId: string, newDuration: number, trimStart?: number) => void;
  onClipDelete: (clipId: string, trackId: string) => void;
  onSeek: (time: number) => void;
  onZoomChange: (zoom: number) => void;
  onDropMedia: (item: MediaItem, trackId: string, startTime: number) => void;
  onDropFile?: (file: File, trackId: string, startTime: number) => Promise<void>;
  onTrackToggleLock: (trackId: string) => void;
  onTrackToggleVisible: (trackId: string) => void;
  onAddTrack: () => void;
  draggingMedia: MediaItem | null;
}

// Single unified color for all clips
const CLIP_COLOR = 'bg-video/70 border-video';
const TRACK_HIGHLIGHT_COLOR = 'ring-2 ring-video/50 bg-video/10';

export function Timeline({
  editorState,
  tracks,
  onClipSelect,
  onClipMove,
  onClipMoveToTrack,
  onClipResize,
  onClipDelete,
  onSeek,
  onZoomChange,
  onDropMedia,
  onDropFile,
  onTrackToggleLock,
  onTrackToggleVisible,
  onAddTrack,
  draggingMedia
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const tracksContainerRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const [draggingClip, setDraggingClip] = useState<{ 
    clipId: string; 
    trackId: string; 
    offsetX: number;
    startTime: number;
    duration: number;
    clip: TimelineClip;
  } | null>(null);
  const [ghostPosition, setGhostPosition] = useState<{ time: number; trackId: string } | null>(null);
  const [hoverTrackId, setHoverTrackId] = useState<string | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<number | null>(null);
  const [resizingClip, setResizingClip] = useState<{
    clipId: string;
    trackId: string;
    edge: 'left' | 'right';
    initialDuration: number;
    initialStart: number;
    initialTrimStart: number;
  } | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Track shift key for disabling snap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftPressed(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pixels per second based on zoom
  const pixelsPerSecond = 50 * editorState.zoom;
  const trackLabelWidth = 120;
  const SNAP_THRESHOLD = 10; // pixels

  // Generate time markers
  const timeMarkers = [];
  const markerInterval = editorState.zoom > 1.5 ? 10 : editorState.zoom > 0.5 ? 30 : 60;
  for (let t = 0; t <= editorState.duration; t += markerInterval) {
    timeMarkers.push(t);
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Convert X position to time
  const xToTime = useCallback((clientX: number, containerRect: DOMRect) => {
    const x = clientX - containerRect.left;
    return Math.max(0, x / pixelsPerSecond);
  }, [pixelsPerSecond]);

  // Get snap points for snapping logic
  const getSnapPoints = useCallback((excludeClipId?: string) => {
    const points: number[] = [0, editorState.currentTime]; // Start and playhead
    
    // Add major time markers
    for (let t = 0; t <= editorState.duration; t += 30) {
      points.push(t);
    }
    
    // Add clip edges
    tracks.forEach(track => {
      track.clips.forEach(clip => {
        if (clip.id !== excludeClipId) {
          points.push(clip.startTime);
          points.push(clip.startTime + clip.duration);
        }
      });
    });
    
    return [...new Set(points)].sort((a, b) => a - b);
  }, [tracks, editorState.currentTime, editorState.duration]);

  // Find nearest snap point
  const findSnapPoint = useCallback((time: number, excludeClipId?: string): number | null => {
    if (isShiftPressed) return null;
    
    const snapPoints = getSnapPoints(excludeClipId);
    const timeX = time * pixelsPerSecond;
    
    for (const point of snapPoints) {
      const pointX = point * pixelsPerSecond;
      if (Math.abs(pointX - timeX) < SNAP_THRESHOLD) {
        return point;
      }
    }
    return null;
  }, [getSnapPoints, pixelsPerSecond, isShiftPressed]);

  // Handle clicking on timeline ruler or track area to seek
  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDraggingPlayhead || draggingClip || resizingClip) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('[data-clip]')) return;
    
    if (!tracksContainerRef.current) return;
    const rect = tracksContainerRef.current.getBoundingClientRect();
    const time = xToTime(e.clientX, rect);
    onSeek(Math.min(time, editorState.duration));
  };

  // Handle playhead drag
  const handlePlayheadMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  };

  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksContainerRef.current) return;
      const rect = tracksContainerRef.current.getBoundingClientRect();
      const time = xToTime(e.clientX, rect);
      onSeek(Math.min(Math.max(0, time), editorState.duration));
    };

    const handleMouseUp = () => {
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, xToTime, editorState.duration, onSeek]);

  // Handle clip dragging for repositioning
  const handleClipMouseDown = (e: React.MouseEvent, clip: TimelineClip, trackId: string) => {
    if (e.button !== 0) return; // Only left click
    e.stopPropagation();
    
    const clipElement = e.currentTarget as HTMLElement;
    const rect = clipElement.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    
    setDraggingClip({ 
      clipId: clip.id, 
      trackId, 
      offsetX,
      startTime: clip.startTime,
      duration: clip.duration,
      clip
    });
    onClipSelect(clip.id, trackId);
  };

  // Track which track the mouse is over during clip drag
  const handleTrackMouseEnter = useCallback((trackId: string) => {
    if (draggingClip) {
      setHoverTrackId(trackId);
    }
  }, [draggingClip]);

  const handleTrackMouseLeave = useCallback(() => {
    if (draggingClip) {
      setHoverTrackId(null);
    }
  }, [draggingClip]);

  useEffect(() => {
    if (!draggingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksContainerRef.current || !timelineRef.current) return;
      const rect = tracksContainerRef.current.getBoundingClientRect();
      let time = xToTime(e.clientX - draggingClip.offsetX, rect);
      
      // Check for snap
      const snapPoint = findSnapPoint(time, draggingClip.clipId);
      if (snapPoint !== null) {
        time = snapPoint;
        setSnapIndicator(snapPoint);
      } else {
        // Also check clip end for snapping
        const endSnapPoint = findSnapPoint(time + draggingClip.duration, draggingClip.clipId);
        if (endSnapPoint !== null) {
          time = endSnapPoint - draggingClip.duration;
          setSnapIndicator(endSnapPoint);
        } else {
          setSnapIndicator(null);
        }
      }
      
      // Determine target track based on mouse Y position
      const targetTrackId = hoverTrackId || draggingClip.trackId;
      const targetTrack = tracks.find(t => t.id === targetTrackId);
      if (!targetTrack) return;

      // Check for overlap with other clips on target track
      let newStartTime = Math.max(0, time);
      const otherClips = targetTrack.clips.filter(c => c.id !== draggingClip.clipId);
      
      for (const clip of otherClips) {
        const clipEnd = clip.startTime + clip.duration;
        const movingClipEnd = newStartTime + draggingClip.duration;
        
        if (newStartTime < clipEnd && movingClipEnd > clip.startTime) {
          if (Math.abs(newStartTime - clipEnd) < Math.abs(movingClipEnd - clip.startTime)) {
            newStartTime = clipEnd;
          } else {
            newStartTime = clip.startTime - draggingClip.duration;
          }
        }
      }

      setGhostPosition({ time: Math.max(0, newStartTime), trackId: targetTrackId });
    };

    const handleMouseUp = () => {
      if (draggingClip && ghostPosition) {
        const targetTrackId = ghostPosition.trackId;
        const newStartTime = ghostPosition.time;
        
        if (targetTrackId !== draggingClip.trackId) {
          // Moving to a different track
          onClipMoveToTrack(draggingClip.clipId, draggingClip.trackId, targetTrackId, newStartTime);
        } else {
          // Same track, just update position
          onClipMove(draggingClip.clipId, draggingClip.trackId, newStartTime);
        }
      }
      
      setDraggingClip(null);
      setGhostPosition(null);
      setSnapIndicator(null);
      setHoverTrackId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingClip, tracks, xToTime, onClipMove, onClipMoveToTrack, findSnapPoint, hoverTrackId, ghostPosition]);

  // Handle clip resizing
  const handleResizeMouseDown = (e: React.MouseEvent, clip: TimelineClip, trackId: string, edge: 'left' | 'right') => {
    e.stopPropagation();
    e.preventDefault();
    
    setResizingClip({
      clipId: clip.id,
      trackId,
      edge,
      initialDuration: clip.duration,
      initialStart: clip.startTime,
      initialTrimStart: clip.trimStart
    });
    onClipSelect(clip.id, trackId);
  };

  useEffect(() => {
    if (!resizingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!tracksContainerRef.current) return;
      const rect = tracksContainerRef.current.getBoundingClientRect();
      const currentTime = xToTime(e.clientX, rect);
      
      const track = tracks.find(t => t.id === resizingClip.trackId);
      const clip = track?.clips.find(c => c.id === resizingClip.clipId);
      if (!clip) return;

      if (resizingClip.edge === 'right') {
        // Resize from right edge
        let newDuration = Math.max(1, currentTime - clip.startTime);
        
        // Snap to points
        const snapPoint = findSnapPoint(clip.startTime + newDuration, resizingClip.clipId);
        if (snapPoint !== null) {
          newDuration = snapPoint - clip.startTime;
          setSnapIndicator(snapPoint);
        } else {
          setSnapIndicator(null);
        }
        
        onClipResize(resizingClip.clipId, resizingClip.trackId, Math.max(1, newDuration));
      } else {
        // Resize from left edge - adjust start time and trim
        let newStart = Math.max(0, currentTime);
        
        // Snap to points
        const snapPoint = findSnapPoint(newStart, resizingClip.clipId);
        if (snapPoint !== null) {
          newStart = snapPoint;
          setSnapIndicator(snapPoint);
        } else {
          setSnapIndicator(null);
        }
        
        const delta = newStart - resizingClip.initialStart;
        const newDuration = resizingClip.initialDuration - delta;
        const newTrimStart = resizingClip.initialTrimStart + delta;
        
        if (newDuration >= 1 && newTrimStart >= 0) {
          onClipMove(resizingClip.clipId, resizingClip.trackId, newStart);
          onClipResize(resizingClip.clipId, resizingClip.trackId, newDuration, newTrimStart);
        }
      }
    };

    const handleMouseUp = () => {
      setResizingClip(null);
      setSnapIndicator(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingClip, tracks, xToTime, onClipResize, onClipMove, findSnapPoint]);

  // Handle drag over for media drops - allow ANY track
  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverTrackId(trackId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest(`[data-track-id]`)) {
      setDragOverTrackId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, trackId: string, trackType: TimelineTrack['type']) => {
    e.preventDefault();
    setDragOverTrackId(null);
    
    // Check for external file drops first
    const files = Array.from(e.dataTransfer.files);
    const mediaFiles = files.filter(f => 
      f.type.startsWith('video/') || 
      f.type.startsWith('audio/') || 
      f.type.startsWith('image/')
    );
    
    if (mediaFiles.length > 0 && onDropFile) {
      // Handle external file drop
      const trackContent = e.currentTarget as HTMLElement;
      const rect = trackContent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let startTime = Math.max(0, x / pixelsPerSecond);
      
      // Snap to points
      const snapPoint = findSnapPoint(startTime);
      if (snapPoint !== null) {
        startTime = snapPoint;
      }
      
      // Snap to 0 if very close
      if (startTime < 0.5 && !snapPoint) {
        startTime = 0;
      }
      
      for (const file of mediaFiles) {
        await onDropFile(file, trackId, startTime);
        // Increment start time for subsequent files
        startTime += 5;
      }
      return;
    }
    
    // Handle internal media panel drops
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
      const item: MediaItem = JSON.parse(data);
      
      // Calculate drop position
      const trackContent = e.currentTarget as HTMLElement;
      const rect = trackContent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      let startTime = Math.max(0, x / pixelsPerSecond);
      
      // Snap to points
      const snapPoint = findSnapPoint(startTime);
      if (snapPoint !== null) {
        startTime = snapPoint;
      }
      
      // Snap to 0 if very close
      if (startTime < 0.5 && !snapPoint) {
        startTime = 0;
      }
      
      // Check for overlaps and snap to end of last overlapping clip
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        const clipDuration = item.duration || 30;
        
        for (const existingClip of track.clips) {
          const clipEnd = existingClip.startTime + existingClip.duration;
          const newClipEnd = startTime + clipDuration;
          
          if (startTime < clipEnd && newClipEnd > existingClip.startTime) {
            startTime = clipEnd;
          }
        }
      }
      
      onDropMedia(item, trackId, startTime);
    } catch (err) {
      console.error('Failed to parse dropped media:', err);
    }
  };

  // Handle mouse wheel for zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.25 : 0.25;
      onZoomChange(Math.max(0.25, Math.min(4, editorState.zoom + delta)));
    }
  }, [editorState.zoom, onZoomChange]);

  const playheadPosition = editorState.currentTime * pixelsPerSecond;
  const timelineWidth = Math.max(editorState.duration * pixelsPerSecond, 800);

  // Generate static waveform pattern for audio clips (deterministic, no streaming)
  const renderWaveform = useCallback((clip: TimelineClip) => {
    if (clip.type !== 'audio') return null;
    
    // Use clip.id to generate deterministic pattern (not random)
    const barCount = Math.min(40, Math.max(10, Math.floor(clip.duration * 2)));
    const seed = clip.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    return (
      <div className="absolute inset-0 flex items-end justify-start gap-[1px] px-1 py-1 overflow-hidden opacity-50">
        {Array.from({ length: barCount }).map((_, i) => {
          // Deterministic height based on seed and index
          const height = 30 + Math.sin((seed + i) * 0.7) * 25 + Math.cos((seed * 2 + i) * 0.4) * 15;
          return (
            <div
              key={i}
              className="w-[3px] bg-white/80 rounded-sm flex-shrink-0"
              style={{ height: `${Math.max(20, Math.min(90, height))}%` }}
            />
          );
        })}
      </div>
    );
  }, []);

  return (
    <div 
      className="min-h-[120px] h-full bg-card flex flex-col select-none"
      onWheel={handleWheel}
    >
      {/* Timeline Header with Zoom Controls - always visible */}
      <div className="h-7 flex items-center justify-between px-2 border-b border-border bg-muted/50 flex-shrink-0">
        <span className="text-[10px] font-semibold text-foreground uppercase tracking-wide">Timeline</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onZoomChange(Math.max(0.1, editorState.zoom - 0.25))}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3 h-3 text-muted-foreground" />
          </button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">
            {Math.round(editorState.zoom * 100)}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(8, editorState.zoom + 0.25))}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3 h-3 text-muted-foreground" />
          </button>
          <button
            onClick={() => {
              const contentWidth = 800;
              const newZoom = contentWidth / (editorState.duration * 50);
              onZoomChange(Math.max(0.1, Math.min(8, newZoom)));
            }}
            className="px-1.5 py-0.5 rounded hover:bg-muted transition-colors text-[10px] text-muted-foreground"
            title="Fit to Window"
          >
            Fit
          </button>
        </div>
      </div>

      {/* Scrollable area containing ruler and tracks */}
      <div 
        ref={timelineRef}
        className="flex-1 min-h-0 overflow-auto relative"
      >
        <div className="min-w-max">
          {/* Time Ruler - sticky at top */}
          <div 
            className="h-5 flex border-b border-border cursor-pointer bg-muted/20 sticky top-0 z-10"
            onClick={handleTimelineClick}
          >
            <div className="flex-shrink-0 bg-muted/30 sticky left-0 z-20" style={{ width: trackLabelWidth }} />
            <div 
              ref={tracksContainerRef}
              className="flex-1 relative"
              style={{ minWidth: timelineWidth }}
            >
              {timeMarkers.map((time) => (
                <div
                  key={time}
                  className="absolute top-0 bottom-0 flex flex-col items-start"
                  style={{ left: time * pixelsPerSecond }}
                >
                  <div className="h-1.5 w-px bg-border" />
                  <span className="text-[9px] text-muted-foreground ml-0.5">
                    {formatTimeShort(time)}
                  </span>
                </div>
              ))}
              
              {/* Playhead marker on ruler */}
              <div
                className="absolute top-0 z-20 cursor-ew-resize"
                style={{ left: playheadPosition - 6, width: 12, height: '100%' }}
                onMouseDown={handlePlayheadMouseDown}
              >
                <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-destructive" />
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-2.5 h-2.5 bg-destructive rounded-sm rotate-45 origin-center translate-y-[1px]" />
              </div>

              {/* Snap indicator */}
              {snapIndicator !== null && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 z-30 pointer-events-none"
                  style={{ left: snapIndicator * pixelsPerSecond }}
                />
              )}
            </div>
          </div>

          {/* Tracks */}
          {tracks.map((track) => {
            const isHighlighted = dragOverTrackId === track.id;
            
            return (
              <div 
                key={track.id} 
                className="flex h-10 border-b border-border last:border-b-0"
                data-track-id={track.id}
              >
                {/* Track Label - sticky left */}
                <div 
                  className="flex-shrink-0 flex items-center gap-1.5 px-2 bg-muted/30 border-r border-border sticky left-0 z-10"
                  style={{ width: trackLabelWidth }}
                >
                  <GripVertical className="w-2.5 h-2.5 text-muted-foreground/50" />
                  <Film className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-foreground flex-1 truncate">{track.name}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onTrackToggleLock(track.id); }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    {track.locked ? (
                      <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                    ) : (
                      <Unlock className="w-2.5 h-2.5 text-muted-foreground/50" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onTrackToggleVisible(track.id); }}
                    className="p-0.5 rounded hover:bg-muted transition-colors"
                  >
                    {track.visible ? (
                      <Eye className="w-2.5 h-2.5 text-muted-foreground" />
                    ) : (
                      <EyeOff className="w-2.5 h-2.5 text-muted-foreground/50" />
                    )}
                  </button>
                </div>

                {/* Track Content */}
                <div 
                  className={`
                    flex-1 relative transition-all duration-150 overflow-visible
                    ${isHighlighted ? TRACK_HIGHLIGHT_COLOR : 'bg-muted/10'}
                    ${draggingMedia ? 'hover:bg-muted/20' : ''}
                    ${draggingClip && hoverTrackId === track.id && draggingClip.trackId !== track.id ? 'ring-2 ring-inset ring-primary/50 bg-primary/10' : ''}
                  `}
                  style={{ minWidth: timelineWidth }}
                  onDragOver={(e) => handleDragOver(e, track.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, track.id, track.type)}
                  onMouseEnter={() => handleTrackMouseEnter(track.id)}
                  onMouseLeave={handleTrackMouseLeave}
                  onClick={(e) => {
                    // Click on track background to seek
                    const target = e.target as HTMLElement;
                    if (!target.closest('[data-clip]')) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const time = Math.max(0, x / pixelsPerSecond);
                      onSeek(Math.min(time, editorState.duration));
                    }
                  }}
                >
                  {/* Clips */}
                  {track.clips.map((clip) => {
                    const isSelected = editorState.selectedClipId === clip.id;
                    const isDragging = draggingClip?.clipId === clip.id;
                    const isResizing = resizingClip?.clipId === clip.id;
                    
                    return (
                      <ContextMenu key={clip.id}>
                        <ContextMenuTrigger asChild>
                          <div
                            data-clip
                            onMouseDown={(e) => handleClipMouseDown(e, clip, track.id)}
                            onDoubleClick={() => {
                              onSeek(clip.startTime);
                              onClipSelect(clip.id, track.id);
                            }}
                            className={`
                              absolute top-1 bottom-1 rounded border cursor-grab active:cursor-grabbing
                              transition-all duration-100
                              ${CLIP_COLOR}
                              ${isSelected ? 'ring-2 ring-white shadow-lg z-10' : 'hover:brightness-110'}
                              ${isDragging ? 'opacity-70 cursor-grabbing' : ''}
                              ${isResizing ? 'cursor-ew-resize' : ''}
                            `}
                            style={{
                              left: clip.startTime * pixelsPerSecond,
                              width: Math.max(clip.duration * pixelsPerSecond, 20)
                            }}
                          >
                            {/* Clip content */}
                            <div className="relative h-full flex flex-col overflow-hidden">
                              <div className="px-2 py-0.5 truncate text-[10px] font-medium text-white flex items-center gap-1 relative z-10">
                                <span className="truncate">{clip.name}</span>
                              </div>
                              
                              {clip.type === 'audio' && (
                                <div className="flex-1 relative overflow-hidden">
                                  {renderWaveform(clip)}
                                </div>
                              )}
                            </div>
                            
                            {/* Resize handles */}
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-l group"
                              onMouseDown={(e) => handleResizeMouseDown(e, clip, track.id, 'left')}
                            >
                              <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded opacity-0 group-hover:opacity-100" />
                            </div>
                            <div 
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/40 rounded-r group"
                              onMouseDown={(e) => handleResizeMouseDown(e, clip, track.id, 'right')}
                            >
                              <div className="absolute right-0.5 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-white/60 rounded opacity-0 group-hover:opacity-100" />
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                          <ContextMenuItem onClick={() => onClipSelect(clip.id, track.id)}>
                            Select
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem onClick={() => {}}>
                            Copy
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => {}}>
                            Duplicate
                          </ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem 
                            className="text-destructive"
                            onClick={() => onClipDelete(clip.id, track.id)}
                          >
                            Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}

                  {/* Ghost position indicator */}
                  {ghostPosition && ghostPosition.trackId === track.id && draggingClip && (
                    <div
                      className={`absolute top-1 bottom-1 rounded border-2 border-dashed pointer-events-none z-20 ${
                        ghostPosition.trackId !== draggingClip.trackId 
                          ? 'border-primary bg-primary/20' 
                          : 'border-white/50 bg-white/10'
                      }`}
                      style={{
                        left: ghostPosition.time * pixelsPerSecond,
                        width: Math.max(draggingClip.duration * pixelsPerSecond, 20)
                      }}
                    />
                  )}

                  {/* Drop zone indicator */}
                  {track.clips.length === 0 && !isHighlighted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-muted-foreground/50">Drop media here</span>
                    </div>
                  )}
                  
                  {isHighlighted && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-xs font-medium text-foreground/70">Drop to add</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Single playhead line spanning all tracks */}
          <div
            className="absolute top-0 w-px bg-destructive pointer-events-none"
            style={{ 
              left: trackLabelWidth + playheadPosition,
              height: `${tracks.length * 40 + 8}px`
            }}
          />

          {/* Add Track Button */}
          <div className="flex h-8 border-b border-border">
            <div 
              className="flex-shrink-0 flex items-center px-2 bg-muted/20 sticky left-0"
              style={{ width: trackLabelWidth }}
            >
              <button 
                onClick={() => onAddTrack()}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Track
              </button>
            </div>
            <div className="flex-1 bg-muted/5" style={{ minWidth: timelineWidth }} />
          </div>
        </div>
      </div>
    </div>
  );
}
