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

function readyConcept(sys, ideaText) {
  const idea = sys.contentIdeaEngine.createContentIdea(ideaText);
  const promoted = sys.contentIdeaEngine.promoteContentIdea(idea.id);
  return sys.contentConceptEngine.createContentConcept(promoted);
}

test('Script: generation from a READY Concept reaches READY with no human action', () => {
  const sys = buildSystem(freshDataDir());
  const concept = readyConcept(sys, 'What happens during heavy rain deliveries');
  const script = sys.scriptEngine.createScript(concept);

  assert.equal(script.status, 'READY');
  assert.equal(script.conceptId, concept.id);
  assert.ok(script.content && script.content.length > 0);
  assert.equal(script.version, 1);
  assert.ok(script.createdAt);
});

test('Script: cannot be created from a Concept that is not READY', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.createContentIdea('Not ready yet');
  // idea not promoted, so no concept can legitimately exist; simulate a
  // non-READY concept object directly to test the guard itself.
  const notReadyConcept = { id: 'fake', status: 'AI_GENERATED' };
  assert.throws(() => sys.scriptEngine.createScript(notReadyConcept), /READY ContentConcept/);
});

test('Script: persists and is retrievable by id', () => {
  const sys = buildSystem(freshDataDir());
  const concept = readyConcept(sys, 'Expenses a rider actually has');
  const created = sys.scriptEngine.createScript(concept);
  const fetched = sys.scriptEngine.get(created.id);
  assert.deepEqual(fetched, created);
});

test('Script: structural validation failure produces GENERATION_FAILED', () => {
  const brokenProvider = new (class extends AIProviderPort {
    generateConcept(idea) {
      return { title: idea.text, premise: idea.text, hook: 'hook: ' + idea.text };
    }
    generateScript() { return { content: '' }; }
  })();
  const sys = buildSystem(freshDataDir(), { aiProvider: brokenProvider });
  const concept = readyConcept(sys, 'A valid enough idea for the concept step');
  const script = sys.scriptEngine.createScript(concept);
  assert.equal(script.status, 'GENERATION_FAILED');
  assert.ok(script.validationErrors.length > 0);
});

test('Script: records a ScriptGenerated event on success', () => {
  const sys = buildSystem(freshDataDir());
  const concept = readyConcept(sys, 'Event check for script');
  const script = sys.scriptEngine.createScript(concept);
  const events = sys.eventLog.all((e) => e.type === 'ScriptGenerated' && e.payload.id === script.id);
  assert.equal(events.length, 1);
});
