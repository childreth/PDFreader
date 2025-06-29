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

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { text, voiceId, apiKey, settings } = JSON.parse(event.body);

        if (!text) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        if (!voiceId) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Voice ID is required' })
            };
        }

        if (!apiKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'API key is required' })
            };
        }

        console.log(`Processing TTS request: ${text.length} characters, voice: ${voiceId}`);

        // Make direct HTTP API call to ElevenLabs
        const fetch = (await import('node-fetch')).default;
        const apiUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': apiKey
            },
            body: JSON.stringify({
                text: text,
                model_id: settings?.modelId || 'eleven_monolingual_v1',
                voice_settings: {
                    stability: settings?.stability || 0.5,
                    similarity_boost: settings?.similarityBoost || 0.5,
                    style: settings?.style || 0.0,
                    use_speaker_boost: settings?.useSpeakerBoost || true
                }
            })
        });

        console.log('ElevenLabs API response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            
            if (response.status === 401) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid API key' })
                };
            } else if (response.status === 429) {
                return {
                    statusCode: 429,
                    headers,
                    body: JSON.stringify({ error: 'API quota exceeded' })
                };
            } else {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: `ElevenLabs API error ${response.status}: ${errorText}` })
                };
            }
        }

        // Get the audio buffer from the response
        const audioBuffer = await response.buffer();
        console.log('Audio buffer received, size:', audioBuffer.length);

        if (!audioBuffer || audioBuffer.length === 0) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Empty audio buffer received from ElevenLabs' })
            };
        }

        // Return the audio buffer
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="speech.mp3"',
                'Content-Length': audioBuffer.length.toString()
            },
            body: audioBuffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('ElevenLabs TTS Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'TTS generation failed', 
                details: error.message 
            })
        };
    }
};