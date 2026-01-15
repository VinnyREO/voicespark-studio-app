import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface APIKeyInputProps {
  apiKey: string | null;
  onSave: (key: string) => void;
  onClear: () => void;
}

export function APIKeyInput({ apiKey, onSave, onClear }: APIKeyInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputKey, setInputKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `••••••••${key.slice(-4)}`;
  };

  const handleSave = async () => {
    if (!inputKey.trim()) {
      setValidationError('Please enter an API key');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    // Simple validation - just check format
    // Real validation would test against the API
    await new Promise((resolve) => setTimeout(resolve, 500));

    if (inputKey.startsWith('xai-') || inputKey.length > 20) {
      onSave(inputKey.trim());
      setInputKey('');
      setIsOpen(false);
    } else {
      setValidationError('Invalid API key format');
    }

    setIsValidating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-secondary/50 border-border hover:bg-secondary"
        >
          <Key className="w-4 h-4" />
          {apiKey ? (
            <span className="font-mono text-xs">{maskApiKey(apiKey)}</span>
          ) : (
            <span>Add API Key</span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-primary" />
            xAI API Key
          </DialogTitle>
          <DialogDescription>
            Enter your xAI API key to generate voiceovers. Your key is stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {apiKey ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="font-mono text-sm">{maskApiKey(apiKey)}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClear}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="xai-xxxxxxxxxxxxxxxx"
                value={inputKey}
                onChange={(e) => {
                  setInputKey(e.target.value);
                  setValidationError(null);
                }}
                className="pr-10 font-mono bg-background"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {validationError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                {validationError}
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={isValidating || !inputKey.trim()}
              className="flex-1 glow-button bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isValidating ? 'Validating...' : apiKey ? 'Update Key' : 'Save Key'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Get your API key from{' '}
            <a
              href="https://console.x.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              console.x.ai
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
