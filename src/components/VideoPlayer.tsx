import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/chatStore";
import type { VideoState } from "../types";

const VIDEO_SOURCES: Record<VideoState, string> = {
  idle: "/videos/idle.mp4",
  greeting: "/videos/greeting.mp4",
  listening: "/videos/listening.mp4",
  response: "/videos/listening.mp4",
  weather: "/videos/weather.mp4",
  goodbye: "/videos/goodbye.mp4",
};

// ============================================
// FALLBACK CONFIGURATION - EDIT HERE
// ============================================
const VIDEO_FALLBACKS: Partial<Record<VideoState, VideoState>> = {
  response: "listening", // ← If response.mp4 fails, use listening.mp4
  weather: "listening", // ← If weather.mp4 fails, use listening.mp4
  goodbye: "idle", // ← If goodbye.mp4 fails, use idle.mp4
};
// ============================================

const LOOPING_STATES: VideoState[] = ["idle", "listening"];

export const VideoPlayer = () => {
  const { currentState, setState, resetChat, isActive } = useChatStore();
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
    goodbye: null,
  });

  // Track which videos have been loaded
  const loadedVideos = useRef<Set<VideoState>>(new Set());

  // Handle video loaded
  const handleVideoLoaded = (state: VideoState) => {
    if (loadedVideos.current.has(state)) return;

    loadedVideos.current.add(state);
    console.log(`✓ Video loaded: ${state} (${loadedVideos.current.size}/6)`);

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
          `⚠ Timeout: Only ${loadedCount}/6 videos loaded. Proceeding...`,
        );
        setIsLoaded(true);
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [isLoaded, loadedCount]);

  // Get the effective video state (with fallback if needed)
  const getEffectiveState = (state: VideoState): VideoState => {
    // ============================================
    // FALLBACK LOGIC - This handles missing videos
    // ============================================
    if (failedVideos.has(state) && VIDEO_FALLBACKS[state]) {
      console.log(`Using fallback for ${state}: ${VIDEO_FALLBACKS[state]}`);
      return VIDEO_FALLBACKS[state]!; // ← Returns "listening" if response fails
    }
    return state;
  };

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

  // Handle video end events
  const handleVideoEnd = (state: VideoState) => {
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
          setState("idle");
        }, 500);
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
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            getEffectiveState(currentState) === state
              ? "opacity-100 z-10"
              : "opacity-0 z-0"
          }`}
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

      {/* Error indicator */}
      {failedVideos.size > 0 && (
        <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur px-3 py-2 rounded-lg text-xs font-mono z-20">
          ⚠ {failedVideos.size} video(s) failed to load
        </div>
      )}
    </div>
  );
};
