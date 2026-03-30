# 🎤 QUICK START GUIDE - Voice Features

## 30-Second Setup

```powershell
# Terminal 1: Start Backend
cd c:\Users\NG\Desktop\ad_chatbot\NG_chatbot\backend
python app.py

# Terminal 2: Start Frontend (wait 3 seconds after backend starts)
cd c:\Users\NG\Desktop\ad_chatbot\NG_chatbot\frontend
npm run dev
```

## 10-Second Test

1. Open browser: `http://localhost:5173`
2. Click "Select Role" → Choose any role
3. Click 🎤 microphone button
4. Say anything in English or Hindi
5. 🔊 Hear AI respond!

**Done!** ✨

---

## What Happens

| Step | Time | What Happens |
|------|------|--------------|
| 1 | 1s | You speak |
| 2 | 1s | Text appears on screen |
| 3 | 1-3s | Backend processes |
| 4 | 1-2s | TTS generates audio* |
| 5 | 2-5s | You hear response |

**Total: 5-8 seconds**

*First time only: 30-50 seconds (model downloads once, then cached)

---

## Key Points

✅ **First Load:** Wait ~30-50 seconds for voice model to download (one-time)  
✅ **Subsequent Loads:** Instant (uses cached model)  
✅ **Languages:** English ↔ Hindi ↔ Marathi (auto-switch)  
✅ **No Setup:** Just npm install already done  
✅ **Ready to Use:** Everything is configured  

---

## If Something's Wrong

### Mic not working?
→ Check browser console (F12): Look for errors  
→ Grant microphone permission when asked  
→ Refresh page (Ctrl+R)

### No voice output?
→ Check speaker volume  
→ Wait for "Loading voice model" to complete  
→ Check console for errors  
→ See `VOICE_SETUP_GUIDE.md` for full troubleshooting

### Whole app not loading?
→ Make sure backend is running  
→ Check if `npm install` completed  
→ Rebuild: `npm run build`  
→ See error in browser console (F12)

---

## Test Checklist

Run through this quick test:

```
□ Backend running? (http://localhost:5000)
□ Frontend running? (http://localhost:5173)
□ Can see chat interface?
□ Can select a role?
□ Can type text message? (text box works?)
□ Can click mic button?
□ Can speak into microphone?
□ Do you see text appear from speech?
□ Does backend respond?
□ Do you hear voice response?
□ Can switch language?
```

If all ✅, you're good to go!

---

## Command Reference

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Create production build |
| `npm run lint` | Check code for errors |
| `npm install` | Install all dependencies |

---

## Documentation Files

```
📖 VOICE_SETUP_GUIDE.md
   └─ Complete setup & troubleshooting guide
   
📖 VOICE_IMPLEMENTATION_STATUS.md
   └─ What was implemented & verification
   
📖 VOICE_ARCHITECTURE.md
   └─ System design diagrams & flows
   
📖 IMPLEMENTATION_COMPLETE.md
   └─ Summary & next steps
```

Read these for specific issues!

---

## Important Notes

⚠️  **Models are Large (~400MB total)**
   - Downloaded on first voice use
   - Cached in browser after first time
   - Only Hindi & English preloaded

⚠️  **CORS Requirements**
   - Must use http://localhost (or HTTPS)
   - Already configured in vite.config.js
   - Not compatible with file:// protocol

⚠️  **Browser Requirements**
   - Need modern browser (Chrome 99+, Firefox 88+, Safari 14+)
   - Needs microphone access (permission popup)
   - Needs audio playback

✅ **No API Keys Needed!**
   - All voice processing is local
   - Only backend AI uses API (already configured)

---

## Example Conversations

### English Example
```
You: (click mic) "Tell me about admission process"
AI: "The admission process involves three steps..."
```

### Hindi Example
```
You: (click mic) "NavGurukul के बारे में बताओ"
AI: (speaks) "NavGurukul एक innovative program है..."
```

### Switch Language
```
1. Click language selector (top right)
2. Select "हिंदी"
3. Now speak in Hindi
4. AI responds in Hindi with Hindi voice
```

---

## Performance Expectations

### First-Time Usage
- **Download:** 30-50 seconds (voice model)
- **After:** Instant on subsequent uses

### Per Message
- **Listen:** 2-5 seconds (you speaking)
- **Process:** 1-3 seconds (network)
- **Respond:** 2-5 seconds (TTS + audio)
- **Total:** ~5-8 seconds

### Model Size
- **Hindi voice:** ~50 MB
- **English voice:** ~50 MB
- **Both cached:** ~100 MB in browser storage

---

## Advanced Features (Optional)

### Change Voice Type
Edit `src/services/speechService.js`:
```javascript
const voiceModels = {
  hindi: { ... },      // Change these
  english: { ... }
}
```

### Adjust Silence Timeout
Edit `src/hooks/useSTT.jsx`:
```javascript
silenceTimeout: 2000  // Change to 3000 for 3 seconds
```

### Add New Language
Edit `src/App.jsx` translations object and add to language selector.

---

## Production Deployment

When deploying:

```
✓ npm run build        Generate optimized bundles
✓ Copy dist/ folder    To web server
✓ Add CORS headers     (already in vite.config.js)
✓ Configure backend    Point to production API
✓ Test voice features  Make sure models load from /models/
✓ Monitor logs         Check browser console for errors
```

Models path must be `/models/` (relative to public folder).

---

## Getting Help

**For issues, check in this order:**

1. **Browser Console** (F12)
   - Look for red errors
   - Copy error message
   - Search in troubleshooting

2. **Network Tab** (F12)
   - Check if models are loading
   - Look for 404 or failed requests
   - Verify path is `/models/...`

3. **Read Docs**
   - `VOICE_SETUP_GUIDE.md` - Detailed troubleshooting
   - `VOICE_ARCHITECTURE.md` - How things work

4. **Check Paths**
   - Models: `/public/models/`
   - Workers: `/public/piper-wasm/`
   - App loads from: `http://localhost:5173`

---

## Common Errors & Fixes

| Error | Solution |
|-------|----------|
| `SpeechRecognition not supported` | Use modern browser |
| `Model fetch failed` | Check `/public/models/` exists |
| `Worker failed to load` | Check `/public/piper-wasm/` exists |
| `No sound output` | Check speaker volume & permissions |
| `App won't start` | Run `npm install` again |

---

## File Locations

```
Keep all in place:

frontend/
├── public/
│   ├── models/              ← Voice models (don't move!)
│   └── piper-wasm/          ← WASM workers (don't move!)
├── src/
│   ├── hooks/useSTT.jsx     ← Speech recognition
│   ├── hooks/useTTS.jsx     ← Text to speech
│   ├── utils/modelCache.js  ← Cache system
│   ├── services/            ← Configuration
│   └── App.jsx              ← Main app
└── package.json             ← Dependencies

Don't delete or move these files!
```

---

## Success Indicators

✅ When working correctly, you should see:

1. Page loads without errors
2. Can select a role
3. Mic button is clickable
4. Speaking triggers text input
5. Backend responds with text
6. First use: "Loading voice model: X%" message
7. Audio plays with AI response
8. No red errors in console (F12)

---

## That's It! 🎉

Your voice-enabled chatbot is ready to use.

Just:
1. Run `python app.py` (backend)
2. Run `npm run dev` (frontend)
3. Open `http://localhost:5173`
4. Click 🎤 and speak!

**Enjoy!** 🎤✨

---

For detailed setup, see: `VOICE_SETUP_GUIDE.md`  
For architecture details, see: `VOICE_ARCHITECTURE.md`  
For troubleshooting, see: Complete guide inside `VOICE_SETUP_GUIDE.md`
