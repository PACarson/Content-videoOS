'use strict';

/**
 * 108_Take.js
 *
 * Take — an immutable, append-only execution fact: "this attempt at this
 * Shot happened, during this Shoot" (Architecture doc §2: "Take is the
 * traceability link between a planned Shot and a captured MediaAsset, and
 * one Shot can have several Takes"; ADR-020 §4). Pure domain module.
 *
 * No lifecycle/state machine of its own. Its core recorded fields
 * (productionPlanId/shootId/shotId/technicalMetadata/recordedAt) are never
 * changed once written (CVOS-P4/P6 applied by analogy: an executed fact is
 * never mutated, never overwritten — a rejected Take stays exactly as
 * recorded; a recapture simply records a new Take).
 *
 * `verificationResult` is the one field allowed to move from `null` to a
 * final value — a single, one-time fill-in (verifyTake), not a revisable
 * state. Once set, it too is immutable (see 206_ShootEngine.js.verifyTake's
 * own-already-verified guard).
 */

function validateTakeFields({ shotId, technicalMetadata }) {
  const errors = [];
  if (typeof shotId !== 'string' || shotId.trim().length === 0) {
    errors.push('shotId must be a non-empty string');
  }
  if (technicalMetadata !== undefined && technicalMetadata !== null && typeof technicalMetadata !== 'object') {
    errors.push('technicalMetadata, if provided, must be an object');
  }
  return { valid: errors.length === 0, errors };
}

function toRecord({ id, productionPlanId, shootId, shotId, technicalMetadata, now }) {
  return {
    id,
    productionPlanId,
    shootId,
    shotId,
    technicalMetadata: technicalMetadata || null,
    recordedAt: now(),
    verificationResult: null,
    verifiedAt: null,
  };
}

module.exports = { validateTakeFields, toRecord };
