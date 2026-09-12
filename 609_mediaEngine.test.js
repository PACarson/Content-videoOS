'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSystem } = require('../src/401_system');

function freshDataDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cvos-test-'));
}

test('importMedia: creates a MediaAsset with status IMPORTED and a provider-neutral source_file_ref', () => {
  const sys = buildSystem(freshDataDir());
  const bytes = Buffer.from('sample video bytes');
  const asset = sys.mediaEngine.importMedia({ binaryContent: bytes, mediaType: 'video', durationSec: 12, orientation: 'vertical' });
  assert.equal(asset.status, 'IMPORTED');
  assert.equal(asset.media_type, 'video');
  assert.equal(asset.duration_sec, 12);
  assert.equal(asset.orientation, 'vertical');
  assert.equal(typeof asset.source_file_ref, 'string');
  assert.ok(!asset.source_file_ref.toLowerCase().includes('drive'), 'source_file_ref must not be Google-Drive-specific');
  assert.equal(asset.latest_analysis_id, null, 'Slice 3 never sets this — MediaAnalysisEngine is Slice 4');
});

test('importMedia: computes a stable content hash', () => {
  const sys = buildSystem(freshDataDir());
  const bytes = Buffer.from('deterministic content');
  const asset = sys.mediaEngine.importMedia({ binaryContent: bytes, mediaType: 'video' });
  assert.equal(typeof asset.hash, 'string');
  assert.equal(asset.hash.length, 64, 'sha256 hex digest');
});

test('importMedia: associates optional Shoot/Shot/Take/Equipment references, all remaining optional', () => {
  const sys = buildSystem(freshDataDir());
  const withRefs = sys.mediaEngine.importMedia({
    binaryContent: Buffer.from('a'), mediaType: 'video',
    shootId: 'shoot-1', shotId: 'shot-1', takeId: 'take-1', equipmentId: 'eq-1',
  });
  assert.equal(withRefs.shoot_id, 'shoot-1');
  assert.equal(withRefs.shot_id, 'shot-1');
  assert.equal(withRefs.take_id, 'take-1');
  assert.equal(withRefs.equipment_id, 'eq-1');

  const withoutRefs = sys.mediaEngine.importMedia({ binaryContent: Buffer.from('b'), mediaType: 'photo' });
  assert.equal(withoutRefs.shoot_id, null);
  assert.equal(withoutRefs.shot_id, null);
  assert.equal(withoutRefs.take_id, null);
  assert.equal(withoutRefs.equipment_id, null);
});

test('importMedia: duplicate binary content (same hash) short-circuits to the existing MediaAsset, does not create a second record', () => {
  const sys = buildSystem(freshDataDir());
  const bytes = Buffer.from('identical bytes');
  const first = sys.mediaEngine.importMedia({ binaryContent: bytes, mediaType: 'video' });
  const second = sys.mediaEngine.importMedia({ binaryContent: Buffer.from(bytes), mediaType: 'video' });
  assert.equal(second.id, first.id);
  const all = sys.storage.readAll('media_assets');
  assert.equal(all.length, 1);
});

test('importMedia: rejects an empty/corrupted buffer rather than creating a MediaAsset pointing at unreadable data', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.mediaEngine.importMedia({ binaryContent: Buffer.alloc(0), mediaType: 'video' }), /rejected/);
  assert.throws(() => sys.mediaEngine.importMedia({ binaryContent: 'not-a-buffer', mediaType: 'video' }), /rejected/);
});

test('importMedia: rejects an invalid mediaType', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(
    () => sys.mediaEngine.importMedia({ binaryContent: Buffer.from('x'), mediaType: 'hologram' }),
    /mediaType/
  );
});

test('Original media is immutable: the same binary can be retrieved back byte-for-byte, and a second import never overwrites it', () => {
  const sys = buildSystem(freshDataDir());
  const bytes = Buffer.from('original immutable bytes');
  const asset = sys.mediaEngine.importMedia({ binaryContent: bytes, mediaType: 'video' });
  const retrieved = sys.mediaEngine.retrieveBinary(asset.id);
  assert.equal(Buffer.compare(retrieved, bytes), 0);

  // Import again with the exact same bytes -> short-circuits, does not touch storage.
  sys.mediaEngine.importMedia({ binaryContent: Buffer.from(bytes), mediaType: 'video' });
  const stillThere = sys.mediaEngine.retrieveBinary(asset.id);
  assert.equal(Buffer.compare(stillThere, bytes), 0, 'original bytes are unchanged');
});

test('retrieveBinary: rejects an unknown MediaAsset id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.mediaEngine.retrieveBinary('nope'), /not found/);
});

test('MediaImported and MediaImportShortCircuited are recorded to the shared EventLog', () => {
  const sys = buildSystem(freshDataDir());
  const bytes = Buffer.from('event log check');
  const asset = sys.mediaEngine.importMedia({ binaryContent: bytes, mediaType: 'audio' });
  sys.mediaEngine.importMedia({ binaryContent: Buffer.from(bytes), mediaType: 'audio' });
  assert.equal(sys.eventLog.all((e) => e.type === 'MediaImported' && e.payload.id === asset.id).length, 1);
  assert.equal(sys.eventLog.all((e) => e.type === 'MediaImportShortCircuited' && e.payload.id === asset.id).length, 1);
});

test('MediaAsset structured metadata persists and is retrievable by id, independent of the binary adapter', () => {
  const sys = buildSystem(freshDataDir());
  const asset = sys.mediaEngine.importMedia({ binaryContent: Buffer.from('persist me'), mediaType: 'video' });
  assert.deepEqual(sys.mediaEngine.get(asset.id), asset);
});

test('Domain/Engine code never references Google-specific runtime APIs (LocalMediaStorageAdapter is the only place SpreadsheetApp/DriveApp-equivalent details could leak, and it does not)', () => {
  const fsMod = require('fs');
  const src = fsMod.readFileSync(require.resolve('../src/207_MediaEngine.js'), 'utf8');
  assert.ok(!/DriveApp|SpreadsheetApp|UrlFetchApp|ScriptApp/.test(src));
});
