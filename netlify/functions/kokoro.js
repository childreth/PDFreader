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
        const { text, voice, quality } = JSON.parse(event.body);

        if (!text) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        if (!voice) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Voice is required' })
            };
        }

        console.log(`Processing Kokoro TTS request: ${text.length} characters, voice: ${voice}, quality: ${quality}`);

        // Import kokoro-js dynamically
        const { KokoroTTS } = await import('kokoro-js');

        console.log('Initializing Kokoro TTS model...');
        
        // Initialize Kokoro with the specified quality/quantization
        const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-ONNX', {
            dtype: quality || 'q8',
        });

        console.log('Generating speech with Kokoro...');
        
        // Generate speech
        const audio = await tts.generate(text, {
            voice: voice,
        });
        
        if (!audio || !audio.audio) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Kokoro failed to generate audio output' })
            };
        }

        console.log('Kokoro synthesis complete, converting to audio buffer');

        // Get the audio data
        const audioData = audio.audio;
        const samplingRate = audio.sampling_rate || 22050; // Kokoro default sampling rate
        
        // Convert to WAV buffer
        const audioBuffer = float32ArrayToWav(audioData, samplingRate);

        console.log('Sending Kokoro audio buffer to client, size:', audioBuffer.length);

        // Return the audio buffer
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'audio/wav',
                'Content-Disposition': 'inline; filename="speech.wav"',
                'Content-Length': audioBuffer.length.toString()
            },
            body: audioBuffer.toString('base64'),
            isBase64Encoded: true
        };

    } catch (error) {
        console.error('Kokoro TTS Error:', error);
        
        if (error.message.includes('fetch') && error.message.includes('model')) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ error: 'Model downloading or loading, please try again' })
            };
        } else if (error.message.includes('download') || error.message.includes('loading')) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ error: 'Model downloading or loading, please try again' })
            };
        } else if (error.message.includes('from_pretrained')) {
            return {
                statusCode: 503,
                headers,
                body: JSON.stringify({ error: 'Model loading, please try again' })
            };
        } else {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Kokoro TTS generation failed', 
                    details: error.message 
                })
            };
        }
    }
};

// Helper function to convert Float32Array to WAV buffer
function float32ArrayToWav(float32Array, sampleRate = 22050) {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + float32Array.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, float32Array.length * 2, true);
    
    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < float32Array.length; i++) {
        const sample = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
    }
    
    return Buffer.from(buffer);
}