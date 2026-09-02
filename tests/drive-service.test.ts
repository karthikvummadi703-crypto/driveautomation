import 'dotenv/config';
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { classifyDriveQuery } from '../server/services/ragService.js';
import { getDriveTokenPublicInfo } from '../server/services/driveTokenService.js';
import { buildSystemInstruction } from '../server/services/ragService.js';

describe('RAG query classification', () => {
  it('classifies storage questions', () => {
    assert.equal(classifyDriveQuery('How much storage am I using?'), 'storage');
    assert.equal(classifyDriveQuery('what is my quota'), 'storage');
    assert.equal(classifyDriveQuery('How much drive space is left?'), 'storage');
    assert.equal(classifyDriveQuery('how much space is remaining'), 'storage');
  });

  it('classifies analytics/file questions', () => {
    assert.equal(classifyDriveQuery('How many PDFs do I have?'), 'analytics');
    assert.equal(classifyDriveQuery('what are my largest files'), 'analytics');
    assert.equal(classifyDriveQuery('how many folders do I have'), 'analytics');
    assert.equal(classifyDriveQuery('What file types do I have?'), 'analytics');
  });

  it('classifies recent file questions', () => {
    assert.equal(classifyDriveQuery('What are my recent files?'), 'recent');
    assert.equal(classifyDriveQuery('Show me my latest files'), 'recent');
    assert.equal(classifyDriveQuery('what files did I recently upload'), 'recent');
    assert.equal(classifyDriveQuery('my newest documents'), 'recent');
  });

  it('classifies activity questions', () => {
    assert.equal(classifyDriveQuery('What happened in my Drive recently?'), 'activity');
    assert.equal(classifyDriveQuery('what changed in my drive'), 'activity');
    assert.equal(classifyDriveQuery('Show drive activity history'), 'activity');
  });

  it('classifies document content questions', () => {
    assert.equal(classifyDriveQuery('Summarize my project report'), 'document');
    assert.equal(classifyDriveQuery('What does my resume contain?'), 'document');
    assert.equal(classifyDriveQuery('Summarize the meeting notes'), 'document');
    assert.equal(classifyDriveQuery('what is in the budget file'), 'document');
  });

  it('classifies general questions', () => {
    assert.equal(classifyDriveQuery('hello, how are you?'), 'general');
    assert.equal(classifyDriveQuery('who are you'), 'general');
  });
});

describe('Drive token public info', () => {
  it('returns null for no record', () => {
    assert.equal(getDriveTokenPublicInfo(null), null);
  });

  it('returns null for a record without access token', () => {
    assert.equal(
      getDriveTokenPublicInfo({
        uid: 'x',
        accessToken: '',
        expiresAt: 0,
        grantedAt: 0,
        driveEmail: null,
      }),
      null,
    );
  });

  it('returns safe info without exposing tokens', () => {
    const info = getDriveTokenPublicInfo({
      uid: 'x',
      accessToken: 'secret-access-token',
      refreshToken: 'secret-refresh-token',
      expiresAt: 123,
      grantedAt: 456,
      driveEmail: 'user@example.com',
    });
    assert.deepEqual(info, { connected: true, driveEmail: 'user@example.com' });
    const json = JSON.stringify(info);
    assert.ok(!json.includes('secret-access-token'));
    assert.ok(!json.includes('secret-refresh-token'));
  });

  it('never exposes refresh token', () => {
    const info = getDriveTokenPublicInfo({
      uid: 'x',
      accessToken: 'tok',
      refreshToken: 'super-secret-refresh',
      expiresAt: 1,
      grantedAt: 2,
      driveEmail: null,
    });
    assert.ok(!JSON.stringify(info).includes('super-secret-refresh'));
  });
});

describe('System instruction grounding', () => {
  it('builds a system instruction with the untrusted-document warning', () => {
    const instruction = buildSystemInstruction({
      documents: [],
      contextPrompt: '',
      sources: [],
    });
    assert.ok(instruction.includes('INSTRUCTION HIERARCHY'));
    assert.ok(instruction.includes('Never invent'));
  });

  it('appends context prompt when present', () => {
    const instruction = buildSystemInstruction({
      documents: [],
      contextPrompt: 'LIVE GOOGLE DRIVE STORAGE:\n- Total used: 1 GB',
      sources: [],
    });
    assert.ok(instruction.includes('LIVE GOOGLE DRIVE STORAGE'));
  });
});
