'use strict';

const ProductionPlan = require('./104_ProductionPlan');
const Shot = require('./105_Shot');
const { runLifecycle } = require('./002_aiGenerationLifecycle');

const PLAN_COLLECTION = 'production_plans';
const SHOT_COLLECTION = 'shots';

/**
 * 204_ProductionPlanEngine.js
 *
 * ProductionPlanEngine — owns ProductionPlan and Shot (Architecture doc §3;
 * absorbs the separately-named Shot-List engine per that same section).
 * Depends only on StorageAdapterPort + AIProviderPort + injected id/clock,
 * never on a concrete adapter — see 001_ports.js.
 *
 * Slice 2 Authorization Gate report (07_...md) governs every invariant
 * enforced below; do not change these without re-reading that report's §G/§H.
 */
class ProductionPlanEngine {
  constructor({ storage, eventLog, aiProvider, idGenerator, now }) {
    this.storage = storage;
    this.eventLog = eventLog;
    this.aiProvider = aiProvider;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /**
   * Concept and script must already be READY — this engine does not
   * re-validate their own lifecycle, only consumes them (mirrors
   * ScriptEngine consuming a READY ContentConcept).
   */
  createProductionPlan(concept, script, location) {
    if (typeof location !== 'string' || location.trim().length === 0) {
      throw new Error('location must be a non-empty string');
    }
    const id = this.idGenerator();
    const lifecycleResult = runLifecycle({
      generate: () => this.aiProvider.generateProductionPlan(concept, script, location),
      validate: (fields) => ProductionPlan.validatePlanFields(fields),
      meetsQualityBar: () => true,
      generatedBy: 'MockAIProvider',
      now: this.now,
    });

    const record = ProductionPlan.toRecord({
      id,
      conceptId: concept.id,
      scriptId: script.id,
      location,
      generatedBy: lifecycleResult.generatedBy,
      lifecycleResult,
    });
    const stored = this.storage.append(PLAN_COLLECTION, record);

    this.eventLog.record('ProductionPlanCreated', { id, status: stored.production_state });

    // Only a successful, READY plan gets its proposed shots persisted — a
    // GENERATION_FAILED plan carries no shots to create (lifecycleResult.fields
    // is either {} or a shape that failed validation; either way, nothing
    // trustworthy to turn into Shot records).
    const shots = [];
    if (stored.production_state === 'READY' && Array.isArray(lifecycleResult.fields.shots)) {
      for (const proposedShot of lifecycleResult.fields.shots) {
        shots.push(this.createShot(stored.id, proposedShot));
      }
    }

    return { plan: stored, shots };
  }

  /**
   * Architecture §3: "Commands: createProductionPlan, createShot". Also the
   * mechanism by which a Shot-List change on an already-AUTHORIZED plan
   * invalidates that authorization (CVOS-P9 / ADR-015) — this is the one
   * staleness trigger Slice 2 can enforce organically, since createShot is a
   * real, callable Slice 2 command (unlike editing an existing Concept/
   * Script/Equipment, which no Slice 1 or Slice 2 command creates a path
   * for — see the gate report §H for why those remain simulated in tests).
   */
  createShot(productionPlanId, { description, capabilityNeed, essential }) {
    const plan = this.storage.read(PLAN_COLLECTION, productionPlanId);
    if (!plan) throw new Error('ProductionPlan not found: ' + productionPlanId);

    const validation = Shot.validateShotFields({ description, capabilityNeed });
    if (!validation.valid) {
      throw new Error('Invalid shot fields: ' + validation.errors.join('; '));
    }

    const shot = Shot.toRecord({
      id: this.idGenerator(),
      productionPlanId,
      description,
      capabilityNeed,
      essential,
      now: this.now,
    });
    const stored = this.storage.append(SHOT_COLLECTION, shot);
    this.eventLog.record('ShotCreated', { id: stored.id, productionPlanId });

    // Fixed during Slice 3 implementation (11_...md): originally only
    // checked `production_state === 'AUTHORIZED'`, so a Shot added after
    // physical shooting had already begun (IN_PROGRESS) silently skipped
    // invalidation — the opposite of what CVOS-P9 requires once real
    // resources are being committed. IN_PROGRESS is now treated the same as
    // AUTHORIZED for this check; this does not touch the Shoot lifecycle
    // decision (ADR-020) or ADR-015 itself.
    if ((plan.production_state === 'AUTHORIZED' || plan.production_state === 'IN_PROGRESS') && plan.authorization_valid === true) {
      this.invalidateAuthorization(productionPlanId, 'Shot list changed after authorization (new shot added)');
    }

    return stored;
  }

  /**
   * The ONLY command that may set production_state to AUTHORIZED —
   * Architecture §3 invariant, enforced here, not merely documented.
   * Human-only by construction: nothing about this method's inputs comes
   * from AI (contrast createProductionPlan, which calls this.aiProvider).
   *
   * Two, and only two, valid entry conditions:
   *  - first authorization: production_state === 'READY' (sets
   *    production_state to AUTHORIZED)
   *  - re-authorization after a material change: production_state is
   *    'AUTHORIZED' OR 'IN_PROGRESS' (fixed during Slice 3 implementation,
   *    11_...md — physical shooting may already be underway when a
   *    material change invalidates authorization; re-authorizing must not
   *    revert that historical fact back to 'AUTHORIZED') with
   *    authorization_valid === false. production_state is left untouched
   *    in this case — only authorization_valid/invalidation_reason/
   *    invalidated_at change.
   * Anything else (GENERATION_FAILED, an intermediate lifecycle value, or
   * an already-valid AUTHORIZED/IN_PROGRESS plan) is rejected.
   */
  authorizeProductionGo(planId) {
    const plan = this.storage.read(PLAN_COLLECTION, planId);
    if (!plan) throw new Error('ProductionPlan not found: ' + planId);

    const firstAuthorization = plan.production_state === 'READY';
    const reAuthorization =
      (plan.production_state === 'AUTHORIZED' || plan.production_state === 'IN_PROGRESS') &&
      plan.authorization_valid === false;

    if (!firstAuthorization && !reAuthorization) {
      throw new Error(
        'authorizeProductionGo rejected: ProductionPlan ' + planId +
        ' is ' + plan.production_state +
        (plan.production_state === 'AUTHORIZED' || plan.production_state === 'IN_PROGRESS'
          ? ' with authorization_valid=' + plan.authorization_valid : '') +
        ' (requires READY, or AUTHORIZED/IN_PROGRESS with authorization_valid=false)'
      );
    }

    const patch = { authorization_valid: true, invalidation_reason: null, invalidated_at: null };
    if (firstAuthorization) {
      patch.production_state = 'AUTHORIZED';
    }
    // reAuthorization: production_state is intentionally omitted from the
    // patch — it stays whatever it currently is (AUTHORIZED or IN_PROGRESS).

    const updated = this.storage.update(PLAN_COLLECTION, planId, patch);
    this.eventLog.record('ProductionGoAuthorized', { id: planId, reAuthorization });
    return updated;
  }

  /**
   * Consequence-side of CVOS-P9 / ADR-015 staleness. production_state stays
   * exactly what it was (AUTHORIZED or IN_PROGRESS) — it never becomes a
   * distinct third state (ADR-015 is explicit that AUTHORIZATION_INVALIDATED
   * is not a production_state value). Fixed during Slice 3 implementation
   * (11_...md) to accept IN_PROGRESS as well as AUTHORIZED — see canStartShoot
   * in 104_ProductionPlan.js for the matching fix and its rationale.
   */
  invalidateAuthorization(planId, reason) {
    const plan = this.storage.read(PLAN_COLLECTION, planId);
    if (!plan) throw new Error('ProductionPlan not found: ' + planId);
    if (plan.production_state !== 'AUTHORIZED' && plan.production_state !== 'IN_PROGRESS') {
      throw new Error('invalidateAuthorization rejected: ProductionPlan ' + planId + ' is not AUTHORIZED or IN_PROGRESS');
    }

    const updated = this.storage.update(PLAN_COLLECTION, planId, {
      authorization_valid: false,
      invalidation_reason: reason,
      invalidated_at: this.now(),
    });
    this.eventLog.record('ProductionGoAuthorizationInvalidated', { id: planId, reason });
    return updated;
  }
  /** Convenience read accessor, matching ContentIdeaEngine/ContentConceptEngine/ScriptEngine. */
  get(id) {
    return this.storage.read(PLAN_COLLECTION, id);
  }

  getShot(id) {
    return this.storage.read(SHOT_COLLECTION, id);
  }

  shotsFor(productionPlanId) {
    return this.storage.readAll(SHOT_COLLECTION, (s) => s.productionPlanId === productionPlanId);
  }
}

module.exports = { ProductionPlanEngine };
