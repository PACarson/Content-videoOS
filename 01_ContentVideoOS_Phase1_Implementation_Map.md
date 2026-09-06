# Content Video OS — Phase 1 Implementation Map

**Domain OS:** Content Video OS
**Phase:** 1 — Vertical Slice Implementation
**Status:** DRAFT — proposing Slice 1 for your explicit authorization, per your own instruction's Step 27/8. **No code has been written yet.**
**Authoritative sources (re-read in full, fresh, immediately before this map — not from memory or earlier summary):** `00_ContentVideoOS_Product_Understanding_Report.md`, `00_ContentVideoOS_AI_Production_Contract.md`, `00_ContentVideoOS_Architecture_Governance_v0.1.md` — ADR-001 through ADR-014, CVOS-P7/P8/P9, the EditVersion Review and Publication state machines, and the Domain Boundary sections were all re-verified against the current, audited text.

---

## 0. One honest constraint, before anything else

Your authorization's Step 4 asks me to "inspect the existing repository structure and project conventions." I want to be precise about what that can mean from here: **this chat session has no file-system access to your actual Content Video OS repository, or to Rider OS, Property OS, or any other real codebase you maintain.** I can only create files inside this conversation's own sandbox. Content Video OS also has no repository yet (confirmed in Architecture doc §17) — there is nothing external to inspect regardless of my access.

What I *am* applying below: the conventions your other Domain OS work has already established, as far as I have visibility into them — Repository + shared DataManagement layering, `00_`-prefixed governance files, and Google Apps Script (`.gs`/`.js`) over Google Sheets/Drive as the implementation stack. I'm assuming that stack continues here unless told otherwise — this is the one thing in §5 below that I think genuinely blocks writing real code, as opposed to a Phase 0 contradiction.

---

## 1. Phase 1 Component Map

Ten components carry the vertical slice. PublicationEngine, AnalyticsEngine, and ContentLearningEngine are out of scope (ADR-014) and don't appear below.

### Foundation
- **Responsibility:** the shared DataManagement layer plus the two adapters (StorageAdapter, MediaStorageAdapter) every engine sits on (Architecture §1, ADR-004).
- **Owner:** n/a — shared, business-agnostic, no domain knowledge.
- **Commands:** none of its own; exposes `read`/`append`/`update`/`archive`/`backup` to every Repository above it.
- **Events:** none.
- **State:** n/a.
- **Persistence:** the substrate everything else persists through.
- **Dependencies:** the storage provider (§5, open question).
- **Tests:** write→read round-trip; a value survives a simulated restart (Persistence-First Rule, §20 of your authorization).

### ContentIdeaEngine
- **Responsibility:** capture and triage raw ideas.
- **Owner:** ContentIdeaEngine.
- **Commands:** `createContentIdea`, `promoteContentIdea`.
- **Events:** `ContentIdeaCreated`, `ContentIdeaPromoted`.
- **State:** `NEW → PROMOTED`.
- **Persistence:** ContentIdea repository.
- **Dependencies:** Foundation only.
- **Tests:** create → promote; promote rejected on an already-promoted Idea.

### ContentConceptEngine
- **Responsibility:** turn a promoted Idea into a Concept via the AI Generation Lifecycle.
- **Owner:** ContentConceptEngine.
- **Commands:** `createContentConcept`.
- **Events:** `ContentConceptGenerated` (fires on reaching `READY`).
- **State:** `AI_GENERATED → AI_VALIDATED → AI_RECOMMENDED → READY` (AI Production Contract §C).
- **Persistence:** ContentConcept repository.
- **Dependencies:** AI Provider adapter — **mocked/deterministic for Phase 1** (your authorization §11): a stub that turns an Idea's text into a structurally-valid Concept (title, premise, audience, platform, format, hook) without a real model call, so the lifecycle and persistence are what's under test, not generation quality.
- **Tests:** reaches `READY` with zero human action; malformed input still produces a `READY`-or-explicitly-failed Concept, never a stuck one.

### ScriptEngine
- **Responsibility:** generate a Script from a `READY` Concept.
- **Owner:** ScriptEngine.
- **Commands:** `createScript`.
- **Events:** `ScriptGenerated`.
- **State:** same AI Generation Lifecycle, ending `READY`.
- **Persistence:** Script repository (versioned, FK → ContentConcept).
- **Dependencies:** same mock AI Provider adapter.
- **Tests:** reaches `READY` automatically once Concept is `READY` — no click in between.

### ProductionPlanEngine
- **Responsibility:** generate the Plan + Shot List from a `READY` Concept + Script; **own the Production Go gate**.
- **Owner:** ProductionPlanEngine.
- **Commands:** `createProductionPlan`, `createShot`, `authorizeProductionGo`.
- **Events:** `ProductionPlanCreated`, `ShotCreated`, `ProductionGoAuthorized`.
- **State:** `DRAFT → READY → AUTHORIZED` (+ `AUTHORIZATION_INVALIDATED` — see §2 below).
- **Persistence:** ProductionPlan + Shot repositories.
- **Dependencies:** mock AI Provider adapter; reads EquipmentEngine.
- **Tests:** your Cases A/B/C live here — see §4.

### EquipmentEngine
- **Responsibility:** own Equipment + CapabilityTag; answer capability-match queries.
- **Owner:** EquipmentEngine.
- **Commands:** `registerEquipment` (human), `updateEquipmentCapability` (human), `recommendEquipmentForShot` (deterministic rule-matching, ADR-008 — never needed a mock, since it was never meant to be an AI call).
- **Events:** `EquipmentRegistered`, `EquipmentUpdated`.
- **State:** n/a — reference data.
- **Persistence:** Equipment + CapabilityTag repository.
- **Dependencies:** Foundation only.
- **Tests:** the six known devices register correctly; a capability match returns a reasoned recommendation, never a bare device name.

### ShootEngine
- **Responsibility:** run Shoot Mode; **enforce the `AUTHORIZED` boundary at the command itself**, not upstream.
- **Owner:** ShootEngine.
- **Commands:** `startShoot`, `recordTake`, `verifyTake`.
- **Events:** `ShootStarted`, `TakeRecorded`, `TakeVerified`.
- **State:** Shoot: none → `IN_PROGRESS` → `COMPLETE`; Take: `NOT_STARTED → CAPTURED → VERIFIED`.
- **Persistence:** Shoot + Take repositories.
- **Dependencies:** ProductionPlanEngine (reads `AUTHORIZED` status); mock AI Provider for `verifyTake`'s fast checks.
- **Tests:** your Cases D/E/F/G live here — see §4.

### MediaEngine
- **Responsibility:** deterministic ingestion — import, hash, link to Take/Shot/Shoot.
- **Owner:** MediaEngine.
- **Commands:** `importMedia`.
- **Events:** `MediaImported`.
- **State:** `IMPORTED → ANALYZED`.
- **Persistence:** MediaAsset repository; MediaStorageAdapter for the file itself.
- **Dependencies:** MediaStorageAdapter.
- **Tests:** import creates a MediaAsset without touching the source file; a duplicate hash is detected, not duplicated. **Case H** effectively lives here too — no command in this engine (or any other) deletes a source file, so an AI-originated delete attempt has nothing to call.

### MediaAnalysisEngine
- **Responsibility:** AI batch analysis of imported footage.
- **Owner:** MediaAnalysisEngine.
- **Commands:** `analyzeMedia`.
- **Events:** `MediaAnalyzed`.
- **State:** append-only `MediaAnalysis` versions.
- **Persistence:** MediaAnalysis repository.
- **Dependencies:** mock AI Provider adapter — deterministic heuristics only for Phase 1 (duration/orientation from file metadata, a placeholder quality/relevance value), per your authorization §12 ("do not attempt to solve every computer-vision problem").
- **Tests:** re-analysis appends a new version, never overwrites; a corrupted file is flagged, not silently skipped.

### EditPlanEngine + EditEngine
- **Responsibility:** EditPlanEngine produces the structured, auditable decision list; EditEngine executes it into a Rough Cut.
- **Owner:** EditPlanEngine / EditEngine respectively.
- **Commands:** `createEditPlan`; `generateRoughCut`.
- **Events:** `EditPlanCreated`; `RoughCutGenerated`.
- **State:** EditPlan follows the AI Generation Lifecycle to `READY`; EditVersion enters `AI_ROUGH_CUT`.
- **Persistence:** EditPlan + EditVersion repositories.
- **Dependencies:** mock AI Provider for plan reasoning; a **simplified assembly mechanism** for the "render" — per your authorization §14, this can be a structured manifest (ordered clip list + timing) rather than an actual rendered video file. Proving `Media → Analysis → Edit Plan → Rough Cut → Human Review` is the goal, not NLE-grade output.
- **Tests:** every EditPlan decision carries a stated reason; `generateRoughCut` never marks its own output approved.

### ReviewEngine (Rough Cut Review only — Phase 1 stops here)
- **Responsibility:** capture human feedback on the Rough Cut; drive the revision loop up to, but not past, Rough Cut approval.
- **Owner:** ReviewEngine.
- **Commands:** `submitForReview`, `approveEdit` *(scoped in Phase 1 to "this Rough Cut is good," not Final Approval)*, `requestRevision`.
- **Events:** `ReviewSubmitted`, `EditApproved`, `RevisionRequested`.
- **State:** `AI_ROUGH_CUT → HUMAN_REVIEW → (REVISION_REQUESTED ⇄ AI_REVISION ⇄ HUMAN_REVIEW)*`. Phase 1 builds up through here; `FINAL_REVIEW`/`FINAL_APPROVED` are **not built** (your authorization §15, ADR-014).
- **Persistence:** Review repository.
- **Dependencies:** EditPlanEngine (for revisions).
- **Tests:** a revision request round-trips into a new EditPlan/EditVersion; the human can mark a Rough Cut "reviewed" without the system ever claiming `FINAL_APPROVED` — that state doesn't exist in the Phase 1 build.

---

## 2. Authorization Validity — resolved per ADR-015

The Runtime & Slice 1 authorization (§6) settled this exactly as flagged above: `AUTHORIZATION_INVALIDATED` is **not** a third `production_state` value. `production_state` stays `DRAFT / READY / AUTHORIZED / IN_PROGRESS / COMPLETE`. A separate field pair carries validity: `authorization_valid: boolean` (`true` from the moment `authorizeProductionGo` succeeds; flips `false` on any material upstream change per CVOS-P9) plus `invalidation_reason` and `invalidated_at`. `startShoot` must check both `production_state === 'AUTHORIZED'` and `authorization_valid === true` — this is now the Slice 2 contract, recorded in the frozen architecture as ADR-015. Not relevant to Slice 1, which never reaches `AUTHORIZED` at all.

## 3. Slice breakdown (your §23 breakdown, adopted as-is)

| Slice | Scope | Depends on |
|---|---|---|
| **1 (proposed below)** | Foundation, ContentIdeaEngine, ContentConceptEngine, ScriptEngine — Idea through Script reaching `READY` | none |
| 2 | ProductionPlanEngine (incl. Shot List), EquipmentEngine, the Production Go gate, `AUTHORIZATION_INVALIDATED` | Slice 1 |
| 3 | ShootEngine, MediaEngine | Slice 2 |
| 4 | MediaAnalysisEngine | Slice 3 |
| 5 | EditPlanEngine, EditEngine | Slice 4 |
| 6 | ReviewEngine (Rough Cut Review only) | Slice 5 |

## 4. Proposed Slice 1 — detail

**Scope:** Foundation + ContentIdeaEngine + ContentConceptEngine + ScriptEngine. Proves an Idea can become a `READY` Script, fully automatically, with real persistence. Nothing in this slice touches Production Go, Shoot, or Media, so none of your §18 governance test cases (A–H) apply yet — those start at Slice 2 (Cases A–C) and Slice 3 (Cases D–H).

**What "done" looks like for this slice:**
- `createContentIdea` → `promoteContentIdea` → `createContentConcept` (runs the AI Generation Lifecycle against the mock adapter) → Concept reaches `READY` → `createScript` (same lifecycle) → Script reaches `READY`.
- Every step persists through Foundation; reloading after a simulated restart shows the same state (Persistence-First Rule, §20).
- No command in this slice requires or accepts a human "approve" action — consistent with the corrected CVOS-P7. The only human-in-the-loop moment is optional inspection, which is never tested as a gate because it isn't one.

**After this slice, I'll report** (per your §24): files changed/created, commands/events added, tests added and run, verification result, any governance-file updates, known limitations, and the proposed next slice.

## 5. The one thing I think is genuinely blocking before I write Slice 1 code

Everything above is language-agnostic by design, matching how the Phase 0 documents were written. Writing real code needs two things this authorization didn't specify:

1. **Runtime/language** — I'm assuming Google Apps Script (`.gs`/`.js`) over Google Sheets, matching your other Domain OS work, unless this OS should be different given the AI-and-media load it carries that your other OSes don't.
2. **Where the code should live** — this session can only create files in its own sandbox (viewable/downloadable, not connected to any real repository, Drive folder, or Apps Script project of yours). Getting Slice 1's code into your actual infrastructure would have to happen outside this conversation.

Neither is a Phase 0 contradiction — they're Phase 1 infrastructure facts the authorization didn't cover. Per your own Stop Conditions (§26), I'm surfacing this now rather than guessing. **No Slice 1 code has been written.** Tell me how to resolve these two (or say "sandbox is fine, assume Apps Script" if that's simplest) and I'll start Slice 1.
