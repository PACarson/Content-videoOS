'use strict';

/**
 * 106_Equipment.js
 *
 * Equipment — Architecture doc §10 (Equipment Model): a Production
 * Capability Model, NOT a physical-inventory system (Inventory OS
 * reconciliation is OPEN — PENDING ARCHITECTURAL DECISION, Architecture
 * §11 item #7; this file does not depend on it). Pure domain module.
 *
 * CapabilityTag is described in §10 as "a small, controlled vocabulary,
 * referenced by Equipment and by Shot" rather than an entity with its own
 * lifecycle/history — implemented here as a plain constant list, not a
 * persisted collection. The list below is illustrative and extensible
 * (Architecture §10's own examples: "A-Cam, B-Cam, POV, Drone",
 * EquipmentEngine's own example: "POV, weather-exposed").
 *
 * Failure mode named in Architecture §3 (EquipmentEngine invariant): gear
 * with no matching capability tag falls back to an explicit UNCLASSIFIED
 * state rather than blocking registration.
 */

const KNOWN_CAPABILITY_TAGS = [
  'A_CAM',
  'B_CAM',
  'POV',
  'DRONE',
  'WEATHER_EXPOSED',
  'LOW_LIGHT',
  'STABILIZED',
  'AUDIO',
  'MACRO',
  'TELEPHOTO',
];

function validateEquipmentFields(fields) {
  const errors = [];
  if (typeof fields.name !== 'string' || fields.name.trim().length === 0) {
    errors.push('name must be a non-empty string');
  }
  if (!Array.isArray(fields.capabilityTags)) {
    errors.push('capabilityTags must be an array');
  }
  return { valid: errors.length === 0, errors };
}

/**
 * Splits requested tags into recognized vs. not, per the UNCLASSIFIED
 * fallback invariant. Registration is never blocked by unrecognized tags —
 * only recognized ones are kept as matchable capabilities.
 */
function classifyTags(requestedTags) {
  const recognized = requestedTags.filter((t) => KNOWN_CAPABILITY_TAGS.includes(t));
  return {
    capabilityTags: recognized,
    classification: recognized.length > 0 ? 'CLASSIFIED' : 'UNCLASSIFIED',
  };
}

function toRecord({ id, name, capabilityTags, now }) {
  const { capabilityTags: recognized, classification } = classifyTags(capabilityTags);
  return {
    id,
    name,
    capabilityTags: recognized,
    classification,
    createdAt: now(),
  };
}

module.exports = { validateEquipmentFields, classifyTags, toRecord, KNOWN_CAPABILITY_TAGS };
