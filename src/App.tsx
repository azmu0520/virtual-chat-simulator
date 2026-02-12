import { VideoPlayer } from "./components/VideoPlayer";
import { ChatControls } from "./components/ChatControls";
import { MicVisualizer } from "./components/MicVisualizer";
import { Transcript } from "./components/Transcript";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useChatStore } from "./store/chatStore";
import { useEffect, useState } from "react";

function App() {
  // Initialize speech recognition
  useSpeechRecognition();
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);

  useEffect(() => {
    const supported =
      "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
    setIsSpeechSupported(supported);
    if (!supported) console.error("Speech recognition not supported");
  }, []);

  const { isListening } = useChatStore();

  return (
    <div className="w-screen h-screen relative">
      {!isSpeechSupported ? (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded">
          Your browser does not support speech recognition.
        </div>
      ) : (
        <>
          <VideoPlayer />

          <MicVisualizer isListening={isListening} />
          <Transcript />
          <ChatControls />
        </>
      )}
    </div>
  );
}

export default App;
