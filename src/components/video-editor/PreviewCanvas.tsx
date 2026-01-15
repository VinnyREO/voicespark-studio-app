import { useEffect, useRef, useCallback } from 'react';
import { AspectRatio as AspectRatioType, MediaAsset, TimelineClip } from '@/types/video-editor';
import { cn } from '@/lib/utils';

// Singleton Audio Manager - guarantees only ONE audio plays at a time globally
const AudioManager = {
  _audio: null as HTMLAudioElement | null,
  _currentClipId: null as string | null,
  _blobUrls: new Map<string, string>(),

  play(clipId: string, src: string, file: File | undefined, startTime: number, volume: number, playbackRate: number) {
    // If same clip is already playing, just update properties
    if (this._currentClipId === clipId && this._audio && !this._audio.paused) {
      this._audio.volume = Math.min(1, Math.max(0, volume));
      this._audio.playbackRate = playbackRate;
      // Sync time if significantly off
      if (Math.abs(this._audio.currentTime - startTime) > 0.2) {
        this._audio.currentTime = startTime;
      }
      return;
    }

    // Different clip or not playing - stop current and start new
    this.stop();

    // Create new audio element
    this._audio = new Audio();
    this._audio.preload = 'auto';
    this._currentClipId = clipId;

    // Get or create blob URL
    let blobUrl = this._blobUrls.get(clipId);
    if (!blobUrl && file) {
      blobUrl = URL.createObjectURL(file);
      this._blobUrls.set(clipId, blobUrl);
    }

    this._audio.src = blobUrl || src;
    this._audio.volume = Math.min(1, Math.max(0, volume));
    this._audio.playbackRate = playbackRate;
    this._audio.currentTime = startTime;
    this._audio.play().catch(() => {});
  },

  stop() {
    if (this._audio) {
      this._audio.pause();
      this._audio.src = '';
      this._audio = null;
    }
    this._currentClipId = null;
  },

  updateVolume(volume: number) {
    if (this._audio) {
      this._audio.volume = Math.min(1, Math.max(0, volume));
    }
  },

  syncTime(time: number) {
    if (this._audio && Math.abs(this._audio.currentTime - time) > 0.2) {
      this._audio.currentTime = time;
    }
  },

  isPlayingClip(clipId: string): boolean {
    return this._currentClipId === clipId && this._audio !== null && !this._audio.paused;
  },

  cleanup() {
    this.stop();
    this._blobUrls.forEach(url => URL.revokeObjectURL(url));
    this._blobUrls.clear();
  }
};

interface PreviewCanvasProps {
  clips: TimelineClip[];
  assets: MediaAsset[];
  playheadPosition: number;
  isPlaying: boolean;
  aspectRatio: AspectRatioType;
  volume: number;
  trackSettings?: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>;
  onDropFile?: (file: File) => void;
}

export function PreviewCanvas({
  clips,
  assets,
  playheadPosition,
  isPlaying,
  aspectRatio,
  volume,
  trackSettings = {},
  onDropFile,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const currentAssetSrcRef = useRef<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const playheadPositionRef = useRef(playheadPosition);

  const getAspectRatioDimensions = (ratio: AspectRatioType) => {
    switch (ratio) {
      case '16:9':
        return { width: 16, height: 9 };
      case '9:16':
        return { width: 9, height: 16 };
      case '1:1':
        return { width: 1, height: 1 };
    }
  };

  // Sync playhead position to ref
  useEffect(() => {
    playheadPositionRef.current = playheadPosition;
  }, [playheadPosition]);

  // Initialize video element once
  useEffect(() => {
    if (!videoRef.current) {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.playsInline = true;
      video.muted = true; // Start muted to avoid autoplay issues
      videoRef.current = video;
    }
  }, []);

  // Draw frame to canvas - optimized for smooth playback
  // STABLE: Only depends on clips/assets, not playheadPosition
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current playhead position from ref instead of prop
    const currentPosition = playheadPositionRef.current;

    // Find active clip at playhead that is on a visible track
    const activeClip = clips.find(clip => {
      const trackSetting = trackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
      return trackSetting.visible &&
             currentPosition >= clip.startTime &&
             currentPosition < clip.startTime + clip.duration;
    });

    // Only clear and show placeholder if there's NO visible clip
    if (!activeClip) {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#666';
      ctx.font = '20px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No video at playhead', canvas.width / 2, canvas.height / 2);
      return;
    }

    const asset = assets.find(a => a.id === activeClip.assetId);
    if (!asset) return;

    // Clear to black background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Handle video
    if (asset.type === 'video' && videoRef.current) {
      const video = videoRef.current;

      // Only draw if video has data ready
      if (video.readyState >= HTMLVideoElement.HAVE_CURRENT_DATA) {
        const videoAspect = video.videoWidth / video.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        // Use "cover" mode - fill entire canvas, may crop edges
        if (videoAspect > canvasAspect) {
          // Video is wider - fit to height, crop sides
          drawHeight = canvas.height;
          drawWidth = canvas.height * videoAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          // Video is taller - fit to width, crop top/bottom
          drawWidth = canvas.width;
          drawHeight = canvas.width / videoAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      }
    }

    // Handle image
    if (asset.type === 'image') {
      const cachedImg = imageCache.current.get(asset.src);

      if (cachedImg && cachedImg.complete) {
        const imgAspect = cachedImg.width / cachedImg.height;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        // Use "cover" mode - fill entire canvas, may crop edges
        if (imgAspect > canvasAspect) {
          // Image is wider - fit to height, crop sides
          drawHeight = canvas.height;
          drawWidth = canvas.height * imgAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          // Image is taller - fit to width, crop top/bottom
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }

        ctx.drawImage(cachedImg, drawX, drawY, drawWidth, drawHeight);
      } else if (!cachedImg) {
        // Load image and cache it
        const img = new Image();
        img.onload = () => {
          imageCache.current.set(asset.src, img);
          drawFrame(); // Redraw once loaded
        };

        // If asset has a File object, create blob URL from it
        // Otherwise use asset.src
        if (asset.file) {
          const blobUrl = URL.createObjectURL(asset.file);
          img.onload = () => {
            imageCache.current.set(asset.src, img);
            URL.revokeObjectURL(blobUrl); // Revoke after loading
            drawFrame(); // Redraw once loaded
          };
          img.src = blobUrl;
        } else {
          img.src = asset.src;
        }
      }
    }

    // Handle audio - show a visual indicator
    if (asset.type === 'audio') {
      // Draw a gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw audio icon
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 64px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u266B', canvas.width / 2, canvas.height / 2 - 30);

      // Draw asset name
      ctx.fillStyle = '#e5e7eb';
      ctx.font = '18px sans-serif';
      ctx.fillText(asset.name, canvas.width / 2, canvas.height / 2 + 40);
    }
  }, [clips, assets, trackSettings]); // STABLE: removed playheadPosition dependency

  // Handle video source changes and playback state
  // SIMPLIFIED: Only runs on clip/asset/playing/volume changes, not playheadPosition
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentPosition = playheadPositionRef.current;
    const activeClip = clips.find(clip =>
      currentPosition >= clip.startTime &&
      currentPosition < clip.startTime + clip.duration
    );

    const asset = activeClip ? assets.find(a => a.id === activeClip.assetId) : null;

    // Handle video asset
    if (asset?.type === 'video') {
      // Only change video source if it's different
      if (currentAssetSrcRef.current !== asset.src) {
        currentAssetSrcRef.current = asset.src;

        // Revoke previous blob URL if it exists
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }

        // If asset has a File object, create a fresh blob URL from it
        // This ensures compatibility with files dragged from external sources
        if (asset.file) {
          const blobUrl = URL.createObjectURL(asset.file);
          currentBlobUrlRef.current = blobUrl;
          video.src = blobUrl;
        } else {
          // Fallback to asset.src if no File object
          video.src = asset.src;
        }

        video.load();
      }

      // Update volume - combine global, track-level, and clip-specific volume
      const trackSetting = trackSettings[activeClip!.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
      const clipVolume = activeClip!.volume ?? 1;
      const finalVolume = volume * trackSetting.volume * clipVolume;
      // Mute video if track is muted OR final volume is 0
      video.muted = trackSetting.muted || finalVolume === 0;
      video.volume = finalVolume;

      // Update playback rate based on track and clip speed
      const clipSpeed = activeClip!.speed ?? 1;
      video.playbackRate = trackSetting.speed * clipSpeed;

      // Calculate time within clip (trimStart defaults to 0)
      const clipTrimStart = activeClip!.trimStart ?? 0;
      const clipTime = currentPosition - activeClip!.startTime + clipTrimStart;

      if (isPlaying) {
        video.currentTime = clipTime;
        video.play().catch(() => {});
      } else {
        video.pause();

        // For paused state, ensure we seek and draw the frame when ready
        if (Math.abs(video.currentTime - clipTime) > 0.016) {
          video.currentTime = clipTime;
          const onSeeked = () => {
            drawFrame();
            video.removeEventListener('seeked', onSeeked);
          };
          video.addEventListener('seeked', onSeeked);
        } else {
          // Already at correct time, just draw
          drawFrame();
        }
      }
    } else {
      // No video asset, pause current video
      video.pause();
      currentAssetSrcRef.current = null;

      // Revoke blob URL when switching away from video
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }

      // Draw for image or placeholder
      if (!isPlaying) {
        drawFrame();
      }
    }
  }, [clips, assets, isPlaying, volume, drawFrame]); // REMOVED playheadPosition

  // Handle user scrubbing when paused - immediate frame-accurate preview
  useEffect(() => {
    if (isPlaying) return; // Only handle when paused

    const video = videoRef.current;
    if (!video) return;

    const activeClip = clips.find(clip =>
      playheadPosition >= clip.startTime &&
      playheadPosition < clip.startTime + clip.duration
    );

    const asset = activeClip ? assets.find(a => a.id === activeClip.assetId) : null;

    if (asset?.type === 'video') {
      const clipTime = playheadPosition - activeClip!.startTime + activeClip!.trimStart;

      // Seek immediately for accurate scrubbing (reduced threshold for better responsiveness)
      if (Math.abs(video.currentTime - clipTime) > 0.016) { // ~1 frame at 60fps
        video.currentTime = clipTime;

        // Wait for seek to complete before drawing
        const onSeeked = () => {
          drawFrame();
          video.removeEventListener('seeked', onSeeked);
        };
        video.addEventListener('seeked', onSeeked);
      } else {
        // If already at correct time, just redraw
        drawFrame();
      }
    } else {
      // For images or no clip, always redraw immediately
      drawFrame();
    }
  }, [playheadPosition, isPlaying, clips, assets, drawFrame]);

  // Store refs for audio data to avoid dependency issues
  const clipsRef = useRef(clips);
  const assetsRef = useRef(assets);
  const volumeRef = useRef(volume);
  const trackSettingsRef = useRef(trackSettings);

  // Update refs when props change (this doesn't trigger re-renders)
  useEffect(() => {
    clipsRef.current = clips;
    assetsRef.current = assets;
    volumeRef.current = volume;
    trackSettingsRef.current = trackSettings;
  }, [clips, assets, volume, trackSettings]);

  // Handle audio playback - ONLY depends on isPlaying to prevent multiple effect runs
  useEffect(() => {
    // Stop audio when not playing
    if (!isPlaying) {
      AudioManager.stop();
      return;
    }

    // Function to find and play the active audio clip
    const syncAudio = () => {
      const currentPosition = playheadPositionRef.current;
      const currentClips = clipsRef.current;
      const currentAssets = assetsRef.current;
      const currentVolume = volumeRef.current;
      const currentTrackSettings = trackSettingsRef.current;

      // Find the first audio-only clip at current playhead position
      const audioClip = currentClips.find(clip => {
        const asset = currentAssets.find(a => a.id === clip.assetId);
        const trackSetting = currentTrackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
        return asset?.type === 'audio' &&
               trackSetting.visible &&
               !trackSetting.muted &&
               currentPosition >= clip.startTime &&
               currentPosition < clip.startTime + clip.duration;
      });

      if (audioClip) {
        const asset = currentAssets.find(a => a.id === audioClip.assetId);
        if (asset) {
          const trackSetting = currentTrackSettings[audioClip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
          const clipVolume = audioClip.volume ?? 1;
          const finalVolume = currentVolume * trackSetting.volume * clipVolume;
          const clipSpeed = audioClip.speed ?? 1;
          const clipTrimStart = audioClip.trimStart ?? 0;
          const clipTime = currentPosition - audioClip.startTime + clipTrimStart;

          AudioManager.play(
            audioClip.id,
            asset.src,
            asset.file,
            clipTime,
            finalVolume,
            trackSetting.speed * clipSpeed
          );
        }
      } else {
        // No audio clip at current position - stop any playing audio
        AudioManager.stop();
      }
    };

    // Run immediately
    syncAudio();

    // Sync periodically while playing
    const syncInterval = window.setInterval(syncAudio, 100);

    return () => {
      clearInterval(syncInterval);
      AudioManager.stop();
    };
  }, [isPlaying]); // ONLY depend on isPlaying - refs handle everything else

  // Animation loop for smooth playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      // Draw one final frame when stopping animation to show paused state
      drawFrame();
      return;
    }

    const animate = () => {
      drawFrame();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, drawFrame]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      // Cleanup all audio elements
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
      // Revoke audio blob URLs
      audioBlobUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      audioBlobUrlsRef.current.clear();
      // Revoke video blob URL on cleanup
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
      }
      imageCache.current.clear();
    };
  }, []);

  const { width, height } = getAspectRatioDimensions(aspectRatio);

  // Calculate canvas dimensions based on aspect ratio
  // Use higher resolution for better quality while maintaining aspect ratio
  const getCanvasDimensions = () => {
    switch (aspectRatio) {
      case '16:9':
        return { width: 1920, height: 1080 };
      case '9:16':
        return { width: 1080, height: 1920 };
      case '1:1':
        return { width: 1080, height: 1080 };
    }
  };

  const canvasDimensions = getCanvasDimensions();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent global handler from also processing this
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFile) {
      const file = e.dataTransfer.files[0];
      onDropFile(file);
    }
  };

  return (
    <div
      data-drop-zone="preview-canvas"
      className="flex items-center justify-center w-full h-full bg-background/50"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Canvas Container */}
      <div className="relative flex items-center justify-center w-full h-full">
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className={cn(
            'border-2 border-border rounded-lg shadow-2xl bg-black',
            'max-w-full max-h-full'
          )}
          style={{
            aspectRatio: `${width}/${height}`,
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}
