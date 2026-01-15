import { useState, useEffect, useCallback, useRef } from 'react';
import { EditorToolbar } from './EditorToolbar';
import { MediaPanel, DriveFile } from './MediaPanel';
import { PreviewPlayer } from './PreviewPlayer';
import { Timeline } from './Timeline';
import { ClipToolbar } from './ClipToolbar';
import { 
  EditorState, 
  MediaItem, 
  TimelineTrack, 
  TimelineClip, 
  CaptionStyle,
  DEFAULT_CAPTION_STYLE
} from '@/types/editor';
import { toast } from 'sonner';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface VideoEditorProps {
  voiceoverUrl?: string;
  voiceoverBlob?: Blob;
  script: string;
}

const DEFAULT_TRACKS: TimelineTrack[] = [
  { id: 'track-1', type: 'video', name: 'Track 1', clips: [], locked: false, visible: true },
  { id: 'track-2', type: 'video', name: 'Track 2', clips: [], locked: false, visible: true },
  { id: 'track-3', type: 'video', name: 'Track 3', clips: [], locked: false, visible: true },
];

export function VideoEditor({ voiceoverUrl, voiceoverBlob, script }: VideoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  
  const [editorState, setEditorState] = useState<EditorState>({
    projectName: 'Untitled Project',
    duration: 150,
    currentTime: 0,
    isPlaying: false,
    zoom: 1,
    aspectRatio: '16:9',
    selectedClipId: null,
    selectedTrackId: null
  });

  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [tracks, setTracks] = useState<TimelineTrack[]>(DEFAULT_TRACKS);
  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [history, setHistory] = useState<{ tracks: TimelineTrack[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draggingMedia, setDraggingMedia] = useState<MediaItem | null>(null);
  const [clipboard, setClipboard] = useState<TimelineClip | null>(null);
  const [showMediaPanel, setShowMediaPanel] = useState(true);
  
  const trackCounter = useRef(3); // Start at 3 since we have 3 default tracks
  const playbackIntervalRef = useRef<number | null>(null);

  // Add voiceover to media library when available (with actual duration)
  useEffect(() => {
    if (voiceoverUrl && voiceoverBlob) {
      // Get actual duration from audio blob
      const audio = document.createElement('audio');
      audio.preload = 'metadata';
      
      audio.onloadedmetadata = () => {
        const actualDuration = isFinite(audio.duration) ? audio.duration : 150;
        
        const voiceoverItem: MediaItem = {
          id: 'voiceover-1',
          type: 'audio',
          name: 'VoiceForge Voiceover',
          url: voiceoverUrl,
          blob: voiceoverBlob,
          duration: actualDuration,
          source: 'voiceover'
        };

        setMediaItems(prev => {
          const filtered = prev.filter(item => item.id !== 'voiceover-1');
          return [voiceoverItem, ...filtered];
        });
        
        // Cleanup
        audio.src = '';
      };
      
      audio.onerror = () => {
        // Fallback with default duration
        const voiceoverItem: MediaItem = {
          id: 'voiceover-1',
          type: 'audio',
          name: 'VoiceForge Voiceover',
          url: voiceoverUrl,
          blob: voiceoverBlob,
          duration: 150,
          source: 'voiceover'
        };

        setMediaItems(prev => {
          const filtered = prev.filter(item => item.id !== 'voiceover-1');
          return [voiceoverItem, ...filtered];
        });
      };
      
      audio.src = voiceoverUrl;
    }
  }, [voiceoverUrl, voiceoverBlob]);

  // Handle playback
  useEffect(() => {
    if (editorState.isPlaying) {
      const startTime = Date.now();
      const startPosition = editorState.currentTime;
      
      playbackIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const newTime = startPosition + elapsed;
        
        if (newTime >= editorState.duration) {
          setEditorState(prev => ({ 
            ...prev, 
            currentTime: prev.duration, 
            isPlaying: false 
          }));
          if (playbackIntervalRef.current) {
            clearInterval(playbackIntervalRef.current);
            playbackIntervalRef.current = null;
          }
        } else {
          setEditorState(prev => ({ ...prev, currentTime: newTime }));
        }
      }, 50);
    } else {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
    }

    return () => {
      if (playbackIntervalRef.current) {
        clearInterval(playbackIntervalRef.current);
      }
    };
  }, [editorState.isPlaying, editorState.duration]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          handlePlayPause();
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          const stepLeft = e.shiftKey ? 0.1 : 1;
          setEditorState(prev => ({ 
            ...prev, 
            currentTime: Math.max(0, prev.currentTime - stepLeft),
            isPlaying: false
          }));
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          const stepRight = e.shiftKey ? 0.1 : 1;
          setEditorState(prev => ({ 
            ...prev, 
            currentTime: Math.min(prev.duration, prev.currentTime + stepRight),
            isPlaying: false
          }));
          break;
          
        case 'Home':
          e.preventDefault();
          setEditorState(prev => ({ ...prev, currentTime: 0, isPlaying: false }));
          break;
          
        case 'End':
          e.preventDefault();
          setEditorState(prev => ({ ...prev, currentTime: prev.duration, isPlaying: false }));
          break;
          
        case 'Delete':
        case 'Backspace':
          if (editorState.selectedClipId && editorState.selectedTrackId) {
            e.preventDefault();
            handleDelete();
          }
          break;
          
        case 'KeyC':
          if (cmdKey && editorState.selectedClipId) {
            e.preventDefault();
            handleCopy();
          }
          break;
          
        case 'KeyV':
          if (cmdKey && clipboard) {
            e.preventDefault();
            handlePaste();
          }
          break;
          
        case 'KeyZ':
          if (cmdKey && !e.repeat) {
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
          }
          break;
          
        case 'KeyS':
          if (!cmdKey && editorState.selectedClipId) {
            e.preventDefault();
            handleSplit();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editorState.selectedClipId, editorState.selectedTrackId, editorState.currentTime, clipboard]);

  // Save to history
  const saveHistory = useCallback(() => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ tracks: JSON.parse(JSON.stringify(tracks)) });
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [tracks, historyIndex]);

  // Get actual duration from media file
  const getMediaDuration = useCallback((file: File, url: string): Promise<number> => {
    return new Promise((resolve) => {
      const isVideo = file.type.startsWith('video/');
      const isAudio = file.type.startsWith('audio/');
      
      if (isVideo || isAudio) {
        const media = isVideo ? document.createElement('video') : document.createElement('audio');
        media.preload = 'metadata';
        
        media.onloadedmetadata = () => {
          const actualDuration = media.duration;
          // Cleanup
          media.src = '';
          resolve(isFinite(actualDuration) ? actualDuration : 30);
        };
        
        media.onerror = () => {
          resolve(30); // Default fallback
        };
        
        // Set timeout in case metadata never loads
        setTimeout(() => resolve(30), 5000);
        
        media.src = url;
      } else {
        // Image - default 5 seconds
        resolve(5);
      }
    });
  }, []);

  // Handle file upload with actual duration detection
  const handleUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    let uploadedCount = 0;
    
    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const url = URL.createObjectURL(file);
      const type = file.type.startsWith('video/') ? 'video' 
        : file.type.startsWith('audio/') ? 'audio' 
        : 'image';
      
      // Get actual duration from media metadata
      const duration = await getMediaDuration(file, url);
      
      const newItem: MediaItem = {
        id: `upload-${Date.now()}-${i}`,
        type,
        name: file.name,
        url,
        duration,
        blob: file,
        source: 'upload'
      };

      setMediaItems(prev => [...prev, newItem]);
      uploadedCount++;
    }
    
    toast.success(`Uploaded ${uploadedCount} file(s)`);
  }, [getMediaDuration]);

  const handleDragStart = useCallback((item: MediaItem) => {
    setDraggingMedia(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingMedia(null);
  }, []);

  const calculateMaxDuration = useCallback((currentTracks: TimelineTrack[]) => {
    let maxEnd = 150;
    for (const track of currentTracks) {
      for (const clip of track.clips) {
        const clipEnd = clip.startTime + clip.duration;
        if (clipEnd > maxEnd) {
          maxEnd = clipEnd;
        }
      }
    }
    return maxEnd + 10;
  }, []);

  // Handle dropping media on timeline
  const handleDropMedia = useCallback((item: MediaItem, trackId: string, startTime: number) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}`,
      mediaId: item.id,
      trackId,
      startTime,
      duration: item.duration || 30,
      trimStart: 0,
      trimEnd: 0,
      name: item.name,
      type: item.type,
      url: item.url,
      thumbnail: item.thumbnail
    };

    setTracks(prev => {
      const updated = prev.map(t => 
        t.id === trackId 
          ? { ...t, clips: [...t.clips, newClip].sort((a, b) => a.startTime - b.startTime) }
          : t
      );
      
      const newDuration = calculateMaxDuration(updated);
      if (newDuration > editorState.duration) {
        setEditorState(prev => ({ ...prev, duration: newDuration }));
      }
      
      return updated;
    });

    saveHistory();
    toast.success(`Added "${item.name}" to timeline`);
    setDraggingMedia(null);
  }, [tracks, editorState.duration, calculateMaxDuration, saveHistory]);

  // Handle file drop directly onto timeline from OS
  const handleDropFile = useCallback(async (file: File, trackId: string, startTime: number) => {
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith('video/') ? 'video' 
      : file.type.startsWith('audio/') ? 'audio' 
      : 'image';
    
    // Get actual duration from media metadata
    const duration = await getMediaDuration(file, url);
    
    const newItem: MediaItem = {
      id: `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      name: file.name,
      url,
      duration,
      blob: file,
      source: 'upload'
    };

    // Add to media library
    setMediaItems(prev => [...prev, newItem]);
    
    // Add directly to timeline
    handleDropMedia(newItem, trackId, startTime);
    
    toast.success(`Added "${file.name}" to timeline`);
  }, [getMediaDuration, handleDropMedia]);

  // Add new track
  const handleAddTrack = useCallback(() => {
    trackCounter.current++;
    const count = trackCounter.current;
    
    const newTrack: TimelineTrack = {
      id: `track-${count}`,
      type: 'video', // All tracks are generic, use video type internally
      name: `Track ${count}`,
      clips: [],
      locked: false,
      visible: true
    };

    setTracks(prev => [...prev, newTrack]);
    saveHistory();
    toast.success(`Added Track ${count}`);
  }, [saveHistory]);

  // Playback controls
  const handlePlayPause = useCallback(() => {
    setEditorState(prev => {
      if (prev.currentTime >= prev.duration) {
        return { ...prev, currentTime: 0, isPlaying: true };
      }
      return { ...prev, isPlaying: !prev.isPlaying };
    });
  }, []);

  const handleSeek = useCallback((time: number) => {
    setEditorState(prev => ({ ...prev, currentTime: time, isPlaying: false }));
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setEditorState(prev => ({ ...prev, currentTime: time }));
  }, []);

  // Clip selection
  const handleClipSelect = useCallback((clipId: string, trackId: string) => {
    setEditorState(prev => ({ 
      ...prev, 
      selectedClipId: clipId,
      selectedTrackId: trackId 
    }));
  }, []);

  // Clip movement within same track
  const handleClipMove = useCallback((clipId: string, trackId: string, newStartTime: number) => {
    setTracks(prev => {
      const updated = prev.map(track => 
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map(clip =>
                clip.id === clipId ? { ...clip, startTime: newStartTime } : clip
              ).sort((a, b) => a.startTime - b.startTime)
            }
          : track
      );
      
      const newDuration = calculateMaxDuration(updated);
      if (newDuration > editorState.duration) {
        setEditorState(prev => ({ ...prev, duration: newDuration }));
      }
      
      return updated;
    });
  }, [editorState.duration, calculateMaxDuration]);

  // Move clip to a different track
  const handleClipMoveToTrack = useCallback((clipId: string, fromTrackId: string, toTrackId: string, newStartTime: number) => {
    setTracks(prev => {
      // Find the clip in the source track
      const sourceTrack = prev.find(t => t.id === fromTrackId);
      const clipToMove = sourceTrack?.clips.find(c => c.id === clipId);
      
      if (!clipToMove) return prev;

      // Create the moved clip with new track ID
      const movedClip: TimelineClip = {
        ...clipToMove,
        trackId: toTrackId,
        startTime: newStartTime
      };

      const updated = prev.map(track => {
        if (track.id === fromTrackId) {
          // Remove from source track
          return { ...track, clips: track.clips.filter(c => c.id !== clipId) };
        }
        if (track.id === toTrackId) {
          // Add to destination track
          return { 
            ...track, 
            clips: [...track.clips, movedClip].sort((a, b) => a.startTime - b.startTime) 
          };
        }
        return track;
      });

      const newDuration = calculateMaxDuration(updated);
      if (newDuration > editorState.duration) {
        setEditorState(prev => ({ ...prev, duration: newDuration }));
      }

      return updated;
    });

    // Update selection to the new track
    setEditorState(prev => ({
      ...prev,
      selectedClipId: clipId,
      selectedTrackId: toTrackId
    }));

    saveHistory();
  }, [editorState.duration, calculateMaxDuration, saveHistory]);

  // Clip resize
  const handleClipResize = useCallback((clipId: string, trackId: string, newDuration: number, trimStart?: number) => {
    setTracks(prev => {
      const updated = prev.map(track => 
        track.id === trackId
          ? {
              ...track,
              clips: track.clips.map(clip =>
                clip.id === clipId 
                  ? { 
                      ...clip, 
                      duration: newDuration,
                      ...(trimStart !== undefined && { trimStart })
                    } 
                  : clip
              )
            }
          : track
      );
      
      const newMaxDuration = calculateMaxDuration(updated);
      if (newMaxDuration > editorState.duration) {
        setEditorState(prev => ({ ...prev, duration: newMaxDuration }));
      }
      
      return updated;
    });
  }, [editorState.duration, calculateMaxDuration]);

  // Clip delete (for timeline right-click)
  const handleClipDelete = useCallback((clipId: string, trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId
        ? { ...track, clips: track.clips.filter(c => c.id !== clipId) }
        : track
    ));

    setEditorState(prev => ({ 
      ...prev, 
      selectedClipId: prev.selectedClipId === clipId ? null : prev.selectedClipId, 
      selectedTrackId: prev.selectedTrackId === trackId && prev.selectedClipId === clipId ? null : prev.selectedTrackId 
    }));

    saveHistory();
    toast.success('Clip deleted');
  }, [saveHistory]);

  // Track controls
  const handleTrackToggleLock = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, locked: !t.locked } : t
    ));
  }, []);

  const handleTrackToggleVisible = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => 
      t.id === trackId ? { ...t, visible: !t.visible } : t
    ));
  }, []);

  // Toolbar actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setTracks(history[historyIndex - 1].tracks);
      toast.info('Undone');
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setTracks(history[historyIndex + 1].tracks);
      toast.info('Redone');
    }
  }, [history, historyIndex]);

  const handleSplit = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) {
      toast.error('Select a clip to split');
      return;
    }

    const track = tracks.find(t => t.id === editorState.selectedTrackId);
    const clip = track?.clips.find(c => c.id === editorState.selectedClipId);
    
    if (!clip) return;

    const splitPoint = editorState.currentTime;
    if (splitPoint <= clip.startTime || splitPoint >= clip.startTime + clip.duration) {
      toast.error('Playhead must be inside the clip to split');
      return;
    }

    const firstDuration = splitPoint - clip.startTime;
    const secondDuration = clip.duration - firstDuration;

    const secondClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      startTime: splitPoint,
      duration: secondDuration,
      trimStart: clip.trimStart + firstDuration
    };

    setTracks(prev => prev.map(t => 
      t.id === editorState.selectedTrackId
        ? {
            ...t,
            clips: [
              ...t.clips.map(c => 
                c.id === clip.id ? { ...c, duration: firstDuration } : c
              ),
              secondClip
            ].sort((a, b) => a.startTime - b.startTime)
          }
        : t
    ));

    saveHistory();
    toast.success('Clip split');
  }, [editorState.selectedClipId, editorState.selectedTrackId, editorState.currentTime, tracks, saveHistory]);

  const handleCopy = useCallback(() => {
    if (!editorState.selectedClipId) {
      toast.error('Select a clip to copy');
      return;
    }

    const clip = tracks.flatMap(t => t.clips).find(c => c.id === editorState.selectedClipId);
    if (clip) {
      setClipboard({ ...clip });
      toast.success('Clip copied');
    }
  }, [editorState.selectedClipId, tracks]);

  const handlePaste = useCallback(() => {
    if (!clipboard) {
      toast.error('Nothing to paste');
      return;
    }

    const newClip: TimelineClip = {
      ...clipboard,
      id: `clip-${Date.now()}`,
      startTime: editorState.currentTime
    };

    // Find appropriate track
    const targetTrack = tracks.find(t => t.id === clipboard.trackId) || tracks[0];
    
    setTracks(prev => prev.map(t => 
      t.id === targetTrack.id
        ? { ...t, clips: [...t.clips, newClip].sort((a, b) => a.startTime - b.startTime) }
        : t
    ));

    saveHistory();
    toast.success('Clip pasted');
  }, [clipboard, editorState.currentTime, tracks, saveHistory]);

  const handleDelete = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) {
      toast.error('Select a clip to delete');
      return;
    }

    setTracks(prev => prev.map(track => 
      track.id === editorState.selectedTrackId
        ? { ...track, clips: track.clips.filter(c => c.id !== editorState.selectedClipId) }
        : track
    ));

    setEditorState(prev => ({ 
      ...prev, 
      selectedClipId: null, 
      selectedTrackId: null 
    }));

    saveHistory();
    toast.success('Clip deleted');
  }, [editorState.selectedClipId, editorState.selectedTrackId, saveHistory]);

  const handleAspectRatioChange = useCallback((ratio: '16:9' | '9:16' | '1:1') => {
    setEditorState(prev => ({ ...prev, aspectRatio: ratio }));
  }, []);

  const handleZoomChange = useCallback((zoom: number) => {
    setEditorState(prev => ({ ...prev, zoom }));
  }, []);

  const handleExport = useCallback(() => {
    toast.info('Export functionality coming soon');
  }, []);

  // Duplicate selected clip
  const handleDuplicate = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) {
      toast.error('Select a clip to duplicate');
      return;
    }

    const track = tracks.find(t => t.id === editorState.selectedTrackId);
    const clip = track?.clips.find(c => c.id === editorState.selectedClipId);
    
    if (!clip) return;

    const newClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}`,
      startTime: clip.startTime + clip.duration
    };

    setTracks(prev => prev.map(t => 
      t.id === editorState.selectedTrackId
        ? { ...t, clips: [...t.clips, newClip].sort((a, b) => a.startTime - b.startTime) }
        : t
    ));

    setEditorState(prev => ({
      ...prev,
      selectedClipId: newClip.id
    }));

    saveHistory();
    toast.success('Clip duplicated');
  }, [editorState.selectedClipId, editorState.selectedTrackId, tracks, saveHistory]);

  // Move clip to start of timeline
  const handleMoveToStart = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) return;

    setTracks(prev => prev.map(track => 
      track.id === editorState.selectedTrackId
        ? {
            ...track,
            clips: track.clips.map(c => 
              c.id === editorState.selectedClipId ? { ...c, startTime: 0 } : c
            ).sort((a, b) => a.startTime - b.startTime)
          }
        : track
    ));

    saveHistory();
    toast.success('Moved to start');
  }, [editorState.selectedClipId, editorState.selectedTrackId, saveHistory]);

  // Move clip to end of timeline content
  const handleMoveToEnd = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) return;

    const track = tracks.find(t => t.id === editorState.selectedTrackId);
    const clip = track?.clips.find(c => c.id === editorState.selectedClipId);
    if (!clip || !track) return;

    // Find the end of the last clip (excluding the selected one)
    const otherClips = track.clips.filter(c => c.id !== editorState.selectedClipId);
    const lastEnd = otherClips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

    setTracks(prev => prev.map(t => 
      t.id === editorState.selectedTrackId
        ? {
            ...t,
            clips: t.clips.map(c => 
              c.id === editorState.selectedClipId ? { ...c, startTime: lastEnd } : c
            ).sort((a, b) => a.startTime - b.startTime)
          }
        : t
    ));

    saveHistory();
    toast.success('Moved to end');
  }, [editorState.selectedClipId, editorState.selectedTrackId, tracks, saveHistory]);

  // Nudge clip left
  const handleNudgeLeft = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) return;

    const nudgeAmount = 0.5; // seconds
    
    setTracks(prev => prev.map(track => 
      track.id === editorState.selectedTrackId
        ? {
            ...track,
            clips: track.clips.map(c => 
              c.id === editorState.selectedClipId 
                ? { ...c, startTime: Math.max(0, c.startTime - nudgeAmount) } 
                : c
            ).sort((a, b) => a.startTime - b.startTime)
          }
        : track
    ));
  }, [editorState.selectedClipId, editorState.selectedTrackId]);

  // Nudge clip right
  const handleNudgeRight = useCallback(() => {
    if (!editorState.selectedClipId || !editorState.selectedTrackId) return;

    const nudgeAmount = 0.5; // seconds
    
    setTracks(prev => prev.map(track => 
      track.id === editorState.selectedTrackId
        ? {
            ...track,
            clips: track.clips.map(c => 
              c.id === editorState.selectedClipId 
                ? { ...c, startTime: c.startTime + nudgeAmount } 
                : c
            ).sort((a, b) => a.startTime - b.startTime)
          }
        : track
    ));
  }, [editorState.selectedClipId, editorState.selectedTrackId]);

  // Get selected clip
  const selectedClip = editorState.selectedClipId
    ? tracks.flatMap(t => t.clips).find(c => c.id === editorState.selectedClipId) || null
    : null;

  return (
    <div 
      ref={editorRef}
      className="flex-1 flex flex-col bg-background overflow-hidden"
      tabIndex={0}
    >
      {/* Toolbar - compact */}
      <EditorToolbar
        editorState={editorState}
        onAspectRatioChange={handleAspectRatioChange}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSplit={handleSplit}
        onCopy={handleCopy}
        onDelete={handleDelete}
        onExport={handleExport}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
      />

      {/* Main Resizable Layout */}
      <ResizablePanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Preview Area */}
        <ResizablePanel defaultSize={60} minSize={30}>
          <div className="h-full flex overflow-hidden">
            {/* Media Panel - collapsible */}
            {showMediaPanel && (
              <MediaPanel
                mediaItems={mediaItems}
                onUpload={handleUpload}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onClose={() => setShowMediaPanel(false)}
                onDriveFileSelect={async (file: DriveFile, accessToken?: string) => {
                  if (!accessToken) return;
                  
                  // Download and add to media library
                  const response = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
                    { headers: { 'Authorization': `Bearer ${accessToken}` } }
                  );
                  const blob = await response.blob();
                  const url = URL.createObjectURL(blob);
                  
                  const type = file.mimeType.startsWith('video/') ? 'video' 
                    : file.mimeType.startsWith('audio/') ? 'audio' 
                    : 'image';
                  
                  const duration = await getMediaDuration({ type: file.mimeType } as File, url);
                  
                  const newItem: MediaItem = {
                    id: `drive-${file.id}`,
                    type,
                    name: file.name,
                    url,
                    duration,
                    source: 'upload'
                  };
                  
                  setMediaItems(prev => [...prev, newItem]);
                  toast.success(`Added "${file.name}" to media library`);
                }}
              />
            )}

            {/* Preview Player - takes full remaining space */}
            <PreviewPlayer
              editorState={editorState}
              captionStyle={captionStyle}
              tracks={tracks}
              onPlayPause={handlePlayPause}
              onSeek={handleSeek}
              onTimeUpdate={handleTimeUpdate}
              showMediaPanelToggle={!showMediaPanel}
              onToggleMediaPanel={() => setShowMediaPanel(true)}
              onAddMedia={async (file: File) => {
                const url = URL.createObjectURL(file);
                const type = file.type.startsWith('video/') ? 'video' 
                  : file.type.startsWith('audio/') ? 'audio' 
                  : 'image';
                
                const duration = await getMediaDuration(file, url);
                
                const newItem: MediaItem = {
                  id: `upload-${Date.now()}`,
                  type,
                  name: file.name,
                  url,
                  duration,
                  blob: file,
                  source: 'upload'
                };
                
                // Add to media library
                setMediaItems(prev => [...prev, newItem]);
                
                // Auto-add to appropriate track at playhead position
                const trackType = type === 'audio' ? 'audio' : 'video';
                const targetTrack = tracks.find(t => t.type === trackType);
                
                if (targetTrack) {
                  handleDropMedia(newItem, targetTrack.id, editorState.currentTime);
                }
                
                return newItem;
              }}
            />
          </div>
        </ResizablePanel>

        {/* Resizable Handle with drag indicator */}
        <ResizableHandle withHandle className="bg-border hover:bg-primary/50 transition-colors" />

        {/* Timeline Area - scrollable */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <div className="h-full flex flex-col overflow-hidden bg-card/30">
            {/* Clip Editing Toolbar - compact */}
            <ClipToolbar
              hasSelection={!!editorState.selectedClipId}
              hasClipboard={!!clipboard}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onSplit={handleSplit}
              onDelete={handleDelete}
              onCopy={handleCopy}
              onPaste={handlePaste}
              onDuplicate={handleDuplicate}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onMoveToStart={handleMoveToStart}
              onMoveToEnd={handleMoveToEnd}
              onNudgeLeft={handleNudgeLeft}
              onNudgeRight={handleNudgeRight}
            />
            
            {/* Timeline content - scrollable */}
            <div className="flex-1 min-h-0 overflow-auto">
              <Timeline
                editorState={editorState}
                tracks={tracks}
                onClipSelect={handleClipSelect}
                onClipMove={handleClipMove}
                onClipMoveToTrack={handleClipMoveToTrack}
                onClipResize={handleClipResize}
                onClipDelete={handleClipDelete}
                onSeek={handleSeek}
                onZoomChange={handleZoomChange}
                onDropMedia={handleDropMedia}
                onDropFile={handleDropFile}
                onTrackToggleLock={handleTrackToggleLock}
                onTrackToggleVisible={handleTrackToggleVisible}
                onAddTrack={handleAddTrack}
                draggingMedia={draggingMedia}
              />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
