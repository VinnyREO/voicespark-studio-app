import { VideoTemplate, CaptionStyle, FacelessNiche } from '@/types/video';

export const CAPTION_PRESETS: Record<string, CaptionStyle> = {
  hormozi: {
    preset: 'hormozi',
    fontFamily: 'Inter',
    fontSize: 48,
    fontWeight: 'black',
    color: '#FFFFFF',
    backgroundColor: '#000000',
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
    animation: 'bounce',
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
    animation: 'shake',
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

export const NICHE_TEMPLATES: VideoTemplate[] = [
  {
    id: 'scary-stories',
    name: 'Scary Stories',
    niche: 'scary-stories',
    captionStyle: CAPTION_PRESETS.horror,
    visualDefaults: {
      source: 'stock',
      keywords: ['dark forest', 'abandoned', 'night', 'fog', 'creepy', 'horror']
    },
    intro: { duration: 3, style: 'text' },
    outro: { duration: 5, style: 'subscribe' }
  },
  {
    id: 'reddit-stories',
    name: 'Reddit Stories',
    niche: 'reddit-stories',
    captionStyle: CAPTION_PRESETS.hormozi,
    visualDefaults: {
      source: 'gameplay',
      keywords: ['minecraft parkour', 'subway surfers', 'gta driving']
    },
    intro: { duration: 2, style: 'none' },
    outro: { duration: 5, style: 'subscribe' }
  },
  {
    id: 'true-crime',
    name: 'True Crime',
    niche: 'true-crime',
    captionStyle: CAPTION_PRESETS.documentary,
    visualDefaults: {
      source: 'stock',
      keywords: ['investigation', 'police', 'courtroom', 'evidence', 'news footage']
    },
    intro: { duration: 4, style: 'animation' },
    outro: { duration: 5, style: 'end-screen' }
  },
  {
    id: 'facts-top10',
    name: 'Facts & Top 10',
    niche: 'facts-top10',
    captionStyle: CAPTION_PRESETS.mrbeast,
    visualDefaults: {
      source: 'stock',
      keywords: ['educational', 'science', 'nature', 'technology', 'amazing']
    },
    intro: { duration: 3, style: 'animation' },
    outro: { duration: 5, style: 'subscribe' }
  },
  {
    id: 'motivation',
    name: 'Motivation',
    niche: 'motivation',
    captionStyle: CAPTION_PRESETS.hormozi,
    visualDefaults: {
      source: 'stock',
      keywords: ['success', 'workout', 'business', 'luxury', 'determination']
    },
    intro: { duration: 2, style: 'none' },
    outro: { duration: 4, style: 'subscribe' }
  },
  {
    id: 'history',
    name: 'History',
    niche: 'history',
    captionStyle: CAPTION_PRESETS.documentary,
    visualDefaults: {
      source: 'stock',
      keywords: ['historical', 'ancient', 'war', 'civilization', 'documentary']
    },
    intro: { duration: 4, style: 'animation' },
    outro: { duration: 5, style: 'end-screen' }
  }
];

export const GAMEPLAY_OPTIONS = [
  { id: 'minecraft-parkour', name: 'Minecraft Parkour', keywords: ['minecraft', 'parkour', 'gaming'] },
  { id: 'subway-surfers', name: 'Subway Surfers', keywords: ['subway surfers', 'mobile game', 'running'] },
  { id: 'gta-driving', name: 'GTA Driving', keywords: ['gta', 'driving', 'car'] },
  { id: 'satisfying', name: 'Satisfying Clips', keywords: ['satisfying', 'asmr', 'oddly satisfying'] },
  { id: 'nature', name: 'Nature B-roll', keywords: ['nature', 'landscape', 'aerial'] }
];

export function getTemplateByNiche(niche: FacelessNiche): VideoTemplate | undefined {
  return NICHE_TEMPLATES.find(t => t.niche === niche);
}
