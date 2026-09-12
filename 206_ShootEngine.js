'use strict';

const ProductionPlan = require('./104_ProductionPlan');
const Shoot = require('./107_Shoot');
const Take = require('./108_Take');

const PLAN_COLLECTION = 'production_plans';
const SHOT_COLLECTION = 'shots';
const SHOOT_COLLECTION = 'shoots';
const TAKE_COLLECTION = 'takes';

/**
 * 206_ShootEngine.js
 *
 * ShootEngine — owns Shoot and Take (Architecture doc §3: "Persistence:
 * Owns Shoot, Take"). It also owns the Shot *capture-status* lifecycle
 * (Architecture §6: "Shot/Take capture lifecycle ... owned by ShootEngine")
 * even though the Shot *record itself* is created by ProductionPlanEngine —
 * this is why this file reads/writes the shared `shots` collection directly
 * through the same generic StorageAdapterPort every engine already uses,
 * rather than depending on ProductionPlanEngine as an object. See the
 * Slice 3 Semantic Resolution Decision (10_...md) and ADR-020 for the full
 * reasoning behind every invariant enforced below — do not change them
 * without re-reading that document.
 *
 * Depends only on StorageAdapterPort + AIProviderPort + injected id/clock,
 * never on a concrete adapter — see 001_ports.js.
 */
class ShootEngine {
  constructor({ storage, eventLog, aiProvider, idGenerator, now }) {
    this.storage = storage;
    this.eventLog = eventLog;
    this.aiProvider = aiProvider;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /**
   * Reuses ProductionPlan.canStartShoot — the single canonical authorization
   * check (ADR-015 / Slice 2). ShootEngine never re-implements this logic.
   *
   * A plan can be shot across more than one session (Architecture §2), so
   * only the *first* startShoot for a given plan advances
   * ProductionPlan.production_state to IN_PROGRESS — a later startShoot
   * against an already-IN_PROGRESS plan is still allowed (starting a second
   * session) but does not re-trigger that transition.
   */
  startShoot(productionPlanId) {
    const plan = this.storage.read(PLAN_COLLECTION, productionPlanId);
    if (!plan) throw new Error('ProductionPlan not found: ' + productionPlanId);
    if (!ProductionPlan.canStartShoot(plan)) {
      throw new Error(
        'startShoot rejected: ProductionPlan ' + productionPlanId +
        ' is ' + plan.production_state +
        (plan.production_state === 'AUTHORIZED' ? ' with authorization_valid=' + plan.authorization_valid : '') +
        ' (requires AUTHORIZED with authorization_valid=true)'
      );
    }

    const shoot = Shoot.toRecord({ id: this.idGenerator(), productionPlanId, now: this.now });
    const stored = this.storage.append(SHOOT_COLLECTION, shoot);
    this.eventLog.record('ShootStarted', { id: stored.id, productionPlanId });

    if (plan.production_state === 'AUTHORIZED') {
      this.storage.update(PLAN_COLLECTION, productionPlanId, { production_state: 'IN_PROGRESS' });
    }

    return stored;
  }

  /**
   * recordTake -> Shot.captureStatus: NOT_STARTED -> CAPTURED (10_...md §D).
   * Never regresses an already-VERIFIED Shot back to CAPTURED.
   * technicalMetadata is whatever minimal in-field technical readout is
   * available at record time (e.g. { durationSec, hasAudio, orientation }) —
   * verifyTake checks THIS, not any imported MediaAsset (see 001_ports.js
   * AIProviderPort.verifyTake for why).
   */
  recordTake(shootId, shotId, technicalMetadata) {
    const shoot = this.storage.read(SHOOT_COLLECTION, shootId);
    if (!shoot) throw new Error('Shoot not found: ' + shootId);
    if (!Shoot.canRecordTake(shoot)) {
      throw new Error('recordTake rejected: Shoot ' + shootId + ' is ' + shoot.shoot_state + ' (requires IN_PROGRESS)');
    }
    const shot = this.storage.read(SHOT_COLLECTION, shotId);
    if (!shot) throw new Error('Shot not found: ' + shotId);
    if (shot.productionPlanId !== shoot.productionPlanId) {
      throw new Error('Shot ' + shotId + ' does not belong to the same ProductionPlan as Shoot ' + shootId);
    }

    const validation = Take.validateTakeFields({ shotId, technicalMetadata });
    if (!validation.valid) throw new Error('Invalid take fields: ' + validation.errors.join('; '));

    const take = Take.toRecord({
      id: this.idGenerator(),
      productionPlanId: shoot.productionPlanId,
      shootId,
      shotId,
      technicalMetadata,
      now: this.now,
    });
    const stored = this.storage.append(TAKE_COLLECTION, take);
    this.eventLog.record('TakeRecorded', { id: stored.id, shootId, shotId });

    if (shot.captureStatus === 'NOT_STARTED') {
      this.storage.update(SHOT_COLLECTION, shotId, { captureStatus: 'CAPTURED' });
    }

    return stored;
  }

  /**
   * AI-driven, technical-only check (ADR-020 §2 / 001_ports.js). A Take can
   * only be verified once — CVOS-P4/P6 applied to Take: a judgment, once
   * recorded, is not revised. A FLAGGED result leaves the Shot at CAPTURED;
   * there is no RECAPTURE_NEEDED value (ADR-020 §4) — a caller who sees a
   * FLAGGED Take simply records a new Take for the same Shot.
   */
  verifyTake(takeId) {
    const take = this.storage.read(TAKE_COLLECTION, takeId);
    if (!take) throw new Error('Take not found: ' + takeId);
    if (take.verificationResult !== null) {
      throw new Error('verifyTake rejected: Take ' + takeId + ' was already verified (immutable once verified — ADR-020 §4)');
    }

    const outcome = this.aiProvider.verifyTake(take.technicalMetadata);
    const updated = this.storage.update(TAKE_COLLECTION, takeId, {
      verificationResult: outcome.result,
      verifiedAt: this.now(),
    });
    this.eventLog.record('TakeVerified', { id: takeId, result: outcome.result, details: outcome.details });

    if (outcome.result === 'VERIFIED') {
      this.storage.update(SHOT_COLLECTION, take.shotId, { captureStatus: 'VERIFIED' });
    }

    return updated;
  }

  /**
   * "This filming session has ended" — nothing more (ADR-020 §3). Never
   * touches ProductionPlan.production_state.
   */
  completeShoot(shootId) {
    const shoot = this.storage.read(SHOOT_COLLECTION, shootId);
    if (!shoot) throw new Error('Shoot not found: ' + shootId);
    if (!Shoot.canComplete(shoot)) {
      throw new Error('completeShoot rejected: Shoot ' + shootId + ' is already ' + shoot.shoot_state);
    }
    const updated = this.storage.update(SHOOT_COLLECTION, shootId, {
      shoot_state: 'COMPLETE',
      completedAt: this.now(),
    });
    this.eventLog.record('ShootCompleted', { id: shootId });
    return updated;
  }

  /** Convenience read accessors, matching the other Slice 1/2 engines. */
  get(id) {
    return this.storage.read(SHOOT_COLLECTION, id);
  }

  getTake(id) {
    return this.storage.read(TAKE_COLLECTION, id);
  }

  takesFor(shootId) {
    return this.storage.readAll(TAKE_COLLECTION, (t) => t.shootId === shootId);
  }
}

module.exports = { ShootEngine };
