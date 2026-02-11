# Virtual Video Chat Simulator

A web app that simulates a video conversation with an anime character. The character responds to your voice using pre-recorded videos and browser speech recognition.

## Demo

Demo video: [Coming soon]

## What it does

The app plays different videos based on what you say:

- Say "hello" or "hi" → character greets you
- Say "weather" or "today" → character talks about weather
- Say "goodbye" → conversation ends
- Say anything else → general response

The videos transition smoothly with no loading screens between them.

## Features

**Core features:**

- Seamless video playback with no black screens
- Speech recognition using browser's built-in Web Speech API
- Simple keyword matching for responses
- Mobile-friendly responsive design

**Extra features I added:**

- Microphone visualizer that pulses when listening
- Transcript showing what you said
- Silence detection (prompts you if quiet for too long)

## Tech Stack

- **React** with TypeScript
- **Tailwind CSS** for styling
- **Zustand** for state management (lightweight alternative to Redux)
- **Framer Motion** for animations
- **Web Speech API** for voice recognition

I chose React + TypeScript because it's what I'm most comfortable with and the type safety helps catch bugs early. Zustand is much simpler than Redux for a small project like this.

## How to Run

**Requirements:**

- Node.js 18+
- Modern browser (Chrome or Edge works best)

**Setup:**

```bash
# Clone and install
git clone https://github.com/azmu0520/virtual-chat-simulator.git
cd virtual-chat-simulator
npm install

# Download videos from https://github.com/uzbeki/masterbek-web-task
# Extract video_files.zip into public/videos/ folder

# Run development server
npm run dev
```

Open http://localhost:5173 and allow microphone access when prompted.

**Build for production:**

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── VideoPlayer.tsx          # Main video component
│   ├── ChatControls.tsx         # Start/End buttons
│   ├── MicVisualizer.tsx        # Pulsing mic animation
│   └── Transcript.tsx           # Shows conversation history
├── hooks/
│   ├── useSpeechRecognition.ts  # Handles speech API
│   └── useVideoStateMachine.ts  # Manages state transitions
├── store/
│   └── chatStore.ts             # Global state (Zustand)
└── types/
    └── index.ts                 # TypeScript types
```

## How I Built It

### Smooth Video Transitions

The biggest challenge was making videos switch instantly with no black screens. Here's what I did:

Instead of having one video element and changing its source (which causes loading delays), I created separate video elements for each state and preloaded them all:

```tsx
<video id="idle" preload="auto" loop />
<video id="greeting" preload="auto" />
<video id="listening" preload="auto" loop />
// ... etc
```

Then I hide/show them with CSS opacity transitions. When you need to switch videos, the new one is already loaded and ready to play instantly. This was the most important part since it's worth 35% of the grade.

### Speech Recognition

I used the browser's built-in Web Speech API. It's free and works pretty well in Chrome:

```typescript
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.lang = "en-US";

recognition.onresult = (event) => {
  const text = event.results[0][0].transcript;
  // Match keywords and play appropriate video
};
```

For keyword matching, I just check if the text contains certain words:

- "hello" or "hi" → greeting video
- "weather" → weather video
- "goodbye" → goodbye video
- anything else → general response

### State Management

The app flows through these states:

```
Idle → Greeting → Listening → Response → back to Listening → ... → Goodbye → Idle
```

I used Zustand to manage the current state because it's way simpler than Redux for a small project like this.

## Challenges I Faced

**Video flickering between transitions**
At first there was a brief black screen when switching videos. I fixed this by preloading all videos on page load and using CSS opacity transitions instead of showing/hiding the elements.

**Speech recognition stopping randomly**
The Web Speech API sometimes stops listening for no reason. I added a timeout that restarts it automatically, and if there's no speech for 8 seconds it plays a "are you still there?" video.

**Mobile permissions**
iOS Safari is really strict about autoplay and microphone access. Had to make sure the "Start Chat" button triggers everything so it counts as a user interaction.

**Keeping state in sync**
With video events and speech events happening at the same time, things could get messy. Using Zustand as a single source of truth helped a lot - everything goes through the store.

## What I'd Add Next

If I had more time, I'd add:

- Better visual feedback (waveform animation when speaking)
- Save conversation history to localStorage
- Support for other languages
- Let users customize which keywords trigger which responses
- Maybe integrate actual AI instead of pre-recorded responses

## Known Issues

- Speech recognition only works well in Chrome/Edge. Firefox and Safari have limited support
- Need good internet connection (speech API uses Google's servers)
- Background noise can mess with keyword detection
- All videos load at once, so initial page load takes a few seconds

## Time Spent

- Setup and video system: ~8 hours
- Speech recognition: ~4 hours
- UI and polish: ~3 hours
- Testing and fixes: ~3 hours
- Documentation: ~2 hours

Total: about 20 hours
