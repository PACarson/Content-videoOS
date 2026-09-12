'use strict';

/**
 * 109_MediaAsset.js
 *
 * MediaAsset — structured metadata about one binary media file (AI
 * Production Contract §E). Pure domain module: does NOT touch the binary
 * content itself — that is MediaStorageAdapter's job (see 001_ports.js).
 * MediaEngine is the only caller.
 *
 * Field set follows §E exactly. Of the ten metadata fields, only
 * `source_file_ref` is a reference into MediaStorageAdapter's territory;
 * every other field is ordinary structured data that flows through the
 * same StorageAdapterPort every other Slice 1/2/3 entity uses (Slice 3
 * Authorization Gate, 09_...md §10).
 *
 * `status`: {IMPORTED, ANALYZED, ARCHIVED} (§E). Slice 3 only ever produces
 * `IMPORTED` — `ANALYZED` is set by MediaAnalysisEngine (Slice 4, out of
 * scope here); `ARCHIVED` is tied to an archive policy that is still
 * OPEN — PENDING (Architecture §9). No code path in this file or in
 * 207_MediaEngine.js ever produces those two values.
 */

const VALID_MEDIA_TYPES = ['video', 'audio', 'photo'];

function validateMediaAssetFields({ hash, mediaType }) {
  const errors = [];
  if (typeof hash !== 'string' || hash.trim().length === 0) {
    errors.push('hash must be a non-empty string');
  }
  if (!VALID_MEDIA_TYPES.includes(mediaType)) {
    errors.push('mediaType must be one of: ' + VALID_MEDIA_TYPES.join(', '));
  }
  return { valid: errors.length === 0, errors };
}

function toRecord({
  id, hash, sourceFileRef, mediaType, durationSec, orientation,
  equipmentId, shootId, shotId, takeId, now,
}) {
  return {
    id,
    hash,
    source_file_ref: sourceFileRef,
    capture_timestamp: now(),
    equipment_id: equipmentId || null,
    shoot_id: shootId || null,
    shot_id: shotId || null,
    take_id: takeId || null,
    media_type: mediaType,
    duration_sec: durationSec !== undefined ? durationSec : null,
    orientation: orientation || null,
    status: 'IMPORTED',
    latest_analysis_id: null,
  };
}

module.exports = { validateMediaAssetFields, toRecord, VALID_MEDIA_TYPES };
