import { Waves, HelpCircle } from 'lucide-react';
import { APIKeyInput } from './APIKeyInput';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface HeaderProps {
  apiKey: string | null;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
}

export function Header({ apiKey, onSaveApiKey, onClearApiKey }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center shadow-lg shadow-primary/20">
                <Waves className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="absolute -inset-1 bg-primary/20 rounded-xl blur-md -z-10" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                VoiceForge
              </h1>
              <p className="text-xs text-muted-foreground">
                YouTube Voiceover Studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <APIKeyInput
              apiKey={apiKey}
              onSave={onSaveApiKey}
              onClear={onClearApiKey}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="end" className="max-w-xs">
                <p className="font-medium mb-1">How to use VoiceForge</p>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Add your xAI API key</li>
                  <li>Paste or write your script</li>
                  <li>Add style tags for expression</li>
                  <li>Choose a voice and generate!</li>
                </ol>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </header>
  );
}
