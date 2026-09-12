'use strict';

/**
 * 001_ports.js
 *
 * Contracts (ports) that the domain/engine layer depends on abstractly.
 * Per the frozen Architecture doc §1 and this Phase 1 runtime authorization §1:
 *
 *   Content Video OS Domain Logic
 *           ↓
 *   Application / Engine Layer
 *           ↓
 *   Adapters / Ports        <-- this file defines the shape of that boundary
 *           ↓
 *   Runtime / Storage Implementations   (InMemory/File adapter for Slice 1 tests,
 *                                        Google Sheets adapter for real deployment)
 *
 * Nothing in src/*Engine.js or src/*.js entity files may import a concrete
 * adapter directly. They only ever call methods declared here. This is what
 * lets Slice 1 run entirely against a local, file-backed adapter in this
 * sandbox while the same domain code would run unchanged against Sheets in
 * a real Apps Script deployment.
 *
 * These are plain JS "duck-typed" contracts (documented, not enforced by the
 * language) rather than TypeScript interfaces or abstract classes with throwing
 * stubs, to avoid the "unnecessary abstraction layer" the Phase 1 authorization
 * (§9) explicitly warns against. A concrete adapter simply implements every
 * method with this exact name and signature.
 */

/**
 * StorageAdapterPort — structured, authoritative data only. Binary media
 * goes through the separate MediaStorageAdapterPort below (ADR-004) — see
 * that port's own comment for why the split stays this narrow.
 *
 * A "collection" is a string like "content_ideas" | "content_concepts" | "scripts" | "events".
 * A "record" is a plain object that always includes an `id` field once persisted.
 */
class StorageAdapterPort {
  /** @returns {object|null} the record, or null if not found */
  read(collection, id) { throw new Error('StorageAdapterPort.read not implemented'); }

  /** @returns {object[]} all records in the collection, optionally filtered */
  readAll(collection, predicate) { throw new Error('StorageAdapterPort.readAll not implemented'); }

  /** Inserts a new record. The record must already have an `id`. @returns {object} the stored record */
  append(collection, record) { throw new Error('StorageAdapterPort.append not implemented'); }

  /** Merges `patch` into the existing record with this id. @returns {object} the updated record */
  update(collection, id, patch) { throw new Error('StorageAdapterPort.update not implemented'); }
}

/**
 * AIProviderPort — the only thing engines call to get AI-generated content.
 * Slice 1 uses MockAIProvider (deterministic, no network call — this sandbox
 * has no network access in any case). A real provider would implement the
 * same methods behind a real model call.
 */
class AIProviderPort {
  /** @param {object} idea a ContentIdea record. @returns {object} concept field values (not yet an entity) */
  generateConcept(idea) { throw new Error('AIProviderPort.generateConcept not implemented'); }

  /** @param {object} concept a ContentConcept record. @returns {object} script field values (not yet an entity) */
  generateScript(concept) { throw new Error('AIProviderPort.generateScript not implemented'); }

  /**
   * Added for Slice 2 (Slice 2 Authorization Gate report §F/M) — Architecture
   * doc §3 already names "AI Provider adapter (planning reasoning)" as
   * ProductionPlanEngine's external dependency; this completes that
   * already-specified contract rather than introducing a new one.
   * @param {object} concept a READY ContentConcept record.
   * @param {object} script a READY Script record.
   * @param {string} location
   * @returns {object} plan field values, including a `shots` array of
   *   { description, capabilityNeed, essential } (not yet entities)
   */
  generateProductionPlan(concept, script, location) { throw new Error('AIProviderPort.generateProductionPlan not implemented'); }

  /**
   * Added for Slice 3 (ADR-020 §2) — the fast/lightweight, in-field
   * TECHNICAL check ShootEngine calls from `verifyTake`. This is never a
   * creative-quality judgment (that is MediaAnalysisEngine/Review's job,
   * later slices) — only technical capture integrity (duration/audio-
   * presence/orientation/etc, whatever `technicalMetadata` was recorded
   * with the Take). It runs against `technicalMetadata`, NOT against any
   * imported binary file — Slice 3's pipeline runs `verifyTake` before any
   * MediaAsset exists (Architecture §3: ShootEngine's failure mode is
   * explicitly about "no connectivity **in the field**", i.e. before the
   * footage is ever offloaded).
   * @param {object|null} technicalMetadata whatever was recorded with the Take.
   * @returns {{ result: 'VERIFIED'|'FLAGGED', details: string }}
   */
  verifyTake(technicalMetadata) { throw new Error('AIProviderPort.verifyTake not implemented'); }
}

/**
 * MediaStorageAdapterPort — binary media only (ADR-004; scope narrowed by
 * the Slice 3 Authorization Gate, 09_...md §10): of MediaAsset's ten
 * metadata fields (AI Production Contract §E), only `source_file_ref`
 * actually needs this port — everything else (hash, timestamps,
 * Shoot/Shot/Take/Equipment references, status) is ordinary structured data
 * that goes through StorageAdapterPort like every other entity. This port's
 * job is narrow on purpose: store a binary, get back a stable opaque
 * reference; read a binary back given that reference.
 *
 * `source_file_ref` must stay a generic path/URI (MediaAsset schema,
 * AI Production Contract §E) — never a Google-Drive-specific field. Slice 3
 * ships a LocalMediaStorageAdapter (303_LocalMediaStorageAdapter.js) for
 * this sandbox; a real Drive-backed adapter is Runtime-Verification-BLOCKED
 * territory (05_.../06_...md) and is not attempted here.
 */
class MediaStorageAdapterPort {
  /** @param {Buffer} content raw binary bytes. @returns {string} a stable, opaque source_file_ref (path/URI) */
  store(content) { throw new Error('MediaStorageAdapterPort.store not implemented'); }

  /** @param {string} sourceFileRef @returns {Buffer} the original bytes */
  retrieve(sourceFileRef) { throw new Error('MediaStorageAdapterPort.retrieve not implemented'); }

  /** @param {string} sourceFileRef @returns {{size: number}} minimal binary metadata */
  getMetadata(sourceFileRef) { throw new Error('MediaStorageAdapterPort.getMetadata not implemented'); }
}

module.exports = { StorageAdapterPort, AIProviderPort, MediaStorageAdapterPort };
