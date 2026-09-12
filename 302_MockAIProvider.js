'use strict';

const { AIProviderPort } = require('../001_ports');

/**
 * MockAIProvider — deterministic stand-in for a real AI provider.
 *
 * Phase 1 authorization §3 / §11: "a deterministic/mock AI implementation is
 * acceptable where real AI calls are unnecessary to prove the lifecycle."
 * This sandbox also has no network access at all, so a real provider call
 * could not be made from here regardless.
 *
 * The point of Slice 1 is to prove the AI Generation Lifecycle, persistence,
 * and the invariants around them — not generation quality. Swapping this for
 * a real provider later means writing one more AIProviderPort implementation;
 * nothing in ContentConceptEngine, ScriptEngine, or the entity modules changes.
 */
class MockAIProvider extends AIProviderPort {
  generateConcept(idea) {
    const text = idea.text.trim();
    return {
      title: text.length > 60 ? text.slice(0, 57) + '...' : text,
      premise: text,
      audience: 'general',
      platform: 'short-form video',
      format: 'talking head + B-roll',
      hook: 'What if ' + text.replace(/[.?!]+$/, '') + '?',
    };
  }

  generateScript(concept) {
    return {
      content:
        'HOOK: ' + concept.hook + '\n\n' +
        'BODY: ' + concept.premise + '\n\n' +
        'CTA: Follow for more on this.',
    };
  }

  /** Added for Slice 2 — see 001_ports.js AIProviderPort.generateProductionPlan. */
  generateProductionPlan(concept, script, location) {
    return {
      shots: [
        { description: 'Opening hook: ' + concept.hook, capabilityNeed: 'A_CAM', essential: true },
        { description: 'Main coverage: ' + concept.premise, capabilityNeed: 'B_CAM', essential: true },
        { description: 'Call-to-action close', capabilityNeed: 'A_CAM', essential: false },
      ],
    };
  }

  /**
   * Added for Slice 3 — see 001_ports.js AIProviderPort.verifyTake. Deterministic,
   * technical-only checks (never creative judgment): flags missing technical
   * metadata (nothing to check — cannot be verified as sound), no detected
   * audio, or a suspiciously short duration (< 1s, likely an aborted take).
   * Anything else passes.
   */
  verifyTake(technicalMetadata) {
    if (!technicalMetadata) {
      return { result: 'FLAGGED', details: 'No technical metadata was recorded with this Take.' };
    }
    if (technicalMetadata.hasAudio === false) {
      return { result: 'FLAGGED', details: 'No audio detected.' };
    }
    if (typeof technicalMetadata.durationSec === 'number' && technicalMetadata.durationSec < 1) {
      return { result: 'FLAGGED', details: 'Duration under 1 second — likely an aborted take.' };
    }
    return { result: 'VERIFIED', details: 'Technical checks passed.' };
  }
}

module.exports = { MockAIProvider };
