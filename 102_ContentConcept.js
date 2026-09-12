'use strict';

/**
 * ContentConcept — the authoritative content-production aggregate root
 * (Architecture doc §2, ADR-002). Pure domain module: no storage, no AI call.
 * ContentConceptEngine is the only caller.
 */

/**
 * Structural validation for the AI_VALIDATED gate. This checks *shape*, not
 * creative quality — required fields present and well-formed. Deliberately
 * minimal for Slice 1 (Product Understanding Report §4 lists more optional
 * fields — script, B-roll strategy, etc. — that later slices may populate;
 * requiring them here would be inventing a Slice 1 requirement the frozen
 * architecture doesn't impose).
 */
function validateConceptFields(fields) {
  const errors = [];
  const required = ['title', 'premise', 'hook'];
  for (const field of required) {
    if (typeof fields[field] !== 'string' || fields[field].trim().length === 0) {
      errors.push(field + ' must be a non-empty string');
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Builds the persisted-shape record from a lifecycle result. `humanEdited`
 * starts false — CVOS-P3: user intent vs. AI recommendation is distinguished
 * at the data level, not just convention. If a human ever edits a field
 * (past Slice 1's scope, but the field exists now so later slices don't need
 * a schema migration), this flips true and the engine must never silently
 * overwrite it on regeneration.
 */
function toRecord({ id, ideaId, version, lifecycleResult }) {
  return {
    id,
    ideaId,
    version,
    title: lifecycleResult.fields.title,
    premise: lifecycleResult.fields.premise,
    audience: lifecycleResult.fields.audience || null,
    platform: lifecycleResult.fields.platform || null,
    format: lifecycleResult.fields.format || null,
    hook: lifecycleResult.fields.hook,
    status: lifecycleResult.status,
    generatedBy: lifecycleResult.generatedBy,
    createdAt: lifecycleResult.generatedAt,
    validationErrors: lifecycleResult.validationErrors,
    humanEdited: false,
  };
}

module.exports = { validateConceptFields, toRecord };
