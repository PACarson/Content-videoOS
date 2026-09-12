'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSystem } = require('../src/401_system');
const { AIProviderPort } = require('../src/001_ports');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cvos-test-'));
}

function promotedIdea(sys, text) {
  const idea = sys.contentIdeaEngine.createContentIdea(text);
  return sys.contentIdeaEngine.promoteContentIdea(idea.id);
}

test('ContentConcept: generation from a promoted Idea reaches READY with no human action', () => {
  const sys = buildSystem(freshDataDir());
  const idea = promotedIdea(sys, 'What it is like to work as a delivery rider for 12 hours');
  const concept = sys.contentConceptEngine.createContentConcept(idea);

  assert.equal(concept.status, 'READY');
  assert.equal(concept.ideaId, idea.id);
  assert.ok(concept.title && concept.title.length > 0);
  assert.ok(concept.premise && concept.premise.length > 0);
  assert.ok(concept.hook && concept.hook.length > 0);
  assert.equal(concept.generatedBy, 'MockAIProvider-v1');
  assert.ok(concept.createdAt, 'provenance timestamp required (CVOS-P2)');
});

test('ContentConcept: cannot be created from a non-promoted Idea', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('Not yet promoted');
  assert.throws(() => sys.contentConceptEngine.createContentConcept(idea), /PROMOTED/);
});

test('ContentConcept: persists and is retrievable by id', () => {
  const sys = buildSystem(freshDataDir());
  const idea = promotedIdea(sys, 'How many orders can one rider complete in a shift?');
  const created = sys.contentConceptEngine.createContentConcept(idea);
  const fetched = sys.contentConceptEngine.get(created.id);
  assert.deepEqual(fetched, created);
});

test('ContentConcept: structural validation failure produces GENERATION_FAILED, not a stuck or half-written record', () => {
  const sys = buildSystem(freshDataDir());
  // An AI provider that returns a structurally invalid concept (blank title/premise/hook)
  const brokenProvider = new (class extends AIProviderPort {
    generateConcept() { return { title: '', premise: '', hook: '' }; }
  })();
  const brokenSys = buildSystem(freshDataDir(), { aiProvider: brokenProvider });
  const idea = promotedIdea(brokenSys, 'Some idea');
  const concept = brokenSys.contentConceptEngine.createContentConcept(idea);

  assert.equal(concept.status, 'GENERATION_FAILED');
  assert.ok(concept.validationErrors.length > 0);
  assert.notEqual(concept.status, 'AI_GENERATED', 'must not be left silently stuck in AI_GENERATED');
});

test('ContentConcept: no command exists to require human approval before Script generation may proceed', () => {
  const sys = buildSystem(freshDataDir());
  const idea = promotedIdea(sys, 'Rainy day delivery');
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  // The corrected CVOS-P7 contract: a READY concept, not an "approved" one,
  // is exactly what ScriptEngine requires. There is intentionally no
  // approveContentConcept call anywhere in this test.
  assert.equal(concept.status, 'READY');
  assert.doesNotThrow(() => sys.scriptEngine.createScript(concept));
});

test('ContentConcept: records a ContentConceptGenerated event on success', () => {
  const sys = buildSystem(freshDataDir());
  const idea = promotedIdea(sys, 'Event check');
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  const events = sys.eventLog.all((e) => e.type === 'ContentConceptGenerated' && e.payload.id === concept.id);
  assert.equal(events.length, 1);
});

test('ContentConcept: humanEdited flag defaults false (CVOS-P3 data-level distinction)', () => {
  const sys = buildSystem(freshDataDir());
  const idea = promotedIdea(sys, 'Distinguishing intent from AI output');
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  assert.equal(concept.humanEdited, false);
});
