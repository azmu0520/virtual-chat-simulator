import { create } from "zustand";
import type { VideoState, TranscriptEntry, ChatState } from "../types";
import { v4 as uuidv4 } from "uuid";

const generateUniqueId = () => uuidv4();

interface ChatActions {
  setState: (state: VideoState) => void;
  startChat: () => void;
  endChat: () => void;
  addTranscript: (entry: Omit<TranscriptEntry, "id" | "timestamp">) => void;
  setListening: (listening: boolean) => void;
  setSilenceTimer: (timer: number | null) => void;
  resetChat: () => void;
  setCharacterSpeaking: (speaking: boolean) => void;
}

const initialState: ChatState = {
  currentState: "idle",
  isActive: false,
  transcript: [],
  isListening: false,
  silenceTimer: null,
  isCharacterSpeaking: false,
};

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
      silenceTimer: null,
    }),

  addTranscript: (entry) =>
    set((state) => ({
      transcript: [
        ...state.transcript,
        {
          ...entry,
          id: generateUniqueId(),
          timestamp: new Date(),
        },
      ],
    })),

  setListening: (listening) => set({ isListening: listening }),

  setSilenceTimer: (timer) => set({ silenceTimer: timer }),

  setCharacterSpeaking: (speaking) => set({ isCharacterSpeaking: speaking }),

  resetChat: () => {
    return set(initialState);
  },
}));
