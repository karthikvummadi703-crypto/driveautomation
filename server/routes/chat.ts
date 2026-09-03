import { Router } from 'express';
import { authenticateFirebaseUser, requireVerifiedEmail } from '../middleware/auth.js';
import { chatWithGemini, streamChatWithGemini } from '../services/gemini.js';
import {
  retrieveUserDriveContext,
  buildSystemInstruction,
} from '../services/ragService.js';
import {
  addConversationMessage,
  createConversation,
  getConversation,
  getConversations,
  conversationToGeminiHistory,
} from '../services/journalService.js';

const router = Router();
router.use(authenticateFirebaseUser);
router.use(requireVerifiedEmail);

const MAX_MESSAGE_LENGTH = 10000;
const MAX_HISTORY_LENGTH = 50;

interface ChatRequestBody {
  message?: string;
  conversationId?: string;
}

const MAX_CONVERSATION_ID_LENGTH = 128;

export function validateChatInput(body: Record<string, unknown>): string | null {
  if (!body.message || typeof body.message !== 'string') {
    return 'Message is required and must be a string.';
  }
  if (body.message.trim().length === 0) {
    return 'Message cannot be empty.';
  }
  if (body.message.length > MAX_MESSAGE_LENGTH) {
    return `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters.`;
  }
  if (body.conversationId !== undefined) {
    if (typeof body.conversationId !== 'string') {
      return 'conversationId must be a string.';
    }
    if (body.conversationId.trim().length === 0) {
      return 'conversationId cannot be empty.';
    }
    if (body.conversationId.length > MAX_CONVERSATION_ID_LENGTH) {
      return `conversationId exceeds maximum length of ${MAX_CONVERSATION_ID_LENGTH} characters.`;
    }
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const body = req.body as ChatRequestBody;

    const validationError = validateChatInput(body as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const message = body.message!.trim();
    let conversationId = body.conversationId;
    let conversation = null;
    let history: ReturnType<typeof conversationToGeminiHistory> = [];

    if (conversationId) {
      conversation = await getConversation(uid, conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      history = conversationToGeminiHistory(conversation.messages);
      if (history.length > MAX_HISTORY_LENGTH) {
        history = history.slice(-MAX_HISTORY_LENGTH);
      }
    }

    // Retrieve grounded context from the authenticated user's Google Drive documents
    const ragStart = Date.now();
    const ragResult = await retrieveUserDriveContext(uid, message);
    const ragMs = Date.now() - ragStart;
    console.log(`[chat] RAG retrieval for user ${uid}: ${ragMs}ms (strategy used by ragService)`);

    const systemInstruction = buildSystemInstruction(ragResult);

    let augmentedMessage = message;

    const geminiStart = Date.now();
    const result = await chatWithGemini({
      message: augmentedMessage,
      history,
      systemInstruction,
    });
    const geminiMs = Date.now() - geminiStart;
    console.log(`[chat] Gemini processing for user ${uid}: ${geminiMs}ms (RAG: ${ragMs}ms)`);

    const userTimestamp = new Date().toISOString();
    const modelTimestamp = new Date().toISOString();

    if (!conversationId) {
      const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
      const newConversation = await createConversation(uid, title);
      conversationId = newConversation.id;

      await addConversationMessage(uid, conversationId, {
        role: 'user',
        content: message,
        timestamp: userTimestamp,
      });
      await addConversationMessage(uid, conversationId, {
        role: 'model',
        content: result.reply,
        timestamp: modelTimestamp,
      });
    } else {
      await addConversationMessage(uid, conversationId!, {
        role: 'user',
        content: message,
        timestamp: userTimestamp,
      });
      await addConversationMessage(uid, conversationId!, {
        role: 'model',
        content: result.reply,
        timestamp: modelTimestamp,
      });
    }

    res.json({
      reply: result.reply,
      conversationId,
      sources: ragResult.sources,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to process chat request.';
    console.error(`[chat] Error: ${message}`);
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/chat/stream
 *
 * Streaming variant of POST /api/chat. Streams the Gemini response back to the
 * client as Server-Sent Events (SSE) so the answer renders progressively.
 * Final event carries conversationId + sources (which reference the backend
 * URL for this same stream route).
 */
router.post('/stream', async (req, res) => {
  const uid = req.user!.uid;
  const body = req.body as ChatRequestBody;

  const validationError = validateChatInput(body as Record<string, unknown>);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const message = body.message!.trim();
  let conversationId = body.conversationId;
  let conversation = null;
  let history: ReturnType<typeof conversationToGeminiHistory> = [];

  try {
    if (conversationId) {
      conversation = await getConversation(uid, conversationId);
      if (!conversation) {
        res.status(404).json({ error: 'Conversation not found.' });
        return;
      }
      history = conversationToGeminiHistory(conversation.messages);
      if (history.length > MAX_HISTORY_LENGTH) {
        history = history.slice(-MAX_HISTORY_LENGTH);
      }
    }
  } catch (loadErr) {
    console.error(`[chat] load conversation error:`, loadErr);
    res.status(500).json({ error: 'Unable to load conversation.' });
    return;
  }

  // RAG retrieval (run before streaming starts, same as non-streaming path).
  let ragResult;
  try {
    const ragStart = Date.now();
    ragResult = await retrieveUserDriveContext(uid, message);
    console.log(`[chat] RAG retrieval for user ${uid}: ${Date.now() - ragStart}ms`);
  } catch (ragErr) {
    console.error(`[chat] RAG error:`, ragErr instanceof Error ? ragErr.message : ragErr);
    ragResult = { documents: [], contextPrompt: '', sources: [] };
  }

  const systemInstruction = buildSystemInstruction(ragResult);

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let fullReply = '';
  try {
    res.write(`event: start\ndata: {"ok":true}\n\n`);
    for await (const chunk of streamChatWithGemini({
      message,
      history,
      systemInstruction,
    })) {
      fullReply += chunk;
      // Escape for JSON string within SSE data frame.
      res.write(`data: ${JSON.stringify({ t: chunk })}\n\n`);
    }

    // Persist messages, then send final event.
    const userTimestamp = new Date().toISOString();
    const modelTimestamp = new Date().toISOString();

    if (!conversationId) {
      const title = message.length > 60 ? message.substring(0, 60) + '...' : message;
      const newConversation = await createConversation(uid, title);
      conversationId = newConversation.id;
    }

    if (!conversationId) throw new Error('conversationId missing after create.');
    await addConversationMessage(uid, conversationId, {
      role: 'user',
      content: message,
      timestamp: userTimestamp,
    });
    await addConversationMessage(uid, conversationId, {
      role: 'model',
      content: fullReply,
      timestamp: modelTimestamp,
    });

    res.write(
      `event: done\ndata: ${JSON.stringify({
        conversationId,
        sources: ragResult.sources ?? [],
        reply: fullReply,
      })}\n\n`,
    );
    res.end();
  } catch (streamErr) {
    console.error(`[chat] stream error:`, streamErr instanceof Error ? streamErr.message : streamErr);
    try {
      const msg = streamErr instanceof Error ? streamErr.message : 'Stream failed.';
      res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    } catch {
      // ignore write failures after early client disconnect
    }
    res.end();
  }
});

router.get('/conversations', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const conversations = await getConversations(uid);
    res.json({ conversations });
  } catch (error) {
    console.error(`[chat] Error listing conversations: ${error}`);
    res.status(500).json({ error: 'Unable to list conversations.' });
  }
});

router.get('/conversations/:conversationId', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const conversation = await getConversation(uid, req.params.conversationId);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }
    res.json({ conversation });
  } catch (error) {
    console.error(`[chat] Error fetching conversation: ${error}`);
    res.status(500).json({ error: 'Unable to fetch conversation.' });
  }
});

export default router;
