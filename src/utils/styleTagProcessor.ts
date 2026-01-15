import { StyleTag } from '@/types';

export const STYLE_TAGS: StyleTag[] = [
  {
    name: 'whisper',
    openTag: '[whisper]',
    closeTag: '[/whisper]',
    description: 'Soft, intimate delivery',
    color: 'tag-whisper',
    example: '[whisper]secret message[/whisper]',
  },
  {
    name: 'excited',
    openTag: '[excited]',
    closeTag: '[/excited]',
    description: 'Energetic, enthusiastic',
    color: 'tag-excited',
    example: '[excited]amazing news![/excited]',
  },
  {
    name: 'serious',
    openTag: '[serious]',
    closeTag: '[/serious]',
    description: 'Formal, authoritative',
    color: 'tag-serious',
    example: '[serious]important notice[/serious]',
  },
  {
    name: 'slow',
    openTag: '[slow]',
    closeTag: '[/slow]',
    description: 'Slower pace',
    color: 'tag-slow',
    example: '[slow]take your time[/slow]',
  },
  {
    name: 'fast',
    openTag: '[fast]',
    closeTag: '[/fast]',
    description: 'Faster pace',
    color: 'tag-fast',
    example: '[fast]quick update[/fast]',
  },
  {
    name: 'pause',
    openTag: '[pause:2s]',
    description: 'Insert pause (adjust seconds)',
    color: 'tag-pause',
    example: '[pause:2s]',
  },
  {
    name: 'emphasis',
    openTag: '[emphasis]',
    closeTag: '[/emphasis]',
    description: 'Emphasize words',
    color: 'tag-emphasis',
    example: '[emphasis]key point[/emphasis]',
  },
];

export function processStyleTags(script: string): string {
  let processed = script;

  // Convert pause tags to ellipsis for natural pausing
  processed = processed.replace(/\[pause:(\d+)s\]/g, (_, seconds) => {
    return '. '.repeat(Math.min(parseInt(seconds), 5));
  });

  // Remove style tags but keep content (for basic API compatibility)
  const tagNames = ['whisper', 'excited', 'serious', 'slow', 'fast', 'emphasis'];
  tagNames.forEach((tag) => {
    processed = processed.replace(new RegExp(`\\[${tag}\\]`, 'g'), '');
    processed = processed.replace(new RegExp(`\\[/${tag}\\]`, 'g'), '');
  });

  return processed.trim();
}

export function countWords(text: string): number {
  const cleanText = text.replace(/\[.*?\]/g, '').trim();
  if (!cleanText) return 0;
  return cleanText.split(/\s+/).filter(Boolean).length;
}

export function countCharacters(text: string): number {
  return text.replace(/\[.*?\]/g, '').length;
}

export function highlightStyleTags(text: string): string {
  let highlighted = text;

  STYLE_TAGS.forEach((tag) => {
    const openRegex = new RegExp(`(\\[${tag.name}(?::\\d+s)?\\])`, 'g');
    highlighted = highlighted.replace(
      openRegex,
      `<span class="style-tag style-tag-${tag.name}">$1</span>`
    );

    if (tag.closeTag) {
      const closeRegex = new RegExp(`(\\[/${tag.name}\\])`, 'g');
      highlighted = highlighted.replace(
        closeRegex,
        `<span class="style-tag style-tag-${tag.name}">$1</span>`
      );
    }
  });

  return highlighted;
}
