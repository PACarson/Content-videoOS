/**
 * SheetsStorageAdapter.gs
 *
 * ============================================================================
 * IMPORTANT — READ BEFORE TRUSTING THIS FILE
 * ============================================================================
 * This file has NOT been executed or tested. This sandbox has no network
 * access (network_configuration: disabled) and no real Google Apps Script
 * runtime — SpreadsheetApp, PropertiesService, etc. do not exist here. This
 * is a best-effort, architecturally-consistent implementation of
 * StorageAdapterPort (see src/001_ports.js) against real Google Sheets, written
 * so the shape of the eventual adapter exists — not a verified deliverable.
 *
 * Before relying on this in production: deploy it to a real Apps Script
 * project (e.g. via `clasp push`), point it at a real Spreadsheet ID, and
 * run the same behavioral tests that test/*.test.js run against
 * LocalFileStorageAdapter — same port, same test intent, different backend.
 * ============================================================================
 *
 * Sheet layout convention: one sheet tab per collection ("content_ideas",
 * "content_concepts", "scripts"). Row 1 is a header of field names; each
 * subsequent row is one JSON-stringified record split isn't used — instead,
 * each column IS a field, header-driven, so the sheet stays human-readable
 * (matches the rest of this ecosystem's Sheets-as-structured-store pattern).
 *
 * Apps Script has no module system — every .gs file shares one global scope.
 * This file defines a single global factory, `makeSheetsStorageAdapter`,
 * rather than a class extending StorageAdapterPort from another file, since
 * cross-file `require`/`extends` the way src/*.js uses it does not exist in
 * the real Apps Script runtime. The *method names and signatures* below are
 * kept identical to StorageAdapterPort on purpose, so porting the domain
 * layer here later is a mechanical exercise, not a redesign.
 */

function makeSheetsStorageAdapter(spreadsheetId) {
  function getSheet_(collection) {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = ss.getSheetByName(collection);
    if (!sheet) {
      sheet = ss.insertSheet(collection);
    }
    return sheet;
  }

  function headerRow_(sheet) {
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) return [];
    return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  }

  function ensureHeader_(sheet, record) {
    var header = headerRow_(sheet);
    if (header.length === 0) {
      header = Object.keys(record);
      sheet.getRange(1, 1, 1, header.length).setValues([header]);
    }
    return header;
  }

  function rowToRecord_(header, row) {
    var record = {};
    for (var i = 0; i < header.length; i++) {
      var raw = row[i];
      // Best-effort: fields that look like JSON (arrays/objects) round-trip
      // through JSON.stringify on write; parse them back here.
      if (typeof raw === 'string' && (raw.charAt(0) === '{' || raw.charAt(0) === '[')) {
        try { raw = JSON.parse(raw); } catch (e) { /* leave as string */ }
      }
      record[header[i]] = raw;
    }
    return record;
  }

  function recordToRow_(header, record) {
    return header.map(function (key) {
      var val = record[key];
      if (val === undefined || val === null) return '';
      if (typeof val === 'object') return JSON.stringify(val);
      return val;
    });
  }

  function readAllRaw_(collection) {
    var sheet = getSheet_(collection);
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lastRow < 2 || lastCol === 0) return { header: headerRow_(sheet), records: [] };
    var header = headerRow_(sheet);
    var values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    var records = values.map(function (row) { return rowToRecord_(header, row); });
    return { header: header, records: records };
  }

  return {
    read: function (collection, id) {
      var all = readAllRaw_(collection).records;
      for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[i];
      }
      return null;
    },

    readAll: function (collection, predicate) {
      var all = readAllRaw_(collection).records;
      return predicate ? all.filter(predicate) : all;
    },

    append: function (collection, record) {
      if (!record || !record.id) throw new Error('append requires a record with an id');
      var existing = this.read(collection, record.id);
      if (existing) throw new Error('duplicate id in ' + collection + ': ' + record.id);
      var sheet = getSheet_(collection);
      var header = ensureHeader_(sheet, record);
      sheet.appendRow(recordToRow_(header, record));
      return record;
    },

    update: function (collection, id, patch) {
      var sheet = getSheet_(collection);
      var raw = readAllRaw_(collection);
      var rowIndex = -1;
      for (var i = 0; i < raw.records.length; i++) {
        if (raw.records[i].id === id) { rowIndex = i; break; }
      }
      if (rowIndex === -1) throw new Error('no record ' + id + ' in ' + collection);
      var merged = Object.assign({}, raw.records[rowIndex], patch);
      var sheetRow = rowIndex + 2; // +1 header, +1 for 1-indexing
      sheet.getRange(sheetRow, 1, 1, raw.header.length).setValues([recordToRow_(raw.header, merged)]);
      return merged;
    },
  };
}
