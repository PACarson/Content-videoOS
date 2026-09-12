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

test('Persistence: Idea -> Concept -> Script chain survives a fresh system instance over the same data directory', () => {
  const dataDir = freshDataDir();

  // --- "before restart": build the chain with one system instance ---
  const before = buildSystem(dataDir);
  const idea = before.contentIdeaEngine.createContentIdea('Persistence check idea');
  const promoted = before.contentIdeaEngine.promoteContentIdea(idea.id);
  const concept = before.contentConceptEngine.createContentConcept(promoted);
  const script = before.scriptEngine.createScript(concept);
  assert.equal(concept.status, 'READY');
  assert.equal(script.status, 'READY');

  // --- "after restart": a brand-new system instance, no shared JS object
  // with `before` at all, pointed at the same on-disk directory ---
  const after = buildSystem(dataDir);

  const reloadedIdea = after.contentIdeaEngine.get(idea.id);
  const reloadedConcept = after.contentConceptEngine.get(concept.id);
  const reloadedScript = after.scriptEngine.get(script.id);

  assert.deepEqual(reloadedIdea, promoted, 'Idea state must survive identically');
  assert.deepEqual(reloadedConcept, concept, 'Concept state must survive identically');
  assert.deepEqual(reloadedScript, script, 'Script state must survive identically');

  // Re-run a relevant invariant after reload, per Phase 1 authorization §10 step 5:
  assert.throws(
    () => after.contentIdeaEngine.promoteContentIdea(idea.id),
    /already PROMOTED/,
    'the already-PROMOTED invariant must still hold after reload, not just before'
  );

  // The event history must also have survived, not just current-state snapshots.
  const events = after.eventLog.all();
  const types = events.map((e) => e.type);
  assert.ok(types.includes('ContentIdeaCreated'));
  assert.ok(types.includes('ContentIdeaPromoted'));
  assert.ok(types.includes('ContentConceptGenerated'));
  assert.ok(types.includes('ScriptGenerated'));
});
