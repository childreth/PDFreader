# PDF Reader with AI Text-to-Speech

A powerful web application that extracts text from PDF files and converts it to speech using multiple TTS providers including local AI models and cloud services.

## 🚀 Features

### **PDF Processing**
- **PDF Text Extraction**: Upload and extract text from PDF files
- **Editable Text**: Edit extracted text before converting to speech
- **Progress Tracking**: Visual progress bar and character counting

### **Multiple TTS Providers**
- 🗣️ **Browser TTS** (Local): Native browser text-to-speech with voice customization
- 🤖 **SpeechT5** (Local AI): High-quality AI-generated speech using Microsoft's SpeechT5
- 🎵 **Kokoro** (Local AI): Premium AI voices with multiple English speakers
- ☁️ **ElevenLabs** (Cloud): Professional-grade cloud TTS with premium voices

### **Advanced Controls**
- Play, pause, resume, stop functionality
- Text chunking for long documents
- Voice rate, pitch, and volume controls
- Settings persistence across sessions

## 📋 Prerequisites

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (for cloning) - [Download here](https://git-scm.com/)

## 🛠️ Local Development Setup

### 1. **Clone the Repository**
```bash
git clone <your-repo-url>
cd PDFreader
```

### 2. **Install Dependencies**
```bash
npm install
```

This will install all required packages including:
- `@huggingface/transformers` - For SpeechT5 AI TTS
- `kokoro-js` - For Kokoro AI TTS  
- `@elevenlabs/elevenlabs-js` - For ElevenLabs cloud TTS
- `express` - Web server
- Other supporting libraries

### 3. **Optional: ElevenLabs Setup**
For cloud TTS features, create a `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and add your ElevenLabs API key:
```env
ELEVENLABS_API_KEY=your_api_key_here
PORT=3000
```
> 💡 **Tip**: Get a free ElevenLabs API key at [elevenlabs.io](https://try.elevenlabs.io/lvh6muiveyp0)

### 4. **Start the Development Server**
```bash
npm start
```

### 5. **Open in Browser**
Navigate to `http://localhost:3000`

## 🎯 How to Use

### **Basic Usage**
1. **Upload PDF**: Click "Choose File" and select a PDF
2. **Select TTS Provider**: Choose from the dropdown menu
3. **Configure Voice**: Adjust settings for your chosen provider
4. **Play**: Click the play button to start text-to-speech

### **TTS Provider Guide**

#### 🗣️ **Browser TTS (Always Available)**
- **Setup**: No setup required
- **Features**: System voices, rate/pitch/volume controls
- **Best for**: Quick testing, no internet required

#### 🤖 **SpeechT5 (Local AI)**
- **Setup**: No additional setup needed
- **Features**: High-quality AI speech, custom speaker embeddings
- **First use**: Downloads ~200MB model (one-time)
- **Best for**: High-quality offline speech

#### 🎵 **Kokoro (Local AI)**
- **Setup**: No additional setup needed
- **Features**: Multiple English accents (American/British), quality settings
- **First use**: Downloads ~200MB model (one-time)
- **Voices**: Bella, Nicole, Sarah, Sky, Adam, Michael, Emma, Isabella, George, Lewis
- **Best for**: Natural-sounding voices with accent variety

#### ☁️ **ElevenLabs (Cloud)**
- **Setup**: Requires API key
- **Features**: Professional voice cloning, emotion control
- **Best for**: Production use, highest quality

## 🏗️ Project Structure

```
PDFreader/
├── index.html              # Main application interface
├── style.css               # Application styling
├── script.js               # Frontend logic and TTS management
├── server.js               # Express server with TTS endpoints
├── package.json            # Node.js dependencies and scripts
├── netlify/                # Netlify deployment functions
│   └── functions/          
├── netlify.toml            # Netlify configuration
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🔧 Development Commands

```bash
# Start development server (full features)
npm start

# Alternative dev command
npm run dev

# Test Netlify functions locally (requires Netlify CLI)
npm run netlify:dev
```

## 🚨 Troubleshooting

### **PDF Issues**
- ❌ **PDF won't load**: Check if PDF is password-protected
- ❌ **No text extracted**: PDF might contain only images
- ✅ **Solution**: Try a different PDF or use OCR tools first

### **AI TTS Issues**
- ❌ **SpeechT5/Kokoro not working**: Model downloading on first use
- ❌ **"Model loading" errors**: Wait 5-10 minutes for initial download
- ✅ **Solution**: Check browser console for download progress

### **ElevenLabs Issues**
- ❌ **API key errors**: Verify key is correct and has credits
- ❌ **Quota exceeded**: Check your ElevenLabs account limits
- ✅ **Solution**: Get free credits at [elevenlabs.io](https://try.elevenlabs.io/lvh6muiveyp0)

### **Server Issues**
- ❌ **Port 3000 in use**: Change PORT in `.env` or stop other services
- ❌ **Dependencies missing**: Run `npm install` again
- ✅ **Solution**: Check terminal output for specific error messages

## 🌐 Production Deployment

This app is optimized for **local development** with full AI features. For production deployment:

- ✅ **Netlify/Vercel**: Browser TTS + ElevenLabs TTS
- ❌ **AI TTS**: Not available in serverless (model size limits)
- 💡 **Recommendation**: Use local development for full features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Test locally with `npm start`
4. Submit a pull request

## 📄 License

ISC License - see LICENSE file for details

---

## 🎉 Quick Start Summary

```bash
# Clone and setup
git clone <repo-url> && cd PDFreader
npm install

# Start developing
npm start

# Open browser
open http://localhost:3000
```

**That's it!** You now have access to all TTS providers including AI models for high-quality speech generation. 🚀