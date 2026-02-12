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
const LISTEN_COOLDOWN = 1500; // 🔧 INCREASED: Wait longer after character stops speaking

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

  // 🔧 FIX: Get isCharacterSpeaking from store
  const {
    isActive,
    currentState,
    setState,
    addTranscript,
    setListening,
    isCharacterSpeaking,
  } = useChatStore();

  // ------------------------------------------------------------
  // 🔧 FIX: Should only listen when character is NOT speaking
  // ------------------------------------------------------------
  const shouldBeListening = useCallback(() => {
    return (
      (currentState === "listening" || currentState === "prompt") &&
      isActive &&
      !isCharacterSpeaking // 🚫 Don't listen while character speaks
    );
  }, [currentState, isActive, isCharacterSpeaking]);

  // ------------------------------------------------------------
  // Process a recognized speech transcript
  // ------------------------------------------------------------
  const processSpeech = useCallback(
    (transcript: string) => {
      const text = transcript.toLowerCase().trim();

      // ✅ Legitimate user speech – add to transcript
      addTranscript({
        speaker: "user",
        text: transcript,
      });

      // Simple keyword matching (could be replaced with NLP)
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

      // --------------------------------------------------------
      // 🔁 RESTART SILENCE TIMER after a successful utterance
      // --------------------------------------------------------
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
    [setState, addTranscript, shouldBeListening],
  );

  // ------------------------------------------------------------
  // Start speech recognition
  // ------------------------------------------------------------
  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRunningRef.current) return;

    try {
      recognitionRef.current.start();
      isRunningRef.current = true;
      setListening(true);
      console.log("🎤 Microphone STARTED");

      // Clear any existing silence timer before setting a new one
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Start the silence timer
      silenceTimerRef.current = setTimeout(() => {
        setState("prompt");
        addTranscript({
          speaker: "character",
          text: "Are you still there?",
        });
      }, SILENCE_TIMEOUT);
    } catch (e: any) {
      console.error("Failed to start recognition:", e.message);
      isRunningRef.current = false;
      setListening(false);

      // ⚠️ Clear any pending silence timer on failure
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
    if (!recognitionRef.current || !isRunningRef.current) return;

    try {
      recognitionRef.current.stop();
      isRunningRef.current = false;
      setListening(false);
      console.log("🔇 Microphone STOPPED");

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
      console.error("Failed to stop recognition:", e.message);
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
      console.log("🎤 Recognized:", transcript);
      processSpeech(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setState("fallback");
      addTranscript({
        speaker: "character",
        text: "I didn't catch that...",
      });
    };

    recognition.onend = () => {
      console.log("⏹️ Recognition ended");
      isRunningRef.current = false;
      setListening(false);

      // Clear any existing restart timer
      if (restartTimerRef.current) {
        clearTimeout(restartTimerRef.current);
        restartTimerRef.current = null;
      }

      // Auto‑restart if still should be listening
      if (shouldBeListening()) {
        restartTimerRef.current = setTimeout(() => {
          if (shouldBeListening() && !isRunningRef.current) {
            startRecognition();
          }
        }, RESTART_DELAY);
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
  ]);

  // ------------------------------------------------------------
  // 🔧 FIX: React to state changes AND character speaking status
  // Automatically mute mic when character speaks
  // ------------------------------------------------------------
  useEffect(() => {
    const should = shouldBeListening();

    // 🛑 Cancel any pending listen-start timer
    if (listenStartTimerRef.current) {
      clearTimeout(listenStartTimerRef.current);
      listenStartTimerRef.current = null;
    }

    if (should && !isRunningRef.current) {
      // ⏱️ Cooldown: wait a bit before turning mic on
      console.log("⏳ Waiting before starting mic...");
      listenStartTimerRef.current = setTimeout(() => {
        // Re-check conditions – may have changed during cooldown
        if (shouldBeListening() && !isRunningRef.current) {
          startRecognition();
        }
      }, LISTEN_COOLDOWN);
    } else if (!should && isRunningRef.current) {
      console.log("🔇 Character speaking - stopping mic");
      stopRecognition();
    }

    return () => {
      if (listenStartTimerRef.current) {
        clearTimeout(listenStartTimerRef.current);
        listenStartTimerRef.current = null;
      }
    };
  }, [shouldBeListening, startRecognition, stopRecognition]);

  // ------------------------------------------------------------
  // Clean up all timers when chat becomes inactive
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
      // Ensure recognition is fully stopped
      if (isRunningRef.current) {
        stopRecognition();
      }
    }
  }, [isActive, stopRecognition]);

  return { isListening: isRunningRef.current };
};
