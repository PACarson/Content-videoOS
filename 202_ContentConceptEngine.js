'use strict';

const ContentConcept = require('./102_ContentConcept');
const { runLifecycle } = require('./002_aiGenerationLifecycle');

const COLLECTION = 'content_concepts';
const GENERATED_BY = 'MockAIProvider-v1';

/**
 * ContentConceptEngine — turns a promoted Idea into a Concept via the AI
 * Generation Lifecycle (Architecture doc §3). No human approval command
 * exists on the critical path — CVOS-P7, corrected under Phase 0D. Optional
 * human intervention (approve/edit/reject) is explicitly out of Slice 1
 * scope (Implementation Map §1, ContentConceptEngine row: "*approveContentConcept*
 * remains available for optional human intervention" — not built until a
 * later slice actually needs it, per Phase 1 authorization §9's instruction
 * not to build engines/commands with no Slice 1 responsibility).
 */
class ContentConceptEngine {
  constructor({ storage, aiProvider, eventLog, idGenerator, now }) {
    this.storage = storage;
    this.aiProvider = aiProvider;
    this.eventLog = eventLog;
    this.idGenerator = idGenerator;
    this.now = now;
  }

  /**
   * Command: createContentConcept. Runs the full AI_GENERATED -> AI_VALIDATED
   * -> AI_RECOMMENDED -> READY chain synchronously and persists the result,
   * whatever it is (READY or GENERATION_FAILED) — never leaves a Concept
   * silently stuck mid-chain.
   */
  createContentConcept(idea) {
    if (!idea || idea.status !== 'PROMOTED') {
      throw new Error('createContentConcept requires a PROMOTED ContentIdea');
    }

    const result = runLifecycle({
      generate: () => this.aiProvider.generateConcept(idea),
      validate: ContentConcept.validateConceptFields,
      generatedBy: GENERATED_BY,
      now: this.now,
    });

    const record = ContentConcept.toRecord({
      id: this.idGenerator(),
      ideaId: idea.id,
      version: 1,
      lifecycleResult: result,
    });

    const stored = this.storage.append(COLLECTION, record);

    if (result.status === 'READY') {
      this.eventLog.record('ContentConceptGenerated', { id: stored.id, ideaId: idea.id });
    } else {
      this.eventLog.record('ContentConceptGenerationFailed', {
        id: stored.id,
        ideaId: idea.id,
        errors: result.validationErrors,
      });
    }

    return stored;
  }

  get(id) {
    return this.storage.read(COLLECTION, id);
  }
}

module.exports = { ContentConceptEngine, COLLECTION };
