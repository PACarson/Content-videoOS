'use strict';

/**
 * 701_reload-demo-write.js
 *
 * Not a unit test — a literal demonstration for the completion report.
 * Run as its own `node` process, writes the Idea->Concept->Script chain to
 * disk, prints the ids, and exits. 702_reload-demo-read.js is then run as a
 * SEPARATE process (not just a new object in the same process, the way
 * test/605_persistence.test.js proves it) to show state survives a real
 * process boundary, per Phase 1 authorization §10.
 *
 * Usage: node scripts/701_reload-demo-write.js <dataDir>
 */
const { buildSystem } = require('../src/401_system');

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Usage: node 701_reload-demo-write.js <dataDir>');
  process.exit(1);
}

const sys = buildSystem(dataDir);
const idea = sys.contentIdeaEngine.createContentIdea('Reload demo: rainy day delivery shift');
const promoted = sys.contentIdeaEngine.promoteContentIdea(idea.id);
const concept = sys.contentConceptEngine.createContentConcept(promoted);
const script = sys.scriptEngine.createScript(concept);

console.log(JSON.stringify({ ideaId: idea.id, conceptId: concept.id, conceptStatus: concept.status, scriptId: script.id, scriptStatus: script.status }));
