# Content Video OS — Phase 1, Slice 1 + Slice 2 + Slice 3

**Scope:** `Foundation → ContentIdea → ContentConcept → Script → READY` (Slice 1) plus
`ProductionPlanEngine (incl. Shot List) → EquipmentEngine → Production Go gate → AUTHORIZED`
(Slice 2) plus `startShoot → recordTake → verifyTake → completeShoot` and
`importMedia` (Slice 3), per `01_ContentVideoOS_Phase1_Implementation_Map.md` §3,
`09_ContentVideoOS_Phase1_Slice3_Authorization_Gate.md`,
`10_ContentVideoOS_Slice3_Semantic_Resolution_Decision.md`, and
`11_ContentVideoOS_Slice3_Completion_Evidence_Handoff.md`. Nothing past that line exists in
this codebase — no MediaAnalysisEngine, no Edit Plan, no Publication. Those are Slice 4+
(deliberate).

## Status

Slice 1: `COMPLETE`. Slice 2: `COMPLETE WITH EXPLICIT DEFERMENTS`. Slice 3: implemented and
verified locally (see `11_ContentVideoOS_Slice3_Completion_Evidence_Handoff.md`) — Shoot/Take
execution lifecycle, technical `verifyTake`, `completeShoot`, and `importMedia` with a local
binary media adapter. 98 automated tests pass total; all three slices' persistence — including
actual imported binary content — is verified across a genuine two-process boundary (see
"Persistence" below). Slice 4+ (MediaAnalysisEngine, Edit Plan, Publication, ...) is
`NOT AUTHORIZED`. This README is the project-local quick reference — see the numbered
governance reports for full detail.

## Architecture

```
domain entities (101_ContentIdea.js, 102_ContentConcept.js, 103_Script.js,
                  104_ProductionPlan.js, 105_Shot.js, 106_Equipment.js,
                  107_Shoot.js, 108_Take.js, 109_MediaAsset.js)
        +
002_aiGenerationLifecycle.js   (AI_GENERATED -> AI_VALIDATED -> AI_RECOMMENDED -> READY, no human click;
                                 reused as-is for ProductionPlan, per Architecture doc §6)
        ↓
engines (ContentIdeaEngine, ContentConceptEngine, ScriptEngine,
         ProductionPlanEngine — Production Go gate + authorization staleness,
         EquipmentEngine — deterministic capability matching, no AI dependency, ADR-008,
         ShootEngine — Shoot/Take execution + Shot.captureStatus lifecycle (ADR-020),
         MediaEngine — importMedia, hash/identify, no destructive operations)
        ↓
001_ports.js   (StorageAdapterPort, AIProviderPort, MediaStorageAdapterPort —
                the only things engines depend on)
        ↓
adapters/
  301_LocalFileStorageAdapter.js     — real, tested, used for Slice 1+2+3 (JSON files on disk)
  302_MockAIProvider.js              — real, tested, deterministic (no network call — none is possible here)
  303_LocalMediaStorageAdapter.js    — real, tested, writes one file per binary under dataDir/media/
  SheetsStorageAdapter.gs        — written for real Google Sheets, but UNTESTED (see below)
```

No entity or engine file imports a concrete adapter directly — only `001_ports.js`. Swapping
`LocalFileStorageAdapter`/`LocalMediaStorageAdapter` for `SheetsStorageAdapter.gs`/a real
Drive-backed adapter in a real deployment should not require touching any domain or engine file.

## Runtime reality check — please read before assuming this runs in production

This project was built and tested inside an isolated chat sandbox with **no network access** and
**no real Google Apps Script runtime**. Concretely:

- `src/*.js` (entities, engines, `LocalFileStorageAdapter`, `MockAIProvider`,
  `LocalMediaStorageAdapter`) — **written, executed, and tested here**. `node --test` runs 98 real
  tests against real code; the persistence claim is backed by three actual two-process
  demonstrations — Slice 1's (`701`/`702`), Slice 2's (`703`/`704`), and Slice 3's (`705`/`706`,
  which also round-trips actual imported binary content byte-for-byte across the process
  boundary) — not just an in-memory assertion.
- `src/adapters/SheetsStorageAdapter.gs` — **written, not executed or tested anywhere**, and
  unchanged since Slice 1 (its contract is generic enough that new collections — including Slice
  3's `shoots`/`takes`/`media_assets` — need no adapter code changes, only one comment line was
  ever touched, during the JS renumbering pass). `SpreadsheetApp` doesn't exist in this sandbox.
  Before trusting it: deploy to a real Apps Script project (e.g. via `clasp push`) against a real
  Spreadsheet, and re-run behavior equivalent to `test/602_contentIdea.test.js` /
  `test/608_shootEngine.test.js` etc. against it.
- `MediaStorageAdapterPort` has only ever been implemented locally
  (`303_LocalMediaStorageAdapter.js`). A real Google-Drive-backed implementation does not exist —
  real Drive upload/file-identity/permissions/large-file behavior remains
  `REQUIRES_REAL_RUNTIME` (unchanged from `01_`/`05_...md`).
- This whole `content-video-os/` tree lives only in this conversation's sandbox. It is not connected
  to any real repository, Drive folder, or Apps Script project. Getting it into your actual
  infrastructure is a step outside this conversation.

## Running the tests

```
node --test
```

Uses Node's built-in test runner (Node ≥18) — no `npm install` needed, no dependencies at all.

## Persistence demonstration (two real, separate `node` processes)

Slice 1 (Idea → Concept → Script):
```
DIR=$(mktemp -d)
node scripts/701_reload-demo-write.js "$DIR"                                  # process 1 — writes, exits
node scripts/702_reload-demo-read.js "$DIR" <ideaId> <conceptId> <scriptId>   # process 2 — reads, verifies
```

Slice 2 (Equipment + ProductionPlan + Production Go + post-authorization Shot List change +
re-authorization):
```
DIR=$(mktemp -d)
node scripts/703_reload-demo-slice2-write.js "$DIR"                                   # process 1 — writes, authorizes, adds a shot (auto-invalidates), exits
node scripts/704_reload-demo-slice2-read.js "$DIR" <planId> <equipmentId> <extraShotId>  # process 2 — reads, re-authorizes
```

Slice 3 (startShoot → recordTake → verifyTake → importMedia → completeShoot):
```
DIR=$(mktemp -d)
node scripts/705_reload-demo-slice3-write.js "$DIR"    # process 1 — writes, verifies, imports a real binary, completes, exits
node scripts/706_reload-demo-slice3-read.js "$DIR" <planId> <shootId> <takeId> <shotId> <mediaAssetId>  # process 2 — reads everything back, including the binary itself
```

(ids are printed as JSON by each write step)

## What's intentionally NOT here (Slice 3 Authorization Gate §5/§23 — Slice 4+)

`MediaAnalysisEngine`, `analyzeMedia`, `MediaAsset.status = ANALYZED`/`ARCHIVED`, `EditPlanEngine`,
`EditEngine`, Rough Cut, Rough Cut Review, `ReviewEngine`, Final Approval, `PublicationEngine`,
Publication, `AnalyticsEngine`, Content Learning, Next Content Recommendation, any cross-OS
integration, any device control (DJI/phone/camera APIs). Building any of these "because they'll
be needed later" was explicitly out of scope for this slice.

## Known limitations (intentional Phase 1 scope, not defects)

- `MockAIProvider` produces structurally-valid but creatively simplistic Concepts/Scripts/plans —
  proving the lifecycle and persistence, not generation quality. Its `verifyTake` is a simple
  deterministic rule (flags missing metadata, no audio, or sub-1-second duration) standing in for
  a real fast/lightweight technical-check model.
- `LocalFileStorageAdapter`'s `readAll`/`update` are O(n) full-file rewrites — fine at current data
  volumes, not how `SheetsStorageAdapter.gs` or a real production adapter should stay implemented at
  scale.
- No `archive`/`backup` modes (the richer `DataManagement` semantics described in the frozen
  Architecture doc) — nothing built so far needs them yet.
- Optional human intervention commands (`approveContentConcept`, etc.) are **not implemented** —
  the frozen architecture marks them optional, and nothing here needs them yet.
- Authorization-staleness triggers for Concept/Script/Equipment changes are **simulated in tests**
  (direct `invalidateAuthorization` calls), not organic — there is no `editConcept`/`editScript`/
  `editEquipment` command anywhere in Slice 1-3 that would trigger them naturally. Only the
  Shot-List trigger (`createShot` on an already-authorized/in-progress plan) is organic.
- `production_state`'s pre-`READY` values (`AI_GENERATED`/`AI_VALIDATED`/`AI_RECOMMENDED`/
  `GENERATION_FAILED`) are an implementation-level reconciliation recorded in the Slice 2 gate
  report §G, not a new ADR.
- **Multi-session bug found and fixed during Slice 3 implementation**: `canStartShoot`,
  `invalidateAuthorization`, and `createShot`'s staleness trigger originally only recognized
  `production_state === 'AUTHORIZED'`, silently breaking Domain Model §2's "a plan can be shot
  across more than one session" once a plan reached `IN_PROGRESS`. All three now also accept
  `IN_PROGRESS` — see `11_ContentVideoOS_Slice3_Completion_Evidence_Handoff.md` for the full
  before/after evidence.
- `verifyTake` is a **technical** check only (duration/audio-presence/etc.) — it is explicitly not
  creative-quality judgment, which remains later slices' job (ADR-020 §2).
- `Shot.captureStatus` has no `RECAPTURE_NEEDED` value (ADR-020 §4, deliberate) — a rejected Take
  is preserved immutably and a new Take is simply recorded for the same Shot.
