'use strict';

/**
 * 002_aiGenerationLifecycle.js
 *
 * The generic, fully-automatic state machine for any AI-generated intermediate
 * artifact (AI Production Contract §C, "AI Generation Lifecycle", corrected
 * under Phase 0D — renamed from "AI Decision Lifecycle"):
 *
 *   AI_GENERATED -> AI_VALIDATED -> AI_RECOMMENDED -> READY
 *
 * No human action is embedded anywhere in this chain (CVOS-P7). If structural
 * validation fails, the artifact stops at GENERATION_FAILED instead of silently
 * continuing or getting stuck mid-chain (Architecture §3, ContentConceptEngine
 * failure mode: "must leave the Concept in a clearly-flagged, retryable state,
 * not stuck in AI_GENERATED indefinitely").
 *
 * This module is reused, not reinvented, by every AI-generation point in the
 * pipeline (ContentConceptEngine, ScriptEngine — and, past Slice 1, EditPlanEngine).
 */

const STATE = Object.freeze({
  AI_GENERATED: 'AI_GENERATED',
  AI_VALIDATED: 'AI_VALIDATED',
  AI_RECOMMENDED: 'AI_RECOMMENDED',
  READY: 'READY',
  GENERATION_FAILED: 'GENERATION_FAILED',
});

/**
 * Runs one artifact through the full lifecycle synchronously.
 *
 * @param {object} params
 * @param {function(): object} params.generate   - produces the raw field values (AI_GENERATED)
 * @param {function(object): {valid: boolean, errors: string[]}} params.validate
 *        - structural/schema validation (the AI_VALIDATED gate)
 * @param {function(object): boolean} [params.meetsQualityBar]
 *        - the AI_RECOMMENDED gate; defaults to "always true" for Slice 1's
 *          mock provider, since a deterministic stub has no real quality
 *          judgement to make. A real provider integration would put an
 *          actual check here without changing this module.
 * @param {string} params.generatedBy - provenance string (CVOS-P2)
 * @param {function(): string} params.now - injectable clock, for deterministic tests
 *
 * @returns {object} { status, fields, generatedBy, generatedAt, validationErrors }
 *          fields is {} if status === GENERATION_FAILED.
 */
function runLifecycle({ generate, validate, meetsQualityBar, generatedBy, now }) {
  const generatedAt = now();

  // AI_GENERATED
  let fields;
  try {
    fields = generate();
  } catch (err) {
    return {
      status: STATE.GENERATION_FAILED,
      fields: {},
      generatedBy,
      generatedAt,
      validationErrors: ['generation threw: ' + err.message],
    };
  }

  // AI_VALIDATED
  const check = validate(fields);
  if (!check.valid) {
    return {
      status: STATE.GENERATION_FAILED,
      fields,
      generatedBy,
      generatedAt,
      validationErrors: check.errors,
    };
  }

  // AI_RECOMMENDED
  const qualityCheck = meetsQualityBar ? meetsQualityBar(fields) : true;
  if (!qualityCheck) {
    return {
      status: STATE.GENERATION_FAILED,
      fields,
      generatedBy,
      generatedAt,
      validationErrors: ['did not meet AI_RECOMMENDED quality bar'],
    };
  }

  // READY — no human action anywhere in this chain (CVOS-P7)
  return {
    status: STATE.READY,
    fields,
    generatedBy,
    generatedAt,
    validationErrors: [],
  };
}

module.exports = { STATE, runLifecycle };
