import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ChatMessage, type ChatMessageItem } from './ChatMessage';
import { BotIcon, SendIcon, SparklesIcon } from '@/components/ui/Icon';

export interface ChatContainerProps {
  messages: ChatMessageItem[];
  loading: boolean;
  error: string | null;
  onSendMessage: (text: string) => Promise<void>;
  driveConnected: boolean;
  driveConnecting?: boolean;
  onConnectDrive?: () => Promise<void>;
}

const SUGGESTED_PROMPTS = [
  'What documents are stored in my connected Drive?',
  'Summarize the contents of my latest files.',
  'How much Drive storage capacity am I using?',
  'List recent activity and modified files.',
];

export function ChatContainer({
  messages,
  loading,
  error,
  onSendMessage,
  driveConnected,
  driveConnecting,
  onConnectDrive,
}: ChatContainerProps) {
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || loading) return;
    setInputText('');
    await onSendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handlePromptClick = (prompt: string) => {
    setInputText(prompt);
    textareaRef.current?.focus();
  };

  return (
    <Card className="flex h-[calc(100vh-12rem)] flex-col overflow-hidden border-white/10 bg-navy-900/60 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-electric to-grape text-white shadow-glow">
            <BotIcon size={20} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
              DriveFlow AI Assistant
              <span className={`flex h-2 w-2 rounded-full ${driveConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            </h2>
            <p className="text-xs text-slate-400">
              {driveConnected
                ? 'Grounded on your connected Google Drive files'
                : 'Connect Drive to query and analyze your documents'}
            </p>
          </div>
        </div>

        {!driveConnected && onConnectDrive && (
          <Button
            variant="primary"
            size="sm"
            loading={driveConnecting}
            onClick={onConnectDrive}
          >
            Connect Google Drive
          </Button>
        )}
      </div>

      {!driveConnected && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-xs text-amber-200">
            ⚠️ <strong>Google Drive Disconnected:</strong> Connect your Google Drive account so Gemini AI can access and analyze your files.
          </p>
          {onConnectDrive && (
            <Button
              variant="outline"
              size="sm"
              loading={driveConnecting}
              onClick={onConnectDrive}
              className="shrink-0 text-xs py-1"
            >
              Connect Drive
            </Button>
          )}
        </div>
      )}

      {/* Message Stream Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 text-electric mb-4">
              <SparklesIcon size={28} />
            </div>
            <h3 className="font-display text-lg font-semibold text-white">
              Ask AI about your Google Drive documents
            </h3>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
              Query, summarize, and extract insights directly from your uploaded Drive files with zero data leakage.
            </p>

            {/* Quick Suggestion Chips */}
            <div className="mt-6 grid w-full max-w-lg gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-xl border border-white/10 bg-white/5 p-3 text-left text-xs font-medium text-slate-300 transition hover:border-electric/40 hover:bg-electric/10 hover:text-white"
                >
                  💬 {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="flex items-center gap-3 py-2 text-xs text-slate-400">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-electric animate-spin">
              ⚡
            </div>
            <span>Analyzing connected Drive files & generating response...</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input Form Footer */}
      <div className="border-t border-white/10 p-4 bg-navy-950/40">
        <div className="flex items-end gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-electric/50 focus-within:ring-1 focus-within:ring-electric/50 transition">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your Drive files... (Press Enter to send, Shift+Enter for new line)"
            rows={2}
            className="flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            disabled={!inputText.trim() || loading}
            loading={loading}
            className="shrink-0 rounded-xl"
          >
            <SendIcon size={16} />
            Send
          </Button>
        </div>
      </div>
    </Card>
  );
}
