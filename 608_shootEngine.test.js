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

function readyAuthorizedPlan(sys, text) {
  const idea = sys.contentIdeaEngine.promoteContentIdea(sys.contentIdeaEngine.createContentIdea(text).id);
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  const script = sys.scriptEngine.createScript(concept);
  const { plan, shots } = sys.productionPlanEngine.createProductionPlan(concept, script, 'Test location');
  const authorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  return { plan: authorized, shots };
}

// --- Production Go boundary (startShoot reuses canStartShoot, no second check) ---

test('startShoot: rejected against a READY (not yet authorized) plan', () => {
  const sys = buildSystem(freshDataDir());
  const idea = sys.contentIdeaEngine.promoteContentIdea(sys.contentIdeaEngine.createContentIdea('x').id);
  const concept = sys.contentConceptEngine.createContentConcept(idea);
  const script = sys.scriptEngine.createScript(concept);
  const { plan } = sys.productionPlanEngine.createProductionPlan(concept, script, 'loc');
  assert.throws(() => sys.shootEngine.startShoot(plan.id), /rejected/);
});

test('startShoot: rejected once authorization has been invalidated', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'invalidated plan');
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'reason');
  assert.throws(() => sys.shootEngine.startShoot(plan.id), /rejected/);
});

test('startShoot: succeeds against AUTHORIZED + authorization_valid=true, creates an IN_PROGRESS Shoot', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'happy path');
  const shoot = sys.shootEngine.startShoot(plan.id);
  assert.equal(shoot.shoot_state, 'IN_PROGRESS');
  assert.equal(shoot.productionPlanId, plan.id);
  assert.equal(shoot.completedAt, null);
});

test('startShoot: the first call for a plan advances ProductionPlan.production_state to IN_PROGRESS', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'advances plan state');
  sys.shootEngine.startShoot(plan.id);
  const updated = sys.productionPlanEngine.get(plan.id);
  assert.equal(updated.production_state, 'IN_PROGRESS');
});

test('startShoot: rejects an unknown ProductionPlan id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.shootEngine.startShoot('does-not-exist'), /not found/);
});

// --- Multi-session (Domain Model §2, fixed during Slice 3 implementation) ---

test('startShoot: a second session is allowed once the plan is IN_PROGRESS (does not re-trigger the state transition)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'multi session');
  const shoot1 = sys.shootEngine.startShoot(plan.id);
  const shoot2 = sys.shootEngine.startShoot(plan.id);
  assert.notEqual(shoot1.id, shoot2.id);
  assert.equal(shoot2.shoot_state, 'IN_PROGRESS');
  const stillInProgress = sys.productionPlanEngine.get(plan.id);
  assert.equal(stillInProgress.production_state, 'IN_PROGRESS');
});

test('startShoot: rejected for a second session once the IN_PROGRESS plan has been invalidated', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'invalidated mid-production');
  sys.shootEngine.startShoot(plan.id);
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'Equipment changed mid-production (simulated)');
  assert.throws(() => sys.shootEngine.startShoot(plan.id), /rejected/);
});

test('re-authorizing a plan that is IN_PROGRESS restores authorization without reverting production_state, and a further session is then allowed', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'reauth mid-production');
  sys.shootEngine.startShoot(plan.id);
  sys.productionPlanEngine.invalidateAuthorization(plan.id, 'reason');
  const reauthorized = sys.productionPlanEngine.authorizeProductionGo(plan.id);
  assert.equal(reauthorized.production_state, 'IN_PROGRESS');
  assert.equal(reauthorized.authorization_valid, true);
  const shoot3 = sys.shootEngine.startShoot(plan.id);
  assert.equal(shoot3.shoot_state, 'IN_PROGRESS');
});

// --- Take / recordTake ---

test('recordTake: rejected against a Shoot that is not IN_PROGRESS (already completed)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'complete then record');
  const shoot = sys.shootEngine.startShoot(plan.id);
  sys.shootEngine.completeShoot(shoot.id);
  assert.throws(() => sys.shootEngine.recordTake(shoot.id, shots[0].id, {}), /rejected/);
});

test('recordTake: rejects a Shot that belongs to a different ProductionPlan than the Shoot', () => {
  const sys = buildSystem(freshDataDir());
  const { plan: planA } = readyAuthorizedPlan(sys, 'plan A');
  const shootA = sys.shootEngine.startShoot(planA.id);
  const { shots: shotsB } = readyAuthorizedPlan(sys, 'plan B');
  assert.throws(() => sys.shootEngine.recordTake(shootA.id, shotsB[0].id, {}), /does not belong/);
});

test('recordTake: creates a unique, immutable Take and advances Shot.captureStatus NOT_STARTED -> CAPTURED', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'record take basic');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const shotBefore = sys.productionPlanEngine.getShot(shots[0].id);
  assert.equal(shotBefore.captureStatus, 'NOT_STARTED');

  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 6, hasAudio: true });
  assert.ok(take.id);
  assert.equal(take.shootId, shoot.id);
  assert.equal(take.shotId, shots[0].id);
  assert.equal(take.productionPlanId, plan.id);
  assert.equal(take.verificationResult, null);

  const shotAfter = sys.productionPlanEngine.getShot(shots[0].id);
  assert.equal(shotAfter.captureStatus, 'CAPTURED');
});

test('recordTake: multiple Takes for the same Shot remain distinct and independently retrievable', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'multiple takes');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take1 = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 3 });
  const take2 = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 4 });
  assert.notEqual(take1.id, take2.id);
  assert.equal(sys.shootEngine.takesFor(shoot.id).length, 2);
});

test('recordTake: rejects an unknown Shoot id and an unknown Shot id', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'unknown ids');
  const shoot = sys.shootEngine.startShoot(plan.id);
  assert.throws(() => sys.shootEngine.recordTake('nope', shots[0].id, {}), /Shoot not found/);
  assert.throws(() => sys.shootEngine.recordTake(shoot.id, 'nope', {}), /Shot not found/);
});

// --- verifyTake: technical verification, not creative approval ---

test('verifyTake: a clean pass advances Shot.captureStatus to VERIFIED', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'verify pass');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 10, hasAudio: true });
  const verified = sys.shootEngine.verifyTake(take.id);
  assert.equal(verified.verificationResult, 'VERIFIED');
  assert.ok(verified.verifiedAt);
  const shot = sys.productionPlanEngine.getShot(shots[0].id);
  assert.equal(shot.captureStatus, 'VERIFIED');
});

test('verifyTake: a technical failure (no audio) is FLAGGED, does not delete the Take, and does not advance Shot.captureStatus past CAPTURED', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'verify fail');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 10, hasAudio: false });
  const verified = sys.shootEngine.verifyTake(take.id);
  assert.equal(verified.verificationResult, 'FLAGGED');
  assert.ok(sys.shootEngine.getTake(take.id), 'the flagged Take is preserved, never deleted');
  const shot = sys.productionPlanEngine.getShot(shots[0].id);
  assert.equal(shot.captureStatus, 'CAPTURED', 'stays CAPTURED — there is no RECAPTURE_NEEDED value (ADR-020 §4)');
});

test('verifyTake: missing technicalMetadata is FLAGGED (nothing to technically check)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'no metadata');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, undefined);
  const verified = sys.shootEngine.verifyTake(take.id);
  assert.equal(verified.verificationResult, 'FLAGGED');
});

test('verifyTake: is immutable once set — calling it again on an already-verified Take is rejected', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'double verify');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 10, hasAudio: true });
  sys.shootEngine.verifyTake(take.id);
  assert.throws(() => sys.shootEngine.verifyTake(take.id), /already verified/);
});

test('verifyTake: AI cannot authorize Production Go, start a Shoot, or otherwise cross into consequential execution — it only ever writes verificationResult/verifiedAt on a Take', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'ai boundary');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { durationSec: 10, hasAudio: true });
  const before = { plan: sys.productionPlanEngine.get(plan.id), shoot: sys.shootEngine.get(shoot.id) };
  sys.shootEngine.verifyTake(take.id);
  const after = { plan: sys.productionPlanEngine.get(plan.id), shoot: sys.shootEngine.get(shoot.id) };
  assert.deepEqual(after.plan, before.plan, 'verifyTake never touches ProductionPlan');
  assert.deepEqual(after.shoot, before.shoot, 'verifyTake never touches Shoot');
});

test('verifyTake: rejects an unknown Take id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.shootEngine.verifyTake('nope'), /not found/);
});

// --- Recapture: no RECAPTURE_NEEDED state, old Take stays immutable (ADR-020 §4) ---

test('Recapture: a rejected Take remains preserved and immutable; a second Take for the same Shot can succeed', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'recapture flow');
  const shoot = sys.shootEngine.startShoot(plan.id);

  const take1 = sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: false });
  const verify1 = sys.shootEngine.verifyTake(take1.id);
  assert.equal(verify1.verificationResult, 'FLAGGED');

  const take2 = sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: true, durationSec: 8 });
  const verify2 = sys.shootEngine.verifyTake(take2.id);
  assert.equal(verify2.verificationResult, 'VERIFIED');

  const take1Reread = sys.shootEngine.getTake(take1.id);
  assert.equal(take1Reread.verificationResult, 'FLAGGED', 'take1 is untouched by take2 ever being recorded or verified');
  assert.notEqual(take1.id, take2.id);

  const shot = sys.productionPlanEngine.getShot(shots[0].id);
  assert.equal(shot.captureStatus, 'VERIFIED');
  assert.equal(sys.shootEngine.takesFor(shoot.id).length, 2, 'both takes remain in history');
});

test('Recapture: no persisted RECAPTURE_NEEDED value exists anywhere Shot.captureStatus is set', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'no recapture state');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: false });
  sys.shootEngine.verifyTake(take.id);
  const shot = sys.productionPlanEngine.getShot(shots[0].id);
  assert.ok(['NOT_STARTED', 'CAPTURED', 'VERIFIED'].includes(shot.captureStatus));
  assert.notEqual(shot.captureStatus, 'RECAPTURE_NEEDED');
});

// --- completeShoot ---

test('completeShoot: transitions IN_PROGRESS -> COMPLETE and does not touch ProductionPlan.production_state', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'complete shoot');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const planBefore = sys.productionPlanEngine.get(plan.id);
  const completed = sys.shootEngine.completeShoot(shoot.id);
  assert.equal(completed.shoot_state, 'COMPLETE');
  assert.ok(completed.completedAt);
  const planAfter = sys.productionPlanEngine.get(plan.id);
  assert.deepEqual(planAfter, planBefore, 'completeShoot never mutates ProductionPlan');
});

test('completeShoot: does not require every Shot to be VERIFIED (no such precondition exists in the architecture)', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'incomplete coverage');
  const shoot = sys.shootEngine.startShoot(plan.id);
  // Only shots[0] gets a take; shots[1] and shots[2] stay NOT_STARTED.
  sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: true, durationSec: 5 });
  const completed = sys.shootEngine.completeShoot(shoot.id);
  assert.equal(completed.shoot_state, 'COMPLETE');
});

test('completeShoot: repeated completion is deterministically rejected, not silently accepted', () => {
  const sys = buildSystem(freshDataDir());
  const { plan } = readyAuthorizedPlan(sys, 'double complete');
  const shoot = sys.shootEngine.startShoot(plan.id);
  sys.shootEngine.completeShoot(shoot.id);
  assert.throws(() => sys.shootEngine.completeShoot(shoot.id), /already COMPLETE/);
});

test('completeShoot: rejects an unknown Shoot id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.shootEngine.completeShoot('nope'), /not found/);
});

// --- Events ---

test('ShootStarted, TakeRecorded, TakeVerified, ShootCompleted are all recorded to the shared EventLog', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'event log coverage');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: true, durationSec: 5 });
  sys.shootEngine.verifyTake(take.id);
  sys.shootEngine.completeShoot(shoot.id);

  assert.equal(sys.eventLog.all((e) => e.type === 'ShootStarted' && e.payload.id === shoot.id).length, 1);
  assert.equal(sys.eventLog.all((e) => e.type === 'TakeRecorded' && e.payload.id === take.id).length, 1);
  assert.equal(sys.eventLog.all((e) => e.type === 'TakeVerified' && e.payload.id === take.id).length, 1);
  assert.equal(sys.eventLog.all((e) => e.type === 'ShootCompleted' && e.payload.id === shoot.id).length, 1);
});

// --- Persistence ---

test('Shoot and Take persist and are retrievable by id', () => {
  const sys = buildSystem(freshDataDir());
  const { plan, shots } = readyAuthorizedPlan(sys, 'persistence check');
  const shoot = sys.shootEngine.startShoot(plan.id);
  const take = sys.shootEngine.recordTake(shoot.id, shots[0].id, { hasAudio: true, durationSec: 5 });
  assert.deepEqual(sys.shootEngine.get(shoot.id), shoot);
  assert.deepEqual(sys.shootEngine.getTake(take.id), take);
});
