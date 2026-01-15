import { useCallback, useRef, useState, useEffect } from 'react';
import { Upload, Video, Music, Image as ImageIcon, Mic, X, Play, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MediaAsset } from '@/types/video-editor';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface MediaPanelProps {
  assets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onRemoveAsset: (assetId: string) => void;
  onDragStart?: (asset: MediaAsset) => void;
  onAddToTimeline?: (asset: MediaAsset) => void;
  onFileUpload?: (file: File) => Promise<void>; // New: Upload files through parent for storage integration
}

interface MediaContextMenuProps {
  asset: MediaAsset;
  position: { x: number; y: number };
  onClose: () => void;
  onAddToTimeline: (asset: MediaAsset) => void;
  onRemove: (assetId: string) => void;
}

function MediaContextMenu({ asset, position, onClose, onAddToTimeline, onRemove }: MediaContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 rounded-lg border border-border bg-popover shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="py-1">
        <button
          onClick={() => handleAction(() => onAddToTimeline(asset))}
          className={cn(
            'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
            'hover:bg-accent transition-colors'
          )}
        >
          <Play className="w-4 h-4" />
          Add to Timeline
        </button>
        <div className="my-1 h-px bg-border/50" />
        <button
          onClick={() => handleAction(() => onRemove(asset.id))}
          className={cn(
            'w-full px-4 py-2 text-left text-sm flex items-center gap-3',
            'text-destructive hover:bg-destructive/10 transition-colors'
          )}
        >
          <X className="w-4 h-4" />
          Remove from Library
        </button>
      </div>
    </div>
  );
}

export function MediaPanel({ assets, onAddAsset, onRemoveAsset, onDragStart, onAddToTimeline, onFileUpload }: MediaPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('all');
  const [contextMenu, setContextMenu] = useState<{ asset: MediaAsset; x: number; y: number } | null>(null);

  const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const generateThumbnail = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        const tempUrl = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 2);
        };

        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());
          }
          URL.revokeObjectURL(tempUrl);
        };

        video.src = tempUrl;
      } else if (file.type.startsWith('image/')) {
        const img = new Image();
        const tempUrl = URL.createObjectURL(file);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 160;
          canvas.height = 90;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const aspectRatio = img.width / img.height;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let offsetX = 0;
            let offsetY = 0;

            if (aspectRatio > canvas.width / canvas.height) {
              drawHeight = canvas.width / aspectRatio;
              offsetY = (canvas.height - drawHeight) / 2;
            } else {
              drawWidth = canvas.height * aspectRatio;
              offsetX = (canvas.width - drawWidth) / 2;
            }

            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            resolve(canvas.toDataURL());
          }
          URL.revokeObjectURL(tempUrl);
        };
        img.src = tempUrl;
      } else {
        resolve('');
      }
    });
  };

  const getMediaDuration = async (file: File): Promise<number | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const tempUrl = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(tempUrl);
        };
        video.src = tempUrl;
      } else if (file.type.startsWith('audio/')) {
        const audio = new Audio();
        audio.preload = 'metadata';
        const tempUrl = URL.createObjectURL(file);

        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          URL.revokeObjectURL(tempUrl);
        };
        audio.src = tempUrl;
      } else {
        resolve(undefined);
      }
    });
  };

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type first
      if (!file.type.startsWith('video/') &&
          !file.type.startsWith('audio/') &&
          !file.type.startsWith('image/')) {
        toast.error(`Unsupported file type: ${file.name}`);
        continue;
      }

      // If onFileUpload is provided, use it (handles storage upload + asset creation)
      if (onFileUpload) {
        try {
          await onFileUpload(file);
        } catch (error) {
          console.error('[MediaPanel] File upload failed:', error);
          toast.error(`Failed to upload ${file.name}`);
        }
      } else {
        // Fallback to legacy behavior (no storage upload)
        let type: 'video' | 'audio' | 'image';

        if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';
        else type = 'image';

        const src = URL.createObjectURL(file);
        const thumbnail = await generateThumbnail(file);
        const duration = await getMediaDuration(file);

        const asset: MediaAsset = {
          id: generateId(),
          type,
          name: file.name,
          src,
          thumbnail,
          duration,
          file,
        };

        onAddAsset(asset);
        toast.success(`Added ${file.name}`);
      }
    }
  }, [onAddAsset, onFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const filteredAssets = assets.filter(asset => {
    if (currentTab === 'all') return true;
    if (currentTab === 'video') return asset.type === 'video';
    if (currentTab === 'audio') return asset.type === 'audio';
    if (currentTab === 'image') return asset.type === 'image';
    if (currentTab === 'voiceover') return asset.type === 'audio' && asset.name.includes('voiceover');
    return true;
  });

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5 text-purple-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-blue-400" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-400" />;
      default:
        return <Video className="w-5 h-5" />;
    }
  };

  const formatDuration = (seconds: number | undefined) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        onChange={handleFileInput}
        className="hidden"
      />

      {/* Upload Button */}
      <div className="p-3 border-b border-border/60">
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="w-full gap-2 bg-primary hover:bg-primary/90"
          size="sm"
        >
          <Upload className="w-4 h-4" />
          Upload Media
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-3 pt-3">
          <TabsList className="grid grid-cols-5 h-8 w-full bg-muted/50">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="video" className="px-2" title="Video">
              <Video className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="audio" className="px-2" title="Audio">
              <Music className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="image" className="px-2" title="Images">
              <ImageIcon className="w-3.5 h-3.5" />
            </TabsTrigger>
            <TabsTrigger value="voiceover" className="px-2" title="Voiceovers">
              <Mic className="w-3.5 h-3.5" />
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={currentTab} className="flex-1 mt-0 overflow-hidden">
          <ScrollArea className="h-full">
            <div
              data-drop-zone="media-panel"
              className={cn(
                'p-3 transition-all',
                isDragging && 'bg-primary/5 border-2 border-dashed border-primary rounded-lg m-2'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {filteredAssets.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isDragging ? 'Drop your files here' : 'No media yet'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag & drop files or click Upload Media
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredAssets.map(asset => (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'copy';
                        e.dataTransfer.setData('application/json', JSON.stringify(asset));
                        onDragStart?.(asset);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setContextMenu({ asset, x: e.clientX, y: e.clientY });
                      }}
                      onClick={() => onAddToTimeline?.(asset)}
                      className="group relative rounded-lg overflow-hidden border border-border/60 bg-card hover:bg-card/80 cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center gap-3 p-2">
                        {/* Thumbnail */}
                        <div className="relative w-20 h-12 rounded bg-muted flex-shrink-0 overflow-hidden">
                          {asset.thumbnail ? (
                            <img
                              src={asset.thumbnail}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {getMediaIcon(asset.type)}
                            </div>
                          )}
                          {/* Duration badge */}
                          {asset.duration && (
                            <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 bg-black/70 rounded text-[10px] font-medium text-white">
                              {formatDuration(asset.duration)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0 mt-0.5">
                              {getMediaIcon(asset.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate leading-tight" title={asset.name}>
                                {asset.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                {asset.type}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Action button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setContextMenu({ asset, x: e.clientX, y: e.clientY });
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-accent transition-all"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors pointer-events-none" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Context Menu */}
      {contextMenu && onAddToTimeline && (
        <MediaContextMenu
          asset={contextMenu.asset}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          onClose={() => setContextMenu(null)}
          onAddToTimeline={onAddToTimeline}
          onRemove={onRemoveAsset}
        />
      )}
    </div>
  );
}
