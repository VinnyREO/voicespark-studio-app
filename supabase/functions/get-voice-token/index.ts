import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { apiKey } = await req.json()
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get ephemeral token from xAI
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 } // 5 minute token
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('xAI error:', response.status, errorText)
      
      let errorMessage = 'Failed to get token from xAI'
      
      if (response.status === 401) {
        errorMessage = 'Invalid API key. Please check your xAI API key.'
      } else if (response.status === 402) {
        errorMessage = 'Payment required. Please add billing to your xAI account at console.x.ai'
      } else if (response.status === 403) {
        errorMessage = 'Voice API not enabled. Please create a new API key with realtime permissions at console.x.ai'
      } else if (response.status === 429) {
        errorMessage = 'Rate limited. Please wait a moment and try again.'
      }
      
      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          details: errorText,
          status: response.status
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = await response.json()
    
    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Edge function error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
