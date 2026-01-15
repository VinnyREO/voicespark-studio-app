import { useState, useEffect, useCallback } from 'react';
import { 
  FolderOpen, 
  Image, 
  Gamepad2, 
  Upload, 
  Music,
  Film,
  GripVertical,
  Volume2,
  HardDrive,
  Folder,
  RefreshCw,
  ArrowLeft,
  Settings,
  Loader2
} from 'lucide-react';
import { MediaItem } from '@/types/editor';
import { DriveSettingsModal } from './DriveSettingsModal';
import { toast } from 'sonner';

type MediaCategory = 'my-media' | 'stock' | 'gameplay' | 'drive';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: number;
  modifiedTime?: string;
}

interface MediaPanelProps {
  mediaItems: MediaItem[];
  onUpload: (files: FileList) => void;
  onDragStart: (item: MediaItem) => void;
  onDragEnd: () => void;
  onClose?: () => void;
  onDriveFileSelect?: (file: DriveFile, accessToken?: string) => void;
}

const STOCK_FOOTAGE: MediaItem[] = [
  { id: 'stock-1', type: 'video', name: 'City Traffic', url: '', source: 'stock', duration: 15 },
  { id: 'stock-2', type: 'video', name: 'Nature Drone', url: '', source: 'stock', duration: 20 },
  { id: 'stock-3', type: 'video', name: 'Ocean Waves', url: '', source: 'stock', duration: 12 },
  { id: 'stock-4', type: 'video', name: 'Abstract Motion', url: '', source: 'stock', duration: 10 },
];

const GAMEPLAY_FOOTAGE: MediaItem[] = [
  { id: 'game-1', type: 'video', name: 'Minecraft Parkour', url: '', source: 'gameplay', duration: 60 },
  { id: 'game-2', type: 'video', name: 'Subway Surfers', url: '', source: 'gameplay', duration: 60 },
  { id: 'game-3', type: 'video', name: 'GTA Driving', url: '', source: 'gameplay', duration: 60 },
  { id: 'game-4', type: 'video', name: 'Satisfying Clips', url: '', source: 'gameplay', duration: 30 },
];

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => {
            requestAccessToken: () => void;
          };
        };
      };
    };
  }
}

export function MediaPanel({ mediaItems, onUpload, onDragStart, onDragEnd, onClose, onDriveFileSelect }: MediaPanelProps) {
  const [activeCategory, setActiveCategory] = useState<MediaCategory>('my-media');
  
  // Drive state
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [showSettings, setShowSettings] = useState(false);
  const [credentials, setCredentials] = useState<{ clientId: string; apiKey: string } | null>(null);
  
  const currentFolderId = folderPath[folderPath.length - 1].id;

  const categories: { id: MediaCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'my-media', label: 'My Media', icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'stock', label: 'Stock', icon: <Image className="w-4 h-4" /> },
    { id: 'gameplay', label: 'Gameplay', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'drive', label: 'Drive', icon: <HardDrive className="w-4 h-4" /> },
  ];

  // Load credentials from localStorage on mount
  useEffect(() => {
    const clientId = localStorage.getItem('google_drive_client_id');
    const apiKey = localStorage.getItem('google_drive_api_key');
    if (clientId && apiKey) {
      setCredentials({ clientId, apiKey });
    }
  }, []);

  // Load Google Identity Services script
  useEffect(() => {
    if (!credentials) return;
    
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => setIsGoogleLoaded(true);
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [credentials]);

  const loadFiles = useCallback(async (folderId: string = 'root') => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const query = `'${folderId}' in parents and trashed = false and (mimeType contains 'video/' or mimeType contains 'audio/' or mimeType contains 'image/' or mimeType = 'application/vnd.google-apps.folder')`;
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,modifiedTime)&orderBy=folder,name`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      
      if (!response.ok) throw new Error('Failed to fetch files');
      
      const data = await response.json();
      setDriveFiles(data.files || []);
    } catch (error) {
      console.error('Error loading files:', error);
      toast.error('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  const handleConnect = useCallback(() => {
    if (!isGoogleLoaded || !window.google || !credentials) {
      toast.error('Please configure API credentials first');
      setShowSettings(true);
      return;
    }

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: credentials.clientId,
      scope: SCOPES,
      callback: (response) => {
        if (response.access_token) {
          setAccessToken(response.access_token);
          setIsConnected(true);
          toast.success('Connected to Google Drive');
        } else if (response.error) {
          toast.error('Failed to connect');
        }
      },
    });

    tokenClient.requestAccessToken();
  }, [isGoogleLoaded, credentials]);

  // Load files when connected or folder changes
  useEffect(() => {
    if (isConnected && accessToken && activeCategory === 'drive') {
      loadFiles(currentFolderId);
    }
  }, [isConnected, accessToken, currentFolderId, loadFiles, activeCategory]);

  const openFolder = (file: DriveFile) => {
    setFolderPath(prev => [...prev, { id: file.id, name: file.name }]);
  };

  const goBack = () => {
    if (folderPath.length > 1) {
      setFolderPath(prev => prev.slice(0, -1));
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.folder') {
      return <Folder className="w-4 h-4 text-yellow-400" />;
    }
    if (mimeType.startsWith('video/')) {
      return <Film className="w-4 h-4 text-video" />;
    }
    if (mimeType.startsWith('audio/')) {
      return <Volume2 className="w-4 h-4 text-primary" />;
    }
    if (mimeType.startsWith('image/')) {
      return <Image className="w-4 h-4 text-green-400" />;
    }
    return <FolderOpen className="w-4 h-4 text-muted-foreground" />;
  };

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      openFolder(file);
    } else if (onDriveFileSelect && accessToken) {
      onDriveFileSelect(file, accessToken);
    }
  };

  const handleDriveDragStart = (e: React.DragEvent, file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('application/json', JSON.stringify({
      ...file,
      isDriveFile: true,
      accessToken
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const getDisplayItems = (): MediaItem[] => {
    switch (activeCategory) {
      case 'my-media':
        return mediaItems;
      case 'stock':
        return STOCK_FOOTAGE;
      case 'gameplay':
        return GAMEPLAY_FOOTAGE;
      default:
        return [];
    }
  };

  const handleDragStart = (e: React.DragEvent, item: MediaItem) => {
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
    onDragStart(item);
  };

  const handleDragEnd = () => {
    onDragEnd();
  };

  const getMediaIcon = (type: MediaItem['type']) => {
    switch (type) {
      case 'audio':
        return <Volume2 className="w-4 h-4 text-primary" />;
      case 'video':
        return <Film className="w-4 h-4 text-video" />;
      case 'image':
        return <Image className="w-4 h-4 text-green-400" />;
    }
  };

  const displayItems = getDisplayItems();

  const renderDriveContent = () => {
    if (!credentials) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
          <HardDrive className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Configure Google Drive</p>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary/20 text-primary text-xs hover:bg-primary/30 transition-colors"
          >
            <Settings className="w-3 h-3" />
            Setup API
          </button>
        </div>
      );
    }

    if (!isConnected) {
      return (
        <div className="flex flex-col items-center justify-center h-32 text-center p-4">
          <HardDrive className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground mb-2">Connect to Drive</p>
          <button
            onClick={handleConnect}
            disabled={!isGoogleLoaded}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {!isGoogleLoaded ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            Connect
          </button>
        </div>
      );
    }

    return (
      <>
        {/* Folder navigation */}
        <div className="flex items-center gap-1 p-2 border-b border-border">
          {folderPath.length > 1 && (
            <button
              onClick={goBack}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          <span className="text-xs text-muted-foreground truncate flex-1">
            {folderPath[folderPath.length - 1].name}
          </span>
          <button
            onClick={() => loadFiles(currentFolderId)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <Settings className="w-3 h-3" />
          </button>
        </div>

        {/* Drive files */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : driveFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <Folder className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No media files</p>
          </div>
        ) : (
          <div className="space-y-2 p-3">
            {driveFiles.map((file) => (
              <div
                key={file.id}
                draggable={file.mimeType !== 'application/vnd.google-apps.folder'}
                onDragStart={(e) => handleDriveDragStart(e, file)}
                onClick={() => handleFileClick(file)}
                className={`
                  group flex items-center gap-3 p-2.5 rounded-lg border border-border 
                  hover:border-video/50 hover:bg-video/5 cursor-pointer transition-all
                  ${file.mimeType === 'application/vnd.google-apps.folder' ? '' : 'active:cursor-grabbing'}
                `}
              >
                {file.mimeType !== 'application/vnd.google-apps.folder' && (
                  <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
                
                {/* Thumbnail */}
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {file.thumbnailLink ? (
                    <img src={file.thumbnailLink} alt="" className="w-full h-full object-cover" />
                  ) : (
                    getFileIcon(file.mimeType)
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {file.mimeType === 'application/vnd.google-apps.folder' ? 'Folder' : 
                      file.size ? `${(Number(file.size) / 1024 / 1024).toFixed(1)} MB` : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <>
      <div className="w-56 bg-card border-r border-border flex flex-col">
        {/* Header with close button */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <span className="text-xs font-semibold text-foreground">Media</span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Close panel"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Category Tabs */}
        <div className="flex border-b border-border">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`
                flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors
                ${activeCategory === cat.id
                  ? 'text-video border-b-2 border-video bg-video/5'
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>

        {/* Content based on category */}
        {activeCategory === 'drive' ? (
          <div className="flex-1 overflow-y-auto">
            {renderDriveContent()}
          </div>
        ) : (
          <>
            {/* Upload Button (only for My Media) */}
            {activeCategory === 'my-media' && (
              <div className="p-3 border-b border-border">
                <label className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg border-2 border-dashed border-border hover:border-video/50 hover:bg-video/5 cursor-pointer transition-colors">
                  <Upload className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Upload Media</span>
                  <input
                    type="file"
                    multiple
                    accept="video/*,audio/*,image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && onUpload(e.target.files)}
                  />
                </label>
              </div>
            )}

            {/* Media Grid */}
            <div className="flex-1 overflow-y-auto p-3">
              {displayItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <Music className="w-8 h-8 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No media yet</p>
                  <p className="text-xs text-muted-foreground/70">Upload files or generate a voiceover</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayItems.map((item) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                      onDragEnd={handleDragEnd}
                      className={`
                        group flex items-center gap-3 p-2.5 rounded-lg border border-border 
                        hover:border-video/50 hover:bg-video/5 cursor-grab active:cursor-grabbing transition-all
                        ${item.source === 'voiceover' ? 'border-primary/30 bg-primary/5' : ''}
                      `}
                    >
                      <GripVertical className="w-3 h-3 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* Thumbnail */}
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        {getMediaIcon(item.type)}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.duration ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}` : item.type}
                        </p>
                      </div>

                      {item.source === 'voiceover' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-medium">
                          VO
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Drag Hint */}
        <div className="p-3 border-t border-border">
          <p className="text-xs text-muted-foreground text-center">
            Drag items to timeline →
          </p>
        </div>
      </div>

      {/* Drive Settings Modal */}
      <DriveSettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)}
        onSave={({ clientId, apiKey }) => {
          localStorage.setItem('google_drive_client_id', clientId);
          localStorage.setItem('google_drive_api_key', apiKey);
          setCredentials({ clientId, apiKey });
          toast.success('API credentials saved');
        }}
      />
    </>
  );
}