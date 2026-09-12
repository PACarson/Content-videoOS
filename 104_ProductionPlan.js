'use strict';

/**
 * 104_ProductionPlan.js
 *
 * ProductionPlan — Architecture doc §2/§3, ADR-002 (hangs off ContentConcept,
 * no independent identity), ADR-015 (authorization validity representation).
 * Pure domain module: no storage, no AI call. ProductionPlanEngine is the
 * only caller.
 *
 * `production_state` reuses the AI Generation Lifecycle values
 * (AI_GENERATED/AI_VALIDATED/AI_RECOMMENDED/READY/GENERATION_FAILED — same
 * module as ContentConcept/Script, Architecture doc §6: "reused for Concept,
 * Script, Production Plan, EditPlan") for the pre-READY phase, then extends
 * with AUTHORIZED/IN_PROGRESS/COMPLETE per ADR-015's explicit five values for
 * the post-Production-Go phase. This is an implementation-level reconciliation
 * of two things the frozen architecture already both says, not a new
 * invention — see the Slice 2 Authorization Gate report §G.
 *
 * ADR-015: `AUTHORIZATION_INVALIDATED` is never a value of `production_state`.
 * Authorization validity is the orthogonal `authorization_valid` /
 * `invalidation_reason` / `invalidated_at` fields below.
 */

/**
 * Structural validation for the AI_VALIDATED gate. Checks the AI-generated
 * `shots` shape only — `location` is a caller-supplied input to
 * generateProductionPlan, not part of what the AI returns, so it is
 * validated by ProductionPlanEngine.createProductionPlan's own argument
 * handling, not here (mirrors how conceptId/scriptId are never part of
 * ContentConcept/Script's own field validation either).
 */
function validatePlanFields(fields) {
  const errors = [];
  if (!Array.isArray(fields.shots) || fields.shots.length === 0) {
    errors.push('shots must be a non-empty array');
  } else {
    fields.shots.forEach((shot, i) => {
      if (typeof shot.description !== 'string' || shot.description.trim().length === 0) {
        errors.push('shots[' + i + '].description must be a non-empty string');
      }
      if (typeof shot.capabilityNeed !== 'string' || shot.capabilityNeed.trim().length === 0) {
        errors.push('shots[' + i + '].capabilityNeed must be a non-empty string');
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Builds the persisted-shape record from a lifecycle result. `shots` itself
 * is NOT stored on this record — each proposed shot becomes its own Shot
 * record (ProductionPlanEngine.createShot), keeping the same
 * child-references-parent-by-id pattern Script already uses (conceptId).
 *
 * `production_state` starts at the lifecycle's own status (READY or
 * GENERATION_FAILED — never AUTHORIZED; see §G of the gate report for why
 * that invariant holds by construction here).
 */
function toRecord({ id, conceptId, scriptId, location, generatedBy, lifecycleResult }) {
  return {
    id,
    conceptId,
    scriptId,
    location,
    production_state: lifecycleResult.status,
    authorization_valid: null,
    invalidation_reason: null,
    invalidated_at: null,
    generatedBy,
    createdAt: lifecycleResult.generatedAt,
    validationErrors: lifecycleResult.validationErrors,
    humanEdited: false,
  };
}

/**
 * The single source of truth for "may a shoot start against this plan" —
 * ADR-015 / Architecture §3 (ShootEngine invariant): both conditions are
 * required, enforced here so that ShootEngine (Slice 3) reuses this function
 * rather than re-implementing the check.
 *
 * Fixed during Slice 3 implementation (11_...md): originally checked only
 * `production_state === 'AUTHORIZED'`, which silently blocked every session
 * after the first one. Domain Model §2 is explicit that "a plan can be shot
 * across more than one session" — once physical execution has begun
 * (`IN_PROGRESS`), a further `startShoot` for a *second* session must still
 * be allowed, as long as authorization has not since been invalidated. This
 * is a bug-fix to match an already-frozen fact (multi-session support was
 * never in question), not a reopening of the Shoot lifecycle decision
 * itself (ADR-020) or of ADR-015.
 */
function canStartShoot(plan) {
  return !!plan &&
    (plan.production_state === 'AUTHORIZED' || plan.production_state === 'IN_PROGRESS') &&
    plan.authorization_valid === true;
}

module.exports = { validatePlanFields, toRecord, canStartShoot };
