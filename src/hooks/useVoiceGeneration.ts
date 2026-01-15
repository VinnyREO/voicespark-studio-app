import { useState, useCallback, useRef } from 'react';
import { generateVoiceover } from '@/services/voiceService';
import { VoiceId } from '@/types';

interface UseVoiceGenerationResult {
  isGenerating: boolean;
  progress: string;
  error: string | null;
  audioUrl: string | null;
  audioBlob: Blob | null;
  transcript: string;
  generate: (script: string, voice: VoiceId, apiKey: string, styleInstructions?: string) => Promise<void>;
  download: () => void;
  reset: () => void;
}

export function useVoiceGeneration(): UseVoiceGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const abortRef = useRef(false);

  const generate = useCallback(
    async (script: string, voice: VoiceId, apiKey: string, styleInstructions: string = '') => {
      // Validate inputs
      if (!script.trim()) {
        setError('Please enter a script');
        return;
      }
      if (!apiKey.trim()) {
        setError('Please enter your xAI API key');
        return;
      }

      // Clean up previous audio URL
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      abortRef.current = false;
      setIsGenerating(true);
      setError(null);
      setProgress('Connecting to xAI...');
      setAudioUrl(null);
      setAudioBlob(null);
      setTranscript('');

      try {
        setProgress('Generating voiceover... This may take a moment.');

        const result = await generateVoiceover(apiKey, script, voice, styleInstructions);

        if (abortRef.current) {
          return;
        }

        if (result.success && result.audioUrl && result.audioBlob) {
          setAudioUrl(result.audioUrl);
          setAudioBlob(result.audioBlob);
          setTranscript(result.transcript || '');
          setProgress('Complete!');
        } else {
          setError(result.error || 'Voice generation failed');
          setProgress('');
        }
      } catch (err) {
        if (!abortRef.current) {
          const message = err instanceof Error ? err.message : 'Generation failed';
          setError(message);
          setProgress('');
        }
      } finally {
        setIsGenerating(false);
      }
    },
    [audioUrl]
  );

  const download = useCallback(() => {
    if (!audioBlob) return;
    
    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voiceover-${Date.now()}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [audioBlob]);

  const reset = useCallback(() => {
    abortRef.current = true;
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setAudioBlob(null);
    setError(null);
    setProgress('');
    setTranscript('');
  }, [audioUrl]);

  return {
    isGenerating,
    progress,
    error,
    audioUrl,
    audioBlob,
    transcript,
    generate,
    download,
    reset,
  };
}
