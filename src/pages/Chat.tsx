import { useCallback, useEffect, useState } from 'react';
import { AnimatedPage } from '@/animations/presets';
import { ChatContainer } from '@/components/chat/ChatContainer';
import type { ChatMessageItem } from '@/components/chat/ChatMessage';
import { useAuth } from '@/hooks/useAuth';
import { useDrive } from '@/hooks/useDrive';
import { aiApi } from '@/services/aiService';

export default function Chat() {
  const { user } = useAuth();
  const { connected: driveConnected, connecting: driveConnecting, connect: connectDrive } = useDrive();

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing conversation or initialize
  const loadConversationHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await aiApi.listConversations();
      const conversations = (res.conversations || []) as Array<{ id: string; title: string }>;
      if (conversations.length > 0) {
        const latestId = conversations[0].id;
        setConversationId(latestId);

        const convRes = await aiApi.getConversation(latestId);
        const conv = convRes.conversation as {
          messages?: Array<{ role: 'user' | 'model'; content: string; timestamp?: string }>;
        };

        if (conv && conv.messages) {
          const loadedMsgs: ChatMessageItem[] = conv.messages.map((m, idx) => ({
            id: `${latestId}-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
          }));
          setMessages(loadedMsgs);
        }
      }
    } catch {
      // Start fresh if no existing conversation is found
    }
  }, [user]);

  useEffect(() => {
    void loadConversationHistory();
  }, [loadConversationHistory]);

  const handleSendMessage = async (text: string) => {
    setError(null);
    setLoading(true);

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessageItem = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);

    const modelMsgId = `model-${Date.now()}`;
    // Add an empty placeholder model message that will fill in progressively
    // as chunks stream from the backend.
    setMessages((prev) => [
      ...prev,
      {
        id: modelMsgId,
        role: 'model',
        content: '',
        timestamp: new Date().toISOString(),
      },
    ]);

    let streamedText = '';
    try {
      const res = await aiApi.sendMessageStream(
        text,
        conversationId,
        (chunk) => {
          streamedText += chunk;
          // Update the placeholder message in place with the accumulated text.
          setMessages((prev) =>
            prev.map((m) =>
              m.id === modelMsgId ? { ...m, content: streamedText } : m,
            ),
          );
        },
      );

      if (res.conversationId && res.conversationId !== conversationId) {
        setConversationId(res.conversationId);
      }

      // Finalize the message with full content + sources.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === modelMsgId
            ? { ...m, content: res.reply || streamedText, sources: res.sources }
            : m,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message to AI.');
      // Remove the empty placeholder on failure so it doesn't linger.
      setMessages((prev) => prev.filter((m) => m.id !== modelMsgId));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedPage className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          AI Drive Assistant
        </h1>
        <p className="text-sm text-slate-400">
          Ask questions, summarize documents, and extract insights directly from your Google Drive.
        </p>
      </div>

      <ChatContainer
        messages={messages}
        loading={loading}
        error={error}
        onSendMessage={handleSendMessage}
        driveConnected={driveConnected}
        driveConnecting={driveConnecting}
        onConnectDrive={connectDrive}
      />
    </AnimatedPage>
  );
}
