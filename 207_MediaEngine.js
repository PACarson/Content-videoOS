'use strict';

const crypto = require('crypto');
const MediaAsset = require('./109_MediaAsset');

const MEDIA_COLLECTION = 'media_assets';

/**
 * 207_MediaEngine.js
 *
 * MediaEngine — owns MediaAsset (Architecture doc §3: "Persistence: Owns
 * MediaAsset"; "Responsibility: Deterministic ingestion — import,
 * hash/identify, and link raw files to Shoot/Take/Shot/Concept").
 *
 * Hashing/identity is domain-level work done HERE, not inside
 * MediaStorageAdapter (Slice 3 Authorization Gate, 09_...md §10) — the
 * adapter's only job is storing bytes and handing back a stable reference.
 *
 * Invariant (Architecture §3): "the source file is never moved, renamed in
 * place, or deleted by this engine or any other." This file never mutates
 * or deletes anything through MediaStorageAdapterPort once stored.
 */
class MediaEngine {
  constructor({ storage, mediaStorage, eventLog, idGenerator, now }) {
    this.storage = storage;
    this.mediaStorage = mediaStorage;
    this.eventLog = eventLog;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /**
   * Duplicate handling (Test Governance §14): "importMedia called twice for
   * the same source file — a hash match should short-circuit, not
   * duplicate." Corrupted/empty input (Architecture §3 failure mode: "must
   * not create a MediaAsset pointing at unreadable data without flagging
   * it") is rejected outright rather than silently stored.
   */
  importMedia({ binaryContent, mediaType, durationSec, orientation, equipmentId, shootId, shotId, takeId }) {
    if (!Buffer.isBuffer(binaryContent) || binaryContent.length === 0) {
      throw new Error('importMedia rejected: binaryContent must be a non-empty Buffer (corrupted or partial file)');
    }

    const hash = crypto.createHash('sha256').update(binaryContent).digest('hex');

    const existing = this.storage.readAll(MEDIA_COLLECTION, (m) => m.hash === hash)[0];
    if (existing) {
      this.eventLog.record('MediaImportShortCircuited', { id: existing.id, hash });
      return existing;
    }

    const validation = MediaAsset.validateMediaAssetFields({ hash, mediaType });
    if (!validation.valid) throw new Error('Invalid media fields: ' + validation.errors.join('; '));

    const sourceFileRef = this.mediaStorage.store(binaryContent);
    const record = MediaAsset.toRecord({
      id: this.idGenerator(), hash, sourceFileRef, mediaType, durationSec, orientation,
      equipmentId, shootId, shotId, takeId, now: this.now,
    });
    const stored = this.storage.append(MEDIA_COLLECTION, record);
    this.eventLog.record('MediaImported', { id: stored.id, hash });
    return stored;
  }

  /** Convenience read accessor, matching the other Slice 1/2/3 engines. */
  get(id) {
    return this.storage.read(MEDIA_COLLECTION, id);
  }

  /** Resolves a MediaAsset's structured record to its actual binary content. */
  retrieveBinary(id) {
    const asset = this.get(id);
    if (!asset) throw new Error('MediaAsset not found: ' + id);
    return this.mediaStorage.retrieve(asset.source_file_ref);
  }
}

module.exports = { MediaEngine };
