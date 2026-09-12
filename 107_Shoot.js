'use strict';

/**
 * 107_Shoot.js
 *
 * Shoot — a filming session (Architecture doc §2/§3; ADR-020). Pure domain
 * module: no storage, no AI call. ShootEngine is the only caller.
 *
 * shoot_state: {IN_PROGRESS, COMPLETE} — two values only (ADR-020 §1). There
 * is deliberately no NOT_STARTED: a Shoot record does not exist before
 * `startShoot` creates it, so it is IN_PROGRESS from the moment it exists.
 * No CANCELLED/PAUSED/FAILED — deferred (10_...md §K), no evidence requires
 * them yet.
 */

function toRecord({ id, productionPlanId, now }) {
  return {
    id,
    productionPlanId,
    shoot_state: 'IN_PROGRESS',
    createdAt: now(),
    completedAt: null,
  };
}

/** recordTake is only valid against a Shoot that is still IN_PROGRESS. */
function canRecordTake(shoot) {
  return !!shoot && shoot.shoot_state === 'IN_PROGRESS';
}

/** completeShoot is only valid against a Shoot that is still IN_PROGRESS (no double-complete). */
function canComplete(shoot) {
  return !!shoot && shoot.shoot_state === 'IN_PROGRESS';
}

module.exports = { toRecord, canRecordTake, canComplete };
