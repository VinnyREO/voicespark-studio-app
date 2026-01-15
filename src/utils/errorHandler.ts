export function getErrorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message: unknown }).message)
      : String(error);

  // Already user-friendly messages from voiceGenerator - pass through
  if (
    message.includes('console.x.ai') ||
    message.includes('Invalid API key') ||
    message.includes('Payment required') ||
    message.includes('Voice API not enabled') ||
    message.includes('Rate limited')
  ) {
    return message;
  }

  // Common xAI errors
  if (message.includes('not authorized') || message.includes('permission') || message.includes('403')) {
    return 'Voice API not enabled. Create a new API key with realtime permissions at console.x.ai';
  }

  if (message.includes('invalid_api_key') || message.includes('Unauthorized') || message.includes('401')) {
    return 'Invalid API key. Please check your xAI API key is correct.';
  }

  if (message.includes('rate_limit') || message.includes('429')) {
    return 'Rate limited. Please wait a moment and try again.';
  }

  if (message.includes('insufficient_quota') || message.includes('billing') || message.includes('402')) {
    return 'Payment required. Add billing to your xAI account at console.x.ai';
  }

  if (message.includes('WebSocket') || message.includes('connection')) {
    return 'Connection failed. Check your internet connection and try again.';
  }

  if (message.includes('timed out') || message.includes('timeout')) {
    return 'Request timed out. Please try again with a shorter script.';
  }

  if (message.includes('No audio')) {
    return 'No audio generated. Try a longer script or different voice.';
  }

  if (message.includes('cancelled')) {
    return 'Generation was cancelled.';
  }

  return message;
}
