import { VoiceGenerationConfig, GenerationResult } from '@/types';

interface EphemeralTokenResponse {
  client_secret?: {
    value: string;
    expires_at: number;
  };
  error?: string;
  details?: string;
  status?: number;
}

export class GrokVoiceGenerator {
  private ws: WebSocket | null = null;
  private audioChunks: string[] = [];
  private transcript: string = '';
  private isCancelled: boolean = false;

  // Step 1: Get ephemeral token from our edge function
  private async getEphemeralToken(apiKey: string): Promise<string> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      throw new Error('Backend not configured. Please ensure Lovable Cloud is enabled.');
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/get-voice-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey })
    });

    const data: EphemeralTokenResponse = await response.json();

    if (!response.ok) {
      // Handle specific error cases with helpful messages
      if (data.status === 401) {
        throw new Error('Invalid API key. Please check your xAI API key is correct.');
      } else if (data.status === 402) {
        throw new Error('Payment required. Add billing to your xAI account at console.x.ai');
      } else if (data.status === 403) {
        throw new Error('Voice API not enabled. Create a new API key with realtime permissions at console.x.ai');
      } else if (data.status === 429) {
        throw new Error('Rate limited. Please wait a moment and try again.');
      }
      throw new Error(data.error || data.details || 'Failed to get ephemeral token');
    }

    if (!data.client_secret?.value) {
      throw new Error('No ephemeral token received from xAI. Check your API permissions.');
    }

    return data.client_secret.value;
  }

  private processStyleTags(script: string): string {
    let processed = script;
    
    const styleHints: Record<string, string> = {
      'whisper': '(speak softly and intimately)',
      'excited': '(speak with high energy and enthusiasm)',
      'serious': '(speak formally and authoritatively)',
      'slow': '(slow down your pace)',
      'fast': '(speed up your delivery)',
      'emphasis': '(emphasize this)',
      'sad': '(convey sadness)',
      'happy': '(sound cheerful)',
      'angry': '(express frustration)'
    };

    // Replace [tag]content[/tag] with (hint) content
    for (const [tag, hint] of Object.entries(styleHints)) {
      const regex = new RegExp(`\\[${tag}\\](.*?)\\[\\/${tag}\\]`, 'gi');
      processed = processed.replace(regex, `${hint} $1`);
    }

    // Handle pause tags - convert to ellipsis
    processed = processed.replace(/\[pause:?(\d*)s?\]/gi, (_, seconds) => {
      const count = parseInt(seconds) || 2;
      return '... '.repeat(count);
    });

    return processed.trim();
  }

  async generate(config: VoiceGenerationConfig): Promise<GenerationResult> {
    const { apiKey, voice, script, sampleRate = 24000 } = config;
    
    this.isCancelled = false;
    this.audioChunks = [];
    this.transcript = '';

    // Get ephemeral token first
    const ephemeralToken = await this.getEphemeralToken(apiKey);

    if (this.isCancelled) {
      throw new Error('Generation cancelled');
    }

    return new Promise((resolve, reject) => {
      // Connect to xAI WebSocket with ephemeral token in URL
      this.ws = new WebSocket(`wss://api.x.ai/v1/realtime?token=${ephemeralToken}`);
      
      const timeout = setTimeout(() => {
        this.cleanup();
        reject(new Error('Connection timed out. Please try again.'));
      }, 60000);

      this.ws.onopen = () => {
        console.log('Connected to xAI Voice API');
        
        // Configure session with voice and instructions
        this.sendMessage({
          type: 'session.update',
          session: {
            voice: voice,
            instructions: `You are a professional voiceover artist. 
Read the following script exactly as written with natural pacing and expression.
Do NOT add any greetings, commentary, or text not in the script.
Do NOT say things like "Sure!" or "Here's the voiceover" - just read the script directly.
Interpret any style hints in brackets naturally.

SCRIPT TO READ:
${this.processStyleTags(script)}`,
            turn_detection: null,
            input_audio_format: 'pcm16',
            output_audio_format: 'pcm16',
          }
        });
      };

      this.ws.onmessage = (event) => {
        if (this.isCancelled) {
          clearTimeout(timeout);
          this.cleanup();
          reject(new Error('Generation cancelled'));
          return;
        }

        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'session.created':
            break;

          case 'session.updated':
            // Create conversation item with the script
            this.sendMessage({
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{
                  type: 'input_text',
                  text: 'Please read the script now.'
                }]
              }
            });
            // Request response generation
            this.sendMessage({
              type: 'response.create',
              response: {
                modalities: ['audio', 'text']
              }
            });
            break;

          case 'response.audio.delta':
          case 'response.output_audio.delta':
            // Collect audio chunks (base64 encoded PCM)
            if (data.delta) {
              this.audioChunks.push(data.delta);
            }
            break;

          case 'response.audio_transcript.delta':
          case 'response.output_audio_transcript.delta':
            // Collect transcript
            if (data.delta) {
              this.transcript += data.delta;
            }
            break;

          case 'response.done':
            console.log('Generation complete!');
            clearTimeout(timeout);
            
            if (this.audioChunks.length === 0) {
              this.cleanup();
              reject(new Error('No audio received. The script may be too short or empty.'));
              return;
            }
            
            // Combine audio and create blob
            const audioBlob = this.createAudioBlob(sampleRate);
            const transcript = this.transcript;
            this.cleanup();
            resolve({
              audioBlob,
              transcript
            });
            break;

          case 'error':
            console.error('xAI Error:', data);
            clearTimeout(timeout);
            this.cleanup();
            reject(new Error(data.error?.message || 'Voice generation failed'));
            break;
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        clearTimeout(timeout);
        this.cleanup();
        reject(new Error('Connection failed. Check your internet connection and try again.'));
      };

      this.ws.onclose = (event) => {
        clearTimeout(timeout);
        if (!event.wasClean && this.audioChunks.length === 0 && !this.isCancelled) {
          reject(new Error('Connection closed unexpectedly. Please try again.'));
        }
      };
    });
  }

  private sendMessage(message: object) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private createAudioBlob(sampleRate: number): Blob {
    // Combine all base64 chunks
    const combinedBase64 = this.audioChunks.join('');
    
    if (!combinedBase64) {
      throw new Error('No audio data received');
    }
    
    // Decode base64 to binary
    const binaryString = atob(combinedBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create WAV file with header
    const wavBuffer = this.pcmToWav(bytes.buffer, sampleRate);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  }

  private pcmToWav(pcmData: ArrayBuffer, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const blockAlign = numChannels * (bitsPerSample / 8);
    
    const wavBuffer = new ArrayBuffer(44 + pcmData.byteLength);
    const view = new DataView(wavBuffer);
    
    // RIFF header
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + pcmData.byteLength, true);
    this.writeString(view, 8, 'WAVE');
    
    // fmt chunk
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    
    // data chunk
    this.writeString(view, 36, 'data');
    view.setUint32(40, pcmData.byteLength, true);
    
    // Copy PCM data
    new Uint8Array(wavBuffer, 44).set(new Uint8Array(pcmData));
    
    return wavBuffer;
  }

  private writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  private cleanup() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.audioChunks = [];
    this.transcript = '';
  }

  cancel() {
    this.isCancelled = true;
    this.cleanup();
  }
}
