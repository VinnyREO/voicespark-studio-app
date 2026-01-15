import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Upload
} from 'lucide-react';
import { EditorState, CaptionStyle, TimelineTrack, TimelineClip, MediaItem } from '@/types/editor';

interface PreviewPlayerProps {
  editorState: EditorState;
  captionStyle: CaptionStyle;
  currentCaption?: string;
  tracks: TimelineTrack[];
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onAddMedia?: (file: File) => Promise<MediaItem>;
  showMediaPanelToggle?: boolean;
  onToggleMediaPanel?: () => void;
}

const ASPECT_RATIO_CLASSES = {
  '16:9': 'aspect-video',
  '9:16': 'aspect-[9/16]',
  '1:1': 'aspect-square'
};

export function PreviewPlayer({
  editorState,
  captionStyle,
  currentCaption,
  tracks,
  onPlayPause,
  onSeek,
  onTimeUpdate,
  onAddMedia,
  showMediaPanelToggle,
  onToggleMediaPanel
}: PreviewPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Find current video clip at playhead position - check all tracks for video type clips
  const currentVideoClip = useMemo(() => {
    for (const track of tracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        // Check if clip has video content (either on video track or has video type)
        if ((track.type === 'video' || clip.type === 'video') && clip.url) {
          if (editorState.currentTime >= clip.startTime && 
              editorState.currentTime < clip.startTime + clip.duration) {
            return clip;
          }
        }
      }
    }
    return null;
  }, [tracks, editorState.currentTime]);

  // Find all audio clips that should be playing at current time
  const currentAudioClips = useMemo(() => {
    const audioClips: TimelineClip[] = [];
    for (const track of tracks) {
      if (!track.visible) continue;
      for (const clip of track.clips) {
        if ((track.type === 'audio' || clip.type === 'audio') && clip.url) {
          if (editorState.currentTime >= clip.startTime && 
              editorState.currentTime < clip.startTime + clip.duration) {
            audioClips.push(clip);
          }
        }
      }
    }
    return audioClips;
  }, [tracks, editorState.currentTime]);

  // Manage audio elements for each audio clip
  useEffect(() => {
    // Get all audio clips from tracks
    const allAudioClips: TimelineClip[] = [];
    for (const track of tracks) {
      for (const clip of track.clips) {
        if ((track.type === 'audio' || clip.type === 'audio') && clip.url) {
          allAudioClips.push(clip);
        }
      }
    }

    // Create audio elements for clips that don't have one
    allAudioClips.forEach(clip => {
      if (!audioRefs.current.has(clip.id)) {
        const audio = new Audio(clip.url);
        audio.preload = 'auto';
        audioRefs.current.set(clip.id, audio);
      }
    });

    // Remove audio elements for clips that no longer exist
    const clipIds = new Set(allAudioClips.map(c => c.id));
    audioRefs.current.forEach((audio, id) => {
      if (!clipIds.has(id)) {
        audio.pause();
        audio.src = '';
        audioRefs.current.delete(id);
      }
    });
  }, [tracks]);

  // Sync audio playback with timeline - play only clips at current time
  useEffect(() => {
    audioRefs.current.forEach((audio, clipId) => {
      const clipPlaying = currentAudioClips.find(c => c.id === clipId);
      
      if (clipPlaying && editorState.isPlaying) {
        const clipLocalTime = editorState.currentTime - clipPlaying.startTime + (clipPlaying.trimStart || 0);
        
        // Sync time if off by more than 0.3s
        if (Math.abs(audio.currentTime - clipLocalTime) > 0.3) {
          audio.currentTime = clipLocalTime;
        }
        
        audio.muted = isMuted;
        if (audio.paused) {
          audio.play().catch(() => {});
        }
      } else {
        if (!audio.paused) {
          audio.pause();
        }
      }
    });
  }, [editorState.isPlaying, editorState.currentTime, currentAudioClips, isMuted]);

  // When seeking (not playing), update audio positions
  useEffect(() => {
    if (!editorState.isPlaying) {
      currentAudioClips.forEach(clip => {
        const audio = audioRefs.current.get(clip.id);
        if (audio) {
          const clipLocalTime = editorState.currentTime - clip.startTime + (clip.trimStart || 0);
          audio.currentTime = clipLocalTime;
        }
      });
    }
  }, [editorState.currentTime, editorState.isPlaying, currentAudioClips]);

  // Sync video playback
  useEffect(() => {
    if (videoRef.current && currentVideoClip) {
      const clipLocalTime = editorState.currentTime - currentVideoClip.startTime + (currentVideoClip.trimStart || 0);
      
      if (editorState.isPlaying) {
        // Only seek if significantly different to avoid stuttering
        if (Math.abs(videoRef.current.currentTime - clipLocalTime) > 0.3) {
          videoRef.current.currentTime = clipLocalTime;
        }
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = clipLocalTime;
      }
    }
  }, [editorState.isPlaying, editorState.currentTime, currentVideoClip]);

  const getCaptionStyles = (): React.CSSProperties => {
    const positionStyles: Record<string, React.CSSProperties> = {
      top: { top: '10%' },
      center: { top: '50%', transform: 'translateY(-50%)' },
      bottom: { bottom: '10%' }
    };

    return {
      fontFamily: captionStyle.fontFamily,
      fontSize: `${captionStyle.fontSize * 0.5}px`,
      fontWeight: captionStyle.fontWeight === 'black' ? 900 : captionStyle.fontWeight === 'bold' ? 700 : 400,
      color: captionStyle.color,
      backgroundColor: captionStyle.backgroundColor,
      textShadow: captionStyle.outline 
        ? `2px 2px 0 ${captionStyle.outlineColor}, -2px -2px 0 ${captionStyle.outlineColor}, 2px -2px 0 ${captionStyle.outlineColor}, -2px 2px 0 ${captionStyle.outlineColor}`
        : undefined,
      ...positionStyles[captionStyle.position]
    };
  };

  // Handle drag and drop to canvas
  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleCanvasDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we're actually leaving the container
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };

  const handleCanvasDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    
    if (!onAddMedia) return;
    
    const files = Array.from(e.dataTransfer.files);
    
    for (const file of files) {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/') || file.type.startsWith('image/')) {
        await onAddMedia(file);
      }
    }
  };

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="flex-1 flex flex-col bg-background relative min-w-0">
      {/* Media Panel Toggle Button (when panel is closed) */}
      {showMediaPanelToggle && onToggleMediaPanel && (
        <button
          onClick={onToggleMediaPanel}
          className="absolute top-2 left-2 z-30 p-1.5 rounded-lg bg-card/90 border border-border hover:bg-muted transition-colors shadow-lg"
          title="Show Media Panel"
        >
          <svg className="w-3.5 h-3.5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      )}
      
      {/* Preview Area - fills available space */}
      <div 
        className={`flex-1 flex items-center justify-center p-2 bg-black relative transition-all min-h-0 ${
          isDraggingOver ? 'ring-2 ring-video ring-dashed ring-inset' : ''
        } ${isFullscreen ? 'p-0' : ''}`}
        onDragOver={handleCanvasDragOver}
        onDragEnter={handleCanvasDragEnter}
        onDragLeave={handleCanvasDragLeave}
        onDrop={handleCanvasDrop}
      >
        {/* Drag overlay */}
        {isDraggingOver && (
          <div className="absolute inset-0 bg-video/20 flex items-center justify-center z-30 pointer-events-none">
            <div className="bg-card/90 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-2 shadow-xl">
              <Upload className="w-5 h-5 text-video" />
              <span className="text-foreground font-medium text-sm">Drop to add media</span>
            </div>
          </div>
        )}
        
        {/* Video Container - fills space while maintaining aspect ratio */}
        <div 
          className={`relative ${ASPECT_RATIO_CLASSES[editorState.aspectRatio]} bg-black rounded overflow-hidden shadow-2xl`}
          style={{ 
            maxWidth: '100%', 
            maxHeight: '100%',
            width: isFullscreen ? 'auto' : '100%',
            height: isFullscreen ? '100%' : 'auto'
          }}
        >
          {/* Video Content or Placeholder */}
          {currentVideoClip && currentVideoClip.url ? (
            <video
              ref={videoRef}
              key={currentVideoClip.id}
              src={currentVideoClip.url}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              muted={isMuted}
              playsInline
              preload="auto"
              onLoadedData={() => {
                if (videoRef.current && currentVideoClip) {
                  const clipTime = editorState.currentTime - currentVideoClip.startTime + (currentVideoClip.trimStart || 0);
                  videoRef.current.currentTime = clipTime;
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-muted/10 to-muted/5 flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center mb-2 mx-auto">
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">No video at playhead</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  {formatTimeShort(editorState.currentTime)}
                </p>
              </div>
            </div>
          )}

          {/* Caption Overlay */}
          {currentCaption && (
            <div 
              className="absolute left-0 right-0 text-center px-4 z-10"
              style={getCaptionStyles()}
            >
              <span className="inline-block px-3 py-1 rounded">
                {currentCaption}
              </span>
            </div>
          )}

          {/* Fullscreen Button - top right of video */}
          <button 
            onClick={toggleFullscreen}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-black/80 transition-colors z-20"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5 text-white" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Playback Controls - compact */}
      <div className="h-12 bg-card border-t border-border flex items-center justify-center gap-3 px-3 flex-shrink-0">
        {/* Skip Back */}
        <button 
          onClick={() => onSeek(Math.max(0, editorState.currentTime - 5))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          className="w-10 h-10 rounded-full bg-video flex items-center justify-center text-video-foreground hover:bg-video/90 transition-colors shadow-lg"
        >
          {editorState.isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4 ml-0.5" />
          )}
        </button>

        {/* Skip Forward */}
        <button 
          onClick={() => onSeek(Math.min(editorState.duration, editorState.currentTime + 5))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
        </button>

        {/* Time Display */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-foreground">{formatTime(editorState.currentTime)}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{formatTime(editorState.duration)}</span>
        </div>

        {/* Volume */}
        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
      </div>
    </div>
  );
}
