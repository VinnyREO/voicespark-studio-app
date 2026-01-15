export type VoiceId = 'Ara' | 'Rex' | 'Sal' | 'Eve' | 'Leo';

export interface Voice {
  id: VoiceId;
  name: string;
  description: string;
  type: 'Male' | 'Female' | 'Neutral';
  tone: string;
  popular?: boolean;
}

export type AudioFormat = 'mp3' | 'wav' | 'opus';

export interface GenerationSettings {
  speed: number;
  format: AudioFormat;
}

export interface StyleTag {
  name: string;
  openTag: string;
  closeTag?: string;
  description: string;
  color: string;
  example: string;
}

export interface GenerationState {
  isGenerating: boolean;
  progress: string;
  error: string | null;
}

export interface AudioState {
  url: string | null;
  blob: Blob | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface VoiceGenerationConfig {
  apiKey: string;
  voice: VoiceId;
  script: string;
  sampleRate?: number;
}

export interface GenerationResult {
  audioBlob: Blob;
  transcript: string;
}
