import { Router } from 'express';
import { authenticateFirebaseUser, requireVerifiedEmail } from '../middleware/auth.js';
import { chatWithGemini } from '../services/gemini.js';
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
