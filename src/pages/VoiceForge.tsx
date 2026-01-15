import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ScriptEditor } from '@/components/ScriptEditor';
import { VoiceSelector } from '@/components/VoiceSelector';
import { SettingsPanel } from '@/components/SettingsPanel';
import { AudioPlayer } from '@/components/AudioPlayer';
import { GenerateButton } from '@/components/GenerateButton';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useVoiceGeneration } from '@/hooks/useVoiceGeneration';
import { VoiceId, GenerationSettings } from '@/types';
import { toast } from 'sonner';
import { AlertCircle, ExternalLink } from 'lucide-react';

const SAMPLE_SCRIPT = `[whisper]Hey there[/whisper]

Welcome back to the channel! Today we're going to explore something [emphasis]absolutely incredible[/emphasis].

[pause:2s]

[excited]I've been waiting to share this with you for weeks![/excited]

[serious]But first, let me give you some important context.[/serious]

[slow]Pay close attention to this next part, because it's crucial.[/slow]

And that's it for today! [whisper]Don't forget to subscribe[/whisper].`;

export default function VoiceForge() {
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('project');

  const [apiKey] = useLocalStorage<string | null>('xai-api-key', null);
  const [script, setScript] = useState(SAMPLE_SCRIPT);
  const [selectedVoice, setSelectedVoice] = useState<VoiceId>('Rex');
  const [settings, setSettings] = useState<GenerationSettings>({
    speed: 1.0,
    format: 'wav',
  });

  const {
    isGenerating,
    progress,
    error,
    audioUrl,
    audioBlob,
    generate,
    reset,
  } = useVoiceGeneration();

  const handleGenerate = useCallback(async () => {
    if (!apiKey) {
      toast.error('Please add your xAI API key first');
      return;
    }

    if (!script.trim()) {
      toast.error('Please enter a script');
      return;
    }

    reset();
    await generate(script, selectedVoice, apiKey);
  }, [apiKey, script, selectedVoice, generate, reset]);

  const handleDownload = useCallback(() => {
    if (!audioBlob || !audioUrl) return;

    const firstWords = script
      .replace(/\[.*?\]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 5)
      .join('_')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');

    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `${firstWords || 'voiceover'}_${timestamp}.wav`;

    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Downloaded ${filename}`);
  }, [audioBlob, audioUrl, script]);

  const isGenerateDisabled = !apiKey || !script.trim();

  return (
    <div className="min-h-screen bg-background">
      {/* Header space */}
      <div className="h-[73px]" />

      <main className="container max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr,340px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">
            <ScriptEditor script={script} onChange={setScript} />

            <GenerateButton
              isGenerating={isGenerating}
              isDisabled={isGenerateDisabled}
              progress={progress}
              onClick={handleGenerate}
            />

            {/* Error Display */}
            {error && (
              <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-destructive">Error</p>
                    <p className="text-sm text-destructive/90">{error}</p>
                    {(error.includes('console.x.ai') || error.includes('API') || error.includes('billing') || error.includes('Voice')) && (
                      <a
                        href="https://console.x.ai"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Go to xAI Console
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            <AudioPlayer
              audioUrl={audioUrl}
              onDownload={handleDownload}
              format="wav"
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="lg:sticky lg:top-24">
              <div className="rounded-xl border border-border bg-card p-5 space-y-6">
                <VoiceSelector
                  selectedVoice={selectedVoice}
                  onSelectVoice={setSelectedVoice}
                />

                <div className="border-t border-border" />

                <SettingsPanel settings={settings} onChange={setSettings} />

                {/* API Info */}
                <div className="border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground">
                    Uses xAI Grok Voice API via WebSocket. Voice API costs ~$0.05/min.{' '}
                    <a
                      href="https://console.x.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Check billing →
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Background gradient */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
