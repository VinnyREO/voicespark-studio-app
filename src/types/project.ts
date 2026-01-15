import { TimelineClip, AspectRatio, MediaType } from './video-editor';

// VideoForge Project Structure
export interface VideoForgeProject {
  version: 1;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  driveProjectId: string; // Google Drive folder ID for this project
  editorState: {
    playheadPosition: number;
    isPlaying: boolean;
    selectedClipIds: string[];
    zoomLevel: number;
    aspectRatio: AspectRatio;
    volume: number;
    duration: number;
    trackSettings: Record<number, {
      volume: number;
      speed: number;
      visible: boolean;
      muted: boolean;
    }>;
  };
  clips: TimelineClip[];
  assetMetadata: AssetMetadata[];
}

// Asset metadata stored in project file
// Does NOT include blob URLs or File objects (non-serializable)
export interface AssetMetadata {
  id: string;
  type: MediaType;
  name: string;
  duration?: number; // in seconds
  thumbnail: string; // data URL (PNG)
  driveFileId: string; // Google Drive file ID for the media file
}

// Project list item (for loading dialog)
export interface ProjectListItem {
  id: string; // Drive folder ID
  name: string;
  updatedAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  thumbnailUrl?: string; // Optional preview image
}

// Project save options
export interface SaveProjectOptions {
  name?: string; // If provided, creates new project; otherwise updates existing
  includeMediaFiles?: boolean; // Default: true
  overwrite?: boolean; // Default: false
}

// Project load result
export interface LoadProjectResult {
  project: VideoForgeProject;
  mediaFiles: Map<string, Blob>; // assetId -> Blob
}

// Supabase-specific project data structure
export interface VideoForgeProjectData {
  version: 1;
  editorState: {
    clips: TimelineClip[];
    playheadPosition: number;
    isPlaying: boolean;
    selectedClipIds: string[];
    zoomLevel: number;
    aspectRatio: string;
    volume: number;
    duration: number;
    trackSettings: Record<number, {
      volume: number;
      speed: number;
      visible: boolean;
      muted: boolean;
    }>;
  };
  mediaMetadata: Array<{
    id: string;
    name: string;
    type: MediaType;
    duration?: number;
    thumbnail: string;
    storagePath: string; // Path in Supabase Storage
  }>;
}
