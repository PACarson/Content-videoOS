'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSystem } = require('../src/401_system');
const { AIProviderPort } = require('../src/001_ports');
const ProductionPlan = require('../src/104_ProductionPlan');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cvos-test-'));
}

function readySystemAndPlanInputs(sys) {
  const idea = sys.contentIdeaEngine.promoteContentIdea(
    sys.contentIdeaEngine.createContentIdea('Behind the scenes of a community garden harvest').id
  );
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  const script = sys.scriptEngine.createScript(concept);
  return { concept, script };
}

function readyPlan(sys) {
  const { concept, script } = readySystemAndPlanInputs(sys);
  return sys.productionPlanEngine.createProductionPlan(concept, script, 'Community Garden, Lot 4');
}

// --- Generation lifecycle ---------------------------------------------

test('ProductionPlan: generation from READY Concept+Script reaches READY with shots, no human action', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyPlan(sys);

  assert.equal(plan.production_state, 'READY');
  assert.equal(plan.authorization_valid, null, 'authorization_valid is not yet meaningful before Production Go');
  assert.ok(shots.length > 0);
  shots.forEach((s) => {
    assert.equal(s.productionPlanId, plan.id);
    assert.equal(s.captureStatus, 'NOT_STARTED', 'Slice 2 never advances capture status — that is ShootEngine/Slice 3');
  });
});

test('ProductionPlan: structural validation failure (empty shots) produces GENERATION_FAILED, not AUTHORIZED or a stuck state', () => {
  class BrokenPlanProvider extends AIProviderPort {
    generateConcept(idea) { return { title: idea.text, premise: idea.text, hook: 'hook?' }; }
    generateScript() { return { content: 'x' }; }
    generateProductionPlan() { return { shots: [] }; }
  }
  const sys = buildSystem(freshDataDir(), { aiProvider: new BrokenPlanProvider() });
  const { concept, script } = readySystemAndPlanInputs(sys);
  const { plan, shots } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Nowhere in particular');

  assert.equal(plan.production_state, 'GENERATION_FAILED');
  assert.ok(plan.validationErrors.length > 0);
  assert.equal(shots.length, 0, 'a failed generation creates no Shot records');
});

test('ProductionPlan: location must be a non-empty string (caller input, not an AI field)', () => {
  const sys = buildSystem(freshDataDir());
  const { concept, script } = readySystemAndPlanInputs(sys);
  assert.throws(() => sys.productionPlanEngine.createProductionPlan(concept, script, ''), /location/);
  assert.throws(() => sys.productionPlanEngine.createProductionPlan(concept, script, undefined), /location/);
});

test('ProductionPlan: no code path from AI generation ever produces AUTHORIZED (CVOS-P7/P8)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  assert.notEqual(plan.production_state, 'AUTHORIZED');
  assert.ok(['READY', 'GENERATION_FAILED'].includes(plan.production_state));
});

// --- Production Go gate --------------------------------------------------

test('Production Go: READY -> authorizeProductionGo -> AUTHORIZED + authorization_valid=true', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  const authorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.equal(authorized.production_state, 'AUTHORIZED');
  assert.equal(authorized.authorization_valid, true);
  assert.equal(authorized.invalidation_reason, null);
  assert.equal(authorized.invalidated_at, null);
});

test('Production Go: records a ProductionGoAuthorized event', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  const events = sys.eventLog.all((e) => e.type === 'ProductionGoAuthorized' && e.payload.id === plan.id);
  assert.equal(events.length, 1);
});

test('Production Go: calling authorizeProductionGo twice while still valid is rejected', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.throws(() => sys.productionPlanEngine.authorizeProductionGo(plan.id), /rejected/);
});

test('Production Go: cannot be called on a GENERATION_FAILED plan', () => {
  class BrokenPlanProvider extends AIProviderPort {
    generateConcept(idea) { return { title: idea.text, premise: idea.text, hook: 'hook?' }; }
    generateScript() { return { content: 'x' }; }
    generateProductionPlan() { return { shots: [] }; }
  }
  const sys = buildSystem(freshDataDir(), { aiProvider: new BrokenPlanProvider() });
  const { concept, script } = readySystemAndPlanInputs(sys);
  const { plan } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Nowhere');
  assert.throws(() => sys.productionPlanEngine.authorizeProductionGo(plan.id), /GENERATION_FAILED/);
});

test('Production Go: rejects an unknown plan id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.productionPlanEngine.authorizeProductionGo('does-not-exist'), /not found/);
});

// --- canStartShoot invariant (the ShootEngine/Slice 3 precondition, enforced now) ---

test('canStartShoot: false for a READY (not yet authorized) plan', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  assert.equal(ProductionPlan.canStartShoot(plan), false);
});

test('canStartShoot: false for a GENERATION_FAILED plan', () => {
  class BrokenPlanProvider extends AIProviderPort {
    generateConcept(idea) { return { title: idea.text, premise: idea.text, hook: 'hook?' }; }
    generateScript() { return { content: 'x' }; }
    generateProductionPlan() { return { shots: [] }; }
  }
  const sys = buildSystem(freshDataDir(), { aiProvider: new BrokenPlanProvider() });
  const { concept, script } = readySystemAndPlanInputs(sys);
  const { plan } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Nowhere');
  assert.equal(ProductionPlan.canStartShoot(plan), false);
});

test('canStartShoot: true for AUTHORIZED + authorization_valid=true', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  const authorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.equal(ProductionPlan.canStartShoot(authorized), true);
});

test('canStartShoot: false for AUTHORIZED + authorization_valid=false (invalidated)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  const invalidated = sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Concept changed upstream');
  assert.equal(ProductionPlan.canStartShoot(invalidated), false);
  assert.equal(invalidated.production_state, 'AUTHORIZED', 'ADR-015: stays AUTHORIZED, never a third state');
});

// Slice 2 Completion Gate §6 full state matrix — DRAFT/IN_PROGRESS/COMPLETE had no code path
// that produced them at the time (DRAFT is never a literal production_state value this
// implementation emits). canStartShoot is a pure function, so these are tested against
// manually-constructed plan objects to pin its behavior for states the engine could not yet
// produce on its own — completion audit found this matrix was not fully exercised before (only
// READY/GENERATION_FAILED/AUTHORIZED were).
//
// UPDATED during Slice 3 implementation (11_...md): the IN_PROGRESS+valid=true row below was
// originally `false`. Domain Model §2 is explicit that "a plan can be shot across more than one
// session" — canStartShoot must allow a *second* startShoot once physical execution has begun,
// as long as authorization is still valid. The earlier assumption (only the pre-shooting
// AUTHORIZED state can start a shoot) was wrong; this test now encodes the corrected, actually
// architecturally-required behavior, not the original guess.
test('canStartShoot: full state matrix, including states this engine cannot yet produce on its own', () => {
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'DRAFT', authorization_valid: true }), false);
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'READY', authorization_valid: true }), false);
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'AUTHORIZED', authorization_valid: true }), true);
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'AUTHORIZED', authorization_valid: false }), false);
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'IN_PROGRESS', authorization_valid: true }), true);
  assert.equal(ProductionPlan.canStartShoot({ production_state: 'COMPLETE', authorization_valid: true }), false);
  assert.equal(ProductionPlan.canStartShoot(null), false, 'a missing plan is not startable');
  assert.equal(ProductionPlan.canStartShoot(undefined), false);
});

// --- Authorization staleness (CVOS-P9 / ADR-015) --------------------------

test('Staleness (organic): creating a new Shot on an already-AUTHORIZED plan invalidates authorization', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);

  const extra = sys.productionPlanEngine.createShot(plan.id, {
    description: 'Extra pickup shot added after Go', capabilityNeed: 'DRONE', essential: false,
  });
  assert.ok(extra.id);

  const afterward = sys.productionPlanEngine.get(plan.id);
  assert.equal(afterward.production_state, 'AUTHORIZED');
  assert.equal(afterward.authorization_valid, false);
  assert.match(afterward.invalidation_reason, /[Ss]hot/);
  assert.ok(afterward.invalidated_at);
});

test('Staleness: creating a Shot on a plan that is not yet authorized does NOT touch authorization fields', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.createShot(plan.id, { description: 'manual add', capabilityNeed: 'AUDIO', essential: false });
  const stillReady = sys.productionPlanEngine.get(plan.id);
  assert.equal(stillReady.production_state, 'READY');
  assert.equal(stillReady.authorization_valid, null);
});

test('Staleness (simulated — no editConcept command exists in Slice 1/2, see 07_...md §H): ' +
  'invalidateAuthorization models a Concept-change trigger', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  const invalidated = sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Concept changed upstream (simulated)');
  assert.equal(invalidated.authorization_valid, false);
  assert.equal(invalidated.invalidation_reason, 'Concept changed upstream (simulated)');
});

test('Staleness (simulated — no editScript command exists in Slice 1/2, see 07_...md §H): ' +
  'invalidateAuthorization models a Script-change trigger identically to the organic Shot-List one', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  const invalidated = sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Script changed upstream (simulated)');
  assert.equal(invalidated.authorization_valid, false);
  assert.equal(invalidated.invalidation_reason, 'Script changed upstream (simulated)');
});

test('Staleness (simulated — no editEquipment command exists in Slice 1/2, see 07_...md §H): ' +
  'invalidateAuthorization models an Equipment-change trigger', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  const invalidated = sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Equipment changed upstream (simulated)');
  assert.equal(invalidated.authorization_valid, false);
  assert.equal(invalidated.invalidation_reason, 'Equipment changed upstream (simulated)');
});

test('invalidateAuthorization: rejects a plan that is not currently AUTHORIZED', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys); // still READY, never authorized
  assert.throws(() => sys.productionPlanEngine.invalidateAuthorization(plan.id, 'anything'), /not AUTHORIZED/);
});

test('Re-authorization: authorizeProductionGo succeeds again after invalidation and clears the reason/timestamp', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Equipment changed upstream (simulated)');

  const reauthorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.equal(reauthorized.production_state, 'AUTHORIZED');
  assert.equal(reauthorized.authorization_valid, true);
  assert.equal(reauthorized.invalidation_reason, null);
  assert.equal(reauthorized.invalidated_at, null);
  assert.equal(ProductionPlan.canStartShoot(reauthorized), true);
});

test('Re-authorization: recorded as its own ProductionGoAuthorized event, distinguishable from first authorization', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'reason');
  sys.productionPlanEngine.authorizeProductionGo(plan.id);

  const events = sys.eventLog.all((e) => e.type === 'ProductionGoAuthorized' && e.payload.id === plan.id);
  assert.equal(events.length, 2);
  assert.equal(events[0].payload.reAuthorization, false);
  assert.equal(events[1].payload.reAuthorization, true);
});

// --- Persistence -----------------------------------------------------------

test('ProductionPlan and its Shots persist and are retrievable by id', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyPlan(sys);
  assert.deepEqual(sys.productionPlanEngine.get(plan.id), plan);
  shots.forEach((s) => assert.deepEqual(sys.productionPlanEngine.getShot(s.id), s));
  assert.equal(sys.productionPlanEngine.shotsFor(plan.id).length, shots.length);
});

// --- Fixed during Slice 3 implementation (11_...md): multi-session support ---
// Domain Model §2: "a plan can be shot across more than one session." This was a
// latent bug in the original Slice 2 authorization logic (it only ever considered
// `production_state === 'AUTHORIZED'`) that could not be exercised until Slice 3's
// ShootEngine actually drove a plan into IN_PROGRESS — the IN_PROGRESS variant of
// this fix is covered end-to-end in 608_shootEngine.test.js. This test covers the
// ProductionPlanEngine-only guarantee: re-authorizing never reverts production_state.

test('re-authorizing an AUTHORIZED + invalid plan restores authorization_valid without changing production_state', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyPlan(sys);
  sys.productionPlanEngine.authorizeProductionGo(plan.id);
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Equipment changed (simulated)');
  const reauthorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.equal(reauthorized.authorization_valid, true);
  assert.equal(reauthorized.invalidation_reason, null);
  assert.equal(reauthorized.production_state, 'AUTHORIZED');
});
