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
        const { text, speakerEmbedding } = JSON.parse(event.body);

        if (!text) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Text is required' })
            };
        }

        console.log(`Processing SpeechT5 TTS request: ${text.length} characters`);

        // Import transformers dynamically
        const { pipeline } = await import('@huggingface/transformers');

        // Initialize the text-to-speech pipeline for SpeechT5
        const synthesizer = await pipeline('text-to-speech', 'Xenova/speecht5_tts', {
            quantized: false,
        });

        console.log('Generating speech with SpeechT5...');
        
        // Use default speaker embeddings if not provided
        const defaultSpeakerEmbeddings = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/speaker_embeddings.bin';
        
        // Generate speech
        const result = await synthesizer(text, {
            speaker_embeddings: speakerEmbedding || defaultSpeakerEmbeddings,
        });
        
        if (!result || !result.audio) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'SpeechT5 failed to generate audio output' })
            };
        }

        console.log('SpeechT5 synthesis complete, converting to audio buffer');

        // Convert Float32Array to WAV buffer 
        // SpeechT5 typically outputs at 16kHz sampling rate
        const samplingRate = result.sampling_rate || 16000;
        const audioBuffer = float32ArrayToWav(result.audio, samplingRate);

        console.log('Sending SpeechT5 audio buffer to client, size:', audioBuffer.length);

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
        console.error('SpeechT5 TTS Error:', error);
        
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
        } else if (error.message.includes('pipeline')) {
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
                    error: 'SpeechT5 TTS generation failed', 
                    details: error.message 
                })
            };
        }
    }
};

// Helper function to convert Float32Array to WAV buffer
function float32ArrayToWav(float32Array, sampleRate = 16000) {
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