import { useState, useEffect, useCallback } from 'react';
import { 
  HardDrive, 
  ChevronDown, 
  ChevronRight, 
  Folder, 
  Film, 
  Music, 
  Image,
  RefreshCw,
  Link2,
  Check,
  ArrowLeft,
  Download,
  Loader2,
  Key,
  Settings
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DriveSettingsModal } from './DriveSettingsModal';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webContentLink?: string;
  size?: number;
  modifiedTime?: string;
}

interface DrivePanelProps {
  onFileSelect: (file: DriveFile, accessToken?: string) => void;
  onFileDragStart: (e: React.DragEvent, file: DriveFile) => void;
}

const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Declare google types
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

export function DrivePanel({ onFileSelect, onFileDragStart }: DrivePanelProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>([
    { id: 'root', name: 'My Drive' }
  ]);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [credentials, setCredentials] = useState<{ clientId: string; apiKey: string } | null>(null);

  const currentFolderId = folderPath[folderPath.length - 1].id;

  // Load credentials from localStorage on mount
  useEffect(() => {
    const clientId = localStorage.getItem('google_drive_client_id');
    const apiKey = localStorage.getItem('google_drive_api_key');
    if (clientId && apiKey) {
      setCredentials({ clientId, apiKey });
    }
  }, []);

  // Load Google Identity Services script when credentials are available
  useEffect(() => {
    if (!credentials?.clientId) {
      return;
    }

    // Check if script already loaded
    if (window.google?.accounts?.oauth2) {
      setIsGoogleLoaded(true);
      return;
    }

    // Load Google Identity Services
    const gsiScript = document.createElement('script');
    gsiScript.src = 'https://accounts.google.com/gsi/client';
    gsiScript.async = true;
    gsiScript.defer = true;
    gsiScript.onload = () => {
      setIsGoogleLoaded(true);
    };
    document.body.appendChild(gsiScript);

    return () => {
      if (gsiScript.parentNode) {
        gsiScript.parentNode.removeChild(gsiScript);
      }
    };
  }, [credentials]);

  // Load files from Google Drive
  const loadFiles = useCallback(async (folderId: string, token?: string) => {
    const authToken = token || accessToken;
    if (!authToken) return;

    setIsLoading(true);
    
    try {
      const query = encodeURIComponent(
        `'${folderId}' in parents and trashed=false and (` +
        `mimeType contains 'video/' or ` +
        `mimeType contains 'audio/' or ` +
        `mimeType contains 'image/' or ` +
        `mimeType = 'application/vnd.google-apps.folder')`
      );
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?` +
        `q=${query}` +
        `&fields=files(id,name,mimeType,thumbnailLink,webContentLink,size,modifiedTime)` +
        `&orderBy=folder,name` +
        `&pageSize=50`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to load files');
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Error loading Drive files:', error);
      toast.error('Failed to load Drive files');
    }
    
    setIsLoading(false);
  }, [accessToken]);

  // Handle Google OAuth connection
  const handleConnect = useCallback(() => {
    if (!window.google || !credentials?.clientId) {
      toast.error('Google API not loaded');
      return;
    }

    setIsLoading(true);

    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: credentials.clientId,
      scope: SCOPES,
      callback: (response) => {
        setIsLoading(false);
        
        if (response.error) {
          toast.error('Failed to connect to Google Drive');
          return;
        }
        
        if (response.access_token) {
          setAccessToken(response.access_token);
          setIsConnected(true);
          loadFiles('root', response.access_token);
          toast.success('Connected to Google Drive');
        }
      },
    });
    
    tokenClient.requestAccessToken();
  }, [credentials, loadFiles]);

  // Handle credentials save from modal
  const handleCredentialsSave = useCallback((creds: { clientId: string; apiKey: string }) => {
    setCredentials(creds);
    toast.success('Credentials saved');
  }, []);

  // Navigate into folder
  const openFolder = useCallback((folder: DriveFile) => {
    setFolderPath(prev => [...prev, { id: folder.id, name: folder.name }]);
    loadFiles(folder.id);
  }, [loadFiles]);

  // Navigate back in folder path
  const navigateToFolder = useCallback((index: number) => {
    const newPath = folderPath.slice(0, index + 1);
    setFolderPath(newPath);
    loadFiles(newPath[newPath.length - 1].id);
  }, [folderPath, loadFiles]);

  // Go back one folder
  const goBack = useCallback(() => {
    if (folderPath.length > 1) {
      navigateToFolder(folderPath.length - 2);
    }
  }, [folderPath, navigateToFolder]);

  // Get icon based on file type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return <Film className="w-6 h-6 text-violet-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-6 h-6 text-primary" />;
    if (mimeType.startsWith('image/')) return <Image className="w-6 h-6 text-emerald-400" />;
    if (mimeType === 'application/vnd.google-apps.folder') return <Folder className="w-6 h-6 text-amber-400" />;
    return <Film className="w-6 h-6 text-muted-foreground" />;
  };

  // Handle file click
  const handleFileClick = async (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      openFolder(file);
    } else {
      setDownloadingFiles(prev => new Set(prev).add(file.id));
      await onFileSelect(file, accessToken || undefined);
      setDownloadingFiles(prev => {
        const next = new Set(prev);
        next.delete(file.id);
        return next;
      });
    }
  };

  // Handle drag start for Drive files
  const handleDragStart = (e: React.DragEvent, file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      e.preventDefault();
      return;
    }

    const fileData = {
      id: `drive-${file.id}`,
      driveFileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      type: file.mimeType.startsWith('video/') ? 'video' 
          : file.mimeType.startsWith('audio/') ? 'audio' 
          : 'image',
      source: 'google-drive',
      accessToken: accessToken,
    };
    
    e.dataTransfer.setData('application/json', JSON.stringify(fileData));
    e.dataTransfer.effectAllowed = 'copy';
    onFileDragStart(e, file);
  };

  // Sort files (folders first, then by name)
  const sortedFiles = [...files].sort((a, b) => {
    const aIsFolder = a.mimeType === 'application/vnd.google-apps.folder';
    const bIsFolder = b.mimeType === 'application/vnd.google-apps.folder';
    if (aIsFolder && !bIsFolder) return -1;
    if (!aIsFolder && bIsFolder) return 1;
    return a.name.localeCompare(b.name);
  });

  const hasCredentials = !!credentials?.clientId && !!credentials?.apiKey;

  return (
    <>
      <div className="bg-card/30 h-full flex flex-col">
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="flex flex-col h-full">
          {/* Header */}
          <CollapsibleTrigger asChild>
            <div 
              className="flex items-center justify-between px-3 py-1.5 cursor-pointer hover:bg-secondary/50 transition-colors flex-shrink-0"
            >
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <HardDrive className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Google Drive</span>
                {isConnected && (
                  <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 rounded-full text-xs text-emerald-400">
                    <Check className="w-3 h-3" />
                    Connected
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Settings button - always visible */}
                {hasCredentials && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(true);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Drive Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}

                {!hasCredentials ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSettings(true);
                    }}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-2 border-amber-500/50 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                  >
                    <Key className="w-4 h-4" />
                    API Key Required
                  </Button>
                ) : !isConnected ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConnect();
                    }}
                    disabled={isLoading || !isGoogleLoaded}
                    size="sm"
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4" />
                    )}
                    {isLoading ? 'Connecting...' : 'Connect Drive'}
                  </Button>
                ) : (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      loadFiles(currentFolderId);
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </div>
            </div>
          </CollapsibleTrigger>

          {/* Content */}
          <CollapsibleContent className="flex-1 min-h-0 overflow-hidden">
            <div className="px-3 pb-2 h-full flex flex-col">
              {!hasCredentials ? (
                <div className="flex items-center justify-center gap-3 py-2">
                  <Key className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Google Drive API Required</p>
                  <Button
                    onClick={() => setShowSettings(true)}
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs h-7"
                  >
                    Configure
                  </Button>
                </div>
              ) : !isConnected ? (
                <div className="flex items-center justify-center gap-3 py-2">
                  <HardDrive className="w-5 h-5 text-muted-foreground/50" />
                  <p className="text-xs text-muted-foreground">Click "Connect Drive" to access your files</p>
                </div>
              ) : isLoading && files.length === 0 ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : (
                <>
                  {/* Breadcrumb navigation */}
                  <div className="flex items-center gap-1 mb-2 text-xs text-muted-foreground flex-shrink-0">
                    {folderPath.length > 1 && (
                      <Button
                        onClick={goBack}
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 mr-1"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </Button>
                    )}
                    <Folder className="w-3 h-3" />
                    {folderPath.map((folder, i) => (
                      <span key={folder.id} className="flex items-center">
                        {i > 0 && <span className="mx-1">/</span>}
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (i < folderPath.length - 1) {
                              navigateToFolder(i);
                            }
                          }}
                          className={`${i < folderPath.length - 1 ? 'hover:text-foreground cursor-pointer' : 'text-foreground'} transition-colors`}
                        >
                          {folder.name}
                        </span>
                      </span>
                    ))}
                  </div>
                  
                  {/* Files grid - horizontal scrollable */}
                  <div className="flex gap-2 overflow-x-auto pb-1 flex-1 items-start">
                    {sortedFiles.map(file => {
                      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                      const isDownloading = downloadingFiles.has(file.id);
                      
                      return (
                        <div
                          key={file.id}
                          draggable={!isFolder}
                          onDragStart={(e) => handleDragStart(e, file)}
                          onClick={() => handleFileClick(file)}
                          className={`flex-shrink-0 w-20 p-2 bg-secondary hover:bg-secondary/80 border border-border hover:border-primary/50 rounded-lg transition-all group ${
                            isFolder ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'
                          } ${isDownloading ? 'opacity-50' : ''}`}
                        >
                          {/* Thumbnail or icon */}
                          <div className="aspect-video bg-background rounded mb-1.5 flex items-center justify-center overflow-hidden relative">
                            {isDownloading ? (
                              <Loader2 className="w-5 h-5 text-primary animate-spin" />
                            ) : file.thumbnailLink ? (
                              <img 
                                src={file.thumbnailLink} 
                                alt={file.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              getFileIcon(file.mimeType)
                            )}
                            {!isFolder && !isDownloading && (
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Download className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </div>
                          {/* File name */}
                          <p className="text-xs text-foreground truncate" title={file.name}>
                            {file.name}
                          </p>
                        </div>
                      );
                    })}
                    
                    {sortedFiles.length === 0 && !isLoading && (
                      <p className="text-sm text-muted-foreground py-2">No media files in this folder</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Settings Modal */}
      <DriveSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleCredentialsSave}
      />
    </>
  );
}
