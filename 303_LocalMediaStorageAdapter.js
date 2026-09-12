'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { MediaStorageAdapterPort } = require('../001_ports');

/**
 * LocalMediaStorageAdapter — implements MediaStorageAdapterPort by writing
 * one file per stored binary under a local directory.
 *
 * This is Slice 3's stand-in for a real Google Drive (or other object
 * storage) adapter — see the Slice 3 Authorization Gate (09_...md §10) for
 * why the port stays this narrow (binary + opaque reference only; every
 * other MediaAsset field is ordinary structured data through
 * StorageAdapterPort, not through this port at all).
 *
 * The reference this returns (`local-media://<key>`) is an opaque URI —
 * MediaAsset.source_file_ref never needs to know it is a local file path.
 * A real Drive-backed adapter would return a Drive-shaped reference behind
 * the exact same three methods; nothing in 109_MediaAsset.js or
 * 207_MediaEngine.js would change.
 *
 * Like LocalFileStorageAdapter, this is deliberately disk-backed, not an
 * in-memory Map — a fresh, separate `node` process must be able to read
 * back a binary stored by an earlier process (see scripts/705-706).
 */
class LocalMediaStorageAdapter extends MediaStorageAdapterPort {
  constructor(baseDir) {
    super();
    this.baseDir = baseDir;
    fs.mkdirSync(baseDir, { recursive: true });
  }

  _pathFor(key) {
    return path.join(this.baseDir, key);
  }

  store(content) {
    if (!Buffer.isBuffer(content)) throw new Error('MediaStorageAdapterPort.store requires a Buffer');
    const key = crypto.randomBytes(16).toString('hex') + '.bin';
    fs.writeFileSync(this._pathFor(key), content);
    return 'local-media://' + key;
  }

  retrieve(sourceFileRef) {
    const key = this._keyFrom(sourceFileRef);
    const file = this._pathFor(key);
    if (!fs.existsSync(file)) throw new Error('no stored media for ' + sourceFileRef);
    return fs.readFileSync(file);
  }

  getMetadata(sourceFileRef) {
    const key = this._keyFrom(sourceFileRef);
    const file = this._pathFor(key);
    if (!fs.existsSync(file)) throw new Error('no stored media for ' + sourceFileRef);
    const stat = fs.statSync(file);
    return { size: stat.size };
  }

  _keyFrom(sourceFileRef) {
    const prefix = 'local-media://';
    if (typeof sourceFileRef !== 'string' || !sourceFileRef.startsWith(prefix)) {
      throw new Error('not a local-media reference: ' + sourceFileRef);
    }
    return sourceFileRef.slice(prefix.length);
  }
}

module.exports = { LocalMediaStorageAdapter };
