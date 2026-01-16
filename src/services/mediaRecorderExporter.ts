import { TimelineClip, MediaAsset } from '@/types/video-editor';

interface ExportOptions {
  clips: TimelineClip[];
  assets: MediaAsset[];
  resolution: { width: number; height: number };
  fps?: number;
  trackSettings: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>;
  onProgress?: (progress: number) => void;
  onStatus?: (status: string) => void;
}

/**
 * Export video using browser's native MediaRecorder API
 * Uses real-time playback for perfect audio/video sync
 * Output format is WebM (VP9 + Opus)
 */
export async function exportWithMediaRecorder({
  clips,
  assets,
  resolution,
  fps = 30,
  trackSettings,
  onProgress,
  onStatus,
}: ExportOptions): Promise<Blob> {
  const { width, height } = resolution;

  console.log('[MediaRecorder Export] ========== STARTING EXPORT ==========');
  console.log('[MediaRecorder Export] Resolution:', width, 'x', height);
  console.log('[MediaRecorder Export] FPS:', fps);
  console.log('[MediaRecorder Export] Total clips passed:', clips.length);

  onStatus?.('Preparing export...');
  onProgress?.(0);

  // Filter visible clips
  const visibleClips = clips.filter(clip => {
    const trackSetting = trackSettings[clip.trackIndex];
    return !trackSetting || trackSetting.visible !== false;
  });

  if (visibleClips.length === 0) {
    throw new Error('No visible clips to export');
  }

  // Debug: Log each clip's timeline placement
  console.log('[MediaRecorder Export] Visible clips on timeline:');
  visibleClips.forEach((clip, i) => {
    const asset = assets.find(a => a.id === clip.assetId);
    const clipEndOnTimeline = clip.startTime + clip.duration;
    console.log(`  [${i}] ${asset?.type || 'unknown'}: "${asset?.name || 'unnamed'}"`);
    console.log(`      Timeline: start=${clip.startTime.toFixed(2)}s, duration=${clip.duration.toFixed(2)}s, END=${clipEndOnTimeline.toFixed(2)}s`);
    console.log(`      Trim: trimStart=${clip.trimStart?.toFixed(2) || 0}s, trimEnd=${clip.trimEnd?.toFixed(2) || 0}s`);
    console.log(`      Track: ${clip.trackIndex}, Volume: ${clip.volume ?? 1}`);
  });

  // Calculate total duration based on clip END POSITIONS on timeline
  // This is startTime + duration (where duration is the visible length on timeline)
  const clipEndPositions = visibleClips.map(c => c.startTime + c.duration);
  const totalDuration = Math.max(...clipEndPositions, 0.1);

  console.log('[MediaRecorder Export] Clip end positions:', clipEndPositions.map(p => p.toFixed(2)));
  console.log('[MediaRecorder Export] TOTAL EXPORT DURATION:', totalDuration.toFixed(2), 'seconds');
  console.log('[MediaRecorder Export] That is:', Math.floor(totalDuration / 60), 'min', Math.floor(totalDuration % 60), 'sec');

  // Show duration in status so user knows what to expect
  const durationMin = Math.floor(totalDuration / 60);
  const durationSec = Math.floor(totalDuration % 60);
  onStatus?.(`Preparing ${durationMin}:${String(durationSec).padStart(2, '0')} export...`);

  // Create offscreen canvas for rendering
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Create audio context for mixing
  const audioContext = new AudioContext();
  const destination = audioContext.createMediaStreamDestination();
  const masterGain = audioContext.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(destination);

  // Pre-load all media elements
  onStatus?.('Loading media files...');

  interface VideoClipData {
    clip: TimelineClip;
    asset: MediaAsset;
    videoElement: HTMLVideoElement;
    audioElement?: HTMLVideoElement | HTMLAudioElement;
    audioSource?: MediaElementAudioSourceNode;
    audioGain?: GainNode;
  }

  interface AudioClipData {
    clip: TimelineClip;
    asset: MediaAsset;
    audioElement: HTMLAudioElement;
    audioSource: MediaElementAudioSourceNode;
    audioGain: GainNode;
  }

  interface ImageClipData {
    clip: TimelineClip;
    asset: MediaAsset;
    imageElement: HTMLImageElement;
  }

  const videoClipData: VideoClipData[] = [];
  const audioClipData: AudioClipData[] = [];
  const imageClipData: ImageClipData[] = [];

  for (const clip of visibleClips) {
    const asset = assets.find(a => a.id === clip.assetId);
    if (!asset) continue;

    const trackSetting = trackSettings[clip.trackIndex] || { volume: 1, muted: false };

    if (asset.type === 'video') {
      // Create video element for rendering
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous';
      videoElement.muted = true; // Mute for rendering - audio handled separately
      videoElement.preload = 'auto';
      videoElement.playsInline = true;
      videoElement.src = asset.src;

      await new Promise<void>((resolve, reject) => {
        videoElement.onloadeddata = () => resolve();
        videoElement.onerror = () => reject(new Error(`Failed to load video: ${asset.name}`));
        videoElement.load();
      });

      const clipData: VideoClipData = {
        clip,
        asset,
        videoElement,
      };

      // Create separate audio element for audio capture (if not muted)
      if (!trackSetting.muted && clip.volume !== 0) {
        try {
          const audioElement = document.createElement('video');
          audioElement.crossOrigin = 'anonymous';
          audioElement.preload = 'auto';
          audioElement.playsInline = true;
          audioElement.src = asset.src;

          await new Promise<void>((resolve) => {
            audioElement.onloadeddata = () => resolve();
            audioElement.onerror = () => resolve(); // Continue even if audio fails
            audioElement.load();
          });

          const audioSource = audioContext.createMediaElementSource(audioElement);
          const audioGain = audioContext.createGain();
          audioGain.gain.value = 0; // Start silent
          audioSource.connect(audioGain);
          audioGain.connect(masterGain);

          clipData.audioElement = audioElement;
          clipData.audioSource = audioSource;
          clipData.audioGain = audioGain;
        } catch (e) {
          console.warn('[MediaRecorder Export] Could not create audio for video:', asset.name, e);
        }
      }

      videoClipData.push(clipData);
      console.log('[MediaRecorder Export] Loaded video:', asset.name);

    } else if (asset.type === 'audio') {
      if (!trackSetting.muted && clip.volume !== 0) {
        try {
          const audioElement = document.createElement('audio');
          audioElement.crossOrigin = 'anonymous';
          audioElement.preload = 'auto';
          audioElement.src = asset.src;

          await new Promise<void>((resolve) => {
            audioElement.onloadeddata = () => resolve();
            audioElement.onerror = () => resolve();
            audioElement.load();
          });

          const audioSource = audioContext.createMediaElementSource(audioElement);
          const audioGain = audioContext.createGain();
          audioGain.gain.value = 0; // Start silent
          audioSource.connect(audioGain);
          audioGain.connect(masterGain);

          audioClipData.push({
            clip,
            asset,
            audioElement,
            audioSource,
            audioGain,
          });
          console.log('[MediaRecorder Export] Loaded audio:', asset.name);
        } catch (e) {
          console.warn('[MediaRecorder Export] Could not create audio source:', asset.name, e);
        }
      }

    } else if (asset.type === 'image') {
      const imageElement = document.createElement('img');
      imageElement.crossOrigin = 'anonymous';
      imageElement.src = asset.src;

      await new Promise<void>((resolve, reject) => {
        imageElement.onload = () => resolve();
        imageElement.onerror = () => reject(new Error(`Failed to load image: ${asset.name}`));
      });

      imageClipData.push({
        clip,
        asset,
        imageElement,
      });
      console.log('[MediaRecorder Export] Loaded image:', asset.name);
    }
  }

  onStatus?.('Setting up recorder...');

  // Get canvas stream
  const canvasStream = canvas.captureStream(fps);

  // Combine video and audio streams
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);

  // Determine best codec
  let mimeType = 'video/webm;codecs=vp9,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }
  }

  console.log('[MediaRecorder Export] Using MIME type:', mimeType);

  // Create MediaRecorder
  const recorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 8000000, // 8 Mbps
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) {
      chunks.push(e.data);
    }
  };

  onStatus?.('Rendering video (real-time playback)...');

  return new Promise<Blob>((resolve, reject) => {
    let isCancelled = false;

    const cleanup = () => {
      isCancelled = true;

      // Stop and cleanup video elements
      for (const data of videoClipData) {
        data.videoElement.pause();
        data.videoElement.src = '';
        if (data.audioElement) {
          data.audioElement.pause();
          data.audioElement.src = '';
        }
      }

      // Stop and cleanup audio elements
      for (const data of audioClipData) {
        data.audioElement.pause();
        data.audioElement.src = '';
      }

      // Close audio context
      audioContext.close().catch(() => {});
    };

    recorder.onstop = () => {
      console.log('[MediaRecorder Export] Recording stopped, creating blob...');
      cleanup();
      const blob = new Blob(chunks, { type: 'video/webm' });
      console.log('[MediaRecorder Export] Export complete, blob size:', blob.size);
      resolve(blob);
    };

    recorder.onerror = (e) => {
      console.error('[MediaRecorder Export] Recorder error:', e);
      cleanup();
      reject(new Error('MediaRecorder failed'));
    };

    // Start recording
    recorder.start(100); // Collect data every 100ms

    // Real-time playback rendering
    const startTime = performance.now();
    let lastProgressUpdate = 0;

    const render = () => {
      if (isCancelled) return;

      const elapsed = (performance.now() - startTime) / 1000;
      const currentTime = elapsed;

      // Check if we're done
      if (currentTime >= totalDuration) {
        console.log('[MediaRecorder Export] Playback complete, stopping recorder...');
        onProgress?.(100);
        onStatus?.('Finalizing...');

        // Mute all audio
        for (const data of videoClipData) {
          if (data.audioGain) data.audioGain.gain.value = 0;
          if (data.audioElement) data.audioElement.pause();
        }
        for (const data of audioClipData) {
          data.audioGain.gain.value = 0;
          data.audioElement.pause();
        }

        // Wait a moment for final audio to be captured
        setTimeout(() => {
          recorder.stop();
        }, 300);
        return;
      }

      // Update progress (every 500ms to reduce overhead)
      if (currentTime - lastProgressUpdate > 0.5) {
        const progress = Math.round((currentTime / totalDuration) * 100);
        onProgress?.(progress);
        const timeStr = `${Math.floor(currentTime / 60)}:${String(Math.floor(currentTime % 60)).padStart(2, '0')}`;
        const totalStr = `${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}`;
        onStatus?.(`Rendering... ${timeStr} / ${totalStr}`);
        lastProgressUpdate = currentTime;
      }

      // Clear canvas with black
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, width, height);

      // Render video clips (sorted by track index for layering)
      const activeVideoClips = videoClipData
        .filter(data => {
          const clipEnd = data.clip.startTime + data.clip.duration;
          return currentTime >= data.clip.startTime && currentTime < clipEnd;
        })
        .sort((a, b) => a.clip.trackIndex - b.clip.trackIndex);

      for (const data of activeVideoClips) {
        const clipTime = currentTime - data.clip.startTime + data.clip.trimStart;
        const trackSetting = trackSettings[data.clip.trackIndex] || { volume: 1, muted: false };
        const volume = (data.clip.volume ?? 1) * (trackSetting.volume ?? 1);

        // Sync video playback
        if (data.videoElement.paused || Math.abs(data.videoElement.currentTime - clipTime) > 0.3) {
          data.videoElement.currentTime = clipTime;
          data.videoElement.play().catch(() => {});
        }

        // Draw video frame
        drawMediaToCanvas(ctx, data.videoElement, width, height);

        // Handle audio from video
        if (data.audioElement && data.audioGain && !trackSetting.muted) {
          if (data.audioElement.paused || Math.abs(data.audioElement.currentTime - clipTime) > 0.3) {
            data.audioElement.currentTime = clipTime;
            data.audioElement.play().catch(() => {});
          }
          data.audioGain.gain.value = volume;
        } else if (data.audioGain) {
          data.audioGain.gain.value = 0;
        }
      }

      // Mute video audio for clips that are no longer active
      for (const data of videoClipData) {
        const clipEnd = data.clip.startTime + data.clip.duration;
        const isActive = currentTime >= data.clip.startTime && currentTime < clipEnd;
        if (!isActive && data.audioGain) {
          data.audioGain.gain.value = 0;
          if (data.audioElement && !data.audioElement.paused) {
            data.audioElement.pause();
          }
        }
      }

      // Render image clips
      const activeImageClips = imageClipData
        .filter(data => {
          const clipEnd = data.clip.startTime + data.clip.duration;
          return currentTime >= data.clip.startTime && currentTime < clipEnd;
        })
        .sort((a, b) => a.clip.trackIndex - b.clip.trackIndex);

      for (const data of activeImageClips) {
        drawMediaToCanvas(ctx, data.imageElement, width, height);
      }

      // Handle standalone audio clips
      for (const data of audioClipData) {
        const clipEnd = data.clip.startTime + data.clip.duration;
        const isActive = currentTime >= data.clip.startTime && currentTime < clipEnd;
        const trackSetting = trackSettings[data.clip.trackIndex] || { volume: 1, muted: false };
        const volume = (data.clip.volume ?? 1) * (trackSetting.volume ?? 1);

        if (isActive && !trackSetting.muted) {
          const clipTime = currentTime - data.clip.startTime + data.clip.trimStart;

          // Sync audio playback
          if (data.audioElement.paused || Math.abs(data.audioElement.currentTime - clipTime) > 0.3) {
            data.audioElement.currentTime = clipTime;
            data.audioElement.play().catch(() => {});
          }
          data.audioGain.gain.value = volume;
        } else {
          data.audioGain.gain.value = 0;
          if (!data.audioElement.paused) {
            data.audioElement.pause();
          }
        }
      }

      // Continue rendering
      requestAnimationFrame(render);
    };

    // Start rendering loop
    requestAnimationFrame(render);
  });
}

/**
 * Draw media (video or image) to canvas maintaining aspect ratio
 */
function drawMediaToCanvas(
  ctx: CanvasRenderingContext2D,
  media: HTMLVideoElement | HTMLImageElement,
  canvasWidth: number,
  canvasHeight: number
) {
  const mediaWidth = media instanceof HTMLVideoElement ? media.videoWidth : media.width;
  const mediaHeight = media instanceof HTMLVideoElement ? media.videoHeight : media.height;

  if (mediaWidth === 0 || mediaHeight === 0) return;

  // Calculate scaling to fit while maintaining aspect ratio
  const scale = Math.min(canvasWidth / mediaWidth, canvasHeight / mediaHeight);
  const scaledWidth = mediaWidth * scale;
  const scaledHeight = mediaHeight * scale;

  // Center the media
  const x = (canvasWidth - scaledWidth) / 2;
  const y = (canvasHeight - scaledHeight) / 2;

  ctx.drawImage(media, x, y, scaledWidth, scaledHeight);
}
