import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useVideoEditor } from '@/hooks/useVideoEditor';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useAutoSave } from '@/hooks/useAutoSave';
import { ToolPanel } from '@/components/video-editor/ToolPanel';
import { PreviewCanvas } from '@/components/video-editor/PreviewCanvas';
import { Timeline } from '@/components/video-editor/Timeline';
import { MediaAsset } from '@/types/video-editor';
import { getProject, saveProjectData } from '@/services/projectService';
import { uploadFile, downloadFile } from '@/services/storageService';
import { VideoForgeProjectData } from '@/types/project';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function VideoForge() {
  console.log('[VideoForge] Component rendering...');

  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');
  const [isLoadingProject, setIsLoadingProject] = useState(!!projectId);

  console.log('[VideoForge] projectId:', projectId, 'isLoadingProject:', isLoadingProject);

  const editor = useVideoEditor();
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [draggedAsset, setDraggedAsset] = useState<MediaAsset | null>(null);
  const [isDraggingExternal, setIsDraggingExternal] = useState(false);
  const [timelineHeight, setTimelineHeight] = useState(288); // 72 * 4 = 288px default (h-72 = 18rem = 288px)
  const [isResizingTimeline, setIsResizingTimeline] = useState(false);
  const [mediaPanelWidth, setMediaPanelWidth] = useState(320); // Default 320px (w-80)
  const [isMediaPanelCollapsed, setIsMediaPanelCollapsed] = useState(false);
  const [isResizingMediaPanel, setIsResizingMediaPanel] = useState(false);

  // Track uploaded media files (assetId -> storagePath mapping)
  const [uploadedMediaFiles, setUploadedMediaFiles] = useState<Map<string, string>>(new Map());

  // Track if initial load is complete (prevents marking changes during load)
  const hasLoadedRef = useRef(false);

  // Track previous counts to detect actual changes
  const prevClipCountRef = useRef(0);
  const prevAssetCountRef = useRef(0);

  // Debug function to check what's in Supabase Storage
  const debugCheckStorage = useCallback(async () => {
    if (!projectId) return;

    console.log('[DEBUG] ========== CHECKING SUPABASE STORAGE ==========');

    try {
      const { data: files, error } = await supabase.storage
        .from('voicespark-projects')
        .list(`${projectId}/assets`);

      if (error) {
        console.error('[DEBUG] Storage list error:', error);
        return;
      }

      console.log('[DEBUG] Files in storage:', files?.length || 0);
      files?.forEach(file => {
        console.log('[DEBUG]   - File:', file.name, 'Size:', file.metadata?.size || 'unknown');
      });

      if (!files || files.length === 0) {
        console.log('[DEBUG] ⚠️ NO FILES IN STORAGE - uploads may have failed!');
      }
    } catch (err) {
      console.error('[DEBUG] Storage check failed:', err);
    }

    console.log('[DEBUG] ================================================');
  }, [projectId]);

  // Debug function to check what's in project_data
  const debugCheckProjectData = useCallback(async () => {
    if (!projectId) return;

    console.log('[DEBUG] ========== CHECKING PROJECT_DATA ==========');

    try {
      const { data, error } = await supabase
        .from('project_data')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[DEBUG] project_data query error:', error);
        return;
      }

      console.log('[DEBUG] project_data exists:', !!data);

      if (data?.data) {
        const projectData = data.data;
        console.log('[DEBUG] mediaMetadata count:', projectData.mediaMetadata?.length || 0);

        projectData.mediaMetadata?.forEach((m: any, i: number) => {
          console.log(`[DEBUG]   Media ${i}: name="${m.name}", id=${m.id}, storagePath=${m.storagePath || 'MISSING!'}`);
        });

        console.log('[DEBUG] clips count:', projectData.editorState?.clips?.length || 0);

        projectData.editorState?.clips?.forEach((c: any, i: number) => {
          console.log(`[DEBUG]   Clip ${i}: id=${c.id}, assetId=${c.assetId}`);
        });
      } else {
        console.log('[DEBUG] ⚠️ NO DATA IN project_data!');
      }
    } catch (err) {
      console.error('[DEBUG] project_data check failed:', err);
    }

    console.log('[DEBUG] ==============================================');
  }, [projectId]);

  // Run debug checks after project loads
  useEffect(() => {
    if (projectId && !isLoadingProject && hasLoadedRef.current) {
      // Small delay to let everything settle
      const timer = setTimeout(() => {
        debugCheckStorage();
        debugCheckProjectData();

        // Also log current editor state
        console.log('[DEBUG] ========== CURRENT EDITOR STATE ==========');
        console.log('[DEBUG] Editor assets count:', editor.state?.assets?.length || 0);
        console.log('[DEBUG] Editor clips count:', editor.state?.clips?.length || 0);
        console.log('[DEBUG] Uploaded files map size:', uploadedMediaFiles.size);
        console.log('[DEBUG] Uploaded files map entries:', Array.from(uploadedMediaFiles.entries()));
        console.log('[DEBUG] ==============================================');
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [projectId, isLoadingProject, debugCheckStorage, debugCheckProjectData, editor.state?.assets?.length, editor.state?.clips?.length, uploadedMediaFiles]);

  // Auto-save handler
  const handleAutoSave = useCallback(async () => {
    if (!projectId || isLoadingProject) {
      console.log('[VideoForge] Skipping auto-save (loading or no project)');
      return;
    }

    console.log('[VideoForge] ========== AUTO-SAVE START ==========');
    console.log('[VideoForge] Project ID:', projectId);

    try {
      // Get current editor state
      console.log('[VideoForge] Getting editor state...');
      const currentState = editor.getCurrentState();
      console.log('[VideoForge] Clips:', currentState.clips?.length || 0);
      console.log('[VideoForge] Assets:', currentState.assets?.length || 0);
      console.log('[VideoForge] Current state:', {
        clips: currentState.clips?.length,
        assets: currentState.assets?.length,
        playheadPosition: currentState.playheadPosition,
        zoomLevel: currentState.zoomLevel,
        aspectRatio: currentState.aspectRatio,
      });

      // Prepare media metadata
      console.log('[VideoForge] Preparing media metadata...');
      console.log('[VideoForge] uploadedMediaFiles map size:', uploadedMediaFiles.size);
      console.log('[VideoForge] uploadedMediaFiles entries:', Array.from(uploadedMediaFiles.entries()));

      const mediaMetadata = currentState.assets.map(asset => {
        const storagePath = uploadedMediaFiles.get(asset.id) || '';

        if (!storagePath) {
          console.warn(`[VideoForge] ⚠️ Asset "${asset.name}" (${asset.id}) has NO storage path - file not uploaded yet!`);
        } else {
          console.log(`[VideoForge] ✅ Asset "${asset.name}" (${asset.id}) → ${storagePath}`);
        }

        return {
          id: asset.id,
          name: asset.name,
          type: asset.type,
          duration: asset.duration,
          thumbnail: asset.thumbnail || '',
          storagePath: storagePath,
        };
      });

      console.log('[VideoForge] Media metadata count:', mediaMetadata.length);

      // Count how many have valid storage paths
      const assetsWithPaths = mediaMetadata.filter(m => m.storagePath).length;
      const assetsWithoutPaths = mediaMetadata.filter(m => !m.storagePath).length;
      console.log(`[VideoForge] Assets with storage paths: ${assetsWithPaths}`);
      console.log(`[VideoForge] Assets WITHOUT storage paths: ${assetsWithoutPaths}`);

      if (assetsWithoutPaths > 0) {
        console.warn('[VideoForge] ⚠️ Some assets are missing storage paths! They may not restore correctly.');
      }

      // Check if we have any data to save
      if (mediaMetadata.length === 0 && currentState.clips.length === 0) {
        console.log('[VideoForge] No data to save (empty project)');
        return;
      }

      // Prepare data object
      const projectData: VideoForgeProjectData = {
        version: 1,
        editorState: {
          clips: currentState.clips,
          playheadPosition: currentState.playheadPosition,
          isPlaying: currentState.isPlaying,
          selectedClipIds: currentState.selectedClipIds,
          zoomLevel: currentState.zoomLevel,
          aspectRatio: currentState.aspectRatio,
          volume: currentState.volume,
          duration: currentState.duration,
          trackSettings: currentState.trackSettings,
        },
        mediaMetadata,
      };

      console.log('[VideoForge] Data to save:', JSON.stringify(projectData, null, 2));

      // Save to Supabase
      console.log('[VideoForge] Calling saveProjectData...');
      await saveProjectData(projectId, projectData);

      console.log('[VideoForge] ========== AUTO-SAVE SUCCESS ==========');
    } catch (error) {
      console.error('[VideoForge] ========== AUTO-SAVE FAILED ==========');
      console.error('[VideoForge] Error:', error);
      throw error;
    }
  }, [projectId, isLoadingProject, editor, uploadedMediaFiles]);

  // Initialize auto-save
  const {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    markAsChanged,
    markAsChangedQuick,
    saveNow,
  } = useAutoSave({
    onSave: handleAutoSave,
    interval: 15000, // 15 seconds - faster auto-save
    enabled: !!projectId && !isLoadingProject, // Disable during loading
  });

  // Auto-save on navigation away
  useEffect(() => {
    return () => {
      // Save when unmounting (user navigating away)
      if (projectId && hasUnsavedChanges && !isSaving) {
        console.log('[VideoForge] Component unmounting, triggering final save');
        handleAutoSave().catch(err => {
          console.error('[VideoForge] Failed to save on unmount:', err);
        });
      }
    };
  }, [projectId, hasUnsavedChanges, isSaving, handleAutoSave]);

  // Browser close protection - Warn and save
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (projectId && hasUnsavedChanges) {
        // Trigger save (best effort)
        handleAutoSave().catch(err => {
          console.error('[VideoForge] Failed to save on browser close:', err);
        });

        // Show browser warning
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [projectId, hasUnsavedChanges, handleAutoSave]);

  // Helper to process a single file and return the asset
  const processSingleFile = useCallback(async (file: File): Promise<MediaAsset | null> => {
    let type: 'video' | 'audio' | 'image';

    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('image/')) type = 'image';
    else {
      toast.error(`Unsupported file type: ${file.name}`);
      return null;
    }

    const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const src = URL.createObjectURL(file);

    // Generate thumbnail
    const thumbnail = await new Promise<string>((resolve) => {
      if (type === 'video' || type === 'image') {
        const el = type === 'video' ? document.createElement('video') : new Image();
        el.src = src;

        if (type === 'video') {
          (el as HTMLVideoElement).onloadedmetadata = () => {
            (el as HTMLVideoElement).currentTime = 0.5;
          };
          (el as HTMLVideoElement).onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(el as HTMLVideoElement, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL());
            }
          };
        } else {
          (el as HTMLImageElement).onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 160;
            canvas.height = 90;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(el as HTMLImageElement, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL());
            }
          };
        }
      } else {
        resolve('');
      }
    });

    // Get duration
    const duration = await new Promise<number | undefined>((resolve) => {
      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          resolve(video.duration);
          URL.revokeObjectURL(video.src);
        };
        video.src = src;
      } else if (type === 'audio') {
        const audio = new Audio();
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
          resolve(audio.duration);
          URL.revokeObjectURL(audio.src);
        };
        audio.src = src;
      } else {
        resolve(undefined);
      }
    });

    const assetId = generateId();
    const asset: MediaAsset = {
      id: assetId,
      type,
      name: file.name,
      src,
      thumbnail,
      duration,
      file,
    };

    console.log('[VideoForge] ========== MEDIA UPLOAD START ==========');
    console.log('[VideoForge] File:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('[VideoForge] Asset ID:', assetId);
    console.log('[VideoForge] Project ID:', projectId);

    editor.addAsset(asset);
    console.log('[VideoForge] Asset added to editor');

    // Upload to Supabase Storage in the background
    if (projectId) {
      console.log('[VideoForge] Starting Supabase Storage upload...');
      uploadFile(projectId, file)
        .then(storagePath => {
          console.log('[VideoForge] ✅ File uploaded successfully');
          console.log('[VideoForge] Storage path:', storagePath);

          setUploadedMediaFiles(prev => {
            const newMap = new Map(prev);
            newMap.set(assetId, storagePath);
            console.log('[VideoForge] Updated uploadedMediaFiles map:');
            console.log('[VideoForge] Map entries:', Array.from(newMap.entries()));
            return newMap;
          });

          console.log('[VideoForge] ========== MEDIA UPLOAD COMPLETE ==========');
          // Asset is already added to editor, will be saved on next auto-save
        })
        .catch(error => {
          console.error('[VideoForge] ========== MEDIA UPLOAD FAILED ==========');
          console.error('[VideoForge] Upload error:', error);
          toast.error(`Failed to upload ${file.name}`);
        });
    } else {
      console.warn('[VideoForge] No project ID - skipping upload to Supabase');
    }

    return asset;
  }, [editor, projectId]);

  // Helper to process multiple dropped files
  const processFiles = useCallback(async (files: FileList) => {
    for (let i = 0; i < files.length; i++) {
      await processSingleFile(files[i]);
    }

    toast.success(`Added ${files.length} file${files.length > 1 ? 's' : ''}`);
  }, [processSingleFile]);

  // NEW: File upload handler for MediaPanel - uploads to storage FIRST, then adds to editor
  const handleFileUpload = useCallback(async (file: File): Promise<void> => {
    console.log('[VideoForge] ========== handleFileUpload START ==========');
    console.log('[VideoForge] File:', file.name, 'Size:', file.size);
    console.log('[VideoForge] Project ID:', projectId);

    if (!projectId) {
      console.error('[VideoForge] No project ID - cannot upload to storage!');
      toast.error('No project selected - cannot save file');
      return;
    }

    // Determine file type
    let type: 'video' | 'audio' | 'image';
    if (file.type.startsWith('video/')) type = 'video';
    else if (file.type.startsWith('audio/')) type = 'audio';
    else if (file.type.startsWith('image/')) type = 'image';
    else {
      toast.error(`Unsupported file type: ${file.name}`);
      return;
    }

    try {
      // STEP 1: Upload to Supabase Storage FIRST (blocking, not background)
      console.log('[VideoForge] Step 1: Uploading to Supabase Storage...');
      const storagePath = await uploadFile(projectId, file);
      console.log('[VideoForge] ✅ Storage upload complete:', storagePath);

      // STEP 2: Generate asset ID
      const assetId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // STEP 3: CRITICAL - Store the mapping IMMEDIATELY after upload
      setUploadedMediaFiles(prev => {
        const newMap = new Map(prev);
        newMap.set(assetId, storagePath);
        console.log('[VideoForge] ✅ Stored mapping:', assetId, '→', storagePath);
        console.log('[VideoForge] Map size now:', newMap.size);
        return newMap;
      });

      // STEP 4: Create blob URL for local preview
      const src = URL.createObjectURL(file);

      // STEP 5: Generate thumbnail
      const thumbnail = await new Promise<string>((resolve) => {
        if (type === 'video' || type === 'image') {
          const el = type === 'video' ? document.createElement('video') : new Image();
          el.src = src;

          if (type === 'video') {
            (el as HTMLVideoElement).onloadedmetadata = () => {
              (el as HTMLVideoElement).currentTime = 0.5;
            };
            (el as HTMLVideoElement).onseeked = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 160;
              canvas.height = 90;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(el as HTMLVideoElement, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL());
              } else {
                resolve('');
              }
            };
          } else {
            (el as HTMLImageElement).onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = 160;
              canvas.height = 90;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(el as HTMLImageElement, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL());
              } else {
                resolve('');
              }
            };
          }
        } else {
          resolve('');
        }
      });

      // STEP 6: Get duration for video/audio
      const duration = await new Promise<number | undefined>((resolve) => {
        if (type === 'video') {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            resolve(video.duration);
          };
          video.src = src;
        } else if (type === 'audio') {
          const audio = new Audio();
          audio.preload = 'metadata';
          audio.onloadedmetadata = () => {
            resolve(audio.duration);
          };
          audio.src = src;
        } else {
          resolve(undefined);
        }
      });

      // STEP 7: Create asset object
      const asset: MediaAsset = {
        id: assetId,
        type,
        name: file.name,
        src,
        thumbnail,
        duration,
        file,
      };

      // STEP 8: Add to editor
      console.log('[VideoForge] Step 8: Adding asset to editor...');
      editor.addAsset(asset);
      console.log('[VideoForge] ✅ Asset added to editor');

      // STEP 9: Mark as changed to trigger auto-save
      if (markAsChangedRef.current) {
        markAsChangedRef.current();
        console.log('[VideoForge] ✅ Marked as changed');
      }

      console.log('[VideoForge] ========== handleFileUpload COMPLETE ==========');
      toast.success(`${file.name} uploaded`);

    } catch (error) {
      console.error('[VideoForge] ========== handleFileUpload FAILED ==========', error);
      toast.error(`Failed to upload ${file.name}`);
      throw error;
    }
  }, [projectId, editor, setUploadedMediaFiles]);

  const handleDropAsset = useCallback((asset: MediaAsset, trackIndex: number, timePosition: number) => {
    // Use exact asset duration for videos/audio, default 3 seconds for images
    const clipDuration = asset.duration || (asset.type === 'image' ? 3 : 5);

    editor.addClip({
      assetId: asset.id,
      trackIndex,
      startTime: timePosition,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: 0,
    });
  }, [editor]);

  // Handle external file drop on timeline
  const handleDropExternalFile = useCallback(async (file: File, trackIndex: number, timePosition: number) => {
    const asset = await processSingleFile(file);
    if (asset) {
      // Use exact asset duration for videos/audio, default 3 seconds for images
      const clipDuration = asset.duration || (asset.type === 'image' ? 3 : 5);

      editor.addClip({
        assetId: asset.id,
        trackIndex,
        startTime: timePosition,
        duration: clipDuration,
        trimStart: 0,
        trimEnd: 0,
      });
      toast.success(`Added ${file.name} to timeline`);
    }
  }, [processSingleFile, editor]);

  // Handle file drop on preview canvas
  const handleDropOnPreview = useCallback(async (file: File) => {
    const asset = await processSingleFile(file);
    if (asset) {
      // Use exact asset duration for videos/audio, default 3 seconds for images
      const clipDuration = asset.duration || (asset.type === 'image' ? 3 : 5);

      // Add clip to track 0 at current playhead position
      editor.addClip({
        assetId: asset.id,
        trackIndex: 0,
        startTime: editor.state.playheadPosition,
        duration: clipDuration,
        trimStart: 0,
        trimEnd: 0,
      });
      toast.success(`Added ${file.name} to Track 1`);
    }
  }, [processSingleFile, editor]);

  // Handle quick add to timeline from media panel
  const handleAddToTimeline = useCallback((asset: MediaAsset) => {
    const clipDuration = asset.duration || (asset.type === 'image' ? 3 : 5);

    // Add to track 0 at the end of existing content
    const lastClipEnd = editor.state.clips.length > 0
      ? Math.max(...editor.state.clips.map(c => c.startTime + c.duration))
      : 0;

    editor.addClip({
      assetId: asset.id,
      trackIndex: 0,
      startTime: lastClipEnd,
      duration: clipDuration,
      trimStart: 0,
      trimEnd: 0,
    });

    toast.success(`Added ${asset.name} to timeline`);
  }, [editor]);

  // Load project data if projectId exists
  useEffect(() => {
    console.log('[VideoForge] useEffect triggered, projectId:', projectId);

    if (!projectId) {
      console.log('[VideoForge] No projectId, setting loading to false');
      setIsLoadingProject(false);
      hasLoadedRef.current = false;
      return;
    }

    const loadProjectData = async () => {
      try {
        console.log('[VideoForge] ========== LOADING PROJECT START ==========');
        console.log('[VideoForge] Project ID:', projectId);
        setIsLoadingProject(true);
        hasLoadedRef.current = false;

        const project = await getProject(projectId);
        console.log('[VideoForge] Project fetched from Supabase:', {
          id: project.id,
          name: project.name,
          hasData: !!project.data,
        });

        if (project.data) {
          const projectData = project.data as VideoForgeProjectData;

          console.log('[VideoForge] Project data structure:', {
            version: projectData.version,
            mediaMetadataCount: projectData.mediaMetadata?.length || 0,
            clipsCount: projectData.editorState?.clips?.length || 0,
          });

          // Log all media metadata
          console.log('[VideoForge] Media metadata:', projectData.mediaMetadata);

          // Log all clips with their assetId references
          console.log('[VideoForge] Clips:', projectData.editorState?.clips?.map(c => ({
            id: c.id,
            assetId: c.assetId,
            trackIndex: c.trackIndex,
            startTime: c.startTime,
          })));

          // Load media files from storage
          const storagePathMap = new Map<string, string>();
          const loadedAssets: MediaAsset[] = [];

          console.log('[VideoForge] Starting media downloads...');

          for (const metadata of projectData.mediaMetadata || []) {
            console.log(`[VideoForge] Processing asset: ${metadata.name}`);
            console.log(`[VideoForge]   - ID: ${metadata.id}`);
            console.log(`[VideoForge]   - Type: ${metadata.type}`);
            console.log(`[VideoForge]   - Storage Path: ${metadata.storagePath || 'MISSING!'}`);

            if (!metadata.storagePath) {
              console.error('[VideoForge] ❌ No storage path for asset:', metadata.name);
              continue;
            }

            try {
              console.log(`[VideoForge] Downloading: ${metadata.storagePath}`);
              const blob = await downloadFile(metadata.storagePath);
              console.log(`[VideoForge] ✅ Downloaded blob, size: ${blob.size} bytes`);

              const blobUrl = URL.createObjectURL(blob);
              console.log(`[VideoForge] Created blob URL: ${blobUrl.substring(0, 50)}...`);

              // Recreate file object with proper MIME type
              const fileType = metadata.type === 'video' ? 'video/mp4' :
                             metadata.type === 'audio' ? 'audio/mpeg' : 'image/png';
              const file = new File([blob], metadata.name, { type: fileType });

              const restoredAsset: MediaAsset = {
                id: metadata.id,
                name: metadata.name,
                type: metadata.type,
                src: blobUrl,
                file: file,
                duration: metadata.duration,
                thumbnail: metadata.thumbnail,
              };

              loadedAssets.push(restoredAsset);
              storagePathMap.set(metadata.id, metadata.storagePath);

              console.log(`[VideoForge] ✅ Asset restored: ${metadata.name} (ID: ${metadata.id})`);
            } catch (error) {
              console.error(`[VideoForge] ❌ Failed to download: ${metadata.name}`, error);
              toast.error(`Failed to load ${metadata.name}`);
            }
          }

          console.log('[VideoForge] Media download complete:');
          console.log(`[VideoForge]   - Loaded assets: ${loadedAssets.length}`);
          console.log(`[VideoForge]   - Storage path map size: ${storagePathMap.size}`);
          console.log(`[VideoForge]   - Asset IDs: ${loadedAssets.map(a => a.id).join(', ')}`);

          // Set uploaded files mapping BEFORE loading state
          setUploadedMediaFiles(storagePathMap);

          // Verify clips have matching assets
          const clips = projectData.editorState?.clips || [];
          const assetIds = new Set(loadedAssets.map(a => a.id));

          for (const clip of clips) {
            const hasMatchingAsset = assetIds.has(clip.assetId);
            console.log(`[VideoForge] Clip ${clip.id}: assetId=${clip.assetId}, hasMatchingAsset=${hasMatchingAsset}`);
            if (!hasMatchingAsset) {
              console.error(`[VideoForge] ❌ ORPHAN CLIP! No asset found for clip ${clip.id}`);
            }
          }

          // Restore editor state with loaded assets and clips
          if (projectData.editorState) {
            const newState = {
              assets: loadedAssets,
              clips: clips,
              playheadPosition: projectData.editorState.playheadPosition || 0,
              isPlaying: false,
              selectedClipIds: [],
              zoomLevel: projectData.editorState.zoomLevel || 50,
              aspectRatio: (projectData.editorState.aspectRatio as any) || '16:9',
              volume: projectData.editorState.volume || 1,
              duration: projectData.editorState.duration || 0,
              trackSettings: projectData.editorState.trackSettings || {},
            };

            console.log('[VideoForge] Loading state into editor:', {
              assetsCount: newState.assets.length,
              clipsCount: newState.clips.length,
              zoomLevel: newState.zoomLevel,
              aspectRatio: newState.aspectRatio,
            });

            editor.loadState(newState);
            console.log('[VideoForge] ✅ Editor state loaded');
          }
        } else {
          console.log('[VideoForge] New project - no saved data');
        }

        console.log('[VideoForge] ========== LOADING PROJECT COMPLETE ==========');
      } catch (error) {
        console.error('[VideoForge] ========== LOADING PROJECT FAILED ==========');
        console.error('[VideoForge] Error:', error);
        toast.error('Failed to load project');
      } finally {
        setIsLoadingProject(false);

        // Mark as loaded AFTER loading is complete
        setTimeout(() => {
          hasLoadedRef.current = true;
          prevClipCountRef.current = editor.state?.clips?.length || 0;
          prevAssetCountRef.current = editor.state?.assets?.length || 0;
          console.log('[VideoForge] ✅ Initial load complete, now tracking changes');
          console.log('[VideoForge] Initial clip count:', prevClipCountRef.current);
          console.log('[VideoForge] Initial asset count:', prevAssetCountRef.current);
        }, 500);
      }
    };

    loadProjectData();
  }, [projectId]); // Only depend on projectId to prevent re-loading

  // Wrap markAsChanged functions in useRef to prevent re-render loops
  const markAsChangedRef = useRef(markAsChanged);
  const markAsChangedQuickRef = useRef(markAsChangedQuick);
  useEffect(() => {
    markAsChangedRef.current = markAsChanged;
    markAsChangedQuickRef.current = markAsChangedQuick;
  }, [markAsChanged, markAsChangedQuick]);

  // Detect when clips are added (but not during initial load)
  // Uses QUICK SAVE (5 seconds) for major changes
  useEffect(() => {
    // Don't track during loading or before initial load complete
    if (!projectId || isLoadingProject || !hasLoadedRef.current) return;

    const currentClipCount = editor.state?.clips?.length || 0;

    // Only mark changed if clip count actually increased (new clip added)
    if (currentClipCount > prevClipCountRef.current) {
      console.log('[VideoForge] 🎬 Clip added to timeline, triggering QUICK SAVE (5s)');
      if (markAsChangedQuickRef.current) {
        markAsChangedQuickRef.current();
      }
    }

    prevClipCountRef.current = currentClipCount;
  }, [editor.state?.clips?.length, projectId, isLoadingProject]);

  // Detect when assets are added (but not during initial load)
  useEffect(() => {
    if (!projectId || isLoadingProject || !hasLoadedRef.current) return;

    const currentAssetCount = editor.state?.assets?.length || 0;

    if (currentAssetCount > prevAssetCountRef.current) {
      console.log('[VideoForge] 📁 Asset added, marking as changed');
      if (markAsChangedRef.current) {
        markAsChangedRef.current();
      }
    }

    prevAssetCountRef.current = currentAssetCount;
  }, [editor.state?.assets?.length, projectId, isLoadingProject]);

  // Monitor auto-save state every 30 seconds
  useEffect(() => {
    if (!projectId) return;

    console.log('[VideoForge] Auto-save monitoring started');

    const interval = setInterval(() => {
      console.log('[VideoForge] ===== AUTO-SAVE STATUS CHECK =====');
      console.log('[VideoForge] Has unsaved changes:', hasUnsavedChanges);
      console.log('[VideoForge] Is saving:', isSaving);
      console.log('[VideoForge] Last saved:', lastSaved?.toLocaleTimeString() || 'never');
      console.log('[VideoForge] Editor assets count:', editor.state?.assets?.length || 0);
      console.log('[VideoForge] Editor clips count:', editor.state?.clips?.length || 0);
      console.log('[VideoForge] Uploaded files map size:', uploadedMediaFiles.size);
    }, 30000);

    return () => clearInterval(interval);
  }, [projectId, hasUnsavedChanges, isSaving, lastSaved, editor.state?.assets?.length, editor.state?.clips?.length, uploadedMediaFiles.size]);

  // Handle media panel resize
  useEffect(() => {
    if (!isResizingMediaPanel) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(250, Math.min(e.clientX, 600)); // Min 250px, max 600px
      setMediaPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizingMediaPanel(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizingMediaPanel]);

  const handleSeekLeft = useCallback(() => {
    const frameTime = 1 / 30; // 30fps
    editor.setPlayheadPosition(Math.max(0, editor.state.playheadPosition - frameTime));
  }, [editor]);

  const handleSeekRight = useCallback(() => {
    const frameTime = 1 / 30; // 30fps
    editor.setPlayheadPosition(Math.min(editor.state.duration, editor.state.playheadPosition + frameTime));
  }, [editor]);

  // Timeline resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingTimeline(true);
  }, []);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!isResizingTimeline) return;

    // Calculate new height based on mouse position from bottom of window
    const newHeight = window.innerHeight - e.clientY;
    // Constrain between 200px and 600px
    const constrainedHeight = Math.max(200, Math.min(600, newHeight));
    setTimelineHeight(constrainedHeight);
  }, [isResizingTimeline]);

  const handleResizeEnd = useCallback(() => {
    setIsResizingTimeline(false);
  }, []);

  useEffect(() => {
    if (isResizingTimeline) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizingTimeline, handleResizeMove, handleResizeEnd]);

  // Global drag and drop handlers
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer && e.dataTransfer.types.includes('Files')) {
        setIsDraggingExternal(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      // Only hide overlay if leaving the window
      if (e.clientX === 0 && e.clientY === 0) {
        setIsDraggingExternal(false);
      }
    };

    const handleDrop = async (e: DragEvent) => {
      // Only process if drop event wasn't already handled by a child component
      // Child components should call e.stopPropagation() to prevent this global handler
      setIsDraggingExternal(false);

      // Check if the drop target is a specific drop zone (has data-drop-zone attribute)
      const target = e.target as HTMLElement;
      const hasDropZone = target.closest('[data-drop-zone]');

      // Only process as fallback if no specific drop zone handled it
      if (!hasDropZone && e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        await processFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [processFiles]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onPlayPause: editor.togglePlayPause,
    onSplit: editor.splitClipAtPlayhead,
    onDelete: editor.deleteSelected,
    onCopy: editor.copySelected,
    onPaste: editor.paste,
    onUndo: editor.undo,
    onRedo: editor.redo,
    onSeekLeft: handleSeekLeft,
    onSeekRight: handleSeekRight,
    onSeekToStart: editor.seekToStart,
    onSeekToEnd: editor.seekToEnd,
  });

  // Show loading state while fetching project data
  if (isLoadingProject) {
    console.log('[VideoForge] Rendering loading state');
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  console.log('[VideoForge] Rendering main editor UI');
  return (
    <div className="h-screen bg-background videoforge-theme flex flex-col overflow-hidden">
      <style>{`
        /* Purple theme for VideoForge */
        .videoforge-theme .glow-button {
          box-shadow: 0 0 30px rgba(168, 85, 247, 0.4);
        }
        .videoforge-theme .glow-button:hover {
          box-shadow: 0 0 50px rgba(168, 85, 247, 0.6);
        }

        /* Primary filled buttons (Upload, Play) */
        .videoforge-theme button[class*="bg-primary"]:not([class*="bg-primary/"]) {
          background: #a855f7 !important;
          color: white !important;
        }
        .videoforge-theme button[class*="bg-primary"]:not([class*="bg-primary/"]):hover {
          background: #9333ea !important;
          color: white !important;
        }

        /* Primary text and borders */
        .videoforge-theme [class*="text-primary"]:not(button) {
          color: #a855f7 !important;
        }
        .videoforge-theme [class*="border-primary"] {
          border-color: #a855f7 !important;
        }
        .videoforge-theme [class*="ring-primary"] {
          --tw-ring-color: #a855f7 !important;
        }

        /* Semi-transparent purple backgrounds */
        .videoforge-theme [class*="bg-primary/"]:not(button) {
          background-color: rgba(168, 85, 247, 0.1) !important;
        }

        /* Toolbar buttons - keep subtle */
        .videoforge-theme .toolbar-btn {
          background: transparent !important;
          color: inherit !important;
        }
        .videoforge-theme .toolbar-btn:hover {
          background: rgba(168, 85, 247, 0.1) !important;
        }

        /* Snap toggle when active */
        .videoforge-theme button[data-active="true"] {
          background: rgba(168, 85, 247, 0.2) !important;
          border-color: #a855f7 !important;
          color: #a855f7 !important;
        }
      `}</style>

      {/* Header space - matches fixed header h-16 (64px) */}
      <div className="h-16 flex-shrink-0" />

      {/* Main content area - Grows to fill space */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tool Panel - Left Sidebar */}
        {!isMediaPanelCollapsed && (
          <>
            <aside
              className="bg-card/30 flex flex-col overflow-hidden flex-shrink-0 relative"
              style={{ width: `${mediaPanelWidth}px` }}
            >
              <ToolPanel
                assets={editor.state.assets}
                onAddAsset={editor.addAsset}
                onRemoveAsset={editor.removeAsset}
                onDragStart={(asset) => setDraggedAsset(asset)}
                onAddToTimeline={handleAddToTimeline}
                onFileUpload={handleFileUpload}
                aspectRatio={editor.state.aspectRatio}
                onAspectRatioChange={editor.setAspectRatio}
                volume={editor.state.volume}
                onVolumeChange={editor.setVolume}
                zoomLevel={editor.state.zoomLevel}
                onZoomChange={editor.setZoomLevel}
                onClose={() => setIsMediaPanelCollapsed(true)}
              />

              {/* Resize handle */}
              <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors group"
                onMouseDown={() => setIsResizingMediaPanel(true)}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-zinc-700 group-hover:bg-primary transition-colors" />
              </div>
            </aside>

            {/* Vertical Divider */}
            <div className="w-1 bg-zinc-700 flex-shrink-0" />
          </>
        )}

        {/* Toggle button for media panel - Only show when collapsed */}
        {isMediaPanelCollapsed && (
          <button
            onClick={() => setIsMediaPanelCollapsed(false)}
            className="absolute left-0 top-24 z-40 p-2 bg-card border border-border rounded-r-lg shadow-lg hover:bg-accent transition-all"
            title="Show Tool Panel"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Main content - Preview and Timeline */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Preview area - Grows to fill available space */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <PreviewCanvas
              clips={editor.state.clips}
              assets={editor.state.assets}
              playheadPosition={editor.state.playheadPosition}
              isPlaying={editor.state.isPlaying}
              aspectRatio={editor.state.aspectRatio}
              volume={editor.state.volume}
              trackSettings={editor.state.trackSettings}
              onDropFile={handleDropOnPreview}
            />
          </div>

          {/* Horizontal Divider above Timeline - Also acts as resize handle */}
          <div
            onMouseDown={handleResizeStart}
            className={cn(
              "h-1 bg-zinc-700 w-full flex-shrink-0 cursor-ns-resize hover:bg-zinc-600 transition-colors relative group",
              isResizingTimeline && "bg-zinc-600"
            )}
          >
            {/* Visual indicator on hover */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-0.5 rounded-full bg-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Timeline - Fixed height, resizable */}
          <div
            className="flex-shrink-0 overflow-hidden relative"
            style={{ height: `${timelineHeight}px` }}
          >
            <Timeline
              clips={editor.state.clips}
              assets={editor.state.assets}
              selectedClipIds={editor.state.selectedClipIds}
              playheadPosition={editor.state.playheadPosition}
              duration={editor.state.duration}
              zoomLevel={editor.state.zoomLevel}
              aspectRatio={editor.state.aspectRatio}
              onSelectClip={editor.selectClip}
              onUpdateClip={editor.updateClip}
              onUpdateMultipleClips={editor.updateMultipleClips}
              onSetPlayhead={editor.setPlayheadPosition}
              onZoomChange={editor.setZoomLevel}
              onDropAsset={handleDropAsset}
              onDropExternalFile={handleDropExternalFile}
              onDeselectAll={editor.deselectAll}
              canUndo={editor.canUndo}
              canRedo={editor.canRedo}
              snapEnabled={snapEnabled}
              onUndo={editor.undo}
              onRedo={editor.redo}
              onCopy={editor.copySelected}
              onPaste={editor.paste}
              onDelete={editor.deleteSelected}
              onSplit={editor.splitClipAtPlayhead}
              onToggleSnap={() => setSnapEnabled(!snapEnabled)}
              isPlaying={editor.state.isPlaying}
              volume={editor.state.volume}
              onPlayPause={editor.togglePlayPause}
              onSeekToStart={editor.seekToStart}
              onSeekToEnd={editor.seekToEnd}
              onVolumeChange={editor.setVolume}
              onSplitAudio={editor.splitAudioFromVideo}
              onDuplicateClip={editor.duplicateClip}
              onDeleteClip={editor.removeClip}
              onSplitClipAtPlayhead={editor.splitClipAtPlayhead}
              trackSettings={editor.state.trackSettings}
              onTrackVolumeChange={editor.setTrackVolume}
              onTrackSpeedChange={editor.setTrackSpeed}
              onTrackVisibleChange={editor.setTrackVisible}
              onTrackMutedChange={editor.setTrackMuted}
              projectId={projectId}
              isSaving={isSaving}
              hasUnsavedChanges={hasUnsavedChanges}
              lastSaved={lastSaved}
              onSaveNow={saveNow}
            />
          </div>
        </main>
      </div>

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(168, 85, 247, 0.05)' }} />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'rgba(236, 72, 153, 0.05)' }} />
      </div>

      {/* Global Drag Overlay */}
      {isDraggingExternal && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/20 border-4 border-dashed border-primary flex items-center justify-center">
              <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-foreground">Drop files to add to library</p>
            <p className="text-sm text-muted-foreground mt-2">Video, audio, or image files</p>
          </div>
        </div>
      )}
    </div>
  );
}
