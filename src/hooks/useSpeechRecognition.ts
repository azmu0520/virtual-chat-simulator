import { useEffect, useRef, useCallback } from "react";
import { useChatStore } from "../store/chatStore";

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

const SILENCE_TIMEOUT = 8000;

export const useSpeechRecognition = () => {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRunningRef = useRef(false); // ← Track if recognition is actually running

  const { isActive, currentState, setState, addTranscript, setListening } =
    useChatStore();

  const processSpeech = useCallback(
    (transcript: string) => {
      const text = transcript.toLowerCase().trim();

      addTranscript({
        speaker: "user",
        text: transcript,
      });

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

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    },
    [setState, addTranscript],
  );

  // Initialize speech recognition once
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      console.log("Recognized:", transcript);
      processSpeech(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      isRunningRef.current = false;
      setListening(false);
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      isRunningRef.current = false;
      setListening(false);

      // Auto-restart if still in listening state
      if (currentState === "listening" && isActive) {
        setTimeout(() => {
          if (
            currentState === "listening" &&
            isActive &&
            !isRunningRef.current
          ) {
            startRecognition();
          }
        }, 100);
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
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [processSpeech, currentState, isActive, setListening]);

  // Helper function to start recognition safely
  const startRecognition = useCallback(() => {
    if (!recognitionRef.current || isRunningRef.current) {
      return;
    }

    try {
      console.log("Starting recognition...");
      recognitionRef.current.start();
      isRunningRef.current = true;
      setListening(true);

      // Set silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }

      silenceTimerRef.current = setTimeout(() => {
        console.log("Silence timeout");
        setState("response");
        addTranscript({
          speaker: "character",
          text: "Are you still there?",
        });
      }, SILENCE_TIMEOUT);
    } catch (e: any) {
      console.error("Failed to start recognition:", e.message);
      isRunningRef.current = false;
      setListening(false);
    }
  }, [setListening, setState, addTranscript]);

  // Helper function to stop recognition safely
  const stopRecognition = useCallback(() => {
    if (!recognitionRef.current || !isRunningRef.current) {
      return;
    }

    try {
      console.log("Stopping recognition...");
      recognitionRef.current.stop();
      isRunningRef.current = false;
      setListening(false);

      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    } catch (e: any) {
      console.error("Failed to stop recognition:", e.message);
    }
  }, [setListening]);

  // Handle state changes
  useEffect(() => {
    const shouldBeListening = currentState === "listening" && isActive;

    if (shouldBeListening && !isRunningRef.current) {
      startRecognition();
    } else if (!shouldBeListening && isRunningRef.current) {
      stopRecognition();
    }
  }, [currentState, isActive, startRecognition, stopRecognition]);

  return { isListening: isRunningRef.current };
};
