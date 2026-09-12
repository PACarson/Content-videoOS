'use strict';

/**
 * Script — versioned narrative/spoken content for a Concept
 * (Architecture doc §2: many per Concept, versioned). Pure domain module.
 * ScriptEngine is the only caller.
 */

function validateScriptFields(fields) {
  const errors = [];
  if (typeof fields.content !== 'string' || fields.content.trim().length === 0) {
    errors.push('content must be a non-empty string');
  }
  return { valid: errors.length === 0, errors };
}

function toRecord({ id, conceptId, version, lifecycleResult }) {
  return {
    id,
    conceptId,
    version, // multiple Script versions coexist under one Concept — Architecture §2
    content: lifecycleResult.fields.content || null,
    status: lifecycleResult.status,
    generatedBy: lifecycleResult.generatedBy,
    createdAt: lifecycleResult.generatedAt,
    validationErrors: lifecycleResult.validationErrors,
  };
}

module.exports = { validateScriptFields, toRecord };
