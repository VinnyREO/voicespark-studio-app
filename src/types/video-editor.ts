export type MediaType = 'video' | 'audio' | 'image';
export type AspectRatio = '16:9' | '9:16' | '1:1';
export type TransitionType = 'none' | 'fade' | 'dissolve' | 'wipe-left' | 'wipe-right' | 'zoom-in' | 'zoom-out';

export interface MediaAsset {
  id: string;
  type: MediaType;
  name: string;
  src: string; // blob URL or data URL
  duration?: number; // for video/audio in seconds
  thumbnail?: string; // data URL for thumbnail
  file?: File; // original file
}

export interface TimelineClip {
  id: string;
  assetId: string;
  trackIndex: number;
  startTime: number; // position on timeline in seconds
  duration: number; // visible duration in seconds
  trimStart: number; // trim from beginning in seconds
  trimEnd: number; // trim from end in seconds
  volume?: number; // clip-specific volume (0-1), defaults to 1
  speed?: number; // playback speed multiplier (0.25-4), defaults to 1
  transitionIn?: TransitionType; // transition effect at start of clip
  transitionDuration?: number; // transition duration in seconds (default 0.5)
}

export interface EditorState {
  assets: MediaAsset[];
  clips: TimelineClip[];
  playheadPosition: number; // in seconds
  isPlaying: boolean;
  selectedClipIds: string[];
  zoomLevel: number; // pixels per second
  aspectRatio: AspectRatio;
  volume: number; // 0-1
  duration: number; // total timeline duration in seconds
  trackSettings: Record<number, { volume: number; speed: number; visible: boolean; muted: boolean }>; // track-level settings
}

export interface EditorAction {
  type: 'ADD_ASSET' | 'REMOVE_ASSET' |
        'ADD_CLIP' | 'REMOVE_CLIP' | 'UPDATE_CLIP' |
        'SET_PLAYHEAD' | 'SET_PLAYING' |
        'SELECT_CLIP' | 'DESELECT_ALL' |
        'SET_ZOOM' | 'SET_ASPECT_RATIO' | 'SET_VOLUME' |
        'UNDO' | 'REDO';
  payload?: MediaAsset | TimelineClip | Partial<TimelineClip> | number | string | boolean | AspectRatio;
}

export interface TimelineInteraction {
  isDragging: boolean;
  isResizing: boolean;
  dragStartX: number;
  dragStartTime: number;
  resizeEdge?: 'left' | 'right';
}

export interface ClipboardData {
  clips: TimelineClip[];
}
