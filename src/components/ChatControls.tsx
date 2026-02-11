import { useChatStore } from "../store/chatStore";

export const ChatControls = () => {
  const { isActive, startChat, endChat } = useChatStore();

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 z-30">
      {!isActive ? (
        <button
          onClick={startChat}
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors shadow-lg"
        >
          Start Chat
        </button>
      ) : (
        <button
          onClick={endChat}
          className="px-8 py-4 bg-red-600 hover:bg-red-700 rounded-lg font-semibold text-lg transition-colors shadow-lg"
        >
          End Chat
        </button>
      )}
    </div>
  );
};
