import { getAdminFirestore } from './firebaseAdmin.js';
import type { GeminiMessage } from './gemini.js';

export interface JournalEntry {
  id: string;
  title: string;
  content: string;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface ConversationMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  title: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  id: string;
  userId: string;
  conversationId: string;
  journalEntryId?: string;
  summary: string;
  title: string;
  keyPoints: string[];
  actionItems: string[];
  createdAt: string;
  updatedAt: string;
}

function userCollection(uid: string, collection: string) {
  const db = getAdminFirestore();
  return db.collection('users').doc(uid).collection(collection);
}

export async function createJournalEntry(
  uid: string,
  data: { title: string; content: string },
): Promise<JournalEntry> {
  const now = new Date().toISOString();
  const ref = await userCollection(uid, 'journalEntries').add({
    title: data.title,
    content: data.content,
    createdAt: now,
    updatedAt: now,
    userId: uid,
  });
  return {
    id: ref.id,
    title: data.title,
    content: data.content,
    createdAt: now,
    updatedAt: now,
    userId: uid,
  };
}

export async function getJournalEntries(uid: string): Promise<JournalEntry[]> {
  const snap = await userCollection(uid, 'journalEntries')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as JournalEntry));
}

export async function getJournalEntry(uid: string, entryId: string): Promise<JournalEntry | null> {
  const doc = await userCollection(uid, 'journalEntries').doc(entryId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() } as JournalEntry;
}

export async function updateJournalEntry(
  uid: string,
  entryId: string,
  data: Partial<{ title: string; content: string; summary: string; keyPoints: string[]; actionItems: string[] }>,
): Promise<void> {
  await userCollection(uid, 'journalEntries').doc(entryId).update({
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

const inMemoryConversations = new Map<string, Conversation>();

export async function createConversation(
  uid: string,
  title: string,
): Promise<Conversation> {
  const now = new Date().toISOString();
  const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const conversation: Conversation = {
    id,
    userId: uid,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await userCollection(uid, 'conversations').add({
      title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      userId: uid,
    });
    conversation.id = ref.id;
  } catch {
    // In-memory fallback for local dev mode
  }

  inMemoryConversations.set(conversation.id, conversation);
  return conversation;
}

export async function getConversations(uid: string): Promise<Conversation[]> {
  try {
    const snap = await userCollection(uid, 'conversations')
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Conversation));
  } catch {
    return Array.from(inMemoryConversations.values()).filter((c) => c.userId === uid);
  }
}

export async function getConversation(uid: string, conversationId: string): Promise<Conversation | null> {
  try {
    const doc = await userCollection(uid, 'conversations').doc(conversationId).get();
    if (doc.exists) return { id: doc.id, ...doc.data() } as Conversation;
  } catch {
    // In-memory fallback
  }
  return inMemoryConversations.get(conversationId) || null;
}

export async function addConversationMessage(
  uid: string,
  conversationId: string,
  message: ConversationMessage,
): Promise<void> {
  const mem = inMemoryConversations.get(conversationId);
  if (mem) {
    mem.messages.push(message);
    mem.updatedAt = new Date().toISOString();
  }

  try {
    const ref = userCollection(uid, 'conversations').doc(conversationId);
    const doc = await ref.get();
    if (doc.exists) {
      const conversation = doc.data() as Conversation;
      const messages = [...conversation.messages, message];
      await ref.update({
        messages,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch {
    // Non-fatal for dev fallback
  }
}

export async function createSummary(
  uid: string,
  data: {
    conversationId: string;
    journalEntryId?: string;
    summary: string;
    title: string;
    keyPoints: string[];
    actionItems: string[];
  },
): Promise<Summary> {
  const now = new Date().toISOString();
  const ref = await userCollection(uid, 'summaries').add({
    ...data,
    createdAt: now,
    updatedAt: now,
    userId: uid,
  });
  return { id: ref.id, ...data, createdAt: now, updatedAt: now, userId: uid };
}

export async function getSummaries(uid: string): Promise<Summary[]> {
  const snap = await userCollection(uid, 'summaries')
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Summary));
}

export function conversationToGeminiHistory(messages: ConversationMessage[]): GeminiMessage[] {
  return messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));
}
