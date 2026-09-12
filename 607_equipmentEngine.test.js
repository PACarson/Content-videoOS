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

test('EquipmentEngine: registering equipment with known capability tags is CLASSIFIED', () => {
  const sys = buildSystem(freshDataDir());
  const eq = sys.equipmentEngine.registerEquipment({ name: 'Sony A7S III', capabilityTags: ['A_CAM', 'LOW_LIGHT'] });
  assert.equal(eq.classification, 'CLASSIFIED');
  assert.deepEqual(eq.capabilityTags.sort(), ['A_CAM', 'LOW_LIGHT'].sort());
  assert.ok(eq.id);
  assert.ok(eq.createdAt);
});

test('EquipmentEngine: registering equipment with no recognized tags falls back to UNCLASSIFIED, registration is not blocked (Architecture §3 failure mode)', () => {
  const sys = buildSystem(freshDataDir());
  const eq = sys.equipmentEngine.registerEquipment({ name: 'Prototype rig', capabilityTags: ['SOME_NEW_UNKNOWN_TAG'] });
  assert.equal(eq.classification, 'UNCLASSIFIED');
  assert.deepEqual(eq.capabilityTags, []);
});

test('EquipmentEngine: rejects an empty name', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.equipmentEngine.registerEquipment({ name: '', capabilityTags: [] }), /name/);
});

test('EquipmentEngine: rejects a non-array capabilityTags', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.equipmentEngine.registerEquipment({ name: 'X', capabilityTags: 'A_CAM' }), /capabilityTags/);
});

test('EquipmentEngine: updateEquipmentCapability re-classifies from UNCLASSIFIED to CLASSIFIED', () => {
  const sys = buildSystem(freshDataDir());
  const eq = sys.equipmentEngine.registerEquipment({ name: 'New gear', capabilityTags: ['UNKNOWN'] });
  assert.equal(eq.classification, 'UNCLASSIFIED');
  const updated = sys.equipmentEngine.updateEquipmentCapability(eq.id, { capabilityTags: ['DRONE'] });
  assert.equal(updated.classification, 'CLASSIFIED');
  assert.deepEqual(updated.capabilityTags, ['DRONE']);
});

test('EquipmentEngine: updateEquipmentCapability rejects an unknown equipment id', () => {
  const sys = buildSystem(freshDataDir());
  assert.throws(() => sys.equipmentEngine.updateEquipmentCapability('nope', { name: 'x' }), /not found/);
});

test('EquipmentEngine: recommendEquipmentForShot matches on capabilityNeed and states a reason (ADR-008: deterministic, no AI call)', () => {
  const sys = buildSystem(freshDataDir());
  sys.equipmentEngine.registerEquipment({ name: 'Drone A', capabilityTags: ['DRONE'] });
  sys.equipmentEngine.registerEquipment({ name: 'Handheld cam', capabilityTags: ['A_CAM', 'STABILIZED'] });

  const recs = sys.equipmentEngine.recommendEquipmentForShot({ capabilityNeed: 'DRONE' });
  assert.equal(recs.length, 1);
  assert.equal(recs[0].name, 'Drone A');
  assert.match(recs[0].reason, /DRONE/);
});

test('EquipmentEngine: recommendEquipmentForShot returns an empty array (not an error) when nothing matches', () => {
  const sys = buildSystem(freshDataDir());
  sys.equipmentEngine.registerEquipment({ name: 'Drone A', capabilityTags: ['DRONE'] });
  const recs = sys.equipmentEngine.recommendEquipmentForShot({ capabilityNeed: 'TELEPHOTO' });
  assert.deepEqual(recs, []);
});

test('EquipmentEngine: has no AI provider dependency at all (constructor accepts none, ADR-008 boundary)', () => {
  const sys = buildSystem(freshDataDir());
  assert.equal(sys.equipmentEngine.aiProvider, undefined);
});

test('EquipmentEngine: persists and is retrievable by id', () => {
  const sys = buildSystem(freshDataDir());
  const eq = sys.equipmentEngine.registerEquipment({ name: 'Tripod', capabilityTags: ['STABILIZED'] });
  assert.deepEqual(sys.equipmentEngine.get(eq.id), eq);
});

test('EquipmentEngine: records EquipmentRegistered and EquipmentUpdated events', () => {
  const sys = buildSystem(freshDataDir());
  const eq = sys.equipmentEngine.registerEquipment({ name: 'Mic', capabilityTags: ['AUDIO'] });
  sys.equipmentEngine.updateEquipmentCapability(eq.id, { name: 'Shotgun Mic' });
  const registered = sys.eventLog.all((e) => e.type === 'EquipmentRegistered' && e.payload.id === eq.id);
  const updated = sys.eventLog.all((e) => e.type === 'EquipmentUpdated' && e.payload.id === eq.id);
  assert.equal(registered.length, 1);
  assert.equal(updated.length, 1);
});
