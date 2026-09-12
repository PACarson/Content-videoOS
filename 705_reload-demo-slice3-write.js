'use strict';

/**
 * 705_reload-demo-slice3-write.js
 *
 * Slice 3 counterpart to 701-704 — a genuine two-process persistence
 * demonstration through startShoot -> recordTake -> verifyTake ->
 * importMedia -> completeShoot (11_...md, required by the Slice 3
 * Implementation Task §29). 706_reload-demo-slice3-read.js runs as its own,
 * separate `node` process to confirm all of this — including the actual
 * imported binary content — survives a real process boundary, not just an
 * in-memory reference.
 *
 * Usage: node scripts/705_reload-demo-slice3-write.js <dataDir>
 */
const { buildSystem } = require('../src/401_system');

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Usage: node 705_reload-demo-slice3-write.js <dataDir>');
  process.exit(1);
}

const sys = buildSystem(dataDir);

const idea = sys.contentIdeaEngine.promoteContentIdea(
  sys.contentIdeaEngine.createContentIdea('Reload demo: rooftop sunset shoot').id
);
const concept = sys.contentConceptEngine.createContentConcept(idea);
const script = sys.scriptEngine.createScript(concept);
const { plan, shots } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Rooftop, Building 5');
sys.productionPlanEngine.authorizeProductionGo(plan.id);

const shoot = sys.shootEngine.startShoot(plan.id);
const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 14, hasAudio: true, orientation: 'vertical' });
sys.shootEngine.verifyTake(take.id);

const originalBytes = Buffer.from('reload-demo-slice3 binary payload — sunset footage bytes');
const media = sys.mediaEngine.importMedia({
  binaryContent: originalBytes,
  mediaType: 'video',
  durationSec: 14,
  orientation: 'vertical',
  shootId: shoot.id,
  shotId: shots[0].id,
  takeId: take.id,
});

sys.shootEngine.completeShoot(shoot.id);

console.log(JSON.stringify({
  planId: plan.id,
  shootId: shoot.id,
  takeId: take.id,
  shotId: shots[0].id,
  mediaAssetId: media.id,
  originalBytesBase64: originalBytes.toString('base64'),
}));
