// Individual style traits that can be mixed
export interface StyleTrait {
  id: string;
  name: string;
  emoji: string;
  shortDesc: string;
  instruction: string;
}

export const STYLE_TRAITS: StyleTrait[] = [
  {
    id: 'warm',
    name: 'Warm',
    emoji: '❤️',
    shortDesc: 'Empathetic & caring',
    instruction: 'Speak with genuine warmth and emotional connection. Sound like you truly care about the listener.'
  },
  {
    id: 'energetic',
    name: 'Energetic',
    emoji: '⚡',
    shortDesc: 'High energy',
    instruction: 'Bring high energy and enthusiasm. Sound excited and engaging.'
  },
  {
    id: 'calm',
    name: 'Calm',
    emoji: '🧘',
    shortDesc: 'Peaceful & soothing',
    instruction: 'Speak slowly and peacefully with a soothing, relaxed delivery.'
  },
  {
    id: 'authoritative',
    name: 'Authoritative',
    emoji: '🎯',
    shortDesc: 'Confident & expert',
    instruction: 'Sound confident and knowledgeable. Speak with authority and expertise.'
  },
  {
    id: 'conversational',
    name: 'Conversational',
    emoji: '💬',
    shortDesc: 'Natural & chatty',
    instruction: 'Be conversational and natural, like talking to a friend. Relaxed and genuine.'
  },
  {
    id: 'dramatic',
    name: 'Dramatic',
    emoji: '🎭',
    shortDesc: 'Cinematic tension',
    instruction: 'Add dramatic pauses and tension. Build suspense and emotional impact like a movie narrator.'
  },
  {
    id: 'inspiring',
    name: 'Inspiring',
    emoji: '✨',
    shortDesc: 'Motivational',
    instruction: 'Sound inspiring and uplifting. Motivate and encourage the listener.'
  },
  {
    id: 'playful',
    name: 'Playful',
    emoji: '😄',
    shortDesc: 'Fun & lighthearted',
    instruction: 'Be playful and fun. Add a lighthearted, slightly humorous tone.'
  },
  {
    id: 'serious',
    name: 'Serious',
    emoji: '📋',
    shortDesc: 'Professional gravity',
    instruction: 'Maintain a serious, professional tone. Give weight to important information.'
  },
  {
    id: 'intimate',
    name: 'Intimate',
    emoji: '🤫',
    shortDesc: 'Close & personal',
    instruction: 'Speak intimately, as if sharing a secret. Softer, more personal delivery.'
  }
];

// Quick preset recipes
export interface QuickPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  traits: string[]; // IDs of traits to combine
  bestFor: string;
  recommendedVoice: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'youtube-storyteller',
    name: 'YouTube Storyteller',
    emoji: '📖🎬',
    description: 'Warm, engaging narrator perfect for story-driven content',
    traits: ['warm', 'conversational', 'dramatic'],
    bestFor: 'Story videos, personal experiences, case studies',
    recommendedVoice: 'Rex'
  },
  {
    id: 'hype-intro',
    name: 'Hype Intro',
    emoji: '⚡🔥',
    description: 'High energy opener that grabs attention',
    traits: ['energetic', 'inspiring', 'playful'],
    bestFor: 'Video intros, announcements, trailers',
    recommendedVoice: 'Eve'
  },
  {
    id: 'trusted-expert',
    name: 'Trusted Expert',
    emoji: '🎯📚',
    description: 'Authoritative but approachable educator',
    traits: ['authoritative', 'warm', 'conversational'],
    bestFor: 'Tutorials, how-tos, educational content',
    recommendedVoice: 'Leo'
  },
  {
    id: 'documentary-narrator',
    name: 'Documentary',
    emoji: '🎥🌍',
    description: 'Cinematic gravitas like nature documentaries',
    traits: ['authoritative', 'dramatic', 'calm'],
    bestFor: 'Explainers, documentaries, brand films',
    recommendedVoice: 'Leo'
  },
  {
    id: 'friendly-guide',
    name: 'Friendly Guide',
    emoji: '👋😊',
    description: 'Like your helpful friend explaining something',
    traits: ['conversational', 'warm', 'playful'],
    bestFor: 'Vlogs, casual tutorials, reviews',
    recommendedVoice: 'Ara'
  },
  {
    id: 'motivational-coach',
    name: 'Motivational',
    emoji: '💪✨',
    description: 'Inspiring and uplifting energy',
    traits: ['inspiring', 'energetic', 'warm'],
    bestFor: 'Self-improvement, fitness, coaching',
    recommendedVoice: 'Rex'
  },
  {
    id: 'mystery-narrator',
    name: 'Mystery/True Crime',
    emoji: '🔍🌙',
    description: 'Suspenseful storytelling with tension',
    traits: ['dramatic', 'intimate', 'serious'],
    bestFor: 'True crime, mysteries, suspense',
    recommendedVoice: 'Sal'
  },
  {
    id: 'wellness-guide',
    name: 'Wellness Guide',
    emoji: '🧘🌿',
    description: 'Peaceful, nurturing presence',
    traits: ['calm', 'warm', 'intimate'],
    bestFor: 'Meditation, wellness, relaxation',
    recommendedVoice: 'Ara'
  },
  {
    id: 'tech-reviewer',
    name: 'Tech Reviewer',
    emoji: '💻🎮',
    description: 'Knowledgeable but accessible tech voice',
    traits: ['authoritative', 'conversational', 'energetic'],
    bestFor: 'Tech reviews, product videos, gaming',
    recommendedVoice: 'Rex'
  }
];

// Function to build instructions from selected traits
export function buildStyleInstructions(traitIds: string[]): string {
  const selectedTraits = STYLE_TRAITS.filter(t => traitIds.includes(t.id));
  
  if (selectedTraits.length === 0) {
    return 'Read the script naturally with clear pronunciation.';
  }

  const traitInstructions = selectedTraits.map(t => t.instruction).join('\n');
  
  return `You are a voice artist combining these qualities:
${traitInstructions}

Blend these characteristics naturally - don't overdo any single aspect.
Let the combination create a unique, authentic voice.`;
}
