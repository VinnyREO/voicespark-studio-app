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

export async function initFFmpeg(onProgress?: (progress: number) => void, onStatus?: (status: string) => void): Promise<FFmpeg> {
  // Return cached instance if already loaded
  if (ffmpeg && ffmpegLoaded) {
    return ffmpeg;
  }

  console.log('[FFmpeg] Initializing new FFmpeg instance');
  ffmpeg = new FFmpeg();

  if (onProgress) {
    ffmpeg.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg Log]', message);
  });

  // Try multiple approaches in order of compatibility
  const approaches = [
    {
      name: 'Direct URLs (fastest)',
      load: async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        onStatus?.('Loading FFmpeg (direct)...');

        await ffmpeg!.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });
      }
    },
    {
      name: 'jsDelivr CDN',
      load: async () => {
        const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd';
        onStatus?.('Loading FFmpeg (jsDelivr)...');

        await ffmpeg!.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });
      }
    },
    {
      name: 'Blob URLs from unpkg',
      load: async () => {
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        onStatus?.('Loading FFmpeg (blob conversion)...');

        const coreURL = await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm');

        await ffmpeg!.load({ coreURL, wasmURL });
      }
    },
  ];

  let lastError: Error | null = null;

  for (const approach of approaches) {
    try {
      console.log(`[FFmpeg] Attempting: ${approach.name}`);

      // 20 second timeout per attempt
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout after 20 seconds')), 20000);
      });

      await Promise.race([approach.load(), timeoutPromise]);

      console.log(`[FFmpeg] SUCCESS with: ${approach.name}`);
      ffmpegLoaded = true;
      return ffmpeg;

    } catch (error) {
      console.error(`[FFmpeg] Failed with ${approach.name}:`, error);
      lastError = error instanceof Error ? error : new Error(`Failed: ${approach.name}`);
      // Continue to next approach
      ffmpegLoaded = false;
      ffmpeg = new FFmpeg(); // Create fresh instance for next attempt

      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(Math.round(progress * 100));
        });
      }
      ffmpeg.on('log', ({ message }) => {
        console.log('[FFmpeg Log]', message);
      });
    }
  }

  // All approaches failed
  ffmpeg = null;
  throw new Error(
    `Could not load FFmpeg after trying all methods. Last error: ${lastError?.message}. ` +
    'Please use "Quick Export (Original)" instead, or try a different browser.'
  );
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
  console.log('[VideoExporter] Starting export with:', {
    clipCount: clips.length,
    assetCount: assets.length,
    resolution,
    format,
    fps
  });

  onStatus?.('Loading FFmpeg (first time may take a moment)...');
  const ff = await initFFmpeg(onProgress);
  console.log('[VideoExporter] FFmpeg initialized successfully');

  // Filter visible clips and sort by track and time
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

  // Write input files to FFmpeg virtual filesystem
  const processedClips: Array<{
    inputName: string;
    clip: TimelineClip;
    asset: MediaAsset;
  }> = [];

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
      console.log(`[VideoExporter] Processing clip ${i + 1}/${visibleClips.length}: ${asset.name}`);

      // Fetch the file data
      const fileData = await fetchFile(asset.src);

      if (!fileData || fileData.byteLength === 0) {
        throw new Error(`File is empty or could not be loaded: ${asset.name}`);
      }

      const inputName = `input${i}.${asset.type === 'video' ? 'mp4' : 'mp3'}`;
      await ff.writeFile(inputName, fileData);

      processedClips.push({ inputName, clip, asset });
    } catch (error) {
      console.error(`[VideoExporter] Failed to process clip ${clip.id}:`, error);

      // Provide more specific error messages
      let errorMsg = `Failed to load media file: ${asset.name}`;
      if (error instanceof Error) {
        if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
          errorMsg += '. CORS Error: The video file cannot be accessed due to browser security restrictions. Try using locally uploaded files instead of URLs.';
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
          errorMsg += '. Network Error: Could not download the file. Check your internet connection.';
        } else {
          errorMsg += `. ${error.message}`;
        }
      }

      throw new Error(errorMsg);
    }
  }

  console.log(`[VideoExporter] Successfully processed ${processedClips.length} clips`);

  if (processedClips.length === 0) {
    throw new Error('No valid video or audio clips found');
  }

  onStatus?.('Building timeline...');
  onProgress?.(30);

  // Create a filter complex to handle timeline composition
  // For simplicity, we'll concatenate clips in sequence
  // In a full implementation, you'd handle overlapping tracks, transitions, etc.

  const outputName = `output.${format}`;

  if (processedClips.length === 1) {
    // Single clip - simple re-encode with settings
    const { inputName, clip, asset } = processedClips[0];
    const trackSetting = trackSettings[clip.trackIndex] || { volume: 1, speed: 1, visible: true, muted: false };

    onStatus?.('Encoding video...');
    onProgress?.(50);

    const ffmpegArgs = [
      '-i', inputName,
      // Trim clip
      '-ss', clip.trimStart.toString(),
      '-t', clip.duration.toString(),
      // Video settings
      '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
      '-r', fps.toString(),
    ];

    // Video codec based on format
    if (format === 'mp4') {
      ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    } else if (format === 'webm') {
      ffmpegArgs.push('-c:v', 'libvpx-vp9', '-b:v', '2M');
    } else {
      // MOV
      ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18');
    }

    // Audio settings
    if (asset.type === 'video' || asset.type === 'audio') {
      if (trackSetting.muted || (clip.volume !== undefined && clip.volume === 0)) {
        ffmpegArgs.push('-an'); // No audio
      } else {
        const volumeMultiplier = (clip.volume ?? 1) * trackSetting.volume;
        ffmpegArgs.push(
          '-af', `volume=${volumeMultiplier}`,
          '-c:a', format === 'webm' ? 'libopus' : 'aac',
          '-b:a', '128k'
        );
      }
    }

    ffmpegArgs.push(outputName);

    console.log('[VideoExporter] FFmpeg command:', ffmpegArgs.join(' '));
    await ff.exec(ffmpegArgs);
    console.log('[VideoExporter] FFmpeg encoding complete');

  } else {
    // Multiple clips - concatenate
    onStatus?.('Encoding and concatenating clips...');
    onProgress?.(50);

    // Create concat file listing all inputs
    let concatContent = '';
    for (const { inputName } of processedClips) {
      concatContent += `file '${inputName}'\n`;
    }
    await ff.writeFile('concat.txt', concatContent);

    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-vf', `scale=${resolution.width}:${resolution.height}:force_original_aspect_ratio=decrease,pad=${resolution.width}:${resolution.height}:(ow-iw)/2:(oh-ih)/2`,
      '-r', fps.toString(),
    ];

    // Video codec
    if (format === 'mp4') {
      ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '23');
    } else if (format === 'webm') {
      ffmpegArgs.push('-c:v', 'libvpx-vp9', '-b:v', '2M');
    } else {
      ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18');
    }

    // Audio
    ffmpegArgs.push('-c:a', format === 'webm' ? 'libopus' : 'aac', '-b:a', '128k');

    ffmpegArgs.push(outputName);

    console.log('[VideoExporter] FFmpeg command (concat):', ffmpegArgs.join(' '));
    await ff.exec(ffmpegArgs);
    console.log('[VideoExporter] FFmpeg concatenation complete');
  }

  onStatus?.('Finalizing...');
  onProgress?.(95);

  // Read the output file
  const data = await ff.readFile(outputName);
  console.log('[VideoExporter] Output file size:', data.byteLength, 'bytes');

  // Clean up
  for (const { inputName } of processedClips) {
    try {
      await ff.deleteFile(inputName);
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  try {
    await ff.deleteFile('concat.txt');
    await ff.deleteFile(outputName);
  } catch (e) {
    // Ignore cleanup errors
  }

  onProgress?.(100);

  // Return blob
  const mimeType = format === 'webm' ? 'video/webm' : format === 'mov' ? 'video/quicktime' : 'video/mp4';
  const blob = new Blob([data], { type: mimeType });
  console.log('[VideoExporter] Export complete, blob size:', blob.size, 'bytes');
  return blob;
}
