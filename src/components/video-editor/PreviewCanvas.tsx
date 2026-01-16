import { useEffect, useRef, useCallback } from 'react';
import { AspectRatio as AspectRatioType, MediaAsset, TimelineClip } from '@/types/video-editor';
import { cn } from '@/lib/utils';

// Multi-track Audio Manager - supports multiple simultaneous audio tracks
// Key insight: Only start/stop on clip transitions, never sync time during playback
const AudioManager = {
  _audioElements: new Map<string, HTMLAudioElement>(), // clipId -> audio element
  _blobUrls: new Map<string, string>(),
  _transitioning: new Set<string>(), // Track which clips are currently transitioning

  // Start playing a clip - supports multiple simultaneous clips
  startClip(clipId: string, src: string, file: File | undefined, startTime: number, volume: number, playbackRate: number) {
    // Prevent re-entry during async operations for this specific clip
    if (this._transitioning.has(clipId)) return;

    // If same clip already playing, just update settings
    const existingAudio = this._audioElements.get(clipId);
    if (existingAudio) {
      this.updateClipSettings(clipId, volume, playbackRate);
      return;
    }

    this._transitioning.add(clipId);

    // Create new audio element for this clip
    const audio = new Audio();
    audio.preload = 'auto';

    // Get or create blob URL (keyed by clipId to ensure uniqueness)
    let audioSrc: string;
    if (file) {
      let blobUrl = this._blobUrls.get(clipId);
      if (!blobUrl) {
        blobUrl = URL.createObjectURL(file);
        this._blobUrls.set(clipId, blobUrl);
      }
      audioSrc = blobUrl;
    } else {
      audioSrc = src;
    }

    audio.src = audioSrc;
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.playbackRate = playbackRate;
    audio.currentTime = startTime;

    // Store reference before play
    this._audioElements.set(clipId, audio);

    // Play and handle completion
    audio.play()
      .then(() => {
        this._transitioning.delete(clipId);
      })
      .catch(() => {
        this._transitioning.delete(clipId);
      });
  },

  // Update volume/speed for a specific clip without touching time or restarting
  updateClipSettings(clipId: string, volume: number, playbackRate: number) {
    const audio = this._audioElements.get(clipId);
    if (audio) {
      audio.volume = Math.min(1, Math.max(0, volume));
      audio.playbackRate = playbackRate;
    }
  },

  // Stop a specific clip
  stopClip(clipId: string) {
    const audio = this._audioElements.get(clipId);
    if (audio) {
      audio.pause();
      audio.src = '';
      this._audioElements.delete(clipId);
    }
    this._transitioning.delete(clipId);
  },

  // Stop all audio
  stop() {
    this._audioElements.forEach((audio, clipId) => {
      audio.pause();
      audio.src = '';
    });
    this._audioElements.clear();
    this._transitioning.clear();
  },

  // Sync time for a specific clip (for explicit user seeks)
  syncClipTime(clipId: string, time: number) {
    const audio = this._audioElements.get(clipId);
    if (audio && !this._transitioning.has(clipId)) {
      audio.currentTime = time;
    }
  },

  // Get all currently playing clip IDs
  getPlayingClipIds(): string[] {
    return Array.from(this._audioElements.keys());
  },

  // Check if a specific clip is playing
  isClipPlaying(clipId: string): boolean {
    return this._audioElements.has(clipId);
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
  seekVersion?: number; // Increments when user explicitly seeks - triggers media sync
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
  seekVersion = 0,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const currentAssetSrcRef = useRef<string | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  const playheadPositionRef = useRef(playheadPosition);
  const lastSeekVersionRef = useRef(seekVersion);
  const currentVideoClipIdRef = useRef<string | null>(null);

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

  // Initialize video element once - run synchronously before other effects
  if (!videoRef.current) {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.playsInline = true;
    video.muted = true; // Start muted to avoid autoplay issues
    videoRef.current = video;
  }

  // Draw frame to canvas - optimized for smooth playback
  // STABLE: Only depends on clips/assets, not playheadPosition
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current playhead position from ref instead of prop
    const currentPosition = playheadPositionRef.current;

    // Find all clips at playhead that are on visible tracks
    const activeClips = clips.filter(clip => {
      const trackSetting = trackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
      return trackSetting.visible &&
             currentPosition >= clip.startTime &&
             currentPosition < clip.startTime + clip.duration;
    });

    // Sort by trackIndex - lower trackIndex = higher priority (Track 1 on top)
    // Then select the highest priority clip (lowest trackIndex)
    activeClips.sort((a, b) => a.trackIndex - b.trackIndex);
    const activeClip = activeClips[0];

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

      // Only draw if video has data ready (HAVE_CURRENT_DATA = 2)
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
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
      } else {
        // Video not ready yet - show loading indicator
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#888';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Loading video...', canvas.width / 2, canvas.height / 2);
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

  // Handle explicit user seeks - sync video and audio to new position
  // This fires when seekVersion changes (user clicked timeline, dragged playhead, etc.)
  useEffect(() => {
    // Skip initial render
    if (lastSeekVersionRef.current === seekVersion) return;
    lastSeekVersionRef.current = seekVersion;

    const video = videoRef.current;
    if (!video) return;

    // Find all clips at playhead and sort by track priority (lower trackIndex = higher priority)
    const activeClips = clips
      .filter(clip =>
        playheadPosition >= clip.startTime &&
        playheadPosition < clip.startTime + clip.duration
      )
      .sort((a, b) => a.trackIndex - b.trackIndex);

    const activeClip = activeClips[0];
    const asset = activeClip ? assets.find(a => a.id === activeClip.assetId) : null;

    // Sync video to new position (always sync video frame for preview)
    if (asset?.type === 'video' && activeClip) {
      const clipTrimStart = activeClip.trimStart ?? 0;
      const clipTime = playheadPosition - activeClip.startTime + clipTrimStart;

      // Check if we need to load a different video source
      if (currentAssetSrcRef.current !== asset.src) {
        currentAssetSrcRef.current = asset.src;

        // Revoke previous blob URL if it exists
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }

        // Create blob URL from file or use src
        if (asset.file) {
          const blobUrl = URL.createObjectURL(asset.file);
          currentBlobUrlRef.current = blobUrl;
          video.src = blobUrl;
        } else {
          video.src = asset.src;
        }

        // Wait for video to load enough data, then seek and draw
        const onCanPlay = () => {
          video.currentTime = clipTime;
          video.removeEventListener('canplay', onCanPlay);
        };
        const onSeeked = () => {
          drawFrame();
          video.removeEventListener('seeked', onSeeked);
        };
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('seeked', onSeeked);
        video.load();
      } else {
        // Same video source - just seek and draw
        video.currentTime = clipTime;
        const onSeeked = () => {
          drawFrame();
          video.removeEventListener('seeked', onSeeked);
        };
        video.addEventListener('seeked', onSeeked);
      }

      // Update the clip ID ref so transition check knows we're on this clip
      currentVideoClipIdRef.current = activeClip.id;
    } else {
      // No video clip at this position - draw placeholder or image
      drawFrame();
    }

    // Only sync audio if currently playing - don't start audio when paused
    if (isPlaying) {
      // Find ALL audio clips at the new position (multi-track support)
      const audioClips = clips.filter(clip => {
        const clipAsset = assets.find(a => a.id === clip.assetId);
        const trackSetting = trackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
        return clipAsset?.type === 'audio' &&
               trackSetting.visible &&
               !trackSetting.muted &&
               playheadPosition >= clip.startTime &&
               playheadPosition < clip.startTime + clip.duration;
      });

      // Stop all audio and restart from new position for all active clips
      AudioManager.stop();

      // Start all audio clips at the seek position
      audioClips.forEach(audioClip => {
        const audioAsset = assets.find(a => a.id === audioClip.assetId);
        if (audioAsset) {
          const trackSetting = trackSettings[audioClip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
          const clipVolume = audioClip.volume ?? 1;
          const finalVolume = volume * trackSetting.volume * clipVolume;
          const clipSpeed = audioClip.speed ?? 1;
          const clipTrimStart = audioClip.trimStart ?? 0;
          const audioClipTime = playheadPosition - audioClip.startTime + clipTrimStart;

          AudioManager.startClip(
            audioClip.id,
            audioAsset.src,
            audioAsset.file,
            audioClipTime,
            finalVolume,
            trackSetting.speed * clipSpeed
          );
        }
      });
    }
  }, [seekVersion, playheadPosition, isPlaying, clips, assets, volume, trackSettings, drawFrame]);

  // Handle video source changes and playback state
  // SIMPLIFIED: Only runs on clip/asset/playing/volume changes, not playheadPosition
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const currentPosition = playheadPositionRef.current;

    // Find all clips at current position and sort by track priority (lower trackIndex = higher priority)
    const activeClips = clips
      .filter(clip =>
        currentPosition >= clip.startTime &&
        currentPosition < clip.startTime + clip.duration
      )
      .sort((a, b) => a.trackIndex - b.trackIndex);

    const activeClip = activeClips[0];
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
  // This is the PRIMARY effect for showing video frames when paused
  useEffect(() => {
    if (isPlaying) return; // Only handle when paused

    const video = videoRef.current;
    if (!video) return;

    // Find all clips at playhead and sort by track priority (lower trackIndex = higher priority)
    const activeClips = clips
      .filter(clip =>
        playheadPosition >= clip.startTime &&
        playheadPosition < clip.startTime + clip.duration
      )
      .sort((a, b) => a.trackIndex - b.trackIndex);

    const activeClip = activeClips[0];
    const asset = activeClip ? assets.find(a => a.id === activeClip.assetId) : null;

    if (asset?.type === 'video') {
      const clipTrimStart = activeClip!.trimStart ?? 0;
      const clipTime = playheadPosition - activeClip!.startTime + clipTrimStart;

      // Helper to seek and draw frame once video is ready
      const seekAndDraw = () => {
        video.currentTime = clipTime;
        const onSeeked = () => {
          drawFrame();
          video.removeEventListener('seeked', onSeeked);
        };
        video.addEventListener('seeked', onSeeked);

        // Fallback: if seeked event doesn't fire within 500ms, draw anyway
        setTimeout(() => {
          if (video.readyState >= 2) {
            drawFrame();
          }
        }, 500);
      };

      // Check if we need to load a different video source
      if (currentAssetSrcRef.current !== asset.src) {
        currentAssetSrcRef.current = asset.src;

        // Revoke previous blob URL if it exists
        if (currentBlobUrlRef.current) {
          URL.revokeObjectURL(currentBlobUrlRef.current);
          currentBlobUrlRef.current = null;
        }

        // Create blob URL from file or use src
        if (asset.file) {
          const blobUrl = URL.createObjectURL(asset.file);
          currentBlobUrlRef.current = blobUrl;
          video.src = blobUrl;
        } else {
          video.src = asset.src;
        }

        // Wait for video to have enough data to seek
        const onLoadedMetadata = () => {
          seekAndDraw();
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.load();

        // Fallback: if loadedmetadata doesn't fire within 1 second, try to draw anyway
        setTimeout(() => {
          if (video.readyState >= 2) {
            drawFrame();
          }
        }, 1000);
      } else if (video.readyState >= 1) {
        // Same video source AND video has metadata - seek immediately
        if (Math.abs(video.currentTime - clipTime) > 0.016) { // ~1 frame at 60fps
          seekAndDraw();
        } else {
          // Already at correct time, just redraw
          drawFrame();
        }
      } else {
        // Video source is set but not loaded yet - wait for metadata
        const onLoadedMetadata = () => {
          seekAndDraw();
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
        };
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        // Try loading if not already
        if (video.src) {
          video.load();
        }

        // Fallback timeout
        setTimeout(() => {
          if (video.readyState >= 2) {
            drawFrame();
          }
        }, 1000);
      }
    } else {
      // For images or no clip, always redraw immediately
      drawFrame();
    }
  }, [playheadPosition, isPlaying, clips, assets, drawFrame]);

  // Draw initial frame on mount and when clips/assets first load
  // This ensures something is visible immediately without user interaction
  useEffect(() => {
    // Always draw on mount/clip changes - this handles the initial "No video at playhead" message
    // and ensures images load correctly
    drawFrame();
  }, [clips, assets, drawFrame]);

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

  // Handle audio playback - supports MULTIPLE simultaneous audio tracks
  // ONLY starts/stops audio on clip transitions, never re-syncs time during playback
  useEffect(() => {
    // Stop all audio when not playing
    if (!isPlaying) {
      AudioManager.stop();
      return;
    }

    // Function to check for audio clip transitions (NOT continuous time sync)
    const checkAudioTransitions = () => {
      const currentPosition = playheadPositionRef.current;
      const currentClips = clipsRef.current;
      const currentAssets = assetsRef.current;
      const currentVolume = volumeRef.current;
      const currentTrackSettings = trackSettingsRef.current;

      // Find ALL audio clips at current playhead position (not just the first one)
      const activeAudioClips = currentClips.filter(clip => {
        const asset = currentAssets.find(a => a.id === clip.assetId);
        const trackSetting = currentTrackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
        return asset?.type === 'audio' &&
               trackSetting.visible &&
               !trackSetting.muted &&
               currentPosition >= clip.startTime &&
               currentPosition < clip.startTime + clip.duration;
      });

      // Get currently playing clip IDs
      const currentlyPlayingIds = new Set(AudioManager.getPlayingClipIds());
      const activeClipIds = new Set(activeAudioClips.map(c => c.id));

      // Stop clips that are no longer active
      currentlyPlayingIds.forEach(clipId => {
        if (!activeClipIds.has(clipId)) {
          AudioManager.stopClip(clipId);
        }
      });

      // Start new clips and update existing ones
      activeAudioClips.forEach(audioClip => {
        const asset = currentAssets.find(a => a.id === audioClip.assetId);
        if (!asset) return;

        const trackSetting = currentTrackSettings[audioClip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
        const clipVolume = audioClip.volume ?? 1;
        const finalVolume = currentVolume * trackSetting.volume * clipVolume;
        const clipSpeed = audioClip.speed ?? 1;

        if (AudioManager.isClipPlaying(audioClip.id)) {
          // Clip already playing - just update volume/speed
          AudioManager.updateClipSettings(audioClip.id, finalVolume, trackSetting.speed * clipSpeed);
        } else {
          // New clip - start it
          const clipTrimStart = audioClip.trimStart ?? 0;
          const clipTime = currentPosition - audioClip.startTime + clipTrimStart;

          AudioManager.startClip(
            audioClip.id,
            asset.src,
            asset.file,
            clipTime,
            finalVolume,
            trackSetting.speed * clipSpeed
          );
        }
      });
    };

    // Run immediately
    checkAudioTransitions();

    // Check for clip transitions periodically (lightweight - no time sync)
    const transitionCheckInterval = window.setInterval(checkAudioTransitions, 100);

    return () => {
      clearInterval(transitionCheckInterval);
      AudioManager.stop();
    };
  }, [isPlaying]); // ONLY depend on isPlaying - refs handle everything else

  // Video clip transition detection - ONLY syncs on clip changes, not continuously
  // This prevents stutter by letting video play naturally once started
  useEffect(() => {
    if (!isPlaying) {
      currentVideoClipIdRef.current = null;
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    // Check for clip transitions (not time sync - that causes stutter)
    const checkClipTransition = () => {
      const currentPosition = playheadPositionRef.current;
      const currentClips = clipsRef.current;
      const currentAssets = assetsRef.current;
      const currentVolume = volumeRef.current;
      const currentTrackSettings = trackSettingsRef.current;

      // Find all video clips at playhead, sorted by track priority
      const videoClips = currentClips
        .filter(clip => {
          const asset = currentAssets.find(a => a.id === clip.assetId);
          const trackSetting = currentTrackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
          return asset?.type === 'video' &&
                 trackSetting.visible &&
                 currentPosition >= clip.startTime &&
                 currentPosition < clip.startTime + clip.duration;
        })
        .sort((a, b) => a.trackIndex - b.trackIndex);

      const activeVideoClip = videoClips[0];

      if (activeVideoClip) {
        const asset = currentAssets.find(a => a.id === activeVideoClip.assetId);
        if (!asset) return;

        // ONLY sync when we transition to a DIFFERENT clip
        const clipChanged = currentVideoClipIdRef.current !== activeVideoClip.id;

        if (clipChanged) {
          currentVideoClipIdRef.current = activeVideoClip.id;

          // Update video source if different
          if (currentAssetSrcRef.current !== asset.src) {
            currentAssetSrcRef.current = asset.src;

            // Revoke previous blob URL
            if (currentBlobUrlRef.current) {
              URL.revokeObjectURL(currentBlobUrlRef.current);
              currentBlobUrlRef.current = null;
            }

            // Create new blob URL if file available
            if (asset.file) {
              const blobUrl = URL.createObjectURL(asset.file);
              currentBlobUrlRef.current = blobUrl;
              video.src = blobUrl;
            } else {
              video.src = asset.src;
            }

            video.load();
          }

          // Update volume and playback settings
          const trackSetting = currentTrackSettings[activeVideoClip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };
          const clipVolume = activeVideoClip.volume ?? 1;
          const finalVolume = currentVolume * trackSetting.volume * clipVolume;
          video.muted = trackSetting.muted || finalVolume === 0;
          video.volume = finalVolume;

          const clipSpeed = activeVideoClip.speed ?? 1;
          video.playbackRate = trackSetting.speed * clipSpeed;

          // Set initial time position for the new clip
          const clipTrimStart = activeVideoClip.trimStart ?? 0;
          const clipTime = currentPosition - activeVideoClip.startTime + clipTrimStart;
          video.currentTime = clipTime;

          // Start playing
          video.play().catch(() => {});
        } else {
          // Same clip - just ensure it's playing, don't touch currentTime
          if (video.paused) {
            video.play().catch(() => {});
          }
        }
      } else {
        // No video clip at playhead - pause video
        if (currentVideoClipIdRef.current !== null) {
          video.pause();
          currentVideoClipIdRef.current = null;
        }
      }
    };

    // Run immediately
    checkClipTransition();

    // Check for clip transitions periodically (this is lightweight - no time sync)
    const transitionCheckInterval = window.setInterval(checkClipTransition, 100);

    return () => {
      clearInterval(transitionCheckInterval);
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
