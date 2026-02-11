export type VideoState =
  | "idle"
  | "greeting"
  | "listening"
  | "response"
  | "weather"
  | "goodbye";

export interface TranscriptEntry {
  id: string;
  speaker: "user" | "character";
  text: string;
  timestamp: Date;
}

export interface ChatState {
  currentState: VideoState;
  isActive: boolean;
  transcript: TranscriptEntry[];
  isListening: boolean;
  silenceTimer: number | null;
}
