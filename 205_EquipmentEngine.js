'use strict';

const Equipment = require('./106_Equipment');

const COLLECTION = 'equipment';

/**
 * 205_EquipmentEngine.js
 *
 * EquipmentEngine — owns Equipment (Architecture doc §3/§10: a Production
 * Capability Model, not a physical-inventory system; Inventory OS
 * reconciliation is OPEN — PENDING ARCHITECTURAL DECISION, not built here).
 *
 * ADR-008: recommendEquipmentForShot is deterministic rule-matching, NOT an
 * AI call — this constructor deliberately takes no `aiProvider` parameter,
 * which is itself part of the AI-authority boundary (Slice 2 Authorization
 * Gate report §I): there is no code path here through which AI could
 * influence a Production Go decision.
 */
class EquipmentEngine {
  constructor({ storage, eventLog, idGenerator, now }) {
    this.storage = storage;
    this.eventLog = eventLog;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /** Human-entered. Never blocked by unrecognized tags — see Equipment.classifyTags (UNCLASSIFIED fallback). */
  registerEquipment({ name, capabilityTags }) {
    const validation = Equipment.validateEquipmentFields({ name, capabilityTags });
    if (!validation.valid) {
      throw new Error('Invalid equipment fields: ' + validation.errors.join('; '));
    }
    const record = Equipment.toRecord({ id: this.idGenerator(), name, capabilityTags, now: this.now });
    const stored = this.storage.append(COLLECTION, record);
    this.eventLog.record('EquipmentRegistered', { id: stored.id, classification: stored.classification });
    return stored;
  }

  /** Human-entered. */
  updateEquipmentCapability(id, { name, capabilityTags }) {
    const existing = this.storage.read(COLLECTION, id);
    if (!existing) throw new Error('Equipment not found: ' + id);

    const nextName = name !== undefined ? name : existing.name;
    const nextTags = capabilityTags !== undefined ? capabilityTags : existing.capabilityTags;
    const validation = Equipment.validateEquipmentFields({ name: nextName, capabilityTags: nextTags });
    if (!validation.valid) {
      throw new Error('Invalid equipment fields: ' + validation.errors.join('; '));
    }
    const { capabilityTags: recognized, classification } = Equipment.classifyTags(nextTags);
    const updated = this.storage.update(COLLECTION, id, { name: nextName, capabilityTags: recognized, classification });
    this.eventLog.record('EquipmentUpdated', { id });
    return updated;
  }

  /** Convenience read accessor, matching the other Slice 1/2 engines. */
  get(id) {
    return this.storage.read(COLLECTION, id);
  }

  /**
   * Deterministic match against every registered Equipment's capabilityTags.
   * Returns a ranked list (most matching tags first) with a stated reason —
   * Architecture §3: "a ranked equipment recommendation with a stated
   * reason." An empty result (no match) is a normal outcome, not an error.
   */
  recommendEquipmentForShot(shot) {
    const allEquipment = this.storage.readAll(COLLECTION);
    const matches = allEquipment
      .filter((eq) => eq.capabilityTags.includes(shot.capabilityNeed))
      .map((eq) => ({
        equipmentId: eq.id,
        name: eq.name,
        reason: 'Matches required capability: ' + shot.capabilityNeed,
      }));
    return matches;
  }
}

module.exports = { EquipmentEngine };
