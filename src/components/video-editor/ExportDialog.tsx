import { useState } from 'react';
import { Download, Film, Settings as SettingsIcon, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AspectRatio, MediaAsset, TimelineClip } from '@/types/video-editor';
import { cn } from '@/lib/utils';
import { exportWithMediaRecorder } from '@/services/mediaRecorderExporter';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clips: TimelineClip[];
  assets: MediaAsset[];
  aspectRatio: AspectRatio;
  duration: number;
  trackSettings: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>;
}

type ExportQuality = 'low' | 'medium' | 'high' | 'ultra';
type ExportFormat = 'mp4' | 'webm' | 'mov';

interface QualityPreset {
  label: string;
  description: string;
  bitrate: string;
  resolution: { width: number; height: number };
}

export function ExportDialog({
  open,
  onOpenChange,
  clips,
  assets,
  aspectRatio,
  duration,
  trackSettings,
}: ExportDialogProps) {
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const getResolution = (ratio: AspectRatio, quality: ExportQuality) => {
    const resolutions: Record<AspectRatio, Record<ExportQuality, { width: number; height: number }>> = {
      '16:9': {
        low: { width: 854, height: 480 },
        medium: { width: 1280, height: 720 },
        high: { width: 1920, height: 1080 },
        ultra: { width: 3840, height: 2160 },
      },
      '9:16': {
        low: { width: 480, height: 854 },
        medium: { width: 720, height: 1280 },
        high: { width: 1080, height: 1920 },
        ultra: { width: 2160, height: 3840 },
      },
      '1:1': {
        low: { width: 480, height: 480 },
        medium: { width: 720, height: 720 },
        high: { width: 1080, height: 1080 },
        ultra: { width: 2160, height: 2160 },
      },
    };
    return resolutions[ratio][quality];
  };

  const qualityPresets: Record<ExportQuality, QualityPreset> = {
    low: {
      label: 'Low (480p)',
      description: 'Fast export, smaller file size',
      bitrate: '1.5 Mbps',
      resolution: getResolution(aspectRatio, 'low'),
    },
    medium: {
      label: 'Medium (720p)',
      description: 'Good quality for web',
      bitrate: '5 Mbps',
      resolution: getResolution(aspectRatio, 'medium'),
    },
    high: {
      label: 'High (1080p)',
      description: 'HD quality, recommended',
      bitrate: '8 Mbps',
      resolution: getResolution(aspectRatio, 'high'),
    },
    ultra: {
      label: 'Ultra (4K)',
      description: 'Maximum quality, large file',
      bitrate: '40 Mbps',
      resolution: getResolution(aspectRatio, 'ultra'),
    },
  };

  const formatOptions = {
    mp4: { label: 'MP4 (H.264)', description: 'Best compatibility' },
    webm: { label: 'WebM (VP9)', description: 'Web optimized' },
    mov: { label: 'MOV (ProRes)', description: 'Professional editing' },
  };

  const estimateFileSize = () => {
    const bitrates = {
      low: 1.5,
      medium: 5,
      high: 8,
      ultra: 40,
    };
    const sizeInMB = (bitrates[quality] * duration) / 8;
    return sizeInMB < 1000
      ? `~${Math.round(sizeInMB)} MB`
      : `~${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const handleQuickExport = async () => {
    // Quick Export renders the full timeline at 720p using browser's MediaRecorder API
    // No FFmpeg required - works instantly without any downloads
    console.log('[QuickExport] Starting quick export (720p WebM using MediaRecorder)');
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Preparing quick export...');
    setErrorMessage(null);

    try {
      const quickResolution = getResolution(aspectRatio, 'medium');
      console.log('[QuickExport] Using resolution:', quickResolution);
      console.log('[QuickExport] Clips to render:', clips.length);

      // Use MediaRecorder-based export (no FFmpeg, works immediately)
      const blob = await exportWithMediaRecorder({
        clips,
        assets,
        resolution: quickResolution,
        fps: 30,
        trackSettings,
        onProgress: (progress) => {
          setExportProgress(progress);
        },
        onStatus: (status) => {
          setExportStatus(status);
        },
      });

      console.log('[QuickExport] Video blob created:', blob.size, 'bytes');

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-export-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus('Export complete!');
      console.log('[QuickExport] Export completed successfully');

      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
      }, 2000);

    } catch (error) {
      console.error('[QuickExport] Export failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(message);
      setExportStatus('');
      setIsExporting(false);
    }
  };

  const handleExport = async () => {
    // Advanced Export uses MediaRecorder with selected quality settings
    console.log('[Export] Starting advanced export process');
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('Initializing...');
    setErrorMessage(null);

    try {
      console.log('[Export] Configuration:', { quality, format, aspectRatio, clipCount: clips.length });
      const resolution = getResolution(aspectRatio, quality);
      console.log('[Export] Target resolution:', resolution);

      // Use MediaRecorder-based export (outputs WebM regardless of format selection)
      const blob = await exportWithMediaRecorder({
        clips,
        assets,
        resolution,
        fps: 30,
        trackSettings,
        onProgress: (progress) => {
          setExportProgress(progress);
        },
        onStatus: (status) => {
          setExportStatus(status);
        },
      });

      console.log('[Export] Video blob created:', blob.size, 'bytes');

      // Create download link (always .webm since MediaRecorder outputs WebM)
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-export-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportProgress(100);
      setExportStatus('Export complete!');
      console.log('[Export] Export completed successfully');

      setTimeout(() => {
        onOpenChange(false);
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus('');
      }, 2000);

    } catch (error) {
      console.error('[Export] Export failed:', error);
      const message = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMessage(message);
      setExportStatus('');
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    // Allow closing even during export
    if (isExporting) {
      // Reset state if closing during export
      setIsExporting(false);
      setExportProgress(0);
      setExportStatus('');
    }
    setErrorMessage(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="w-5 h-5" />
            Export Video
          </DialogTitle>
          <DialogDescription>
            Configure export settings for your video
          </DialogDescription>
        </DialogHeader>

        {!isExporting ? (
          <div className="space-y-6 py-4">
            {/* Quality Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <SettingsIcon className="w-4 h-4" />
                Quality
              </Label>
              <RadioGroup value={quality} onValueChange={(v) => setQuality(v as ExportQuality)}>
                <div className="space-y-2">
                  {(Object.keys(qualityPresets) as ExportQuality[]).map((q) => {
                    const preset = qualityPresets[q];
                    return (
                      <div
                        key={q}
                        className={cn(
                          'flex items-start space-x-3 p-3 rounded-lg border border-border/60 cursor-pointer transition-colors',
                          quality === q ? 'bg-primary/10 border-primary' : 'hover:bg-accent/50'
                        )}
                        onClick={() => setQuality(q)}
                      >
                        <RadioGroupItem value={q} id={`quality-${q}`} className="mt-1" />
                        <Label htmlFor={`quality-${q}`} className="flex-1 cursor-pointer">
                          <div className="font-medium">{preset.label}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.description}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {preset.resolution.width}x{preset.resolution.height} • {preset.bitrate}
                          </div>
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(formatOptions) as ExportFormat[]).map((f) => (
                    <SelectItem key={f} value={f}>
                      <div className="flex flex-col items-start">
                        <span>{formatOptions[f].label}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatOptions[f].description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Export Info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Clips:</span>
                <span className="font-medium">{clips.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Aspect Ratio:</span>
                <span className="font-medium">{aspectRatio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estimated Size:</span>
                <span className="font-medium">{estimateFileSize()}</span>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-4 bg-destructive/20 border border-destructive rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-destructive/30 flex items-center justify-center">
                    <span className="text-destructive text-xs font-bold">!</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-destructive">Export Failed</p>
                    <p className="text-sm text-destructive/90 mt-1">{errorMessage}</p>
                    <div className="mt-3 flex gap-2">
                      <Button
                        onClick={() => setErrorMessage(null)}
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        Dismiss
                      </Button>
                      <Button
                        onClick={() => {
                          setErrorMessage(null);
                          handleExport();
                        }}
                        variant="outline"
                        size="sm"
                        className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Buttons */}
            <div className="space-y-3">
              <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Quick Export:</span> Renders your full timeline at 720p WebM (faster).
                  <br />
                  <span className="font-semibold text-foreground">Advanced Export:</span> Renders with your selected quality (WebM format).
                  <br />
                  <span className="text-muted-foreground/70 italic">Export uses browser's native MediaRecorder - no downloads required.</span>
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleQuickExport}
                  variant="outline"
                  className="flex-1 gap-2 border-green-500/50 text-green-600 hover:bg-green-500/10 hover:text-green-600"
                  disabled={isExporting || clips.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Quick Export
                </Button>
                <Button
                  onClick={handleExport}
                  className="flex-1 gap-2 bg-primary hover:bg-primary/90"
                  disabled={isExporting || clips.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Advanced Export
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 space-y-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <Progress value={exportProgress} className="h-3" />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{exportStatus}</span>
                <span className="font-medium">{exportProgress}%</span>
              </div>
            </div>
            <div className="flex justify-center pt-4">
              <Button
                onClick={handleClose}
                variant="outline"
                size="sm"
              >
                Cancel Export
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
