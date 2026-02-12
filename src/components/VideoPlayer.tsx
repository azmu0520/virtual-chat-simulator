import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import type { VideoState } from "../types";

const VIDEO_SOURCES: Record<VideoState, string> = {
  idle: "/videos/idle.mp4",
  greeting: "/videos/greeting.mp4",
  listening: "/videos/listening.mp4",
  response: "/videos/general_response.mp4",
  weather: "/videos/weather.mp4",
  goodbye: "/videos/goodbye.mp4",
  fallback: "/videos/fallback.mp4",
  prompt: "/videos/prompt.mp4",
};

const VIDEO_FALLBACKS: Partial<Record<VideoState, VideoState>> = {
  response: "listening",
  weather: "listening",
  goodbye: "idle",
};

const LOOPING_STATES: VideoState[] = ["idle", "listening"];

// 🔧 States where character is speaking (has audio)
const SPEAKING_STATES: VideoState[] = [
  "greeting",
  "response",
  "weather",
  "goodbye",
  "fallback",
  "prompt",
];

export const VideoPlayer = () => {
  const { currentState, setState, resetChat, isActive, setCharacterSpeaking } =
    useChatStore();
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [failedVideos, setFailedVideos] = useState<Set<VideoState>>(new Set());

  // Create refs for ALL videos
  const videoRefs = useRef<Record<VideoState, HTMLVideoElement | null>>({
    idle: null,
    greeting: null,
    listening: null,
    response: null,
    weather: null,
    fallback: null,
    prompt: null,
    goodbye: null,
  });

  // Track which videos have been loaded
  const loadedVideos = useRef<Set<VideoState>>(new Set());

  // Handle video loaded
  const handleVideoLoaded = (state: VideoState) => {
    if (loadedVideos.current.has(state)) return;

    loadedVideos.current.add(state);
    console.log(`✓ Video loaded: ${state} (${loadedVideos.current.size}/8)`);

    setLoadedCount(loadedVideos.current.size);

    if (loadedVideos.current.size === Object.keys(VIDEO_SOURCES).length) {
      setIsLoaded(true);
      console.log("✓ All videos loaded!");

      const idleVideo = videoRefs.current["idle"];
      if (idleVideo && currentState === "idle") {
        idleVideo.play().catch(console.error);
      }
    }
  };

  // Handle video loading errors
  const handleVideoError = (state: VideoState, error: any) => {
    const video = videoRefs.current[state];
    const errorDetails = video?.error;

    let errorMessage = `✗ Failed to load ${state}.mp4`;

    if (errorDetails) {
      switch (errorDetails.code) {
        case 1:
          errorMessage += " - Loading aborted";
          break;
        case 2:
          errorMessage += " - Network error";
          break;
        case 3:
          errorMessage += " - Corrupted or unsupported format";
          break;
        case 4:
          errorMessage += " - File not found or format not supported";
          break;
      }
    }

    console.error(errorMessage, VIDEO_SOURCES[state]);

    setFailedVideos((prev) => new Set(prev).add(state));
    handleVideoLoaded(state); // Count as loaded to not block UI
  };

  // Timeout fallback
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!isLoaded) {
        console.warn(
          `⚠ Timeout: Only ${loadedCount}/8 videos loaded. Proceeding...`,
        );
        setIsLoaded(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoaded, loadedCount]);

  // Get the effective video state (with fallback if needed)
  const getEffectiveState = (state: VideoState): VideoState => {
    const visited = new Set<VideoState>();
    let current = state;

    while (failedVideos.has(current) && VIDEO_FALLBACKS[current]) {
      if (visited.has(current)) {
        console.warn(`Fallback loop detected for ${state}, using 'idle'`);
        return "idle";
      }
      visited.add(current);
      current = VIDEO_FALLBACKS[current]!;
    }
    return current;
  };

  // 🔧 KEY FIX: Detect when character is speaking based on current state
  useEffect(() => {
    const effectiveState = getEffectiveState(currentState);
    const isSpeaking = SPEAKING_STATES.includes(effectiveState);

    if (isSpeaking) {
      console.log("🔊 Character speaking:", effectiveState);
      setCharacterSpeaking(true);
    } else {
      console.log("🔇 Character silent:", effectiveState);
      setCharacterSpeaking(false);
    }
  }, [currentState, setCharacterSpeaking, failedVideos]);

  // Handle video state changes
  useEffect(() => {
    const effectiveState = getEffectiveState(currentState);
    const currentVideo = videoRefs.current[effectiveState];

    if (!currentVideo || !isLoaded) return;

    // Pause all other videos
    Object.entries(videoRefs.current).forEach(([state, video]) => {
      if (video && state !== effectiveState) {
        video.pause();
        video.currentTime = 0;
      }
    });

    currentVideo.currentTime = 0;

    requestAnimationFrame(() => {
      if (isActive || (effectiveState === "idle" && currentVideo.muted)) {
        currentVideo.play().catch((err) => {
          console.error(`Failed to play ${effectiveState} video:`, err);
        });
      }
    });
  }, [currentState, isActive, isLoaded, failedVideos]);

  // 🔧 ENHANCED: Handle video end events + stop speaking
  const handleVideoEnd = (state: VideoState) => {
    console.log("⏹️ Video ended:", state);

    switch (state) {
      case "greeting":
        setState("listening");
        break;
      case "response":
      case "weather":
        setState("listening");
        break;
      case "goodbye":
        setTimeout(() => {
          resetChat();
        }, 500);
        break;
      case "prompt":
      case "fallback":
        setState("listening");
        break;
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {/* Loading screen */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
          <div className="text-center">
            <div className="mb-4">
              <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
            </div>
            <p className="text-xl mb-2">Loading videos...</p>
            <p className="text-sm text-gray-400">
              {loadedCount} / {Object.keys(VIDEO_SOURCES).length}
            </p>
          </div>
        </div>
      )}

      {/* All video elements */}
      {(Object.keys(VIDEO_SOURCES) as VideoState[]).map((state) => (
        <video
          key={state}
          ref={(el) => {
            videoRefs.current[state] = el;
          }}
          src={VIDEO_SOURCES[state]}
          className={`absolute inset-0 w-full h-full object-cover ${
            getEffectiveState(currentState) === state
              ? "opacity-100 z-10"
              : "opacity-0 z-0"
          }`}
          style={{
            transition:
              getEffectiveState(currentState) === state
                ? "opacity 50ms ease-in"
                : "opacity 400ms ease-out",
            willChange: "opacity",
          }}
          loop={LOOPING_STATES.includes(state)}
          preload="auto"
          playsInline
          muted={state === "idle"}
          onLoadedData={() => handleVideoLoaded(state)}
          onError={(e) => handleVideoError(state, e)}
          onEnded={() => handleVideoEnd(state)}
        />
      ))}

      {/* State indicator */}
      <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-2 rounded-lg text-sm font-mono z-20">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              currentState === "idle"
                ? "bg-gray-400"
                : currentState === "listening"
                  ? "bg-green-400"
                  : "bg-blue-400"
            }`}
          />
          {currentState}
          {failedVideos.has(currentState) && " (fallback)"}
        </div>
      </div>

      {failedVideos.size > 0 && (
        <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur px-3 py-2 rounded-lg text-xs font-mono z-20 group">
          ⚠ {failedVideos.size} video(s) failed
          <div className="absolute right-0 mt-1 hidden group-hover:block bg-black/90 text-white p-2 rounded text-xs whitespace-nowrap">
            {Array.from(failedVideos).map((v) => (
              <div key={v}>• {v}.mp4</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
