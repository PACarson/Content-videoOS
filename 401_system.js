'use strict';

const path = require('path');
const { LocalFileStorageAdapter } = require('./adapters/301_LocalFileStorageAdapter');
const { MockAIProvider } = require('./adapters/302_MockAIProvider');
const { LocalMediaStorageAdapter } = require('./adapters/303_LocalMediaStorageAdapter');
const { EventLog } = require('./003_EventLog');
const { ContentIdeaEngine } = require('./201_ContentIdeaEngine');
const { ContentConceptEngine } = require('./202_ContentConceptEngine');
const { ScriptEngine } = require('./203_ScriptEngine');
const { ProductionPlanEngine } = require('./204_ProductionPlanEngine');
const { EquipmentEngine } = require('./205_EquipmentEngine');
const { ShootEngine } = require('./206_ShootEngine');
const { MediaEngine } = require('./207_MediaEngine');

let counter = 0;
function defaultIdGenerator() {
  counter += 1;
  return 'id_' + Date.now().toString(36) + '_' + counter.toString(36);
}

function defaultNow() {
  return new Date().toISOString();
}

/**
 * buildSystem — the one place that wires concrete adapters to engines.
 * A real Apps Script deployment would have its own equivalent wiring file
 * that constructs SheetsStorageAdapter (+ a real Drive-backed
 * MediaStorageAdapter, Slice 3 Authorization Gate §10, MUST_WAIT) instead of
 * the two local adapters; nothing in the engines above would need to change.
 *
 * @param {string} dataDir - directory LocalFileStorageAdapter and
 *   LocalMediaStorageAdapter both persist under (structured JSON directly in
 *   dataDir, binary media under dataDir/media) — one root recovers both.
 */
function buildSystem(dataDir, overrides = {}) {
  const storage = overrides.storage || new LocalFileStorageAdapter(dataDir);
  const mediaStorage = overrides.mediaStorage || new LocalMediaStorageAdapter(path.join(dataDir, 'media'));
  const aiProvider = overrides.aiProvider || new MockAIProvider();
  const idGenerator = overrides.idGenerator || defaultIdGenerator;
  const now = overrides.now || defaultNow;
  const eventLog = overrides.eventLog || new EventLog(storage, idGenerator, now);

  return {
    storage,
    mediaStorage,
    aiProvider,
    eventLog,
    contentIdeaEngine: new ContentIdeaEngine({ storage, eventLog, idGenerator, now }),
    contentConceptEngine: new ContentConceptEngine({ storage, aiProvider, eventLog, idGenerator, now }),
    scriptEngine: new ScriptEngine({ storage, aiProvider, eventLog, idGenerator, now }),
    productionPlanEngine: new ProductionPlanEngine({ storage, aiProvider, eventLog, idGenerator, now }),
    equipmentEngine: new EquipmentEngine({ storage, eventLog, idGenerator, now }),
    shootEngine: new ShootEngine({ storage, aiProvider, eventLog, idGenerator, now }),
    mediaEngine: new MediaEngine({ storage, mediaStorage, eventLog, idGenerator, now }),
  };
}

module.exports = { buildSystem };
