import { useState } from 'react';
import { Settings, Image as ImageIcon, Layers, Sliders, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MediaPanel } from './MediaPanel';
import { MediaAsset, AspectRatio } from '@/types/video-editor';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

interface ToolPanelProps {
  // Media props
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onRemoveAsset: (assetId: string) => void;
  onDragStart?: (asset: MediaAsset) => void;
  onAddToTimeline?: (asset: MediaAsset) => void;
  onFileUpload?: (file: File) => Promise<void>; // New: Upload with storage integration

  // Settings props
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  zoomLevel: number;
  onZoomChange: (level: number) => void;

  // Panel control
  onClose?: () => void;
}

export function ToolPanel({
  assets,
  onAddAsset,
  onRemoveAsset,
  onDragStart,
  onAddToTimeline,
  onFileUpload,
  aspectRatio,
  onAspectRatioChange,
  volume,
  onVolumeChange,
  zoomLevel,
  onZoomChange,
  onClose,
}: ToolPanelProps) {
  const [activeTab, setActiveTab] = useState('media');

  return (
    <div className="flex flex-col h-full bg-card/30 overflow-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Navigation - Fixed at top */}
        <div className="flex-shrink-0 border-b border-border/60 bg-card/60 px-2 pt-2 pb-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground px-2">Tools</span>
            {onClose && (
              <Button
                onClick={onClose}
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-accent"
                title="Close tool panel"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <TabsList className="grid grid-cols-3 h-9 w-full bg-muted/50">
            <TabsTrigger value="media" className="text-xs gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              Media
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="effects" className="text-xs gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Effects
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Media Tab */}
        <TabsContent value="media" className="flex-1 mt-0 overflow-hidden">
          <MediaPanel
            assets={assets}
            onAddAsset={onAddAsset}
            onRemoveAsset={onRemoveAsset}
            onDragStart={onDragStart}
            onAddToTimeline={onAddToTimeline}
            onFileUpload={onFileUpload}
          />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="flex-1 mt-0 overflow-auto">
          <div className="p-4 space-y-6">
            {/* Aspect Ratio */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-semibold">Aspect Ratio</Label>
              </div>
              <RadioGroup value={aspectRatio} onValueChange={(value) => onAspectRatioChange(value as AspectRatio)}>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="16:9" id="ratio-16-9" />
                    <Label htmlFor="ratio-16-9" className="flex-1 cursor-pointer">
                      <div className="font-medium">16:9 Landscape</div>
                      <div className="text-xs text-muted-foreground">Standard widescreen (YouTube, etc.)</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="9:16" id="ratio-9-16" />
                    <Label htmlFor="ratio-9-16" className="flex-1 cursor-pointer">
                      <div className="font-medium">9:16 Portrait</div>
                      <div className="text-xs text-muted-foreground">Vertical (TikTok, Reels, Stories)</div>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-border/60 hover:bg-accent/50 transition-colors cursor-pointer">
                    <RadioGroupItem value="1:1" id="ratio-1-1" />
                    <Label htmlFor="ratio-1-1" className="flex-1 cursor-pointer">
                      <div className="font-medium">1:1 Square</div>
                      <div className="text-xs text-muted-foreground">Instagram posts</div>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Master Volume */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Master Volume</Label>
              <div className="space-y-2">
                <Slider
                  value={[volume * 100]}
                  min={0}
                  max={100}
                  step={1}
                  onValueChange={(values) => onVolumeChange(values[0] / 100)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Muted</span>
                  <span>{Math.round(volume * 100)}%</span>
                  <span>Max</span>
                </div>
              </div>
            </div>

            {/* Timeline Zoom */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Timeline Zoom</Label>
              <div className="space-y-2">
                <Slider
                  value={[zoomLevel]}
                  min={10}
                  max={200}
                  step={5}
                  onValueChange={(values) => onZoomChange(values[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Fit</span>
                  <span>{zoomLevel}px/s</span>
                  <span>Detail</span>
                </div>
              </div>
            </div>

            {/* Export Settings Preview */}
            <div className="pt-4 border-t border-border/60">
              <div className="text-xs text-muted-foreground space-y-1">
                <div className="flex justify-between">
                  <span>Resolution:</span>
                  <span className="text-foreground">1920x1080</span>
                </div>
                <div className="flex justify-between">
                  <span>Frame Rate:</span>
                  <span className="text-foreground">30 FPS</span>
                </div>
                <div className="flex justify-between">
                  <span>Format:</span>
                  <span className="text-foreground">MP4 (H.264)</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Effects Tab (Placeholder) */}
        <TabsContent value="effects" className="flex-1 mt-0 overflow-auto">
          <div className="p-4">
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <Layers className="w-12 h-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Effects Coming Soon</p>
              <p className="text-xs text-muted-foreground">
                Transitions, filters, and text overlays will be available here
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
