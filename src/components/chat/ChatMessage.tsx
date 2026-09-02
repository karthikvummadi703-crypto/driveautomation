import { BotIcon, FileIcon, UserIcon } from '@/components/ui/Icon';

export interface ChatMessageItem {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp?: string;
  sources?: string[];
}

export interface ChatMessageProps {
  message: ChatMessageItem;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex gap-3 sm:gap-4 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      } items-start my-3.5`}
    >
      {/* Avatar Icon */}
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-glow ${
          isUser
            ? 'bg-gradient-to-br from-electric to-grape text-white'
            : 'border border-white/10 bg-white/10 text-electric'
        }`}
      >
        {isUser ? <UserIcon size={16} /> : <BotIcon size={18} />}
      </div>

      {/* Message Content Bubble */}
      <div className={`max-w-[85%] sm:max-w-[78%] space-y-2`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isUser
              ? 'bg-gradient-to-r from-electric to-grape text-white shadow-glow rounded-tr-none'
              : 'border border-white/10 bg-white/5 text-slate-200 rounded-tl-none backdrop-blur-md'
          }`}
        >
          {message.content}
        </div>

        {/* Source File Chips */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
            <span className="text-slate-400 text-[11px] font-medium">Sources:</span>
            {message.sources.map((src, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-lg border border-electric/30 bg-electric/10 px-2.5 py-1 font-mono text-[11px] text-electric"
              >
                <FileIcon size={12} />
                {src}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
