import { VideoPlayer } from "./components/VideoPlayer";
import { ChatControls } from "./components/ChatControls";
import { MicVisualizer } from "./components/MicVisualizer";
import { Transcript } from "./components/Transcript";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useChatStore } from "./store/chatStore";

function App() {
  // Initialize speech recognition
  useSpeechRecognition();

  const { isListening } = useChatStore();

  return (
    <div className="w-screen h-screen relative">
      {/* Video background */}
      <VideoPlayer />

      {/* Overlay UI */}
      <MicVisualizer isListening={isListening} />
      <Transcript />
      <ChatControls />
    </div>
  );
}

export default App;
