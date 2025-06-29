const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Initialize ElevenLabs client
let elevenlabsClient = null;

// Initialize ElevenLabs client with API key
function initializeElevenLabs(apiKey) {
    if (!apiKey) {
        throw new Error('ElevenLabs API key is required');
    }
    elevenlabsClient = new ElevenLabsClient({
        apiKey: apiKey
    });
    return elevenlabsClient;
}

// Route to serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ElevenLabs TTS endpoint
app.post('/api/tts/elevenlabs', async (req, res) => {
    try {
        const { text, voiceId, apiKey, settings } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!voiceId) {
            return res.status(400).json({ error: 'Voice ID is required' });
        }

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        // Initialize client with provided API key
        const client = initializeElevenLabs(apiKey);

        console.log(`Processing TTS request: ${text.length} characters, voice: ${voiceId}`);

        // Use direct HTTP API call instead of SDK
        console.log('Making direct HTTP API call to ElevenLabs...');
        
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
        console.log('Response headers:', {
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('ElevenLabs API error:', errorText);
            throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
        }

        // Get the audio buffer from the response
        const audioBuffer = await response.buffer();
        console.log('Audio buffer received, size:', audioBuffer.length);

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Empty audio buffer received from ElevenLabs');
        }

        // Set appropriate headers for audio response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', 'inline; filename="speech.mp3"');
        res.setHeader('Content-Length', audioBuffer.length.toString());

        console.log('Sending audio buffer to client, size:', audioBuffer.length);

        // Send the audio buffer
        res.send(audioBuffer);

    } catch (error) {
        console.error('ElevenLabs TTS Error:', error);
        
        if (error.message.includes('unauthorized') || error.message.includes('401')) {
            res.status(401).json({ error: 'Invalid API key' });
        } else if (error.message.includes('quota') || error.message.includes('limit')) {
            res.status(429).json({ error: 'API quota exceeded' });
        } else {
            res.status(500).json({ 
                error: 'TTS generation failed', 
                details: error.message 
            });
        }
    }
});

// ElevenLabs streaming endpoint
app.post('/api/tts/elevenlabs/stream', async (req, res) => {
    try {
        const { text, voiceId, apiKey, settings } = req.body;

        if (!text || !voiceId || !apiKey) {
            return res.status(400).json({ error: 'Text, voice ID, and API key are required' });
        }

        const client = initializeElevenLabs(apiKey);

        console.log(`Processing streaming TTS request: ${text.length} characters`);

        // Generate streaming speech
        const audioStream = await client.textToSpeech.stream(voiceId, {
            text: text,
            model_id: settings?.modelId || 'eleven_monolingual_v1',
            voice_settings: {
                stability: settings?.stability || 0.5,
                similarity_boost: settings?.similarityBoost || 0.5
            }
        });

        // Set headers for streaming response
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Transfer-Encoding', 'chunked');

        // Pipe the stream to response
        audioStream.pipe(res);

    } catch (error) {
        console.error('ElevenLabs Streaming Error:', error);
        res.status(500).json({ 
            error: 'Streaming TTS failed', 
            details: error.message 
        });
    }
});

// Bark TTS endpoint
app.post('/api/tts/bark', async (req, res) => {
    try {
        const { text, voicePreset } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        if (!voicePreset) {
            return res.status(400).json({ error: 'Voice preset is required' });
        }

        console.log(`Processing Bark TTS request: ${text.length} characters, voice: ${voicePreset}`);

        // Import transformers dynamically
        const { pipeline } = await import('@huggingface/transformers');

        // Initialize the text-to-speech pipeline for Bark
        const synthesizer = await pipeline('text-to-speech', 'suno/bark-small');

        console.log('Generating speech with Bark...');
        
        // Generate speech - Bark uses voice presets via forward_params
        const result = await synthesizer(text, {
            forward_params: {
                do_sample: true,
                history_prompt: voicePreset,
            }
        });
        
        if (!result || !result.audio) {
            throw new Error('Bark failed to generate audio output');
        }

        console.log('Bark synthesis complete, converting to audio buffer');

        // Convert Float32Array to WAV buffer 
        // Bark typically outputs at 24kHz sampling rate
        const samplingRate = result.sampling_rate || 24000;
        const audioBuffer = float32ArrayToWav(result.audio, samplingRate);

        // Set appropriate headers for WAV audio response
        res.setHeader('Content-Type', 'audio/wav');
        res.setHeader('Content-Disposition', 'inline; filename="speech.wav"');
        res.setHeader('Content-Length', audioBuffer.length.toString());

        console.log('Sending Bark audio buffer to client, size:', audioBuffer.length);

        // Send the audio buffer
        res.send(audioBuffer);

    } catch (error) {
        console.error('Bark TTS Error:', error);
        
        if (error.message.includes('fetch') && error.message.includes('model')) {
            res.status(503).json({ error: 'Model downloading or loading, please try again' });
        } else if (error.message.includes('download') || error.message.includes('loading')) {
            res.status(503).json({ error: 'Model downloading or loading, please try again' });
        } else if (error.message.includes('pipeline')) {
            res.status(503).json({ error: 'Model loading, please try again' });
        } else {
            res.status(500).json({ 
                error: 'Bark TTS generation failed', 
                details: error.message 
            });
        }
    }
});

// Helper function to convert Float32Array to WAV buffer
function float32ArrayToWav(float32Array, sampleRate = 24000) {
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

// Get available voices endpoint
app.post('/api/tts/elevenlabs/voices', async (req, res) => {
    try {
        const { apiKey } = req.body;

        console.log('Voices request received:', { hasApiKey: !!apiKey });

        if (!apiKey) {
            return res.status(400).json({ error: 'API key is required' });
        }

        console.log('Initializing ElevenLabs client...');
        const client = initializeElevenLabs(apiKey);
        
        console.log('Fetching voices from ElevenLabs...');
        const voicesResponse = await client.voices.getAll();
        
        console.log('Voices response:', { 
            type: typeof voicesResponse, 
            hasVoices: !!voicesResponse?.voices,
            voiceCount: voicesResponse?.voices?.length || 0
        });

        // Handle different response structures
        const voices = voicesResponse?.voices || voicesResponse || [];
        
        res.json({ voices: voices });

    } catch (error) {
        console.error('Error fetching voices:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        
        res.status(500).json({ 
            error: 'Failed to fetch voices', 
            details: error.message,
            type: error.name
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
    console.log(`PDF Reader server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;