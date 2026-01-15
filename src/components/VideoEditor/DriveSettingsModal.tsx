import { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DriveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (credentials: { clientId: string; apiKey: string }) => void;
}

export function DriveSettingsModal({ isOpen, onClose, onSave }: DriveSettingsModalProps) {
  const [clientId, setClientId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  // Load existing credentials from localStorage
  useEffect(() => {
    if (isOpen) {
      const savedClientId = localStorage.getItem('google_drive_client_id') || '';
      const savedApiKey = localStorage.getItem('google_drive_api_key') || '';
      setClientId(savedClientId);
      setApiKey(savedApiKey);
      setSaved(false);
    }
  }, [isOpen]);

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('google_drive_client_id', clientId);
    localStorage.setItem('google_drive_api_key', apiKey);
    
    // Notify parent
    onSave({ clientId, apiKey });
    
    // Show saved indicator
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">Google Drive Setup</DialogTitle>
              <p className="text-sm text-muted-foreground">Connect your Drive for fast media access</p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instructions */}
          <div className="p-4 bg-secondary/50 rounded-lg border border-border">
            <p className="text-sm text-foreground mb-2">To connect Google Drive:</p>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Go to Google Cloud Console</li>
              <li>Create a project & enable Drive API</li>
              <li>Create OAuth 2.0 Client ID (Web application)</li>
              <li>Create API Key</li>
              <li>Add your domain to authorized origins</li>
            </ol>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Open Google Cloud Console
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Client ID Input */}
          <div className="space-y-2">
            <Label htmlFor="clientId" className="text-foreground">
              OAuth Client ID
            </Label>
            <Input
              id="clientId"
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="123456789-abcdefg.apps.googleusercontent.com"
              className="bg-secondary border-border"
            />
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-foreground">
              API Key
            </Label>
            <Input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="bg-secondary border-border"
            />
          </div>

          {/* Status indicator */}
          {clientId && apiKey && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              Credentials configured - ready to connect
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            onClick={onClose}
            variant="ghost"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!clientId || !apiKey}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Credentials
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
