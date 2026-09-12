'use strict';

/**
 * ContentIdea — a raw, lightly-structured content opportunity.
 * Product Understanding Report §4; Architecture doc §2 (many, independent of any Concept).
 *
 * Pure domain module: no storage, no AI, no I/O. ContentIdeaEngine is the only
 * caller, and only ContentIdeaEngine persists what this module produces.
 */

const STATUS = Object.freeze({ NEW: 'NEW', PROMOTED: 'PROMOTED' });
const SOURCE = Object.freeze({ USER: 'USER', AI_RECOMMENDATION: 'AI_RECOMMENDATION' });

/**
 * Validates raw input for a new idea. Returns { valid, errors }.
 */
function validateNewIdea(text) {
  const errors = [];
  if (typeof text !== 'string' || text.trim().length === 0) {
    errors.push('text must be a non-empty string');
  } else if (text.trim().length > 2000) {
    errors.push('text must be 2000 characters or fewer');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Builds a new ContentIdea record in NEW status. Throws if input is invalid —
 * callers (the engine) are expected to validate first and surface the error,
 * this is the last line of defense so an invalid Idea can never be constructed.
 */
function createIdea({ id, text, source, createdAt }) {
  const check = validateNewIdea(text);
  if (!check.valid) {
    throw new Error('Invalid ContentIdea input: ' + check.errors.join('; '));
  }
  if (!Object.values(SOURCE).includes(source)) {
    throw new Error('Invalid ContentIdea source: ' + source);
  }
  return {
    id,
    text: text.trim(),
    source, // CVOS-P3: source is set at creation and never changed (Architecture §3, ContentIdeaEngine invariant)
    status: STATUS.NEW,
    createdAt,
  };
}

/**
 * Returns a copy of the idea transitioned to PROMOTED, or throws if it is
 * already promoted (ContentIdeaEngine invariant, Architecture §3).
 */
function promote(idea) {
  if (idea.status === STATUS.PROMOTED) {
    throw new Error('ContentIdea ' + idea.id + ' is already PROMOTED');
  }
  return { ...idea, status: STATUS.PROMOTED };
}

module.exports = { STATUS, SOURCE, validateNewIdea, createIdea, promote };
