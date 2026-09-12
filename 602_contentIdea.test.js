'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSystem } = require('../src/401_system');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cvos-test-'));
}

test('ContentIdea: creation persists a NEW idea and returns it with an id', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('What a 12-hour delivery shift feels like');
  assert.equal(idea.status, 'NEW');
  assert.equal(idea.source, 'USER');
  assert.ok(idea.id, 'idea should have an id');
  assert.equal(idea.text, 'What a 12-hour delivery shift feels like');
});

test('ContentIdea: retrieval returns the same record that was created', () => {
  const sys = buildSystem(freshDataDir());
  const created = sys.contentIdeaEngine.createContentIdea('Rainy day delivery');
  const fetched = sys.contentIdeaEngine.get(created.id);
  assert.deepEqual(fetched, created);
});

test('ContentIdea: invalid input (empty text) is rejected, not persisted', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.contentIdeaEngine.createContentIdea(''), /non-empty string/);
  assert.throws(() => sys.contentIdeaEngine.createContentIdea('   '), /non-empty string/);
  assert.throws(() => sys.contentIdeaEngine.createContentIdea(null), /non-empty string/);
  assert.deepEqual(sys.storage.readAll('content_ideas'), [], 'no partial record should exist');
});

test('ContentIdea: invalid source is rejected', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.contentIdeaEngine.createContentIdea('valid text', 'NOT_A_REAL_SOURCE'));
});

test('ContentIdea: promote transitions NEW -> PROMOTED', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('How much can a rider earn in a day?');
  const promoted = sys.contentIdeaEngine.promoteContentIdea(idea.id);
  assert.equal(promoted.status, 'PROMOTED');
});

test('ContentIdea: promoting an already-PROMOTED idea is rejected', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('Heavy rain delivery story');
  sys.contentIdeaEngine.promoteContentIdea(idea.id);
  assert.throws(() => sys.contentIdeaEngine.promoteContentIdea(idea.id), /already PROMOTED/);
});

test('ContentIdea: source is immutable once set (CVOS-P3)', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('AI-suggested follow-up idea', 'AI_RECOMMENDATION');
  const promoted = sys.contentIdeaEngine.promoteContentIdea(idea.id);
  assert.equal(promoted.source, 'AI_RECOMMENDATION', 'promote must not touch source');
});

test('ContentIdea: creation records a ContentIdeaCreated event', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('Event log check');
  const events = sys.eventLog.all((e) => e.type === 'ContentIdeaCreated' && e.payload.id === idea.id);
  assert.equal(events.length, 1);
});
