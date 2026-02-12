import { useEffect, useRef } from "react";
import { useChatStore } from "../store/chatStore";
import { motion, AnimatePresence } from "framer-motion";

export const Transcript = () => {
  const { transcript, isActive } = useChatStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  if (!isActive || transcript.length === 0) return null;

  return (
    <div className="absolute left-8 top-8 bottom-24 w-80 bg-black/70 backdrop-blur rounded-lg p-4 overflow-hidden flex flex-col z-30">
      <h3 className="text-sm font-semibold mb-3 text-gray-300">Conversation</h3>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3">
        <AnimatePresence>
          {transcript.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${
                entry.speaker === "user" ? "text-blue-300" : "text-green-300"
              }`}
            >
              <span className="font-semibold">
                {entry.speaker === "user" ? "You: " : "Character: "}
              </span>
              <span className="text-white">{entry.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {!isActive && transcript.length > 0 && (
        <button
          onClick={() => useChatStore.getState().resetChat()}
          className="mt-2 text-xs text-gray-400 hover:text-white"
        >
          Clear conversation
        </button>
      )}
    </div>
  );
};
