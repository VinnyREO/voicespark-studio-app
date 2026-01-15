export interface EditorState {
  projectName: string;
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  zoom: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  selectedClipId: string | null;
  selectedTrackId: string | null;
}

export interface MediaItem {
  id: string;
  type: 'audio' | 'video' | 'image';
  name: string;
  url: string;
  blob?: Blob;
  duration?: number;
  thumbnail?: string;
  source: 'upload' | 'stock' | 'gameplay' | 'voiceover';
}

export interface TimelineTrack {
  id: string;
  type: 'audio' | 'video' | 'captions';
  name: string;
  clips: TimelineClip[];
  locked: boolean;
  visible: boolean;
}

export interface TimelineClip {
  id: string;
  mediaId?: string;
  trackId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  name: string;
  type: 'audio' | 'video' | 'image' | 'caption';
  url?: string;
  thumbnail?: string;
  text?: string;
}

export interface CaptionClip extends TimelineClip {
  type: 'caption';
  text: string;
  style: CaptionStyle;
}

export interface CaptionStyle {
  preset: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fade' | 'pop' | 'typewriter' | 'karaoke';
  outline: boolean;
  outlineColor?: string;
}

export const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  preset: 'hormozi',
  fontFamily: 'Inter',
  fontSize: 48,
  fontWeight: 'black',
  color: '#FFFFFF',
  backgroundColor: undefined,
  position: 'center',
  animation: 'pop',
  outline: true,
  outlineColor: '#000000'
};

export const CAPTION_STYLE_PRESETS: Record<string, CaptionStyle> = {
  hormozi: {
    preset: 'hormozi',
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 'black',
    color: '#FFFFFF',
    position: 'center',
    animation: 'pop',
    outline: true,
    outlineColor: '#000000'
  },
  mrbeast: {
    preset: 'mrbeast',
    fontFamily: 'Bangers',
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFF00',
    position: 'center',
    animation: 'karaoke',
    outline: true,
    outlineColor: '#FF0000'
  },
  documentary: {
    preset: 'documentary',
    fontFamily: 'Georgia',
    fontSize: 36,
    fontWeight: 'normal',
    color: '#FFFFFF',
    position: 'bottom',
    animation: 'fade',
    outline: true,
    outlineColor: '#000000'
  },
  horror: {
    preset: 'horror',
    fontFamily: 'Creepster',
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.7)',
    position: 'center',
    animation: 'typewriter',
    outline: false
  },
  minimal: {
    preset: 'minimal',
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: 'normal',
    color: '#FFFFFF',
    position: 'bottom',
    animation: 'fade',
    outline: true,
    outlineColor: '#000000'
  }
};
