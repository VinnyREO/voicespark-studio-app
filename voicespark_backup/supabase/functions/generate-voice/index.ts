import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { apiKey, script, voice } = await req.json()

    if (!apiKey || !script) {
      return new Response(
        JSON.stringify({ error: 'API key and script are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process script - convert style tags to natural language hints
    const processedScript = script
      .replace(/\[whisper\](.*?)\[\/whisper\]/gi, '(softly) $1')
      .replace(/\[excited\](.*?)\[\/excited\]/gi, '(enthusiastically) $1')
      .replace(/\[serious\](.*?)\[\/serious\]/gi, '(seriously) $1')
      .replace(/\[slow\](.*?)\[\/slow\]/gi, '(slowly) $1')
      .replace(/\[fast\](.*?)\[\/fast\]/gi, '(quickly) $1')
      .replace(/\[emphasis\](.*?)\[\/emphasis\]/gi, '(emphasizing) $1')
      .replace(/\[sad\](.*?)\[\/sad\]/gi, '(sadly) $1')
      .replace(/\[happy\](.*?)\[\/happy\]/gi, '(cheerfully) $1')
      .replace(/\[angry\](.*?)\[\/angry\]/gi, '(angrily) $1')
      .replace(/\[pause:?\d*s?\]/gi, '...')

    console.log('Generating voice with:', { voice: voice || 'Rex', scriptLength: processedScript.length })

    // Connect to xAI WebSocket and generate audio
    const audioData = await generateVoiceoverViaWebSocket(apiKey, processedScript, voice || 'Rex')

    // Return audio as base64
    return new Response(
      JSON.stringify({ 
        success: true, 
        audio: audioData.audio,
        transcript: audioData.transcript,
        format: 'wav'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Voice generation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Voice generation failed'
    let userMessage = errorMessage
    
    // Provide helpful error messages
    if (errorMessage.includes('not authorized') || errorMessage.includes('permission') || errorMessage.includes('403')) {
      userMessage = 'Voice API not enabled. Create a new API key at console.x.ai with "realtime" endpoint enabled.'
    } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('invalid')) {
      userMessage = 'Invalid API key. Check your xAI API key.'
    } else if (errorMessage.includes('402') || errorMessage.includes('billing') || errorMessage.includes('payment')) {
      userMessage = 'Billing issue. Add credits at console.x.ai'
    } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
      userMessage = 'Rate limited. Please wait a moment and try again.'
    }
    
    return new Response(
      JSON.stringify({ error: userMessage, details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function generateVoiceoverViaWebSocket(
  apiKey: string, 
  script: string, 
  voice: string
): Promise<{ audio: string; transcript: string }> {
  return new Promise((resolve, reject) => {
    const audioChunks: string[] = []
    let transcript = ''
    
    // Use Deno's WebSocket with authentication subprotocols
    const ws = new WebSocket('wss://api.x.ai/v1/realtime', [
      'realtime',
      `openai-insecure-api-key.${apiKey}`,
      'openai-beta.realtime-v1'
    ])

    const timeout = setTimeout(() => {
      ws.close()
      reject(new Error('WebSocket timeout - no response after 60 seconds'))
    }, 60000)

    ws.onopen = () => {
      console.log('WebSocket connected to xAI')
      
      // Configure session
      ws.send(JSON.stringify({
        type: 'session.update',
        session: {
          voice: voice,
          instructions: `You are a professional voiceover artist for YouTube videos.
Read the following script exactly as written with natural expression.
Do NOT add greetings, commentary, sign-offs, or anything not in the script.
Do NOT say "Sure", "Of course", "Here's the voiceover" or similar.
Just read the script directly and naturally.

SCRIPT TO READ:
${script}`,
          modalities: ['audio', 'text'],
          turn_detection: null,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16'
        }
      }))

      // Small delay then send the trigger
      setTimeout(() => {
        ws.send(JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'message',
            role: 'user',
            content: [{ type: 'input_text', text: 'Read the script now.' }]
          }
        }))

        ws.send(JSON.stringify({
          type: 'response.create',
          response: { modalities: ['audio', 'text'] }
        }))
      }, 200)
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        // Collect audio chunks
        if (data.type === 'response.audio.delta' || data.type === 'response.output_audio.delta') {
          if (data.delta) {
            audioChunks.push(data.delta)
          }
        }

        // Collect transcript
        if (data.type === 'response.audio_transcript.delta' || data.type === 'response.output_audio_transcript.delta') {
          if (data.delta) {
            transcript += data.delta
          }
        }

        // Handle completion
        if (data.type === 'response.done' || data.type === 'response.audio.done') {
          clearTimeout(timeout)
          
          if (audioChunks.length === 0) {
            ws.close()
            reject(new Error('No audio generated. Try a different script or voice.'))
            return
          }

          console.log('Audio generation complete, chunks:', audioChunks.length)

          // Combine audio chunks and create WAV
          const combinedAudio = audioChunks.join('')
          const wavBase64 = createWavFromPcm(combinedAudio)
          
          ws.close()
          resolve({ audio: wavBase64, transcript })
        }

        // Handle errors
        if (data.type === 'error') {
          clearTimeout(timeout)
          ws.close()
          console.error('xAI error:', data.error)
          reject(new Error(data.error?.message || 'xAI API error'))
        }
      } catch (e) {
        console.error('Message parse error:', e)
      }
    }

    ws.onerror = (error) => {
      clearTimeout(timeout)
      console.error('WebSocket error:', error)
      reject(new Error('WebSocket connection failed. Check API key permissions.'))
    }

    ws.onclose = (event) => {
      clearTimeout(timeout)
      if (!event.wasClean && audioChunks.length === 0) {
        reject(new Error(`Connection closed unexpectedly: ${event.code} ${event.reason || 'Unknown reason'}`))
      }
    }
  })
}

function createWavFromPcm(base64Pcm: string): string {
  // Decode base64 to bytes
  const binaryString = atob(base64Pcm)
  const pcmBytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    pcmBytes[i] = binaryString.charCodeAt(i)
  }

  // WAV header parameters
  const sampleRate = 24000
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = pcmBytes.length
  const fileSize = 36 + dataSize

  // Create WAV buffer
  const wavBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(wavBuffer)

  // RIFF header
  writeString(view, 0, 'RIFF')
  view.setUint32(4, fileSize, true)
  writeString(view, 8, 'WAVE')

  // fmt chunk
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  // data chunk
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  // Copy PCM data
  new Uint8Array(wavBuffer, 44).set(pcmBytes)

  // Convert to base64
  const wavBytes = new Uint8Array(wavBuffer)
  let binary = ''
  for (let i = 0; i < wavBytes.length; i++) {
    binary += String.fromCharCode(wavBytes[i])
  }
  return btoa(binary)
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}
