import { VoiceId } from '@/types';
import { VOICES } from '@/utils/voices';
import { VoiceCard } from './VoiceCard';
import { Mic2 } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoice: VoiceId;
  onSelectVoice: (voice: VoiceId) => void;
}

export function VoiceSelector({ selectedVoice, onSelectVoice }: VoiceSelectorProps) {
  const selectedVoiceData = VOICES.find((v) => v.id === selectedVoice);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Mic2 className="w-4 h-4" />
        <span className="text-sm font-medium">Voice</span>
      </div>

      <div className="grid gap-3">
        {VOICES.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            isSelected={selectedVoice === voice.id}
            onSelect={() => onSelectVoice(voice.id)}
          />
        ))}
      </div>

      {selectedVoiceData && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Selected: <span className="text-foreground font-medium">{selectedVoiceData.name}</span> — {selectedVoiceData.description}
        </p>
      )}
    </div>
  );
}
