pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// DOM Elements
const pdfUpload = document.getElementById('pdf-upload');
const pdfContent = document.getElementById('pdf-content');
const playBtn = document.getElementById('play-btn');
const pauseBtn = document.getElementById('pause-btn');
const stopBtn = document.getElementById('stop-btn');
const resumeBtn = document.getElementById('resume-btn');
const ttsProvider = document.getElementById('tts-provider');
const voiceSelect = document.getElementById('voice-select');
const voiceOptions = document.getElementById('voice-options');
const comboboxToggle = document.querySelector('.combobox-toggle');
const elevenlabsSettings = document.getElementById('elevenlabs-settings');
const browserSettings = document.getElementById('browser-settings');
const speecht5Settings = document.getElementById('speecht5-settings');
const speecht5Loading = document.getElementById('speecht5-loading');
const speecht5Speaker = document.getElementById('speecht5-speaker');
const speecht5CustomUrl = document.getElementById('speecht5-custom-url');
const speecht5EmbeddingUrl = document.getElementById('speecht5-embedding-url');
const kokoroSettings = document.getElementById('kokoro-settings');
const kokoroLoading = document.getElementById('kokoro-loading');
const kokoroVoice = document.getElementById('kokoro-voice');
const kokoroQuality = document.getElementById('kokoro-quality');
const elevenlabsApiKey = document.getElementById('elevenlabs-api-key');
const elevenlabsVoice = document.getElementById('elevenlabs-voice');
const rateSlider = document.getElementById('rate');
const pitchSlider = document.getElementById('pitch');
const volumeSlider = document.getElementById('volume');
const progressFill = document.getElementById('progress-fill');
const currentPositionEl = document.getElementById('current-position');
const totalLength = document.getElementById('total-length');

// Global variables
let fullText = '';
let voices = [];
let currentUtterance = null;
let currentAudio = null;
let isPlaying = false;
let isPaused = false;
let currentCharPosition = 0;

// Environment detection for API endpoints
const API_BASE = window.location.hostname === 'localhost' ? '/api' : '/.netlify/functions';
const IS_LOCAL = window.location.hostname === 'localhost';

// TTS Provider Management
class TTSManager {
    constructor() {
        this.currentProvider = 'browser';
        this.setupEventListeners();
    }

    setupEventListeners() {
        ttsProvider.addEventListener('change', (e) => {
            this.switchProvider(e.target.value);
        });
    }

    switchProvider(provider) {
        this.currentProvider = provider;
        if (provider === 'browser') {
            browserSettings.style.display = 'block';
            elevenlabsSettings.style.display = 'none';
            speecht5Settings.style.display = 'none';
            kokoroSettings.style.display = 'none';
        } else if (provider === 'elevenlabs') {
            browserSettings.style.display = 'none';
            elevenlabsSettings.style.display = 'block';
            speecht5Settings.style.display = 'none';
            kokoroSettings.style.display = 'none';
            // Load ElevenLabs voices when switching to that provider
            loadElevenLabsVoices();
        } else if (provider === 'speecht5') {
            browserSettings.style.display = 'none';
            elevenlabsSettings.style.display = 'none';
            speecht5Settings.style.display = 'block';
            kokoroSettings.style.display = 'none';
        } else if (provider === 'kokoro') {
            browserSettings.style.display = 'none';
            elevenlabsSettings.style.display = 'none';
            speecht5Settings.style.display = 'none';
            kokoroSettings.style.display = 'block';
        }
    }

    async speak(text) {
        this.stop(); // Stop any current playback
        
        if (this.currentProvider === 'browser') {
            return this.speakBrowser(text);
        } else if (this.currentProvider === 'elevenlabs') {
            return this.speakElevenLabs(text);
        } else if (this.currentProvider === 'speecht5') {
            return this.speakSpeechT5(text);
        } else if (this.currentProvider === 'kokoro') {
            return this.speakKokoro(text);
        }
    }

    speakBrowser(text) {
        return new Promise((resolve, reject) => {
            if (!text) {
                reject(new Error('No text provided'));
                return;
            }

            currentUtterance = new SpeechSynthesisUtterance(text);
            const selectedVoiceName = voiceSelect.getAttribute('data-selected-voice');
            const voice = voices.find(v => v.name === selectedVoiceName);
            
            if (voice) currentUtterance.voice = voice;
            currentUtterance.rate = parseFloat(rateSlider.value);
            currentUtterance.pitch = parseFloat(pitchSlider.value);
            currentUtterance.volume = parseFloat(volumeSlider.value);

            currentUtterance.onstart = () => {
                isPlaying = true;
                this.updatePlayButtons();
            };

            currentUtterance.onend = () => {
                isPlaying = false;
                isPaused = false;
                this.updatePlayButtons();
                resolve();
            };

            currentUtterance.onerror = (event) => {
                isPlaying = false;
                isPaused = false;
                this.updatePlayButtons();
                reject(new Error(`Speech synthesis error: ${event.error}`));
            };

            speechSynthesis.speak(currentUtterance);
        });
    }

    async speakElevenLabs(text) {
        console.log('ElevenLabs TTS starting...', { textLength: text.length });
        
        const apiKey = elevenlabsApiKey.value.trim();
        if (!apiKey) {
            throw new Error('ElevenLabs API key is required. See the link below to create an account for free.');
        }

        const voiceId = elevenlabsVoice.value;
        console.log('Using voice ID:', voiceId);
        
        try {
            console.log('Sending request to backend...');
            // Use our backend proxy instead of direct API call
            const response = await fetch(`${API_BASE}/tts/elevenlabs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voiceId: voiceId,
                    apiKey: apiKey,
                    settings: {
                        modelId: 'eleven_monolingual_v1',
                        stability: 0.5,
                        similarityBoost: 0.5
                    }
                })
            });

            console.log('Backend response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Backend error:', errorData);
                throw new Error(errorData.error || `Server error: ${response.status}`);
            }

            console.log('Getting audio blob...');
            const audioBlob = await response.blob();
            console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type);
            
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created audio URL:', audioUrl);
            
            currentAudio = new Audio(audioUrl);
            
            return new Promise((resolve, reject) => {
                currentAudio.onloadstart = () => {
                    console.log('Audio loading started');
                };

                currentAudio.oncanplay = () => {
                    console.log('Audio can play');
                };

                currentAudio.onplay = () => {
                    console.log('Audio playback started');
                    isPlaying = true;
                    this.updatePlayButtons();
                };

                currentAudio.onended = () => {
                    console.log('Audio playback ended');
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                currentAudio.onerror = (event) => {
                    console.error('Audio playback error:', event);
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Audio playback error'));
                };

                console.log('Starting audio playback...');
                currentAudio.play().catch(error => {
                    console.error('Play promise rejected:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            throw new Error(`ElevenLabs request failed: ${error.message}`);
        }
    }

    async speakSpeechT5(text) {
        console.log('SpeechT5 TTS starting...', { textLength: text.length });
        
        // Get speaker embedding setting
        const speakerSetting = speecht5Speaker.value;
        let speakerEmbedding = null;
        
        if (speakerSetting === 'custom') {
            speakerEmbedding = speecht5EmbeddingUrl.value.trim();
            if (!speakerEmbedding) {
                throw new Error('Custom speaker embedding URL is required');
            }
        }
        
        console.log('Using SpeechT5 speaker setting:', speakerSetting);
        
        // Show loading indicator
        if (speecht5Loading) {
            speecht5Loading.style.display = 'flex';
        }
        
        try {
            console.log('Sending request to SpeechT5 backend...');
            const response = await fetch(`${API_BASE}/tts/speecht5`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    speakerEmbedding: speakerEmbedding
                })
            });

            console.log('SpeechT5 backend response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('SpeechT5 backend error:', errorData);
                
                if (response.status === 503 && errorData.error && errorData.error.includes('downloading')) {
                    throw new Error('SpeechT5 model is downloading for first-time use. This may take 5-10 minutes depending on your internet connection. Please try again in a few minutes.');
                } else if (response.status === 503 && errorData.error && errorData.error.includes('loading')) {
                    throw new Error('SpeechT5 model is loading. Please wait a moment and try again.');
                } else {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }
            }

            console.log('Getting SpeechT5 audio blob...');
            const audioBlob = await response.blob();
            console.log('SpeechT5 audio blob size:', audioBlob.size, 'type:', audioBlob.type);
            
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created SpeechT5 audio URL:', audioUrl);
            
            currentAudio = new Audio(audioUrl);
            
            return new Promise((resolve, reject) => {
                currentAudio.onloadstart = () => {
                    console.log('SpeechT5 audio loading started');
                };

                currentAudio.oncanplay = () => {
                    console.log('SpeechT5 audio can play');
                };

                currentAudio.onplay = () => {
                    console.log('SpeechT5 audio playback started');
                    isPlaying = true;
                    this.updatePlayButtons();
                };

                currentAudio.onended = () => {
                    console.log('SpeechT5 audio playback ended');
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                currentAudio.onerror = (event) => {
                    console.error('SpeechT5 audio playback error:', event);
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('SpeechT5 audio playback error'));
                };

                console.log('Starting SpeechT5 audio playback...');
                currentAudio.play().catch(error => {
                    console.error('SpeechT5 play promise rejected:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('SpeechT5 TTS error:', error);
            throw new Error(`SpeechT5 request failed: ${error.message}`);
        } finally {
            // Hide loading indicator
            if (speecht5Loading) {
                speecht5Loading.style.display = 'none';
            }
        }
    }

    async speakKokoro(text) {
        console.log('Kokoro TTS starting...', { textLength: text.length });
        
        const voice = kokoroVoice.value;
        const quality = kokoroQuality.value;
        
        console.log('Using Kokoro voice:', voice, 'quality:', quality);
        
        // Show loading indicator
        if (kokoroLoading) {
            kokoroLoading.style.display = 'flex';
        }
        
        try {
            console.log('Sending request to Kokoro backend...');
            const response = await fetch(`${API_BASE}/tts/kokoro`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    voice: voice,
                    quality: quality
                })
            });

            console.log('Kokoro backend response status:', response.status);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Kokoro backend error:', errorData);
                
                if (response.status === 503 && errorData.error && errorData.error.includes('downloading')) {
                    throw new Error('Kokoro model is downloading for first-time use. This may take 5-10 minutes depending on your internet connection. Please try again in a few minutes.');
                } else if (response.status === 503 && errorData.error && errorData.error.includes('loading')) {
                    throw new Error('Kokoro model is loading. Please wait a moment and try again.');
                } else {
                    throw new Error(errorData.error || `Server error: ${response.status}`);
                }
            }

            console.log('Getting Kokoro audio blob...');
            const audioBlob = await response.blob();
            console.log('Kokoro audio blob size:', audioBlob.size, 'type:', audioBlob.type);
            
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Created Kokoro audio URL:', audioUrl);
            
            currentAudio = new Audio(audioUrl);
            
            return new Promise((resolve, reject) => {
                currentAudio.onloadstart = () => {
                    console.log('Kokoro audio loading started');
                };

                currentAudio.oncanplay = () => {
                    console.log('Kokoro audio can play');
                };

                currentAudio.onplay = () => {
                    console.log('Kokoro audio playback started');
                    isPlaying = true;
                    this.updatePlayButtons();
                };

                currentAudio.onended = () => {
                    console.log('Kokoro audio playback ended');
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };

                currentAudio.onerror = (event) => {
                    console.error('Kokoro audio playback error:', event);
                    isPlaying = false;
                    isPaused = false;
                    this.updatePlayButtons();
                    URL.revokeObjectURL(audioUrl);
                    reject(new Error('Kokoro audio playback error'));
                };

                console.log('Starting Kokoro audio playback...');
                currentAudio.play().catch(error => {
                    console.error('Kokoro play promise rejected:', error);
                    reject(error);
                });
            });

        } catch (error) {
            console.error('Kokoro TTS error:', error);
            throw new Error(`Kokoro request failed: ${error.message}`);
        } finally {
            // Hide loading indicator
            if (kokoroLoading) {
                kokoroLoading.style.display = 'none';
            }
        }
    }

    pause() {
        if (this.currentProvider === 'browser' && currentUtterance) {
            speechSynthesis.pause();
            isPaused = true;
        } else if (currentAudio) {
            currentAudio.pause();
            isPaused = true;
        }
        this.updatePlayButtons();
    }

    resume() {
        if (this.currentProvider === 'browser') {
            speechSynthesis.resume();
            isPaused = false;
        } else if (currentAudio) {
            currentAudio.play();
            isPaused = false;
        }
        this.updatePlayButtons();
    }

    stop() {
        if (this.currentProvider === 'browser') {
            speechSynthesis.cancel();
        } else if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }
        isPlaying = false;
        isPaused = false;
        this.updatePlayButtons();
    }

    updatePlayButtons() {
        if (isPlaying && !isPaused) {
            playBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
        } else if (isPaused) {
            playBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'inline-block';
        } else {
            playBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
        }
    }
}

// Initialize TTS Manager
const ttsManager = new TTSManager();

// Browser voice management
function populateVoiceList() {
    voices = speechSynthesis.getVoices();
    voiceOptions.innerHTML = '';
    
    let selectedVoice = null;
    
    voices.forEach((voice, index) => {
        const option = document.createElement('li');
        option.textContent = `${voice.name} (${voice.lang})`;
        option.setAttribute('data-lang', voice.lang);
        option.setAttribute('data-name', voice.name);
        option.setAttribute('role', 'option');
        option.setAttribute('id', `voice-option-${index}`);
        option.setAttribute('tabindex', '-1');
        
        option.addEventListener('click', () => {
            selectVoiceOption(option);
        });
        
        voiceOptions.appendChild(option);
        
        // Select first voice by default if none selected
        if (index === 0 && !selectedVoice) {
            selectedVoice = option;
        }
    });
    
    // Initialize with first voice if available
    if (selectedVoice) {
        selectVoiceOption(selectedVoice);
    }
    
    // Set up combobox functionality
    setupCombobox();
}

// Combobox functionality
function setupCombobox() {
    let isOpen = false;
    let highlightedIndex = -1;
    
    // Toggle dropdown
    comboboxToggle.addEventListener('click', () => {
        toggleDropdown();
    });
    
    // Input focus
    voiceSelect.addEventListener('focus', () => {
        voiceSelect.setAttribute('aria-expanded', 'true');
    });
    
    // Input click
    voiceSelect.addEventListener('click', () => {
        if (!isOpen) {
            toggleDropdown();
        }
    });
    
    // Filter as user types
    voiceSelect.addEventListener('input', () => {
        const filterText = voiceSelect.value.toLowerCase();
        filterVoiceOptions(filterText);
        
        // Show dropdown when typing
        if (!isOpen) {
            toggleDropdown();
        }
    });
    
    // Handle keyboard navigation
    voiceSelect.addEventListener('keydown', (e) => {
        const options = Array.from(voiceOptions.querySelectorAll('li:not([hidden])'));
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    toggleDropdown();
                } else {
                    highlightedIndex = Math.min(highlightedIndex + 1, options.length - 1);
                    updateHighlight(options);
                }
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    highlightedIndex = Math.max(highlightedIndex - 1, 0);
                    updateHighlight(options);
                }
                break;
                
            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
                    selectVoiceOption(options[highlightedIndex]);
                    toggleDropdown(false);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                toggleDropdown(false);
                break;
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!voiceSelect.contains(e.target) && 
            !comboboxToggle.contains(e.target) && 
            !voiceOptions.contains(e.target)) {
            toggleDropdown(false);
        }
    });
    
    // Helper functions
    function toggleDropdown(force) {
        isOpen = force !== undefined ? force : !isOpen;
        voiceOptions.hidden = !isOpen;
        voiceSelect.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        
        if (isOpen) {
            // Reset highlight
            highlightedIndex = -1;
            updateHighlight(Array.from(voiceOptions.querySelectorAll('li:not([hidden])')));
        }
    }
    
    function updateHighlight(options) {
        options.forEach((opt, idx) => {
            opt.classList.toggle('highlighted', idx === highlightedIndex);
            if (idx === highlightedIndex) {
                opt.scrollIntoView({ block: 'nearest' });
            }
        });
    }
    
    function filterVoiceOptions(filterText) {
        const options = voiceOptions.querySelectorAll('li');
        let visibleCount = 0;
        
        options.forEach(option => {
            const text = option.textContent.toLowerCase();
            const isMatch = text.includes(filterText);
            option.hidden = !isMatch;
            
            if (isMatch) visibleCount++;
        });
        
        // If no matches, show all
        if (visibleCount === 0) {
            options.forEach(option => {
                option.hidden = false;
            });
        }
    }
}

function selectVoiceOption(option) {
    // Update all options
    const allOptions = voiceOptions.querySelectorAll('li');
    allOptions.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    
    // Update input value
    voiceSelect.value = option.textContent;
    
    // Store selected voice name as data attribute
    voiceSelect.setAttribute('data-selected-voice', option.getAttribute('data-name'));
}

// ElevenLabs voice management
async function loadElevenLabsVoices() {
    const apiKey = elevenlabsApiKey.value.trim();
    const voiceSelect = document.getElementById('elevenlabs-voice');
    
    // Set default voices first
    voiceSelect.innerHTML = `
        <option value="JBFqnCBsd6RMkjVDRZzb">Rachel (Default)</option>
        <option value="TxGEqnHWrfWFTfGW9XjX">Josh (Default)</option>
        <option value="AZnzlk1XvdvUeBnXmlld">Domi (Default)</option>
        <option value="EXAVITQu4vr4xnSDxMaL">Bella (Default)</option>
    `;
    
    if (!apiKey) {
        console.log('No API key provided for ElevenLabs voices, using defaults');
        return;
    }

    try {
        console.log('Loading ElevenLabs voices...');
        const response = await fetch(`${API_BASE}/tts/elevenlabs-voices`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ apiKey: apiKey })
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Voices API response:', data);
            
            if (data.voices && data.voices.length > 0) {
                // Clear and repopulate with API voices
                voiceSelect.innerHTML = '';
                
                data.voices.forEach(voice => {
                    const option = document.createElement('option');
                    // Handle both voice_id and voiceId properties
                    option.value = voice.voice_id || voice.voiceId;
                    option.textContent = `${voice.name} (${voice.category || 'Custom'})`;
                    voiceSelect.appendChild(option);
                });
                
                console.log(`Loaded ${data.voices.length} ElevenLabs voices from API`);
            } else {
                console.warn('No voices returned from API, keeping defaults');
            }
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.warn('Failed to load ElevenLabs voices:', response.status, errorData);
            // Keep default voices on error
        }
    } catch (error) {
        console.error('Error loading ElevenLabs voices:', error);
        // Keep default voices on error
    }
}

// Load ElevenLabs voices when API key changes
elevenlabsApiKey.addEventListener('blur', loadElevenLabsVoices);

// Handle SpeechT5 speaker selection change
speecht5Speaker.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        speecht5CustomUrl.style.display = 'block';
    } else {
        speecht5CustomUrl.style.display = 'none';
    }
});

populateVoiceList();
if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populateVoiceList;
}

// PDF upload and processing
pdfUpload.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Show loading message
    pdfContent.textContent = 'Loading PDF...';
    
    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const typedarray = new Uint8Array(e.target.result);
            const pdf = await pdfjsLib.getDocument(typedarray).promise;
            
            const numPages = pdf.numPages;
            console.log(`PDF has ${numPages} pages`);
            
            let fullTextContent = '';
            
            // Process pages sequentially to maintain order
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                try {
                    const page = await pdf.getPage(pageNum);
                    const textContent = await page.getTextContent();
                    
                    let pageText = '';
                    textContent.items.forEach(item => {
                        if (item.str) {
                            pageText += item.str + ' ';
                        }
                    });
                    
                    fullTextContent += pageText + '\n\n';
                    console.log(`Processed page ${pageNum}, text length: ${pageText.length}`);
                    
                    // Update progress during loading
                    pdfContent.textContent = `Loading... ${pageNum}/${numPages} pages processed`;
                    
                } catch (pageError) {
                    console.error(`Error processing page ${pageNum}:`, pageError);
                }
            }
            
            // Final text processing
            fullText = fullTextContent.trim();
            
            if (fullText.length > 0) {
                pdfContent.textContent = fullText;
                totalLength.textContent = fullText.length;
                updateProgress(0);
                console.log(`PDF extraction complete. Total text length: ${fullText.length}`);
            } else {
                pdfContent.textContent = 'No text found in this PDF. The PDF might contain only images or be password protected.';
                console.warn('No text extracted from PDF');
            }
            
        } catch (error) {
            console.error('PDF processing error:', error);
            pdfContent.textContent = 'Error loading PDF: ' + error.message;
            alert('Error loading PDF: ' + error.message);
        }
    };

    reader.onerror = function(error) {
        console.error('File reading error:', error);
        pdfContent.textContent = 'Error reading file';
        alert('Error reading file');
    };

    reader.readAsArrayBuffer(file);
});

// Text chunking for long documents
function chunkText(text, maxLength = 500) {
    const sentences = text.match(/[^\.!?]+[\.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length <= maxLength) {
            currentChunk += sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

// Progress tracking
function updateProgress(position, totalLength = null) {
    const currentText = pdfContent.textContent || pdfContent.innerText || '';
    const total = totalLength || currentText.length;
    const percentage = total > 0 ? (position / total) * 100 : 0;
    progressFill.style.width = `${percentage}%`;
    currentPositionEl.textContent = position;
    
    // Update total length display if provided
    if (totalLength !== null) {
        totalLength.textContent = total;
    }
}

// Playback with chunking
async function playTextInChunks(text) {
    console.log('Starting chunked playback, text length:', text.length);
    
    // Set playing state before starting
    isPlaying = true;
    isPaused = false;
    ttsManager.updatePlayButtons();
    
    const chunks = chunkText(text, 500);
    console.log('Created chunks:', chunks.length);
    let totalProcessed = 0;

    try {
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Processing chunk ${i + 1}/${chunks.length}, length: ${chunk.length}`);
            console.log('Current state - isPlaying:', isPlaying, 'isPaused:', isPaused);
            
            if (!isPlaying || isPaused) {
                console.log('Playback stopped or paused, breaking loop');
                break;
            }
            
            await ttsManager.speak(chunk);
            totalProcessed += chunk.length;
            updateProgress(totalProcessed);
            
            console.log(`Chunk ${i + 1} completed`);
            // Small delay between chunks
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log('All chunks completed');
    } catch (error) {
        console.error('TTS Error:', error);
        alert('Text-to-speech error: ' + error.message);
    } finally {
        // Reset state when done
        isPlaying = false;
        isPaused = false;
        ttsManager.updatePlayButtons();
    }
}

// Event listeners for controls
playBtn.addEventListener('click', async () => {
    console.log('Play button clicked');
    console.log('Current provider:', ttsManager.currentProvider);
    
    // Get current text from the editable content area
    const currentText = pdfContent.textContent || pdfContent.innerText || '';
    console.log('Current text length:', currentText.length);
    
    if (!currentText.trim()) {
        alert('Please upload a PDF or enter some text first');
        return;
    }

    try {
        if (ttsManager.currentProvider === 'elevenlabs' || ttsManager.currentProvider === 'speecht5' || ttsManager.currentProvider === 'kokoro') {
            console.log('Using', ttsManager.currentProvider, 'with chunking');
            await playTextInChunks(currentText);
        } else {
            console.log('Using browser TTS');
            await ttsManager.speak(currentText);
        }
    } catch (error) {
        console.error('Playback error:', error);
        alert('Playback error: ' + error.message);
    }
});

pauseBtn.addEventListener('click', () => {
    ttsManager.pause();
});

resumeBtn.addEventListener('click', () => {
    ttsManager.resume();
});

stopBtn.addEventListener('click', () => {
    ttsManager.stop();
    updateProgress(0);
});

// Settings persistence
function saveSettings() {
    const settings = {
        provider: ttsProvider.value,
        apiKey: elevenlabsApiKey.value,
        voice: elevenlabsVoice.value,
        speecht5Speaker: speecht5Speaker.value,
        speecht5EmbeddingUrl: speecht5EmbeddingUrl.value,
        kokoroVoice: kokoroVoice.value,
        kokoroQuality: kokoroQuality.value,
        rate: rateSlider.value,
        pitch: pitchSlider.value,
        volume: volumeSlider.value
    };
    localStorage.setItem('pdfReaderSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('pdfReaderSettings');
    if (saved) {
        const settings = JSON.parse(saved);
        ttsProvider.value = settings.provider || 'browser';
        elevenlabsApiKey.value = settings.apiKey || '';
        elevenlabsVoice.value = settings.voice || 'JBFqnCBsd6RMkjVDRZzb';
        speecht5Speaker.value = settings.speecht5Speaker || 'default';
        speecht5EmbeddingUrl.value = settings.speecht5EmbeddingUrl || '';
        kokoroVoice.value = settings.kokoroVoice || 'af_bella';
        kokoroQuality.value = settings.kokoroQuality || 'q8';
        rateSlider.value = settings.rate || 1;
        pitchSlider.value = settings.pitch || 1;
        volumeSlider.value = settings.volume || 1;
        
        ttsManager.switchProvider(settings.provider || 'browser');
    }
}

// Save settings on change
[ttsProvider, elevenlabsApiKey, elevenlabsVoice, speecht5Speaker, speecht5EmbeddingUrl, kokoroVoice, kokoroQuality, rateSlider, pitchSlider, volumeSlider].forEach(element => {
    element.addEventListener('change', saveSettings);
});

// Update character count when content is edited
pdfContent.addEventListener('input', () => {
    const currentText = pdfContent.textContent || pdfContent.innerText || '';
    totalLength.textContent = currentText.length;
    updateProgress(0); // Reset progress when text changes
});

// Visual feedback for editing
pdfContent.addEventListener('focus', () => {
    console.log('Content editing started');
});

pdfContent.addEventListener('blur', () => {
    console.log('Content editing finished');
});

// Hide AI TTS options if not running locally (due to Netlify function size limits)
function configureUIForEnvironment() {
    if (!IS_LOCAL) {
        // Hide AI TTS options in production
        const speecht5Option = document.querySelector('option[value="speecht5"]');
        const kokoroOption = document.querySelector('option[value="kokoro"]');
        
        if (speecht5Option) {
            speecht5Option.style.display = 'none';
            speecht5Option.disabled = true;
        }
        if (kokoroOption) {
            kokoroOption.style.display = 'none';
            kokoroOption.disabled = true;
        }
        
        // Add info message
        const ttsSettings = document.querySelector('.tts-settings');
        const infoDiv = document.createElement('div');
        infoDiv.className = 'deployment-info';
        infoDiv.innerHTML = '<small>🏠 <strong>Local Development:</strong> AI TTS (SpeechT5, Kokoro) available with <code>npm start</code><br>☁️ <strong>Production:</strong> Browser TTS and ElevenLabs TTS available</small>';
        infoDiv.style.cssText = 'margin-top: 10px; padding: 8px; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 4px;';
        ttsSettings.appendChild(infoDiv);
    }
}

// Load settings on page load
loadSettings();
configureUIForEnvironment();