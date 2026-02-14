import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../store/chatStore";

// ============================================
// TYPES (from Web Speech API)
// ============================================
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  length: number;
}

interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

// ============================================
// CONSTANTS
// ============================================
const SILENCE_TIMEOUT = 8000; // 8 seconds of silence triggers prompt
const RESTART_DELAY = 500; // Delay before restarting recognition
const LISTEN_COOLDOWN = 300; // 🔧 REDUCED: Quick restart for natural conversation

// ============================================
// HOOK
// ============================================
export const useSpeechRecognition = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isRunningRef = useRef(false);

  const {
    isActive,
    currentState,
    setState,
    addTranscript,
    setListening,
    isCharacterSpeaking,
  } = useChatStore();

  // ------------------------------------------------------------
  // 🔧 UPDATED: Allow listening during most states except greeting/goodbye
  // ------------------------------------------------------------
  const shouldBeListening = useCallback(() => {
    const should =
      (currentState === "listening" ||
        currentState === "prompt" ||
        currentState === "response" || // ✅ Allow during responses
        currentState === "weather" || // ✅ Allow during weather
        currentState === "fallback") && // ✅ Allow during fallback
      isActive &&
      !isCharacterSpeaking;

    return should;
  }, [currentState, isActive, isCharacterSpeaking]);

  // ------------------------------------------------------------
  // Process a recognized speech transcript
  // ------------------------------------------------------------
  const processSpeech = useCallback(
    (transcript: string) => {
      const text = transcript.toLowerCase().trim();

      // ✅ Add to transcript
      addTranscript({
        speaker: "user",
        text: transcript,
      });

      // Simple keyword matching
      if (text.includes("hello") || text.includes("hi")) {
        setState("greeting");
        addTranscript({
          speaker: "character",
          text: "Hello! How are you?",
        });
      } else if (text.includes("weather") || text.includes("today")) {
        setState("weather");
        addTranscript({
          speaker: "character",
          text: "It's a beautiful day!",
        });
      } else if (text.includes("goodbye") || text.includes("bye")) {
        setState("goodbye");
        addTranscript({
          speaker: "character",
          text: "Goodbye! See you next time!",
        });
      } else {
        setState("response");
        addTranscript({
          speaker: "character",
          text: "Interesting! Tell me more.",
        });
      }

      // Restart silence timer
      if (shouldBeListening()) {
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
        silenceTimerRef.current = setTimeout(() => {
          setState("prompt");
          addTranscript({
            speaker: "character",
            text: "Are you still there?",
          });
        }, SILENCE_TIMEOUT);
      }
    },
    [
      setState,
      addTranscript,
      shouldBeListening,
      isCharacterSpeaking,
      currentState,
    ],
  );

  // ------------------------------------------------------------
  // Start speech recognition
  // ------------------------------------------------------------
  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRunningRef.current) {
      return;
    }

    try {
      recognitionRef.current.start();
      isRunningRef.current = true;
      setListening(true);

      // Clear any existing silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Start silence timer
      silenceTimerRef.current = setTimeout(() => {
        setState("prompt");
        addTranscript({
          speaker: "character",
          text: "Are you still there?",
        });
      }, SILENCE_TIMEOUT);
    } catch (e: any) {
      console.error("❌ Failed to start recognition:", e.message);
      isRunningRef.current = false;
      setListening(false);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    }
  }, [setListening, setState, addTranscript]);

  // ------------------------------------------------------------
  // Stop speech recognition
  // ------------------------------------------------------------
  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRunningRef.current) {
      return;
    }

    try {
      recognitionRef.current.stop();
      isRunningRef.current = false;
      setListening(false);

      // Clear all timers
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    } catch (e: any) {
      console.error("❌ Failed to stop recognition:", e.message);
    }
  }, [setListening]);

  // ------------------------------------------------------------
  // Initialize SpeechRecognition once
  // ------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("❌ Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;

      processSpeech(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error);
      setState("fallback");
      addTranscript({
        speaker: "character",
        text: "I didn't catch that...",
      });
    };

    recognition.onend = () => {
      isRunningRef.current = false;
      setListening(false);

      // Clear restart timer
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current && isRunningRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
      if (listenStartTimerRef.current)
        clearTimeout(listenStartTimerRef.current);
    };
  }, [
    processSpeech,
    shouldBeListening,
    setListening,
    setState,
    addTranscript,
    startRecognition,
    isCharacterSpeaking,
  ]);

  // ------------------------------------------------------------
  // 🔧 MAIN CONTROL: React to state changes AND character speaking status
  // ------------------------------------------------------------
  useEffect(() => {
    const should = shouldBeListening();

    // Cancel pending timer
    if (listenStartTimerRef.current) {
      clearTimeout(listenStartTimerRef.current);
      listenStartTimerRef.current = null;
    }

    if (should && !isRunningRef.current) {
      listenStartTimerRef.current = setTimeout(() => {
        if (shouldBeListening() && !isRunningRef.current) {
          startRecognition();
        }
      }, LISTEN_COOLDOWN);
    } else if (!should && isRunningRef.current) {
      stopRecognition();
    }

    return () => {
      if (listenStartTimerRef.current) {
        clearTimeout(listenStartTimerRef.current);
        listenStartTimerRef.current = null;
      }
    };
  }, [
    shouldBeListening,
    startRecognition,
    stopRecognition,
    currentState,
    isCharacterSpeaking,
    isActive,
  ]);

  // ------------------------------------------------------------
  // Clean up when inactive
  // ------------------------------------------------------------
  useEffect(() => {
    if (!isActive) {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }
      if (listenStartTimerRef.current) {
        clearTimeout(listenStartTimerRef.current);
        listenStartTimerRef.current = null;
      }
      if (isRunningRef.current) {
        stopRecognition();
      }
    }
  }, [isActive, stopRecognition]);

  return { isListening: isRunningRef.current };
};
