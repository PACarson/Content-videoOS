'use strict';

/**
 * EventLog — the History layer (Architecture doc §1, "Event/History Layer").
 * A thin wrapper, not a new abstraction: it just appends to the "events"
 * collection through the same StorageAdapterPort every entity uses, so no
 * new adapter or port is needed for Slice 1 (Phase 1 authorization §9:
 * avoid unnecessary abstraction layers).
 */
class EventLog {
  constructor(storage, idGenerator, now) {
    this.storage = storage;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  record(type, payload) {
    return this.storage.append('events', {
      id: this.idGenerator(),
      type,
      payload,
      at: this.now(),
    });
  }

  all(predicate) {
    return this.storage.readAll('events', predicate);
  }
}

module.exports = { EventLog };
