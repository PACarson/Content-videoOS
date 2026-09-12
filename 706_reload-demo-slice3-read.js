'use strict';

/**
 * 706_reload-demo-slice3-read.js
 *
 * Runs in a SEPARATE `node` process from 705_reload-demo-slice3-write.js.
 * Re-reads every id that process printed and confirms Shoot/Take/Shot/
 * MediaAsset state — including the actual imported binary content,
 * retrieved back through LocalMediaStorageAdapter — all survive a real
 * process boundary.
 *
 * Usage: node scripts/706_reload-demo-slice3-read.js <dataDir> <planId> <shootId> <takeId> <shotId> <mediaAssetId>
 */
const { buildSystem } = require('../src/401_system');

const [, , dataDir, planId, shootId, takeId, shotId, mediaAssetId] = process.argv;
if (!dataDir || !planId || !shootId || !takeId || !shotId || !mediaAssetId) {
  console.error('Usage: node 706_reload-demo-slice3-read.js <dataDir> <planId> <shootId> <takeId> <shotId> <mediaAssetId>');
  process.exit(1);
}

const sys = buildSystem(dataDir);

const plan = sys.productionPlanEngine.get(planId);
const shoot = sys.shootEngine.get(shootId);
const take = sys.shootEngine.getTake(takeId);
const shot = sys.productionPlanEngine.getShot(shotId);
const media = sys.mediaEngine.get(mediaAssetId);
const retrievedBytes = sys.mediaEngine.retrieveBinary(mediaAssetId);

console.log(JSON.stringify({
  planFound: !!plan,
  planProductionState: plan ? plan.production_state : null,
  shootFound: !!shoot,
  shootState: shoot ? shoot.shoot_state : null,
  takeFound: !!take,
  takeVerificationResult: take ? take.verificationResult : null,
  shotCaptureStatus: shot ? shot.captureStatus : null,
  mediaFound: !!media,
  mediaStatus: media ? media.status : null,
  mediaHash: media ? media.hash : null,
  mediaSourceFileRef: media ? media.source_file_ref : null,
  retrievedBytesBase64: retrievedBytes.toString('base64'),
}));
