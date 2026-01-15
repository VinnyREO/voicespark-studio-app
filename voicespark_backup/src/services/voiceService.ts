export interface VoiceGenerationResult {
  success: boolean;
  audioUrl?: string;
  audioBlob?: Blob;
  transcript?: string;
  error?: string;
}

export async function generateVoiceover(
  apiKey: string,
  script: string,
  voice: string = 'Rex'
): Promise<VoiceGenerationResult> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    if (!supabaseUrl) {
      return {
        success: false,
        error: 'Backend not configured. Please ensure Lovable Cloud is enabled.'
      };
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-voice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        script,
        voice
      })
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error || 'Voice generation failed'
      };
    }

    // Convert base64 audio to blob
    const audioBytes = atob(data.audio);
    const audioArray = new Uint8Array(audioBytes.length);
    for (let i = 0; i < audioBytes.length; i++) {
      audioArray[i] = audioBytes.charCodeAt(i);
    }
    const audioBlob = new Blob([audioArray], { type: 'audio/wav' });
    const audioUrl = URL.createObjectURL(audioBlob);

    return {
      success: true,
      audioUrl,
      audioBlob,
      transcript: data.transcript
    };
  } catch (error) {
    console.error('Voice generation error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Voice generation failed'
    };
  }
}
