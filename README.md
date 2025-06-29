# PDF Reader with Text-to-Speech

A web application that extracts text from PDF files and converts it to speech using both local browser TTS and ElevenLabs cloud TTS.

## Features

- **PDF Text Extraction**: Upload and extract text from PDF files
- **Dual TTS Support**: 
  - Local browser text-to-speech (offline)
  - ElevenLabs cloud TTS (high-quality voices)
- **Advanced Controls**: Play, pause, resume, stop, and progress tracking
- **Voice Customization**: Adjust rate, pitch, volume for browser TTS
- **Text Chunking**: Smart text processing for long documents
- **Responsive Design**: Works on desktop and mobile devices
- **Settings Persistence**: Auto-saves preferences

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm
- ElevenLabs API key (for cloud TTS features)

### Installation

1. **Clone/Download the project**
   ```bash
   cd PDFreader
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file and add your ElevenLabs API key:
   ```
   ELEVENLABS_API_KEY=your_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## Usage

### Browser TTS (Local)
1. Select "Browser (Local)" as TTS provider
2. Choose a voice from your system's available voices
3. Adjust rate, pitch, and volume as needed
4. Upload a PDF and click Play

### ElevenLabs TTS (Cloud)
1. Select "ElevenLabs (Cloud)" as TTS provider
2. Enter your ElevenLabs API key
3. Choose from available voices (loads automatically)
4. Upload a PDF and click Play

## API Endpoints

The backend provides the following endpoints:

- `GET /` - Serves the main application
- `GET /api/health` - Health check
- `POST /api/tts/elevenlabs` - Generate speech using ElevenLabs
- `POST /api/tts/elevenlabs/stream` - Stream speech generation
- `POST /api/tts/elevenlabs/voices` - Get available voices

## Project Structure

```
PDFreader/
├── index.html          # Frontend HTML
├── style.css           # Styling
├── script.js           # Frontend JavaScript
├── server.js           # Backend Express server
├── package.json        # Node.js dependencies
├── .env.example        # Environment variables template
└── README.md           # This file
```

## Dependencies

### Frontend
- PDF.js - PDF text extraction
- HTML5 Audio API - Audio playback
- Web Speech API - Browser TTS

### Backend
- Express.js - Web server
- @elevenlabs/elevenlabs-js - ElevenLabs SDK
- cors - Cross-origin resource sharing
- dotenv - Environment variable management

## Security Notes

- API keys are sent from frontend to backend (not stored server-side)
- CORS is enabled for development
- No persistent storage of sensitive data

## Troubleshooting

### PDF Not Loading
- Check browser console for errors
- Ensure PDF is not password protected
- Try a different PDF file

### ElevenLabs Not Working
- Verify API key is correct
- Check network connection
- Monitor browser console for API errors
- Ensure you have sufficient ElevenLabs credits

### Server Issues
- Verify Node.js version (v14+)
- Check if port 3000 is available
- Review server logs for errors

## Development

To run in development mode:
```bash
npm run dev
```

The server will restart automatically when you make changes to server.js.

## License

ISC License