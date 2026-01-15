import { useState, useEffect } from 'react';
import { 
  STYLE_TRAITS, 
  QUICK_PRESETS, 
  QuickPreset,
  buildStyleInstructions 
} from '@/config/styleMixer';
import { VoiceId } from '@/types';

interface StyleMixerProps {
  onStyleChange: (instructions: string, recommendedVoice?: VoiceId) => void;
}

export function StyleMixer({ onStyleChange }: StyleMixerProps) {
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');
  const [selectedPreset, setSelectedPreset] = useState('youtube-storyteller');
  const [selectedTraits, setSelectedTraits] = useState<string[]>(['warm', 'conversational', 'dramatic']);

  // Initialize with default preset
  useEffect(() => {
    const defaultPreset = QUICK_PRESETS.find(p => p.id === 'youtube-storyteller');
    if (defaultPreset) {
      const instructions = buildStyleInstructions(defaultPreset.traits);
      onStyleChange(instructions, defaultPreset.recommendedVoice as VoiceId);
    }
  }, []);

  const handlePresetSelect = (preset: QuickPreset) => {
    setSelectedPreset(preset.id);
    setSelectedTraits(preset.traits);
    setMode('presets');
    const instructions = buildStyleInstructions(preset.traits);
    onStyleChange(instructions, preset.recommendedVoice as VoiceId);
  };

  const handleTraitToggle = (traitId: string) => {
    const newTraits = selectedTraits.includes(traitId)
      ? selectedTraits.filter(t => t !== traitId)
      : [...selectedTraits, traitId].slice(0, 4); // Max 4 traits
    
    setSelectedTraits(newTraits);
    setSelectedPreset('custom');
    const instructions = buildStyleInstructions(newTraits);
    onStyleChange(instructions);
  };

  const currentPreset = QUICK_PRESETS.find(p => p.id === selectedPreset);

  return (
    <div className="space-y-4">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">🎭 Delivery Style</span>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setMode('presets')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              mode === 'presets' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Quick Presets
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              mode === 'custom' 
                ? 'bg-primary text-primary-foreground' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Custom Mix
          </button>
        </div>
      </div>

      {/* Quick Presets Grid */}
      {mode === 'presets' && (
        <div className="grid grid-cols-3 gap-2">
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={`
                p-2 rounded-lg border text-center transition-all relative
                ${selectedPreset === preset.id 
                  ? 'border-primary bg-primary/10 shadow-lg shadow-primary/10' 
                  : 'border-border bg-muted/50 hover:border-muted-foreground'
                }
              `}
            >
              <div className="text-lg">{preset.emoji}</div>
              <div className="text-[10px] font-medium text-foreground truncate mt-1">
                {preset.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Custom Mix - Trait Pills */}
      {mode === 'custom' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Select up to 4 traits to combine ({selectedTraits.length}/4)
          </p>
          <div className="flex flex-wrap gap-2">
            {STYLE_TRAITS.map((trait) => {
              const isSelected = selectedTraits.includes(trait.id);
              const isDisabled = !isSelected && selectedTraits.length >= 4;
              
              return (
                <button
                  key={trait.id}
                  onClick={() => !isDisabled && handleTraitToggle(trait.id)}
                  disabled={isDisabled}
                  className={`
                    px-2 py-1.5 rounded-full text-xs flex items-center gap-1.5 transition-all
                    ${isSelected 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20' 
                      : isDisabled
                        ? 'bg-muted text-muted-foreground/50 cursor-not-allowed'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }
                  `}
                >
                  <span>{trait.emoji}</span>
                  <span>{trait.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Current Selection Info */}
      <div className="bg-muted/30 rounded-lg p-3 space-y-2">
        {mode === 'presets' && currentPreset && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-base">{currentPreset.emoji}</span>
              <span className="font-medium text-sm text-foreground">{currentPreset.name}</span>
              <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-auto">
                Best: {currentPreset.recommendedVoice}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{currentPreset.description}</p>
            <p className="text-[10px] text-muted-foreground/70">
              ✨ {currentPreset.bestFor}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {currentPreset.traits.map(traitId => {
                const trait = STYLE_TRAITS.find(t => t.id === traitId);
                return trait ? (
                  <span key={trait.id} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    {trait.emoji} {trait.name}
                  </span>
                ) : null;
              })}
            </div>
          </>
        )}
        
        {mode === 'custom' && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-base">🎨</span>
              <span className="font-medium text-sm text-foreground">Custom Mix</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedTraits.map(traitId => {
                const trait = STYLE_TRAITS.find(t => t.id === traitId);
                return trait ? (
                  <span key={trait.id} className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {trait.emoji} {trait.name}
                  </span>
                ) : null;
              })}
              {selectedTraits.length === 0 && (
                <span className="text-xs text-muted-foreground">No traits selected</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
