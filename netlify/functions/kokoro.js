exports.handler = async (event, context) => {
    // Set CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Kokoro requires large AI models that exceed Netlify function limits
    // Return error message directing users to use local development for AI TTS
    return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ 
            error: 'Kokoro TTS is not available in the deployed version due to model size constraints. Please use local development (npm start) for AI TTS features, or use Browser/ElevenLabs TTS in production.',
            provider: 'kokoro',
            alternatives: ['browser', 'elevenlabs']
        })
    };
};