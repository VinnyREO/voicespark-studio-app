import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { QUICK_PRESETS, STYLE_TRAITS, buildStyleInstructions, QuickPreset, StyleTrait } from '@/config/styleMixer';
import { Sparkles, Sliders, Check } from 'lucide-react';

const MAX_TRAITS = 4;

interface DeliveryStyleSelectorProps {
  selectedPresetId: string | null;
  selectedTraits: string[];
  onPresetSelect: (presetId: string | null) => void;
  onTraitsChange: (traits: string[]) => void;
  onRecommendedVoice?: (voiceId: string) => void;
}

export function DeliveryStyleSelector({
  selectedPresetId,
  selectedTraits,
  onPresetSelect,
  onTraitsChange,
  onRecommendedVoice,
}: DeliveryStyleSelectorProps) {
  const [activeTab, setActiveTab] = useState<'presets' | 'custom'>(
    selectedTraits.length > 0 ? 'custom' : 'presets'
  );

  const handlePresetClick = (preset: QuickPreset) => {
    if (selectedPresetId === preset.id) {
      // Deselect
      onPresetSelect(null);
    } else {
      onPresetSelect(preset.id);
      onTraitsChange([]); // Clear custom traits when selecting preset
      if (onRecommendedVoice) {
        onRecommendedVoice(preset.recommendedVoice);
      }
    }
  };

  const handleTraitClick = (trait: StyleTrait) => {
    onPresetSelect(null); // Clear preset when using custom traits

    if (selectedTraits.includes(trait.id)) {
      // Remove trait
      onTraitsChange(selectedTraits.filter(t => t !== trait.id));
    } else if (selectedTraits.length < MAX_TRAITS) {
      // Add trait
      onTraitsChange([...selectedTraits, trait.id]);
    }
  };

  const selectedPreset = QUICK_PRESETS.find(p => p.id === selectedPresetId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Delivery Style</span>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presets' | 'custom')}>
        <TabsList className="grid w-full grid-cols-2 bg-secondary/50">
          <TabsTrigger value="presets" className="text-xs">
            Quick Presets
          </TabsTrigger>
          <TabsTrigger value="custom" className="text-xs">
            Custom Mix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="presets" className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handlePresetClick(preset)}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-left transition-all',
                  selectedPresetId === preset.id
                    ? 'bg-primary/10 border-primary'
                    : 'bg-secondary/30 border-border hover:bg-secondary/50 hover:border-primary/50'
                )}
              >
                <span className="text-lg shrink-0">{preset.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{preset.name}</span>
                    {selectedPresetId === preset.id && (
                      <Check className="w-3.5 h-3.5 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {preset.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {selectedPreset && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Best for:</span>{' '}
                {selectedPreset.bestFor}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Recommended voice:</span>{' '}
                <span className="text-primary">{selectedPreset.recommendedVoice}</span>
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="custom" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Select up to {MAX_TRAITS} traits
              </span>
            </div>
            <span className={cn(
              'text-xs font-mono',
              selectedTraits.length === MAX_TRAITS ? 'text-amber-400' : 'text-muted-foreground'
            )}>
              {selectedTraits.length}/{MAX_TRAITS}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {STYLE_TRAITS.map((trait) => {
              const isSelected = selectedTraits.includes(trait.id);
              const isDisabled = !isSelected && selectedTraits.length >= MAX_TRAITS;

              return (
                <button
                  key={trait.id}
                  onClick={() => handleTraitClick(trait)}
                  disabled={isDisabled}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all',
                    isSelected
                      ? 'bg-primary/10 border-primary'
                      : isDisabled
                        ? 'bg-secondary/20 border-border/50 opacity-50 cursor-not-allowed'
                        : 'bg-secondary/30 border-border hover:bg-secondary/50 hover:border-primary/50'
                  )}
                >
                  <span>{trait.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium">{trait.name}</span>
                  </div>
                  {isSelected && (
                    <Check className="w-3 h-3 text-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedTraits.length > 0 && (
            <div className="p-3 rounded-lg bg-secondary/30 border border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Your mix:</span>{' '}
                {selectedTraits.map(id => {
                  const trait = STYLE_TRAITS.find(t => t.id === id);
                  return trait ? `${trait.emoji} ${trait.name}` : '';
                }).join(' + ')}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper to get style instructions from current selection
export function getStyleInstructions(
  presetId: string | null,
  traits: string[]
): string {
  if (presetId) {
    const preset = QUICK_PRESETS.find(p => p.id === presetId);
    if (preset) {
      return buildStyleInstructions(preset.traits);
    }
  }

  if (traits.length > 0) {
    return buildStyleInstructions(traits);
  }

  return '';
}
