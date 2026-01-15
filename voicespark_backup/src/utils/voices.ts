import { Voice } from '@/types';

export const VOICES: Voice[] = [
  {
    id: 'Rex',
    name: 'Rex',
    type: 'Male',
    tone: 'Confident, clear',
    description: 'Professional and articulate, ideal for business applications',
    popular: true,
  },
  {
    id: 'Ara',
    name: 'Ara',
    type: 'Female',
    tone: 'Warm, friendly',
    description: 'Default voice, balanced and conversational',
  },
  {
    id: 'Sal',
    name: 'Sal',
    type: 'Neutral',
    tone: 'Smooth, balanced',
    description: 'Versatile voice suitable for various contexts',
  },
  {
    id: 'Eve',
    name: 'Eve',
    type: 'Female',
    tone: 'Energetic, upbeat',
    description: 'Engaging and enthusiastic, great for interactive experiences',
  },
  {
    id: 'Leo',
    name: 'Leo',
    type: 'Male',
    tone: 'Authoritative, strong',
    description: 'Decisive and commanding, suitable for instructional content',
  },
];
