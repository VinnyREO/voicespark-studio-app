import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { MediaAsset, TimelineClip } from '@/types/video-editor';

let ffmpeg: FFmpeg | null = null;
let ffmpegLoaded = false;

// Quick Export: Download original file without re-encoding (always works)
export async function quickExportOriginal(asset: MediaAsset, onStatus?: (status: string) => void): Promise<void> {
  try {
    console.log('[QuickExport] Downloading original file:', asset.name);
    onStatus?.('Downloading original file...');

    const response = await fetch(asset.src);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const blob = await response.blob();

    onStatus?.('Preparing download...');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `video-export-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'mp3'}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log('[QuickExport] Export complete');
    onStatus?.('Export complete!');
  } catch (error) {
    console.error('[QuickExport] Export failed:', error);
    throw new Error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper to wrap load with timeout
async function loadWithTimeout(
  ff: FFmpeg,
  config: { coreURL: string; wasmURL: string; workerURL?: string },
  timeoutMs: number
): Promise<void> {
  const loadStart = Date.now();
  console.log('[FFmpeg] Calling ffmpeg.load() with config:', {
    coreURL: config.coreURL.substring(0, 50) + '...',
    wasmURL: config.wasmURL.substring(0, 50) + '...',
    workerURL: config.workerURL ? config.workerURL.substring(0, 50) + '...' : 'none',
  });

  const loadPromise = ff.load(config);
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      const elapsed = ((Date.now() - loadStart) / 1000).toFixed(1);
      reject(new Error(`FFmpeg initialization timed out after ${elapsed}s. The WASM module failed to initialize.`));
    }, timeoutMs);
  });

  await Promise.race([loadPromise, timeoutPromise]);
  console.log('[FFmpeg] ffmpeg.load() completed in', Date.now() - loadStart, 'ms');
}

export async function initFFmpeg(onProgress?: (progress: number) => void, onStatus?: (status: string) => void): Promise<FFmpeg> {
  // Return cached instance if already loaded
  if (ffmpeg && ffmpegLoaded) {
    console.log('[FFmpeg] Using cached instance');
    return ffmpeg;
  }

  console.log('[FFmpeg] Initializing new FFmpeg instance');

  // Check browser capabilities
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const isCrossOriginIsolated = typeof window !== 'undefined' && window.crossOriginIsolated;
  console.log('[FFmpeg] Browser capabilities:');
  console.log(`  - SharedArrayBuffer available: ${hasSharedArrayBuffer}`);
  console.log(`  - crossOriginIsolated: ${isCrossOriginIsolated}`);

  if (!hasSharedArrayBuffer || !isCrossOriginIsolated) {
    throw new Error(
      'FFmpeg requires SharedArrayBuffer which needs Cross-Origin-Isolation headers. ' +
      'Please ensure the server is configured with COOP/COEP headers.'
    );
  }

  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg Log]', message);
  });

  const startTime = Date.now();
  const INIT_TIMEOUT = 60000; // 60 second timeout for initialization

  // Use multi-threaded FFmpeg core (@ffmpeg/core-mt) which requires worker file
  // This works when SharedArrayBuffer is available (with COOP/COEP headers)
  const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/umd';

  try {
    console.log('[FFmpeg] Loading multi-threaded FFmpeg from unpkg CDN...');
    onStatus?.('Loading video engine...');

    // Download all THREE required files for multi-threaded FFmpeg
    console.log('[FFmpeg] Downloading ffmpeg-core.js...');
    const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
    console.log('[FFmpeg] core.js downloaded');

    console.log('[FFmpeg] Downloading ffmpeg-core.wasm (~32MB)...');
    onStatus?.('Downloading video engine (~32MB)...');
    const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');
    console.log('[FFmpeg] WASM downloaded');

    console.log('[FFmpeg] Downloading ffmpeg-core.worker.js...');
    const workerURL = await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript');
    console.log('[FFmpeg] Worker downloaded');

    console.log('[FFmpeg] All 3 files downloaded, initializing WASM with worker...');
    onStatus?.('Initializing video engine...');

    // Load FFmpeg with all three URLs (multi-threaded requires worker)
    await loadWithTimeout(ffmpeg, { coreURL, wasmURL, workerURL }, INIT_TIMEOUT);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[FFmpeg] Loaded successfully in ${elapsed}s`);
    ffmpegLoaded = true;
    onStatus?.('Video engine ready!');
    return ffmpeg;

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[FFmpeg] Failed to load after ${elapsed}s:`, error);

    // Reset for retry
    ffmpeg = new FFmpeg();
    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(Math.round(progress * 100));
      });
    }
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg Log]', message);
    });

    // Try jsDelivr as fallback
    console.log('[FFmpeg] Trying jsDelivr fallback...');
    onStatus?.('Trying alternative source...');

    const fallbackURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/umd';

    try {
      console.log('[FFmpeg] Downloading from jsDelivr...');
      const coreURL = await toBlobURL(`${fallbackURL}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${fallbackURL}/ffmpeg-core.wasm`, 'application/wasm');
      const workerURL = await toBlobURL(`${fallbackURL}/ffmpeg-core.worker.js`, 'text/javascript');

      console.log('[FFmpeg] jsDelivr files downloaded, initializing...');
      onStatus?.('Initializing video engine...');

      await loadWithTimeout(ffmpeg, { coreURL, wasmURL, workerURL }, INIT_TIMEOUT);

      const elapsed2 = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[FFmpeg] Loaded from jsDelivr in ${elapsed2}s`);
      ffmpegLoaded = true;
      onStatus?.('Video engine ready!');
      return ffmpeg;

    } catch (fallbackError) {
      ffmpeg = null;
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.error(`[FFmpeg] All sources failed after ${totalTime}s:`, fallbackError);

      const errorMsg = fallbackError instanceof Error ? fallbackError.message : 'Unknown error';
      throw new Error(
        `Could not initialize video engine after ${totalTime}s. ${errorMsg}. ` +
        'Please refresh the page and try again.'
      );
    }
  }
}

interface ExportOptions {
  clips: TimelineClip[];
  assets: MediaAsset[];
  resolution: { width: number; height: number };
  format: 'mp4' | 'webm' | 'mov';
  fps?: number;
  trackSettings: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>;
  onProgress?: (progress: number) => void;
  onStatus?: (status: string) => void;
}

export async function exportVideo({
  clips,
  assets,
  resolution,
  format,
  fps = 30,
  trackSettings,
  onProgress,
  onStatus,
}: ExportOptions): Promise<Blob> {
  console.log('[VideoExporter] ========== STARTING EXPORT ==========');
  console.log('[VideoExporter] Config:', { clipCount: clips.length, assetCount: assets.length, resolution, format, fps });

  onStatus?.('Loading FFmpeg (first time may take a moment)...');
  const ff = await initFFmpeg(onProgress, onStatus);
  console.log('[VideoExporter] FFmpeg initialized successfully');

  // Filter visible clips and sort by start time (lower track index = higher priority for same time)
  const visibleClips = clips.filter(clip => {
    const trackSetting = trackSettings[clip.trackIndex];
    return !trackSetting || trackSetting.visible !== false;
  }).sort((a, b) => a.startTime - b.startTime || a.trackIndex - b.trackIndex);

  console.log('[VideoExporter] Visible clips:', visibleClips.length);

  if (visibleClips.length === 0) {
    throw new Error('No visible clips to export');
  }

  onStatus?.('Preparing media files...');
  onProgress?.(10);

  // Write input files to FFmpeg virtual filesystem and track which have audio
  const processedClips: Array<{
    inputName: string;
    inputIndex: number;
    clip: TimelineClip;
    asset: MediaAsset;
    hasAudio: boolean; // Track whether this input has an audio stream
  }> = [];

  let inputIdx = 0;

  for (let i = 0; i < visibleClips.length; i++) {
    const clip = visibleClips[i];
    const asset = assets.find((a) => a.id === clip.assetId);

    if (!asset) {
      console.warn(`[VideoExporter] Asset not found for clip ${clip.id}`);
      continue;
    }

    // Only process video and audio clips
    if (asset.type !== 'video' && asset.type !== 'audio') {
      console.log(`[VideoExporter] Skipping non-media clip type: ${asset.type}`);
      continue;
    }

    try {
      console.log(`[VideoExporter] Loading clip ${i + 1}/${visibleClips.length}: ${asset.name} (${asset.type})`);

      const fileData = await fetchFile(asset.src);

      if (!fileData || fileData.byteLength === 0) {
        throw new Error(`File is empty or could not be loaded: ${asset.name}`);
      }

      const ext = asset.type === 'video' ? 'mp4' : 'mp3';
      const inputName = `input${inputIdx}.${ext}`;
      await ff.writeFile(inputName, fileData);

      processedClips.push({
        inputName,
        inputIndex: inputIdx,
        clip,
        asset,
        hasAudio: asset.type === 'audio', // Audio files always have audio, video we'll assume true initially
      });
      inputIdx++;
    } catch (error) {
      console.error(`[VideoExporter] Failed to process clip ${clip.id}:`, error);
      let errorMsg = `Failed to load media file: ${asset.name}`;
      if (error instanceof Error) {
        errorMsg += `. ${error.message}`;
      }
      throw new Error(errorMsg);
    }
  }

  console.log(`[VideoExporter] Successfully loaded ${processedClips.length} clips`);

  if (processedClips.length === 0) {
    throw new Error('No valid video or audio clips found');
  }

  // Separate video and audio clips
  const videoClips = processedClips.filter(pc => pc.asset.type === 'video');
  const audioOnlyClips = processedClips.filter(pc => pc.asset.type === 'audio');

  // Calculate total timeline duration
  let totalDuration = 0;
  for (const pc of processedClips) {
    const clipEnd = pc.clip.startTime + pc.clip.duration;
    totalDuration = Math.max(totalDuration, clipEnd);
  }

  console.log('[VideoExporter] Timeline analysis:');
  console.log(`  - Video clips: ${videoClips.length}`);
  console.log(`  - Audio-only clips: ${audioOnlyClips.length}`);
  console.log(`  - Total duration: ${totalDuration.toFixed(2)}s`);

  // Log each clip for debugging
  for (const pc of processedClips) {
    const trackSetting = trackSettings[pc.clip.trackIndex] || { volume: 1, muted: false };
    console.log(`  - [${pc.asset.type}] "${pc.asset.name}" @ ${pc.clip.startTime.toFixed(2)}s, dur=${pc.clip.duration.toFixed(2)}s, track=${pc.clip.trackIndex}, muted=${trackSetting.muted}`);
  }

  onStatus?.('Building timeline...');
  onProgress?.(30);

  const outputName = `output.${format}`;

  // Build FFmpeg command with proper video/audio mixing
  const buildFFmpegCommand = (skipVideoAudio: boolean): string[] => {
    const args: string[] = [];
    const filterParts: string[] = [];
    const audioStreams: string[] = [];

    // === INPUT 0: Black background video spanning entire timeline ===
    args.push('-f', 'lavfi', '-i', `color=c=black:s=${resolution.width}x${resolution.height}:d=${totalDuration}:r=${fps}`);

    // === INPUTS 1+: All media files ===
    for (const pc of processedClips) {
      args.push('-i', pc.inputName);
    }

    // === VIDEO PROCESSING ===
    // Strategy: Start with black background, overlay each video clip using 'enable' for timing
    if (videoClips.length > 0) {
      let currentBase = '[0:v]';

      for (let i = 0; i < videoClips.length; i++) {
        const vc = videoClips[i];
        const inputNum = vc.inputIndex + 1; // +1 because input 0 is the black background
        const clipStart = vc.clip.startTime;
        const clipEnd = vc.clip.startTime + vc.clip.duration;
        const trimStart = vc.clip.trimStart;
        const clipDuration = vc.clip.duration;

        // Prepare video: trim, scale, pad to fit resolution
        const prepLabel = `vprep${i}`;
        filterParts.push(
          `[${inputNum}:v]trim=start=${trimStart}:duration=${clipDuration},setpts=PTS-STARTPTS,` +
          `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,` +
          `pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2,fps=${fps}[${prepLabel}]`
        );

        // Overlay on current base with enable filter for timing
        const isLast = i === videoClips.length - 1;
        const outLabel = isLast ? '[vout]' : `[vbase${i}]`;

        // Use enable to show overlay only during the clip's time window
        filterParts.push(
          `${currentBase}[${prepLabel}]overlay=0:0:enable='between(t,${clipStart},${clipEnd})'${outLabel}`
        );

        currentBase = outLabel;
      }
    } else {
      // No video clips - use black background directly
      filterParts.push(`[0:v]null[vout]`);
    }

    // === AUDIO PROCESSING ===
    // Process ALL audio sources: video file audio + standalone audio files

    // 1. Audio from video clips (if not skipped and not muted)
    if (!skipVideoAudio) {
      for (let i = 0; i < videoClips.length; i++) {
        const vc = videoClips[i];
        const inputNum = vc.inputIndex + 1;
        const trackSetting = trackSettings[vc.clip.trackIndex] || { volume: 1, muted: false };

        if (trackSetting.muted || vc.clip.volume === 0) {
          console.log(`[VideoExporter] Skipping muted video audio: ${vc.asset.name}`);
          continue;
        }

        const volume = (vc.clip.volume ?? 1) * (trackSetting.volume ?? 1);
        const delayMs = Math.round(vc.clip.startTime * 1000);
        const trimStart = vc.clip.trimStart;
        const clipDuration = vc.clip.duration;
        const audioLabel = `va${i}`;

        console.log(`[VideoExporter] Adding video audio: ${vc.asset.name}, delay=${delayMs}ms, vol=${volume}`);

        filterParts.push(
          `[${inputNum}:a]atrim=start=${trimStart}:duration=${clipDuration},asetpts=PTS-STARTPTS,` +
          `volume=${volume},adelay=${delayMs}|${delayMs}[${audioLabel}]`
        );
        audioStreams.push(`[${audioLabel}]`);
      }
    }

    // 2. Audio from standalone audio clips (MP3, etc.)
    for (let i = 0; i < audioOnlyClips.length; i++) {
      const ac = audioOnlyClips[i];
      const inputNum = ac.inputIndex + 1;
      const trackSetting = trackSettings[ac.clip.trackIndex] || { volume: 1, muted: false };

      if (trackSetting.muted || ac.clip.volume === 0) {
        console.log(`[VideoExporter] Skipping muted audio clip: ${ac.asset.name}`);
        continue;
      }

      const volume = (ac.clip.volume ?? 1) * (trackSetting.volume ?? 1);
      const delayMs = Math.round(ac.clip.startTime * 1000);
      const trimStart = ac.clip.trimStart;
      const clipDuration = ac.clip.duration;
      const audioLabel = `a${i}`;

      console.log(`[VideoExporter] Adding audio clip: ${ac.asset.name}, delay=${delayMs}ms, vol=${volume}, duration=${clipDuration}s`);

      filterParts.push(
        `[${inputNum}:a]atrim=start=${trimStart}:duration=${clipDuration},asetpts=PTS-STARTPTS,` +
        `volume=${volume},adelay=${delayMs}|${delayMs}[${audioLabel}]`
      );
      audioStreams.push(`[${audioLabel}]`);
    }

    // Mix all audio streams
    let audioOutputLabel = '';
    if (audioStreams.length > 1) {
      filterParts.push(
        `${audioStreams.join('')}amix=inputs=${audioStreams.length}:duration=longest:dropout_transition=0[aout]`
      );
      audioOutputLabel = '[aout]';
    } else if (audioStreams.length === 1) {
      audioOutputLabel = audioStreams[0];
    }

    console.log(`[VideoExporter] Audio streams to mix: ${audioStreams.length}`);

    // Build filter_complex
    const filterComplex = filterParts.join(';');
    console.log('[VideoExporter] Filter complex:', filterComplex);

    args.push('-filter_complex', filterComplex);

    // Map video output (ALWAYS)
    args.push('-map', '[vout]');

    // Map audio output (if any)
    if (audioOutputLabel) {
      args.push('-map', audioOutputLabel);
    }

    // Set output duration
    args.push('-t', totalDuration.toString());

    // Video codec
    if (format === 'mp4') {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p');
    } else if (format === 'webm') {
      args.push('-c:v', 'libvpx-vp9', '-b:v', '2M');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p');
    }

    // Audio codec
    if (audioOutputLabel) {
      args.push('-c:a', format === 'webm' ? 'libopus' : 'aac', '-b:a', '192k');
    } else {
      args.push('-an');
    }

    args.push('-y', outputName);

    return args;
  };

  onStatus?.('Encoding video...');
  onProgress?.(50);

  // Try with video audio first
  let success = false;
  try {
    const ffmpegArgs = buildFFmpegCommand(false);
    console.log('[VideoExporter] FFmpeg command:', ffmpegArgs.join(' '));
    await ff.exec(ffmpegArgs);
    success = true;
    console.log('[VideoExporter] FFmpeg encoding succeeded (with video audio)');
  } catch (firstError) {
    console.warn('[VideoExporter] First attempt failed (might be missing audio in video):', firstError);

    // Retry without video audio (in case video files don't have audio streams)
    if (videoClips.length > 0 && audioOnlyClips.length > 0) {
      try {
        onStatus?.('Retrying without video audio...');
        const ffmpegArgs = buildFFmpegCommand(true);
        console.log('[VideoExporter] FFmpeg command (retry):', ffmpegArgs.join(' '));
        await ff.exec(ffmpegArgs);
        success = true;
        console.log('[VideoExporter] FFmpeg encoding succeeded (without video audio)');
      } catch (secondError) {
        console.error('[VideoExporter] Second attempt also failed:', secondError);
        throw secondError;
      }
    } else if (audioOnlyClips.length > 0) {
      // Only audio clips exist - try without any video audio
      try {
        onStatus?.('Retrying with audio-only clips...');
        const ffmpegArgs = buildFFmpegCommand(true);
        console.log('[VideoExporter] FFmpeg command (audio-only retry):', ffmpegArgs.join(' '));
        await ff.exec(ffmpegArgs);
        success = true;
        console.log('[VideoExporter] FFmpeg encoding succeeded (audio-only)');
      } catch (thirdError) {
        console.error('[VideoExporter] Audio-only attempt failed:', thirdError);
        throw thirdError;
      }
    } else {
      throw firstError;
    }
  }

  if (!success) {
    throw new Error('FFmpeg encoding failed');
  }

  onStatus?.('Finalizing...');
  onProgress?.(95);

  // Read output file
  const data = await ff.readFile(outputName);
  console.log('[VideoExporter] Output file size:', data.byteLength, 'bytes');

  // Cleanup
  for (const pc of processedClips) {
    try { await ff.deleteFile(pc.inputName); } catch { /* ignore */ }
  }
  try { await ff.deleteFile(outputName); } catch { /* ignore */ }

  onProgress?.(100);

  const mimeType = format === 'webm' ? 'video/webm' : format === 'mov' ? 'video/quicktime' : 'video/mp4';
  const blob = new Blob([data], { type: mimeType });

  console.log('[VideoExporter] ========== EXPORT COMPLETE ==========');
  console.log(`[VideoExporter] Final blob: ${blob.size} bytes, type: ${mimeType}`);

  return blob;
}
