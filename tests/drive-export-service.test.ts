import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildJournalExportMarkdown } from '../server/services/driveExportService.js';

describe('buildJournalExportMarkdown', () => {
  it('produces a markdown document with title, author, and content', () => {
    const md = buildJournalExportMarkdown({
      title: 'My Day',
      content: 'It was a good day.',
      userEmail: 'user@example.com',
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(md.includes('# My Day'));
    assert.ok(md.includes('Author: user@example.com'));
    assert.ok(md.includes('It was a good day.'));
    assert.ok(!md.includes('## Summary'));
    assert.ok(!md.includes('## Key Points'));
    assert.ok(!md.includes('## Action Items'));
  });

  it('includes summary, key points, and action items when provided', () => {
    const md = buildJournalExportMarkdown({
      title: 'Planning',
      content: 'Plan content',
      summary: 'A short summary',
      keyPoints: ['Point one', 'Point two'],
      actionItems: ['Task one', 'Task two'],
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(md.includes('## Summary'));
    assert.ok(md.includes('A short summary'));
    assert.ok(md.includes('## Key Points'));
    assert.ok(md.includes('- Point one'));
    assert.ok(md.includes('- Point two'));
    assert.ok(md.includes('## Action Items'));
    assert.ok(md.includes('- [ ] Task one'));
    assert.ok(md.includes('- [ ] Task two'));
  });

  it('omits optional author when email is null', () => {
    const md = buildJournalExportMarkdown({
      title: 'No Author',
      content: 'body',
      userEmail: null,
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(!md.includes('Author:'));
  });

  it('renders exportedAt as a localized date string', () => {
    const md = buildJournalExportMarkdown({
      title: 'Date',
      content: 'body',
      exportedAt: '2026-09-01T10:00:00.000Z',
    });
    assert.ok(md.includes('Exported: '));
    assert.ok(new Date(md.split('Exported: ')[1].split('\n')[0]).toString() !== 'Invalid Date');
  });
});
