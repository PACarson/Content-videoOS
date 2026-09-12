'use strict';

/**
 * 105_Shot.js
 *
 * Shot — Architecture doc §2 ("Many per ProductionPlan"), §3
 * (ProductionPlanEngine owns creation via `createShot`; "A Shot marked
 * ESSENTIAL cannot be silently dropped"). Pure domain module.
 *
 * `captureStatus` is the NOT_STARTED -> CAPTURED -> VERIFIED (proposed
 * RECAPTURE_NEEDED branch) lifecycle from Architecture §6 — but that
 * lifecycle is explicitly "owned by ShootEngine" (Slice 3). Slice 2 only
 * ever creates a Shot at its initial NOT_STARTED value; nothing in this
 * file or in ProductionPlanEngine ever transitions it further. See Slice 2
 * Authorization Gate report §C.
 */

const CAPTURE_STATUS_INITIAL = 'NOT_STARTED';

function validateShotFields(fields) {
  const errors = [];
  if (typeof fields.description !== 'string' || fields.description.trim().length === 0) {
    errors.push('description must be a non-empty string');
  }
  if (typeof fields.capabilityNeed !== 'string' || fields.capabilityNeed.trim().length === 0) {
    errors.push('capabilityNeed must be a non-empty string');
  }
  return { valid: errors.length === 0, errors };
}

function toRecord({ id, productionPlanId, description, capabilityNeed, essential, now }) {
  return {
    id,
    productionPlanId,
    description,
    capabilityNeed,
    essential: !!essential,
    captureStatus: CAPTURE_STATUS_INITIAL,
    createdAt: now(),
  };
}

module.exports = { validateShotFields, toRecord, CAPTURE_STATUS_INITIAL };
