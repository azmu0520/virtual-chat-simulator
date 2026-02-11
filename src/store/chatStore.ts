import { create } from "zustand";
import type { VideoState, TranscriptEntry, ChatState } from "../types";

interface ChatActions {
  setState: (state: VideoState) => void;
  startChat: () => void;
  endChat: () => void;
  addTranscript: (entry: Omit<TranscriptEntry, "id" | "timestamp">) => void;
  setListening: (listening: boolean) => void;
  setSilenceTimer: (timer: number | null) => void;
  resetChat: () => void;
}

const initialState: ChatState = {
  currentState: "idle",
  isActive: false,
  transcript: [],
  isListening: false,
  silenceTimer: null,
};

// ============================================
// UNIQUE ID GENERATOR - FIX FOR DUPLICATE KEYS
// ============================================
let idCounter = 0;
const generateUniqueId = () => {
  idCounter += 1;
  return `${Date.now()}-${idCounter}`;
};
// ============================================

export const useChatStore = create<ChatState & ChatActions>((set) => ({
  ...initialState,

  setState: (state) => set({ currentState: state }),

  startChat: () =>
    set({
      isActive: true,
      currentState: "greeting",
    }),

  endChat: () =>
    set({
      isActive: false,
      currentState: "goodbye",
    }),

  addTranscript: (entry) =>
    set((state) => ({
      transcript: [
        ...state.transcript,
        {
          ...entry,
          id: generateUniqueId(), // ← Use unique ID generator
          timestamp: new Date(),
        },
      ],
    })),

  setListening: (listening) => set({ isListening: listening }),

  setSilenceTimer: (timer) => set({ silenceTimer: timer }),

  resetChat: () => {
    idCounter = 0; // ← Reset counter when chat resets
    return set(initialState);
  },
}));
