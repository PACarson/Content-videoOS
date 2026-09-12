'use strict';

/**
 * 702_reload-demo-read.js — run as its own `node` process (see 701_reload-demo-write.js).
 * Usage: node scripts/702_reload-demo-read.js <dataDir> <ideaId> <conceptId> <scriptId>
 */
const { buildSystem } = require('../src/401_system');

const [, , dataDir, ideaId, conceptId, scriptId] = process.argv;
if (!dataDir || !ideaId || !conceptId || !scriptId) {
  console.error('Usage: node 702_reload-demo-read.js <dataDir> <ideaId> <conceptId> <scriptId>');
  process.exit(1);
}

// Brand new process, brand new system instance, zero shared memory with
// whatever process wrote this data.
const sys = buildSystem(dataDir);

const idea = sys.contentIdeaEngine.get(ideaId);
const concept = sys.contentConceptEngine.get(conceptId);
const script = sys.scriptEngine.get(scriptId);

const result = {
  ideaFound: !!idea,
  ideaStatus: idea && idea.status,
  conceptFound: !!concept,
  conceptStatus: concept && concept.status,
  scriptFound: !!script,
  scriptStatus: script && script.status,
  eventCount: sys.eventLog.all().length,
};

console.log(JSON.stringify(result, null, 2));

const ok = result.ideaFound && result.ideaStatus === 'PROMOTED'
  && result.conceptFound && result.conceptStatus === 'READY'
  && result.scriptFound && result.scriptStatus === 'READY';

process.exit(ok ? 0 : 1);
