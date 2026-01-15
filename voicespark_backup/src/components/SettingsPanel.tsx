import { GenerationSettings, AudioFormat } from '@/types';
import { Settings, ChevronDown } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChange: (settings: GenerationSettings) => void;
}

export function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  const formatOptions: { value: AudioFormat; label: string }[] = [
    { value: 'mp3', label: 'MP3' },
    { value: 'wav', label: 'WAV' },
    { value: 'opus', label: 'Opus' },
  ];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-foreground transition-colors">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          <span className="text-sm font-medium">Settings</span>
        </div>
        <ChevronDown
          className={cn('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4 space-y-6">
        {/* Speed Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-foreground">Speed</label>
            <span className="text-sm font-mono text-primary">
              {settings.speed.toFixed(1)}x
            </span>
          </div>
          <Slider
            value={[settings.speed]}
            onValueChange={([value]) => onChange({ ...settings, speed: value })}
            min={0.5}
            max={2}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.5x</span>
            <span>1.0x</span>
            <span>2.0x</span>
          </div>
        </div>

        {/* Format Selection */}
        <div className="space-y-2">
          <label className="text-sm text-foreground">Output Format</label>
          <Select
            value={settings.format}
            onValueChange={(value: AudioFormat) =>
              onChange({ ...settings, format: value })
            }
          >
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {formatOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
