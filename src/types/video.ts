export interface VideoProject {
  id: string;
  name: string;
  createdAt: Date;
  
  // Audio
  voiceoverUrl?: string;
  voiceoverBlob?: Blob;
  voiceoverDuration?: number;
  
  // Script & Captions
  script: string;
  captions: Caption[];
  captionStyle: CaptionStyle;
  
  // Visuals
  visualSource: VisualSource;
  clips: VideoClip[];
  
  // Template
  template?: VideoTemplate;
  
  // Output
  aspectRatio: '16:9' | '9:16' | '1:1';
  duration?: number;
}

export interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style?: Partial<CaptionStyle>;
}

export interface CaptionStyle {
  preset: CaptionPreset;
  fontFamily: string;
  fontSize: number;
  fontWeight: 'normal' | 'bold' | 'black';
  color: string;
  backgroundColor?: string;
  position: 'top' | 'center' | 'bottom';
  animation: 'none' | 'fade' | 'pop' | 'typewriter' | 'bounce' | 'shake';
  outline: boolean;
  outlineColor?: string;
}

export type CaptionPreset = 
  | 'hormozi'
  | 'mrbeast'
  | 'documentary'
  | 'horror'
  | 'minimal'
  | 'custom';

export type VisualSource = 
  | 'stock'
  | 'gameplay'
  | 'ai-images'
  | 'upload'
  | 'screen-record';

export interface VideoClip {
  id: string;
  type: 'stock' | 'gameplay' | 'ai' | 'upload';
  url: string;
  thumbnailUrl?: string;
  startTime: number;
  endTime: number;
  clipStart?: number;
  clipEnd?: number;
  keywords?: string[];
}

export interface VideoTemplate {
  id: string;
  name: string;
  niche: FacelessNiche;
  captionStyle: CaptionStyle;
  visualDefaults: {
    source: VisualSource;
    keywords: string[];
  };
  intro?: {
    duration: number;
    style: 'text' | 'animation' | 'none';
  };
  outro?: {
    duration: number;
    style: 'subscribe' | 'end-screen' | 'none';
  };
}

export type FacelessNiche = 
  | 'scary-stories'
  | 'reddit-stories'
  | 'true-crime'
  | 'facts-top10'
  | 'motivation'
  | 'history'
  | 'conspiracy'
  | 'ai-news'
  | 'celebrity-gossip'
  | 'custom';
