import { useState } from "react";
import { Reply, SmilePlus } from "lucide-react";
import type { ChatMessage } from "../utils/types";

const reactionChoices = ["👍", "❤️", "😂", "😮", "🙏"];

interface ChatMessageControlsProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onReact: (message: ChatMessage, emoji: string) => void;
}

export function ChatMessageControls({
  message,
  onReply,
  onReact,
}: ChatMessageControlsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  return (
    <div className="mt-1.5">
      {message.reply_to_message_id && (
        <div className="mb-2 rounded-lg border-l-2 border-current/40 bg-black/[0.04] px-2 py-1 text-[10px] leading-4 opacity-80">
          <span className="block truncate font-semibold">
            {message.reply_to_sender_name ?? "Message"}
          </span>
          <span className="block max-w-[220px] truncate">
            {message.reply_to_body ?? "Original message"}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => onReply(message)}
          className="inline-flex min-h-7 items-center gap-1 rounded-full px-2 text-[10px] font-medium opacity-70 hover:bg-black/[0.06] hover:opacity-100"
          aria-label={`Reply to ${message.sender_name}`}
        >
          <Reply size={12} /> Reply
        </button>
        <button
          type="button"
          onClick={() => setShowReactionPicker((current) => !current)}
          aria-expanded={showReactionPicker}
          aria-label="Add reaction"
          className="grid size-7 place-items-center rounded-full text-sm opacity-70 hover:bg-black/[0.06] hover:opacity-100"
        >
          <SmilePlus size={14} />
        </button>
        {message.reactions?.map((reaction) => (
          <button
            type="button"
            key={reaction.emoji}
            onClick={() => onReact(message, reaction.emoji)}
            aria-pressed={reaction.reacted}
            className={`min-h-7 rounded-full px-2 text-[11px] ${
              reaction.reacted ? "bg-[#2501FF]/10 ring-1 ring-[#2501FF]/25" : "bg-black/[0.04]"
            }`}
          >
            {reaction.emoji} {reaction.count}
          </button>
        ))}
        {showReactionPicker && reactionChoices.map((emoji) => (
            <button
              type="button"
              key={emoji}
              onClick={() => {
                onReact(message, emoji);
                setShowReactionPicker(false);
              }}
              aria-label={`React ${emoji}`}
              className="grid size-7 place-items-center rounded-full text-xs hover:bg-black/[0.06]"
            >
              {emoji}
            </button>
          ))}
      </div>
    </div>
  );
}
