'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runLifecycle, STATE } = require('../src/002_aiGenerationLifecycle');

test('AI Generation Lifecycle: a valid generation reaches READY, passing through no human state', () => {
  const result = runLifecycle({
    generate: () => ({ value: 'ok' }),
    validate: (fields) => ({ valid: fields.value === 'ok', errors: [] }),
    generatedBy: 'test-provider',
    now: () => 'fixed-timestamp',
  });

  assert.equal(result.status, STATE.READY);
  assert.equal(result.generatedBy, 'test-provider');
  assert.equal(result.generatedAt, 'fixed-timestamp');
  assert.deepEqual(result.validationErrors, []);
  // The whole point of the correction (CVOS-P7 / ADR-013): there is no
  // AWAITING_REVIEW, APPROVED, or any state name anywhere in this module
  // that a human must click through. Confirmed structurally, not just by
  // absence of an approve() call:
  assert.ok(!('AWAITING_REVIEW' in STATE));
  assert.ok(!('APPROVED' in STATE));
});

test('AI Generation Lifecycle: failed structural validation stops at GENERATION_FAILED, not silently at READY', () => {
  const result = runLifecycle({
    generate: () => ({ value: 'bad' }),
    validate: (fields) => ({ valid: false, errors: ['value must be ok'] }),
    generatedBy: 'test-provider',
    now: () => 'fixed-timestamp',
  });

  assert.equal(result.status, STATE.GENERATION_FAILED);
  assert.deepEqual(result.validationErrors, ['value must be ok']);
});

test('AI Generation Lifecycle: a thrown generator error is caught into GENERATION_FAILED, never propagates as a stuck record', () => {
  const result = runLifecycle({
    generate: () => { throw new Error('provider timeout'); },
    validate: () => ({ valid: true, errors: [] }),
    generatedBy: 'test-provider',
    now: () => 'fixed-timestamp',
  });

  assert.equal(result.status, STATE.GENERATION_FAILED);
  assert.match(result.validationErrors[0], /provider timeout/);
});

test('AI Generation Lifecycle: an explicit quality-bar check can also fail the chain', () => {
  const result = runLifecycle({
    generate: () => ({ value: 'ok' }),
    validate: () => ({ valid: true, errors: [] }),
    meetsQualityBar: () => false,
    generatedBy: 'test-provider',
    now: () => 'fixed-timestamp',
  });

  assert.equal(result.status, STATE.GENERATION_FAILED);
  assert.match(result.validationErrors[0], /quality bar/);
});
