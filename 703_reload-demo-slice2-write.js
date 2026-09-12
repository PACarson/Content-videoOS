'use strict';

/**
 * 703_reload-demo-slice2-write.js
 *
 * Slice 2 counterpart to 701/702 — extends the same two-process persistence
 * demonstration (Slice 2 Authorization Gate report, 07_...md §L) through
 * Equipment registration, ProductionPlan generation, Production Go
 * authorization, a post-authorization Shot List change (organic staleness
 * trigger), and re-authorization. 704_reload-demo-slice2-read.js runs as a
 * SEPARATE process to confirm all of this survives a real process boundary,
 * not just object references held in memory.
 *
 * Usage: node scripts/703_reload-demo-slice2-write.js <dataDir>
 */
const { buildSystem } = require('../src/401_system');

const dataDir = process.argv[2];
if (!dataDir) {
  console.error('Usage: node 703_reload-demo-slice2-write.js <dataDir>');
  process.exit(1);
}

const sys = buildSystem(dataDir);

const idea = sys.contentIdeaEngine.promoteContentIdea(
  sys.contentIdeaEngine.createContentIdea('Reload demo: community garden harvest').id
);
const concept = sys.contentConceptEngine.createContentConcept(idea);
const script = sys.scriptEngine.createScript(concept);

const equipment = sys.equipmentEngine.registerEquipment({ name: 'Reload-demo drone', capabilityTags: ['DRONE'] });

const { plan, shots } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Community Garden, Lot 4');
sys.productionPlanEngine.authorizeProductionGo(plan.id);

// Organic staleness trigger: a Shot List change after authorization.
const extraShot = sys.productionPlanEngine.createShot(plan.id, {
  description: 'Reload demo: extra drone establishing shot', capabilityNeed: 'DRONE', essential: false,
});

const afterExtraShot = sys.productionPlanEngine.get(plan.id);

console.log(JSON.stringify({
  planId: plan.id,
  planStateAfterFirstGo: 'AUTHORIZED',
  planStateAfterExtraShot: afterExtraShot.production_state,
  authorizationValidAfterExtraShot: afterExtraShot.authorization_valid,
  equipmentId: equipment.id,
  originalShotIds: shots.map((s) => s.id),
  extraShotId: extraShot.id,
}));
