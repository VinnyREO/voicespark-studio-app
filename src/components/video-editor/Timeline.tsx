import { useRef, useCallback, useEffect, useState } from 'react';
import { TimelineClip, MediaAsset, AspectRatio } from '@/types/video-editor';
import { TimelineTrack } from './TimelineTrack';
import { Toolbar } from './Toolbar';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, Maximize2, Undo2, Redo2, Scissors, Copy, Clipboard, Trash2, Magnet, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Plus, Download, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ExportDialog } from './ExportDialog';

interface TimelineProps {
  clips: TimelineClip[];
  assets: MediaAsset[];
  selectedClipIds: string[];
  playheadPosition: number;
  duration: number;
  zoomLevel: number;
  aspectRatio: AspectRatio;
  onSelectClip: (clipId: string, shiftKey: boolean) => void;
  onUpdateClip: (clipId: string, updates: Partial<TimelineClip>) => void;
  onUpdateMultipleClips?: (clipIds: string[], getUpdates: (clip: TimelineClip) => Partial<TimelineClip>) => void;
  onSetPlayhead: (position: number) => void;
  onZoomChange: (level: number) => void;
  onDropAsset?: (asset: MediaAsset, trackIndex: number, timePosition: number) => void;
  onDropExternalFile?: (file: File, trackIndex: number, timePosition: number) => void;
  onDeselectAll?: () => void;
  // Toolbar props
  canUndo?: boolean;
  canRedo?: boolean;
  snapEnabled?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onDelete?: () => void;
  onSplit?: () => void;
  onToggleSnap?: () => void;
  // Transport controls props
  isPlaying?: boolean;
  volume?: number;
  onPlayPause?: () => void;
  onSeekToStart?: () => void;
  onSeekToEnd?: () => void;
  onVolumeChange?: (volume: number) => void;
  // Context menu actions
  onSplitAudio?: (clipId: string) => void;
  onDuplicateClip?: (clipId: string) => void;
  onDeleteClip?: (clipId: string) => void;
  onSplitClipAtPlayhead?: (clipId: string) => void;
  trackSettings?: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>;
  onTrackVolumeChange?: (trackIndex: number, volume: number) => void;
  onTrackSpeedChange?: (trackIndex: number, speed: number) => void;
  onTrackVisibleChange?: (trackIndex: number, visible: boolean) => void;
  onTrackMutedChange?: (trackIndex: number, muted: boolean) => void;
  // Save status props
  projectId?: string;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
  lastSaved?: Date | null;
  onSaveNow?: () => void;
}

const MIN_ZOOM = 10;
const MAX_ZOOM = 200;

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

export function Timeline({
  clips,
  assets,
  selectedClipIds,
  playheadPosition,
  duration,
  zoomLevel,
  aspectRatio,
  onSelectClip,
  onUpdateClip,
  onUpdateMultipleClips,
  onSetPlayhead,
  onZoomChange,
  onDropAsset,
  onDropExternalFile,
  onDeselectAll,
  canUndo = false,
  canRedo = false,
  snapEnabled = false,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDelete,
  onSplit,
  onToggleSnap,
  isPlaying = false,
  volume = 1,
  onPlayPause,
  onSeekToStart,
  onSeekToEnd,
  onVolumeChange,
  onSplitAudio,
  onDuplicateClip,
  onDeleteClip,
  onSplitClipAtPlayhead,
  trackSettings = {},
  onTrackVolumeChange,
  onTrackSpeedChange,
  onTrackVisibleChange,
  onTrackMutedChange,
  projectId,
  isSaving = false,
  hasUnsavedChanges = false,
  lastSaved,
  onSaveNow,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [minTrackCount, setMinTrackCount] = useState(3); // User can manually add more tracks
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Calculate number of tracks needed (minimum from user or 3, expand based on clips)
  const maxTrackIndex = clips.length > 0 ? Math.max(...clips.map(c => c.trackIndex)) : 0;
  const trackCount = Math.max(minTrackCount, maxTrackIndex + 2); // Always have at least one empty track at bottom

  // Timeline width - extend indefinitely based on content or scroll
  // Always extend well beyond current content to allow infinite scrolling
  const contentDuration = duration > 0 ? duration : 30;
  const extendedDuration = Math.max(contentDuration * 2, 300); // At least 5 minutes or 2x content
  const timelineWidth = Math.max(extendedDuration * zoomLevel, 3000); // Minimum 3000px
  const playheadLeftPx = Math.max(0, playheadPosition * zoomLevel); // Never position before 0

  // Generate time markers - extend indefinitely across entire timeline
  const markers = [];
  const markerInterval = zoomLevel < 30 ? 10 : zoomLevel < 60 ? 5 : 1;
  const maxTime = timelineWidth / zoomLevel;
  const markerCount = Math.ceil(maxTime / markerInterval);

  for (let i = 0; i <= markerCount; i++) {
    const time = i * markerInterval;
    markers.push({
      time,
      position: time * zoomLevel,
      label: `${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`,
    });
  }

  const handleTimelineClick = useCallback((e: React.MouseEvent) => {
    if (isDraggingPlayhead) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - 80; // Subtract 80px track label offset
    const clickedTime = Math.max(0, relativeX / zoomLevel); // Never go below 0

    onSetPlayhead(clickedTime);
  }, [zoomLevel, onSetPlayhead, isDraggingPlayhead]);

  const handlePlayheadMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDraggingPlayhead(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingPlayhead || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const relativeX = e.clientX - rect.left - 80; // Subtract 80px track label offset
    const newTime = Math.max(0, relativeX / zoomLevel);

    onSetPlayhead(newTime);
  }, [isDraggingPlayhead, zoomLevel, onSetPlayhead]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (isDraggingPlayhead) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDraggingPlayhead, handleMouseMove, handleMouseUp]);

  // Cmd/Ctrl + Scroll to zoom, Shift + Scroll to pan horizontally
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.metaKey || e.ctrlKey) {
        // Zoom functionality
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        const newZoom = Math.max(MIN_ZOOM, Math.min(zoomLevel + delta, MAX_ZOOM));
        onZoomChange(newZoom);
      } else if (e.shiftKey) {
        // Horizontal scroll functionality
        e.preventDefault();
        const scrollContainer = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollLeft += e.deltaY;
        }
      }
    };

    const timeline = timelineRef.current;
    if (timeline) {
      timeline.addEventListener('wheel', handleWheel, { passive: false });
      return () => {
        timeline.removeEventListener('wheel', handleWheel);
      };
    }
  }, [zoomLevel, onZoomChange]);

  const handleZoomIn = () => {
    onZoomChange(Math.min(zoomLevel + 10, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    onZoomChange(Math.max(zoomLevel - 10, MIN_ZOOM));
  };

  const handleFitToView = () => {
    if (timelineRef.current && duration > 0) {
      const availableWidth = timelineRef.current.clientWidth - 100;
      const newZoom = availableWidth / duration;
      onZoomChange(Math.max(MIN_ZOOM, Math.min(newZoom, MAX_ZOOM)));
    }
  };

  const hasSelection = selectedClipIds.length > 0;
  const isMuted = volume === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <Toolbar
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={hasSelection}
        snapEnabled={snapEnabled}
        onUndo={onUndo || (() => {})}
        onRedo={onRedo || (() => {})}
        onCopy={onCopy || (() => {})}
        onPaste={onPaste || (() => {})}
        onDelete={onDelete || (() => {})}
        onSplit={onSplit || (() => {})}
        onToggleSnap={onToggleSnap || (() => {})}
      />

      {/* Old inline toolbar - Keeping playback controls */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/30">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-muted-foreground mr-2">Timeline</span>

          {/* Undo/Redo */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onUndo}
                disabled={!canUndo}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Undo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Undo (Cmd+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onRedo}
                disabled={!canRedo}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Redo2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Redo (Cmd+Shift+Z)</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Edit Tools */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onSplit}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Scissors className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Split clip at playhead (S)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onCopy}
                disabled={!hasSelection}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Copy selected (Cmd+C)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onPaste}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Clipboard className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Paste at playhead (Cmd+V)</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onDelete}
                disabled={!hasSelection}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete selected (Delete)</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Snap Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleSnap}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
                data-active={snapEnabled}
              >
                <Magnet className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Toggle snap to clips</p>
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Add Track */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setMinTrackCount(prev => prev + 1)}
                variant="ghost"
                size="sm"
                className="toolbar-btn"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add new track</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Center - Transport Controls */}
        <div className="flex items-center gap-3">
          {/* Playback buttons */}
          <Button
            onClick={onSeekToStart}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <SkipBack className="w-4 h-4" />
          </Button>

          <Button
            onClick={onPlayPause}
            size="icon"
            className={cn(
              'h-10 w-10 rounded-full glow-button',
              'bg-primary text-primary-foreground hover:bg-primary/90'
            )}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5 ml-0.5" />
            )}
          </Button>

          <Button
            onClick={onSeekToEnd}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <SkipForward className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Time Display */}
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-foreground tabular-nums">{formatTime(playheadPosition)}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground tabular-nums">{formatTime(duration)}</span>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Volume Control */}
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onVolumeChange?.(isMuted ? 1 : 0)}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </Button>

            <Slider
              value={[volume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(values) => onVolumeChange?.(values[0] / 100)}
              className="w-24"
            />
          </div>
        </div>

        {/* Right - Zoom Controls */}
        <div className="flex items-center gap-2">
          <Button
            onClick={handleZoomOut}
            variant="ghost"
            size="sm"
            disabled={zoomLevel <= MIN_ZOOM}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>

          <span className="text-xs text-muted-foreground min-w-[60px] text-center">
            {Math.round(zoomLevel)}px/s
          </span>

          <Button
            onClick={handleZoomIn}
            variant="ghost"
            size="sm"
            disabled={zoomLevel >= MAX_ZOOM}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            onClick={handleFitToView}
            variant="ghost"
            size="sm"
            title="Fit to view"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Save Status & Button (if project exists) */}
          {projectId && (
            <>
              <div className="flex items-center gap-2 mr-1">
                {isSaving ? (
                  <>
                    <div className="animate-spin h-3 w-3 border-2 border-purple-500 border-t-transparent rounded-full" />
                    <span className="text-xs text-muted-foreground">Saving...</span>
                  </>
                ) : hasUnsavedChanges ? (
                  <>
                    <div className="h-2 w-2 bg-yellow-500 rounded-full animate-pulse" />
                    <span className="text-xs text-muted-foreground">Unsaved</span>
                  </>
                ) : lastSaved ? (
                  <>
                    <div className="h-2 w-2 bg-green-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">
                      {(() => {
                        const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000);
                        if (seconds < 60) return 'Saved';
                        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
                        return 'Saved';
                      })()}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="h-2 w-2 bg-zinc-500 rounded-full" />
                    <span className="text-xs text-muted-foreground">Ready</span>
                  </>
                )}
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={onSaveNow}
                    disabled={isSaving || !hasUnsavedChanges}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Save project now</p>
                </TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6 mx-2" />
            </>
          )}

          {/* Export Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setShowExportDialog(true)}
                variant="default"
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export video</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Export Dialog */}
      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        clips={clips}
        assets={assets}
        aspectRatio={aspectRatio}
        duration={duration}
        trackSettings={trackSettings}
      />

      {/* Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="relative">
            {/* Time ruler */}
            <div
              className="sticky top-0 z-20 h-10 border-b border-border/60 bg-card/80 backdrop-blur-sm cursor-pointer"
              onClick={handleTimelineClick}
            >
              <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
                <div className="absolute left-20 right-0 h-full">
                  {markers.map((marker, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-border/30 pointer-events-none"
                      style={{ left: `${marker.position}px` }}
                    >
                      <span className="absolute top-2 left-2 text-xs font-medium text-muted-foreground/80">
                        {marker.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tracks */}
            <div
              ref={timelineRef}
              className="relative"
              style={{ width: `${timelineWidth}px` }}
              onClick={handleTimelineClick}
            >
              {/* Vertical time marker lines extending through all tracks */}
              <div className="absolute left-20 right-0 top-0 bottom-0 pointer-events-none">
                {markers.map((marker, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 border-l border-border/20"
                    style={{ left: `${marker.position}px` }}
                  />
                ))}
              </div>

              {Array.from({ length: trackCount }, (_, i) => {
                const trackSetting = trackSettings[i] || { volume: 1, speed: 1, visible: true, muted: false };
                return (
                  <TimelineTrack
                    key={i}
                    trackIndex={i}
                    clips={clips}
                    assets={assets}
                    selectedClipIds={selectedClipIds}
                    pixelsPerSecond={zoomLevel}
                    snapEnabled={snapEnabled}
                    onSelectClip={onSelectClip}
                    onUpdateClip={onUpdateClip}
                    onUpdateMultipleClips={onUpdateMultipleClips}
                    onDropAsset={onDropAsset}
                    onDropExternalFile={onDropExternalFile}
                    onDeselectAll={onDeselectAll}
                    onSplitAudio={onSplitAudio}
                    onDuplicate={onDuplicateClip}
                    onDeleteClip={onDeleteClip}
                    onSplitClipAtPlayhead={onSplitClipAtPlayhead}
                    trackVolume={trackSetting.volume}
                    trackSpeed={trackSetting.speed}
                    trackVisible={trackSetting.visible}
                    trackMuted={trackSetting.muted}
                    onTrackVolumeChange={onTrackVolumeChange}
                    onTrackSpeedChange={onTrackSpeedChange}
                    onTrackVisibleChange={onTrackVisibleChange}
                    onTrackMutedChange={onTrackMutedChange}
                  />
                );
              })}

              {/* Playhead */}
              <div
                className={cn(
                  'absolute top-0 bottom-0 z-30 pointer-events-none',
                  'transition-transform duration-75'
                )}
                style={{
                  left: `${80 + playheadLeftPx}px`, // Add 80px offset for track labels
                  transform: isDraggingPlayhead ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {/* Playhead line */}
                <div className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg shadow-red-500/50" />

                {/* Playhead handle */}
                <div
                  className="absolute top-0 -translate-x-1/2 cursor-ew-resize pointer-events-auto"
                  onMouseDown={handlePlayheadMouseDown}
                >
                  <div className="w-3 h-3 bg-red-500 rounded-full border-2 border-background shadow-lg" />
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
