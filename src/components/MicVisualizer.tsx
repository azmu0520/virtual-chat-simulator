import { motion } from "framer-motion";

interface MicVisualizerProps {
  isListening: boolean;
}

export const MicVisualizer = ({ isListening }: MicVisualizerProps) => {
  if (!isListening) return null;

  return (
    <div className="absolute top-8 right-8 flex items-center gap-3">
      <motion.div
        className="w-4 h-4 bg-red-500 rounded-full"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [1, 0.7, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <span className="text-sm font-medium">Listening...</span>
    </div>
  );
};
