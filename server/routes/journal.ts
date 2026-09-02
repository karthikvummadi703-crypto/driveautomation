import { Router } from 'express';
import { authenticateFirebaseUser, requireVerifiedEmail } from '../middleware/auth.js';
import {
  createJournalEntry,
  getJournalEntries,
  getJournalEntry,
  updateJournalEntry,
  createSummary,
  getSummaries,
} from '../services/journalService.js';
import {
  buildJournalExportMarkdown,
  createDriveExportRecord,
  getDriveExportRecords,
  updateDriveExportRecord,
} from '../services/driveExportService.js';
import { callN8nExport, n8nConfigured, n8nWebhookUrl } from '../services/n8nService.js';
import { chatWithGemini } from '../services/gemini.js';

const router = Router();
router.use(authenticateFirebaseUser);
router.use(requireVerifiedEmail);

const MAX_TITLE_LENGTH = 200;
const MAX_CONTENT_LENGTH = 50000;

interface JournalBody {
  title?: string;
  content?: string;
}

export function validateJournalInput(body: Record<string, unknown>): string | null {
  if (body.title !== undefined && typeof body.title !== 'string') {
    return 'Title must be a string.';
  }
  if (body.content !== undefined && typeof body.content !== 'string') {
    return 'Content must be a string.';
  }
  if (body.title && body.title.length > MAX_TITLE_LENGTH) {
    return `Title exceeds maximum length of ${MAX_TITLE_LENGTH} characters.`;
  }
  if (body.content && body.content.length > MAX_CONTENT_LENGTH) {
    return `Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters.`;
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const body = req.body as JournalBody;

    const validationError = validateJournalInput(body as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    if (!body.title?.trim() || !body.content?.trim()) {
      res.status(400).json({ error: 'Title and content are required.' });
      return;
    }

    const entry = await createJournalEntry(uid, {
      title: body.title.trim(),
      content: body.content.trim(),
    });

    res.status(201).json({ entry });
  } catch (error) {
    console.error(`[journal] Error creating entry: ${error}`);
    res.status(500).json({ error: 'Unable to create journal entry.' });
  }
});

router.get('/', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const entries = await getJournalEntries(uid);
    res.json({ entries });
  } catch (error) {
    console.error(`[journal] Error listing entries: ${error}`);
    res.status(500).json({ error: 'Unable to list journal entries.' });
  }
});

router.get('/:entryId', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const entry = await getJournalEntry(uid, req.params.entryId);
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found.' });
      return;
    }
    res.json({ entry });
  } catch (error) {
    console.error(`[journal] Error fetching entry: ${error}`);
    res.status(500).json({ error: 'Unable to fetch journal entry.' });
  }
});

router.put('/:entryId', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const body = req.body as JournalBody;

    const validationError = validateJournalInput(body as Record<string, unknown>);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const existing = await getJournalEntry(uid, req.params.entryId);
    if (!existing) {
      res.status(404).json({ error: 'Journal entry not found.' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (body.title !== undefined) updateData.title = body.title.trim();
    if (body.content !== undefined) updateData.content = body.content.trim();
    if (body.title === undefined && body.content === undefined) {
      res.status(400).json({ error: 'At least one of title or content is required.' });
      return;
    }

    await updateJournalEntry(uid, req.params.entryId, updateData);

    res.json({ entry: { ...existing, ...updateData } });
  } catch (error) {
    console.error(`[journal] Error updating entry: ${error}`);
    res.status(500).json({ error: 'Unable to update journal entry.' });
  }
});

router.post('/:entryId/summarize', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const entry = await getJournalEntry(uid, req.params.entryId);
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found.' });
      return;
    }

    const systemInstruction =
      'You are an AI assistant that creates concise, insightful summaries of journal entries. ' +
      'Provide a clear summary, key points, and actionable items when relevant. ' +
      'Format your response as JSON with fields: summary (string), keyPoints (string[]), actionItems (string[]).';

    const result = await chatWithGemini({
      message: `Please summarize this journal entry:\n\nTitle: ${entry.title}\n\nContent: ${entry.content}`,
      systemInstruction,
    });

    let parsed: { summary: string; keyPoints: string[]; actionItems: string[] };
    try {
      const jsonMatch = result.reply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        parsed = {
          summary: result.reply,
          keyPoints: [],
          actionItems: [],
        };
      }
    } catch {
      parsed = {
        summary: result.reply,
        keyPoints: [],
        actionItems: [],
      };
    }

    await updateJournalEntry(uid, entry.id, {
      summary: parsed.summary,
      keyPoints: parsed.keyPoints,
      actionItems: parsed.actionItems,
    });

    const savedSummary = await createSummary(uid, {
      conversationId: '',
      journalEntryId: entry.id,
      summary: parsed.summary,
      title: entry.title,
      keyPoints: parsed.keyPoints,
      actionItems: parsed.actionItems,
    });

    res.json({ summary: savedSummary });
  } catch (error) {
    console.error(`[journal] Error summarizing entry: ${error}`);
    res.status(500).json({ error: 'Unable to summarize journal entry.' });
  }
});

router.get('/summaries/list', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const summaries = await getSummaries(uid);
    res.json({ summaries });
  } catch (error) {
    console.error(`[journal] Error listing summaries: ${error}`);
    res.status(500).json({ error: 'Unable to list summaries.' });
  }
});

router.post('/:entryId/export', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const entry = await getJournalEntry(uid, req.params.entryId);
    if (!entry) {
      res.status(404).json({ error: 'Journal entry not found.' });
      return;
    }

    if (!n8nConfigured()) {
      res.status(503).json({
        error: 'Drive automation is not configured.',
        alternative: n8nWebhookUrl() ? null : 'The server n8n webhook URL is not set.',
      });
      return;
    }

    const now = new Date().toISOString();
    const markdown = buildJournalExportMarkdown({
      title: entry.title,
      content: entry.content,
      summary: entry.summary,
      keyPoints: entry.keyPoints,
      actionItems: entry.actionItems,
      userEmail: req.user!.email,
      exportedAt: now,
    });

    const exportRecord = await createDriveExportRecord(uid, {
      journalEntryId: entry.id,
      source: 'journal',
      fileName: `${sanitizeFileName(entry.title)}.md`,
      status: 'pending',
    });

    try {
      await callN8nExport({
        uid,
        journalEntryId: entry.id,
        fileName: exportRecord.fileName,
        markdown,
        email: req.user!.email,
      });
      await updateDriveExportRecord(uid, exportRecord.id, { status: 'success' });
      res.json({
        exportId: exportRecord.id,
        status: 'success',
        message: 'Journal exported to your personal Drive folder.',
      });
    } catch (err) {
      await updateDriveExportRecord(uid, exportRecord.id, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Export failed',
      });
      console.error(`[journal] Export failed for user ${uid}: ${err}`);
      res.status(502).json({ error: 'Unable to export journal to Drive.' });
    }
  } catch (error) {
    console.error(`[journal] Export error: ${error}`);
    res.status(500).json({ error: 'Unable to process journal export.' });
  }
});

router.get('/exports/list', async (req, res) => {
  try {
    const uid = req.user!.uid;
    const exports = await getDriveExportRecords(uid);
    res.json({ exports });
  } catch (error) {
    console.error(`[journal] Error listing exports: ${error}`);
    res.status(500).json({ error: 'Unable to list exports.' });
  }
});

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 80);
  return cleaned || 'journal_entry';
}

export default router;
