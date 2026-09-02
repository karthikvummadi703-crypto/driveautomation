import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateChatInput } from '../server/routes/chat.js';
import { validateJournalInput } from '../server/routes/journal.js';
import { buildJournalExportMarkdown } from '../server/services/driveExportService.js';

describe('Chat input validation', () => {
  it('accepts a valid message', () => {
    assert.equal(validateChatInput({ message: 'Hello' }), null);
  });

  it('accepts a valid message with a conversationId', () => {
    assert.equal(validateChatInput({ message: 'Hello', conversationId: 'abc123' }), null);
  });

  it('rejects missing message', () => {
    assert.ok(validateChatInput({}).includes('Message is required'));
  });

  it('rejects non-string message', () => {
    assert.ok(validateChatInput({ message: 123 }).includes('Message is required'));
  });

  it('rejects empty message', () => {
    assert.ok(validateChatInput({ message: '   ' }).includes('cannot be empty'));
  });

  it('rejects message exceeding max length', () => {
    assert.ok(validateChatInput({ message: 'a'.repeat(10001) }).includes('maximum length'));
  });

  it('rejects non-string conversationId', () => {
    assert.ok(validateChatInput({ message: 'hi', conversationId: 42 }).includes('must be a string'));
  });

  it('rejects empty conversationId', () => {
    assert.ok(validateChatInput({ message: 'hi', conversationId: '   ' }).includes('cannot be empty'));
  });

  it('rejects overly long conversationId', () => {
    assert.ok(validateChatInput({ message: 'hi', conversationId: 'a'.repeat(129) }).includes('maximum length'));
  });
});

describe('Journal input validation', () => {
  it('accepts valid title and content', () => {
    assert.equal(validateJournalInput({ title: 'My title', content: 'My content' }), null);
  });

  it('accepts only title (partial update)', () => {
    assert.equal(validateJournalInput({ title: 'New title' }), null);
  });

  it('accepts empty object (PUT will reject separately)', () => {
    assert.equal(validateJournalInput({}), null);
  });

  it('rejects non-string title', () => {
    assert.ok(validateJournalInput({ title: 5 }).includes('Title must be a string'));
  });

  it('rejects non-string content', () => {
    assert.ok(validateJournalInput({ content: [] }).includes('Content must be a string'));
  });

  it('rejects title over max length', () => {
    assert.ok(validateJournalInput({ title: 'a'.repeat(201) }).includes('maximum length'));
  });

  it('rejects content over max length', () => {
    assert.ok(validateJournalInput({ content: 'a'.repeat(50001) }).includes('maximum length'));
  });
});

describe('Journal export markdown', () => {
  it('escapes/normalizes nothing but renders header', () => {
    const md = buildJournalExportMarkdown({
      title: 'Título',
      content: 'Body',
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(md.startsWith('# Título'));
  });

  it('renders key points as bullet list', () => {
    const md = buildJournalExportMarkdown({
      title: 't',
      content: 'c',
      keyPoints: ['a', 'b'],
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(md.includes('- a'));
    assert.ok(md.includes('- b'));
  });
});
