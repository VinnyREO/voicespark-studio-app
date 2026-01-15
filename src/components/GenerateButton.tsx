import { Mic, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GenerateButtonProps {
  isGenerating: boolean;
  isDisabled: boolean;
  progress?: string;
  onClick: () => void;
}

export function GenerateButton({ isGenerating, isDisabled, progress, onClick }: GenerateButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={isDisabled || isGenerating}
      className={cn(
        'w-full h-14 text-lg font-semibold gap-3',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !isGenerating && !isDisabled && 'glow-button animate-pulse-glow'
      )}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          {progress || 'Generating Voiceover...'}
        </>
      ) : (
        <>
          <Mic className="w-5 h-5" />
          Generate Voiceover
        </>
      )}
    </Button>
  );
}
