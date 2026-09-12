'use strict';

const Script = require('./103_Script');
const { runLifecycle } = require('./002_aiGenerationLifecycle');

const COLLECTION = 'scripts';
const GENERATED_BY = 'MockAIProvider-v1';

/**
 * ScriptEngine — generates a Script from a READY Concept via the AI
 * Generation Lifecycle. Same "no human click required" posture as
 * ContentConceptEngine (CVOS-P7).
 */
class ScriptEngine {
  constructor({ storage, aiProvider, eventLog, idGenerator, now }) {
    this.storage = storage;
    this.aiProvider = aiProvider;
    this.eventLog = eventLog;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /** Command: createScript. Requires a READY Concept — not "approved", just READY. */
  createScript(concept) {
    if (!concept || concept.status !== 'READY') {
      throw new Error('createScript requires a READY ContentConcept');
    }

    const result = runLifecycle({
      generate: () => this.aiProvider.generateScript(concept),
      validate: Script.validateScriptFields,
      generatedBy: GENERATED_BY,
      now: this.now,
    });

    const record = Script.toRecord({
      id: this.idGenerator(),
      conceptId: concept.id,
      version: 1,
      lifecycleResult: result,
    });

    const stored = this.storage.append(COLLECTION, record);

    if (result.status === 'READY') {
      this.eventLog.record('ScriptGenerated', { id: stored.id, conceptId: concept.id });
    } else {
      this.eventLog.record('ScriptGenerationFailed', {
        id: stored.id,
        conceptId: concept.id,
        errors: result.validationErrors,
      });
    }

    return stored;
  }

  get(id) {
    return this.storage.read(COLLECTION, id);
  }
}

module.exports = { ScriptEngine, COLLECTION };
