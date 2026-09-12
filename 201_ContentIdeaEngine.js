'use strict';

const ContentIdea = require('./101_ContentIdea');

const COLLECTION = 'content_ideas';

/**
 * ContentIdeaEngine — owns ContentIdea (Architecture doc §3). Depends only on
 * the StorageAdapterPort contract and injected id/clock functions, never on a
 * concrete adapter — see src/001_ports.js.
 */
class ContentIdeaEngine {
  constructor({ storage, eventLog, idGenerator, now }) {
    this.storage = storage;
    this.eventLog = eventLog;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /**
   * Command: createContentIdea. Rejects invalid input rather than persisting
   * a broken record (Architecture doc §14, "command validation": reject
   * malformed commands before they reach a Repository).
   */
  createContentIdea(text, source = ContentIdea.SOURCE.USER) {
    const idea = ContentIdea.createIdea({
      id: this.idGenerator(),
      text,
      source,
      createdAt: this.now(),
    });
    const stored = this.storage.append(COLLECTION, idea);
    this.eventLog.record('ContentIdeaCreated', { id: stored.id });
    return stored;
  }

  /** Command: promoteContentIdea. */
  promoteContentIdea(id) {
    const idea = this.storage.read(COLLECTION, id);
    if (!idea) throw new Error('ContentIdea not found: ' + id);
    const promoted = ContentIdea.promote(idea); // throws if already PROMOTED
    const stored = this.storage.update(COLLECTION, id, promoted);
    this.eventLog.record('ContentIdeaPromoted', { id: stored.id });
    return stored;
  }

  get(id) {
    return this.storage.read(COLLECTION, id);
  }
}

module.exports = { ContentIdeaEngine, COLLECTION };
