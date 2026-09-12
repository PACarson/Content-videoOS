'use strict';

const fs = require('fs');
const path = require('path');
const { StorageAdapterPort } = require('../001_ports');

/**
 * LocalFileStorageAdapter — implements StorageAdapterPort by reading/writing
 * one JSON file per collection on local disk.
 *
 * This is Slice 1's stand-in for the real Google Sheets adapter (see
 * adapters/SheetsStorageAdapter.gs, which is written but cannot be executed
 * or tested in this sandbox — no network access, no real Apps Script
 * runtime). Deliberately file-backed rather than a plain in-memory object:
 * an in-memory object trivially "survives" within one process and would
 * prove nothing about real persistence. Writing to disk and re-reading it
 * from a *separate* Node process is the actual test this sandbox can run
 * for the Persistence-First Rule (Phase 1 authorization §10 / §20).
 *
 * Every domain/engine file talks only to the StorageAdapterPort contract —
 * nothing here is imported anywhere except a test's or a script's adapter
 * wiring step.
 */
class LocalFileStorageAdapter extends StorageAdapterPort {
  constructor(baseDir) {
    super();
    this.baseDir = baseDir;
    fs.mkdirSync(baseDir, { recursive: true });
  }

  _filePath(collection) {
    return path.join(this.baseDir, collection + '.json');
  }

  _loadAll(collection) {
    const file = this._filePath(collection);
    if (!fs.existsSync(file)) return [];
    const raw = fs.readFileSync(file, 'utf8').trim();
    return raw.length === 0 ? [] : JSON.parse(raw);
  }

  _saveAll(collection, records) {
    fs.writeFileSync(this._filePath(collection), JSON.stringify(records, null, 2), 'utf8');
  }

  read(collection, id) {
    const records = this._loadAll(collection);
    return records.find((r) => r.id === id) || null;
  }

  readAll(collection, predicate) {
    const records = this._loadAll(collection);
    return predicate ? records.filter(predicate) : records;
  }

  append(collection, record) {
    if (!record || !record.id) throw new Error('append requires a record with an id');
    const records = this._loadAll(collection);
    if (records.some((r) => r.id === record.id)) {
      throw new Error('duplicate id in ' + collection + ': ' + record.id);
    }
    records.push(record);
    this._saveAll(collection, records);
    return record;
  }

  update(collection, id, patch) {
    const records = this._loadAll(collection);
    const idx = records.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('no record ' + id + ' in ' + collection);
    records[idx] = { ...records[idx], ...patch };
    this._saveAll(collection, records);
    return records[idx];
  }
}

module.exports = { LocalFileStorageAdapter };
