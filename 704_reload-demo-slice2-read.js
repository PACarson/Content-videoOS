'use strict';

/**
 * 704_reload-demo-slice2-read.js
 *
 * Runs in a SEPARATE `node` process from 703_reload-demo-slice2-write.js.
 * Re-reads every id that process printed and confirms the ProductionPlan's
 * post-invalidation state and its Shot List (original + the one added after
 * authorization) both survive a real process boundary, then re-authorizes
 * and confirms that also persists correctly.
 *
 * Usage: node scripts/704_reload-demo-slice2-read.js <dataDir> <planId> <equipmentId> <extraShotId>
 */
const { buildSystem } = require('../src/401_system');

const [, , dataDir, planId, equipmentId, extraShotId] = process.argv;
if (!dataDir || !planId || !equipmentId || !extraShotId) {
  console.error('Usage: node 704_reload-demo-slice2-read.js <dataDir> <planId> <equipmentId> <extraShotId>');
  process.exit(1);
}

const sys = buildSystem(dataDir);

const plan = sys.productionPlanEngine.get(planId);
const equipment = sys.equipmentEngine.get(equipmentId);
const extraShot = sys.productionPlanEngine.getShot(extraShotId);
const allShots = sys.productionPlanEngine.shotsFor(planId);

const reauthorized = sys.productionPlanEngine.authorizeProductionGo(planId);

console.log(JSON.stringify({
  planFound: !!plan,
  planStateBeforeReauth: plan ? plan.production_state : null,
  authorizationValidBeforeReauth: plan ? plan.authorization_valid : null,
  invalidationReasonBeforeReauth: plan ? plan.invalidation_reason : null,
  equipmentFound: !!equipment,
  equipmentClassification: equipment ? equipment.classification : null,
  extraShotFound: !!extraShot,
  totalShotCount: allShots.length,
  reauthorizedState: reauthorized.production_state,
  reauthorizedValid: reauthorized.authorization_valid,
}));
