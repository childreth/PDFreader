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
        const { apiKey } = JSON.parse(event.body);

        console.log('Voices request received:', { hasApiKey: !!apiKey });

        if (!apiKey) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'API key is required' })
            };
        }

        console.log('Fetching voices from ElevenLabs...');
        
        // Make direct HTTP API call to ElevenLabs
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'xi-api-key': apiKey
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            
            if (response.status === 401) {
                return {
                    statusCode: 401,
                    headers,
                    body: JSON.stringify({ error: 'Invalid API key' })
                };
            } else {
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ error: `Failed to fetch voices: ${errorText}` })
                };
            }
        }

        const voicesData = await response.json();
        console.log('Voices response:', { 
            hasVoices: !!voicesData?.voices,
            voiceCount: voicesData?.voices?.length || 0
        });

        // Handle different response structures
        const voices = voicesData?.voices || voicesData || [];
        
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ voices: voices })
        };

    } catch (error) {
        console.error('Error fetching voices:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Failed to fetch voices', 
                details: error.message,
                type: error.name
            })
        };
    }
};