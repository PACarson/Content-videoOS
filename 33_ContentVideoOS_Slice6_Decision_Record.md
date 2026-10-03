# CVOS Slice 6 — Formal Decision Record

**Task Type:** Governance / Decision Record only. No implementation. No ADR modification. No test-writing. No package rebuild.

**Nature of this document:** this is the canonical human-decision record for the six decisions surfaced by `32_ContentVideoOS_Slice6_Decision_Gate.md`. It records what was approved, preserves everything that was not approved (so it can be reopened later without re-analysis), and grants no implementation authorization of any kind.

---

## 3. Current Authority Status

- Slice 5 = **CLOSED**.
- Final integrated Slice 5 package = **82 files**.
- Slice 5 baseline = **143/143 tests**.
- Slice 6 readiness result (`31_`) = **NOT READY**, prior to the decisions recorded here.
- Slice 6 implementation = **NOT AUTHORIZED** — unchanged by this document.
- This document resolves the human architectural/semantic questions identified by the Slice 6 Readiness Gate (`31_`) and Decision Gate (`32_`).
- A subsequent process — translating these decisions into a Slice 6 Implementation Contract (the Slice-6 equivalent of `CVOS_Slice5_Implementation_Contract_v1.md`), followed by an Implementation Authorization Gate — is still required before any code is written.

Slice 6 is not, and is not described anywhere in this document as, implemented, runtime-verified, or production-ready.

---

## 4. Source Material Reviewed

- `30_ContentVideoOS_Session_Handoff_Checkpoint.md`
- `31_ContentVideoOS_Slice6_Readiness_Gate.md`
- `32_ContentVideoOS_Slice6_Decision_Gate.md` (the direct source of the six decisions and all retained alternatives below)
- `00_ContentVideoOS_Architecture_Governance_v0.1.md` (§2, §3, §7, §14, §15, §17 — re-checked for exact wording, not modified)
- `00_ContentVideoOS_AI_Production_Contract.md` (§F, §G, §J — re-checked for exact wording, not modified)
- `CVOS_Slice5_Implementation_Contract_v1.md` (§5, §10 — re-checked for exact wording, not modified)
- `src/111_EditProject.js`, `112_EditPlan.js`, `113_EditVersion.js`, `209_EditPlanEngine.js`, `210_EditEngine.js`, `001_ports.js` (read-only, for factual verification of field shapes cited below)

No file in this list was modified.

---

## 5. Human-Approved Decisions

The six decisions below are **APPROVED**, exactly as specified by the human owner. They are not reinterpreted, weakened, or broadened here.

---

### DECISION 1 — Review Entity Model

**APPROVED: OPTION A2**

Review uses an **append-only, versioned Review model — one new immutable Review record per review round, linked to the EditVersion being reviewed.**

Recorded explicitly:

- Review is not a single mutable long-lived record.
- Each review round creates a new Review record.
- Historical Review records remain readable.
- The reviewed `EditVersion` identity is preserved on each Review record.
- This follows the existing CVOS append-only/versioning direction already established for `EditPlan` (`supersedes_version`) and for `MediaAnalysis`.
- This decision does **not** yet define the final field-level Review schema (e.g., exact field names, exact `round` representation, exact `findings` shape).
- It does **not** authorize implementation of ReviewEngine.
- It does **not** yet decide whether individual findings require a separate `ReviewItem`/`Finding` entity (that remains OPTION A3, retained below, not selected now).

**Retained design context:** the chosen A2 model must preserve the possibility of future evolution toward A3 if actual requirements later justify granular `ReviewItem`/`Finding` persistence (e.g., per-clip audit trails, per-clip analytics). A2 is chosen as the minimal model that satisfies the immutability/history requirement without introducing a second new entity before one is demonstrably needed.

---

### DECISION 2 — Final Approval Scope

**APPROVED: OPTION B2**

Slice 6 implements **Rough Cut Review only.** Final Approval is deferred to a later phase/slice.

Slice 6 therefore does **not** currently authorize implementation of:

- `FINAL_REVIEW`
- `FINAL_APPROVED`
- Final Approval command semantics (`approveEdit` reaching a terminal approved state)
- downstream publication authorization
- publication lifecycle

**Rationale, recorded neutrally:**

- Existing governance contains a scope tension: AI Production Contract §G states ReviewEngine "covers the Rough Cut Review and Final Approval gates," while Architecture §17's Project State section places "Final Approval polish" outside Phase 1 and assigns "Final Approval, then Publication" to Phase 2.
- The human decision resolves Slice 6's scope in favor of the narrower Rough Cut Review boundary, i.e., it reads Architecture §17's phase ordering as controlling for implementation-sequencing purposes.
- This avoids importing Final Approval and its downstream authorization/freshness semantics into Slice 6 prematurely.
- This document does **not** rewrite the existing architecture. The underlying documentation tension between AI Production Contract §G and Architecture §17 is **not resolved** by this decision — it remains a governance item for a later reconciliation pass (see §18, Decision Dependency Map, and the retained B1/B3 alternatives in §12).

---

### DECISION 3 — AI Revision Loop

**APPROVED: OPTION C1**

The revision-loop maximum, when subsequently specified, is scoped to **the EditPlan lineage — the chain of revisions connected through `supersedes_version` back to the original plan.**

This means the eventual revision count is associated with one `EditPlan` revision lineage, rather than:

- one individual `EditVersion`/Review round (OPTION C2, retained below), or
- every `EditPlan` ever created under the entire `EditProject` (OPTION C3, retained below).

**CRITICAL — the numeric limit is NOT YET DECIDED.** No number is approved by this document. Specifically not approved: 3, 5, 10, 20, or any other value.

The following remain **future decisions**, explicitly out of scope for this record:

1. exact numeric maximum
2. exact counting event (does a `RevisionRequested` event count, does a `createEditPlan` call count, does a `generateRoughCut` call count — these may not be the same number, per `32_` §6)
3. exact enforcement point (inside `ReviewEngine.requestRevision`, inside `EditPlanEngine.createEditPlan`, or elsewhere)
4. exact behavior when the maximum is reached (hard block, soft warning, forced human-escalation path)
5. relationship between `requestRevision` and subsequent `createEditPlan` (automatic chaining vs. separate steps — this is `32_`'s OD-07, still open)
6. whether revision generation is synchronous or a separate step
7. whether any human override path exists once the cap is reached

This record distinguishes **scope = decided (C1, lineage-based)** from **numeric maximum / enforcement semantics = undecided**.

---

### DECISION 4 — EditVersion / Review Approval Freshness

**APPROVED: DEFERRED**

Because Decision 2 explicitly defers Final Approval, the approval-freshness mechanism is also deferred.

This decision is **not** recorded as "no freshness mechanism." It is recorded as:

**Approval freshness is deferred with the Final Approval lifecycle.**

Explicitly preserved:

- CVOS-P9 already establishes the governing principle that the historical fact of approval must not be erased, and that downstream authorization may cease to be valid if upstream state drifts (Architecture §7, re-verified verbatim in this pass; unchanged, not modified here).
- The exact `EditVersion`/Review freshness mechanism remains to be resolved **before** the Final Approval lifecycle is implemented — not before Slice 6 as scoped by Decision 2 (Rough Cut Review only), since Rough Cut Review alone does not produce a terminal, forward-authorizing approval fact of the kind CVOS-P9 is protecting.
- No D1/D2/D3 mechanism (see `32_` §7 / retained alternatives §14 below) is selected at this stage. This is a deferral of the question, not a selection of D1 ("no mechanism").

---

### DECISION 5 — REJECTED State

**APPROVED: OPTION E2**

No separate terminal `REJECTED` state is added to the Slice 6 ReviewEngine state machine.

The Review lifecycle, as scoped for Slice 6 by Decision 2, continues to use:

- `HUMAN_REVIEW`
- `REVISION_REQUESTED`
- `AI_REVISION`

with whatever transition structure a future Implementation Contract specifies within that vocabulary (AI Production Contract §G's existing diagram, not modified here).

Recorded: the existing Architecture §14 (Test Governance) reference to `REJECTED` as a state to test is a **documentation inconsistency** to reconcile later — it names a state that does not exist in AI Production Contract §G's actual ReviewEngine diagram. This document does not modify §14. No `REJECTED` state is implemented or given semantics by this record.

---

### DECISION 6 — ADR-022 Synchronization

**APPROVED: OPTION A**

The human owner authorizes a **future** formal ADR-022 synchronization/write-in process for the rule already established by `CVOS_Slice5_Implementation_Contract_v1.md` §5:

> revising a stale/unverifiable EditPlan is EDITING / REVISION, not an EXECUTED-class action.

**This Decision Record does not itself modify ADR-022.** It records only the authorization to perform the formal synchronization as a **separate governance task**, to be conducted with the same rigor as ADR-022's original adoption (draft exact amendment → review → formal adoption → governance update → re-run relevant readiness/closure checks). No amendment text is drafted here.

---

## 11. Retained Alternatives and Deferred Design Options

Nothing below is described as wrong, inferior, or permanently closed. Each is retained exactly as analyzed in `32_`, so it can be reopened without re-analysis if CVOS's requirements later change.

### 11.1 Review Model Alternatives (Decision 1)

**OPTION A1 — Mutable single Review.** One `Review` record per `EditVersion`, with findings updated in place across rounds.

Retained characteristics:
- Simpler persistence (one row to find, always).
- Mutable state — a round's status is overwritten by the next round's status.
- Weaker append-only history: reconstructing "what did round 1 actually say" would require an event log or other compensating mechanism, since the record itself no longer reflects it after a later mutation.
- Potential conflict with CVOS-P6 (historical integrity) if a later approval overwrites an earlier rejection/revision-request state on the same row.
- Makes historical round reconstruction harder without extra infrastructure.
- Could still become relevant if a future requirement genuinely prioritizes a simpler, single-current-state representation over full round-by-round history — this is not ruled out permanently, only not chosen for the initial Slice 6 shape.

**OPTION A3 — Append-only Review + ReviewItem/Finding.** Same round-versioned `Review` as A2, plus a separate child entity for each per-clip decision.

Retained characteristics:
- Higher-granularity auditability — can answer "what did round 2 say about clip X specifically" as a direct query rather than parsing an array field.
- Independent per-clip decision persistence, enabling future per-finding lifecycle, assignment, or status tracking if ever needed.
- Stronger querying/analytics possibilities (e.g., "how often is `REMOVE` chosen across all projects").
- Additional entity/schema complexity — a second new entity, on top of `Review` itself, introduced in the same slice.
- Currently not required by the established Slice 6 problem as scoped by Decision 2 (Rough Cut Review only) — the per-clip vocabulary (AI Production Contract §G) can be represented as a structured array field on a single `Review` record (A2) without losing round-level immutability.
- Explicitly retained as the natural next step if per-clip granular audit, per-finding analytics, or finding-level lifecycle tracking become an actual future requirement.

---

### 12. Retained Final Approval Alternatives (Decision 2)

**OPTION B1 — Full Review lifecycle including `FINAL_REVIEW → FINAL_APPROVED` in Slice 6.**

Retained implications:
- Full ReviewEngine state machine implemented in one slice.
- Final Approval live in Slice 6 immediately.
- Approval freshness (Decision 4) becomes immediately relevant and would need to be resolved now rather than deferred.
- Larger Slice 6 test scope (full approval-lifecycle and freshness tests, per `31_`'s test-readiness section).
- Phase 2 could then focus more directly on Publication alone, since Final Approval would already exist.
- Directly supported by AI Production Contract §G's literal text ("covers the Rough Cut Review and Final Approval gates").

**OPTION B3 — Full lifecycle in Slice 6, interpreting "Final Approval polish" (Architecture §17) as downstream integration/polish rather than the initial approval capability.**

Retained implications:
- Same implementation scope as B1.
- A different interpretation of Architecture §17's wording — treats "Rough Cut Review" in ADR-014's vertical-slice chain as shorthand for the whole Review Lifecycle, and "Final Approval polish" as referring only to Phase 2's *deepening* of what Final Approval enables (e.g., feeding `PublicationEngine`), not the `FINAL_APPROVED` transition's existence.
- Requires this particular reading of existing phase wording to be accepted; it is the interpretation requiring the most inference of the three considered in `32_`, and was not adopted.

Neither B1 nor B3 is deleted from consideration; both remain available if a future review of ADR-014/§17 concludes differently, or if Architecture §17 is itself amended.

---

### 13. Retained Revision Loop Alternatives (Decision 3)

**OPTION C2 — Count Review rounds per EditVersion.**

Retained characteristics:
- A natural UX interpretation for "how many times have I asked for changes on *this specific* rough cut."
- Depends on Decision 1's Review-round schema (A2/A3) to count cleanly.
- Risk: resets each time a wholly new `EditVersion` is generated, so a revision effort could evade a cap by generating a fresh `EditVersion` instead of revising the current one.
- Could allow unlimited total revisions across many different `EditVersion`s for the same underlying editing effort, unless combined with a lineage-level cap (C1) as a second, outer bound.

**OPTION C3 — Count EditPlan versions across the whole EditProject.**

Retained characteristics:
- Broadest possible scope — every `EditPlan` version ever created for the whole Concept, regardless of lineage.
- Easy, deterministic counting (`EditPlanEngine.getAllForProject`, already exists, no lineage filtering needed).
- Risk: conflates "revision iteration" with "total plans ever made" — a human exploring a second, unrelated creative direction for the same Concept would consume the same allowance as someone revising one direction repeatedly.
- Potential to unfairly restrict legitimate independent creative exploration under the same Concept.

**OPTION C4 — No system-enforced maximum.**

Retained characteristics:
- No additional guard logic anywhere in `createEditPlan`/`requestRevision`.
- Human remains entirely responsible for deciding when to stop the loop, consistent with CVOS-P7's general "human remains final authority" philosophy.
- Simplest possible implementation — nothing to build, nothing to test beyond confirming no accidental cap exists.
- Leaves AI Production Contract §J's own named concern (an unbounded AI/human revision loop) completely unaddressed at the system level.

None of C2/C3/C4 is deleted from consideration. C1 (lineage-based) was selected as the scope; the numeric value and enforcement details remain a distinct, still-open decision per Decision 3 above.

---

### 14. Retained Approval-Freshness Alternatives (Decision 4)

**OPTION D1 — No freshness mechanism.**

Retained characteristics:
- Approval, once granted, remains permanently usable with no re-validation.
- The historical fact of approval is preserved (satisfies half of CVOS-P9).
- CVOS-P9's forward-authorization revocation principle would not be implemented — the exact scenario CVOS-P9 names as a worked example (an approved `EditVersion` whose underlying `EditPlan` later goes stale) would remain unguarded if D1 were ever chosen outright.
- Retained here specifically so it is not confused with Decision 4's actual meaning: Decision 4 = **deferred**, not D1. If a future Final Approval Implementation Contract ever explicitly chose D1, that would be a distinct, affirmative decision to accept the CVOS-P9 gap — not what is recorded here.

**OPTION D2 — Extend ADR-022's identity-comparison pattern** (record the `EditPlan`'s provenance-verified state at approval time; re-check `EditPlanEngine.checkProvenance` before treating the approval as currently authorizing anything further).

Retained characteristics:
- Directly analogous to ADR-022's existing, tested, identity-based (not timestamp-based) comparison principle.
- Would require a new field recording "the EditPlan version/provenance-status this approval was granted against."
- Satisfies both halves of CVOS-P9 for this specific case.

**OPTION D3 — ADR-015-style explicit validity state** (`approval_valid` boolean + `invalidation_reason` + `invalidated_at`, flipped by an explicit check rather than always recomputed).

Retained characteristics:
- Mirrors `ProductionPlan.authorization_valid` (ADR-015) rather than `EditPlan.media_provenance`'s always-freshly-computed approach.
- Requires deciding *when* the flip happens — on a schedule, on next read, or only when explicitly re-checked by a caller. ADR-015 resolved this for `ProductionPlan` by tying the flip to `createShot`'s call path; no equivalent trigger point is obvious for `EditVersion` since Slice 6 (as scoped) introduces no execution step of its own to hang the check on.
- The distinction between ADR-022's identity-based approach (D2) and ADR-015's orthogonal-flag approach (D3) is preserved explicitly, as these are structurally different solutions, not variations of the same one.

No mechanism among D1/D2/D3 is chosen now. All three remain available once Final Approval's Implementation Contract is eventually drafted.

---

### 15. Retained REJECTED-State Alternative (Decision 5)

**OPTION E1 — A true terminal `REJECTED` state.**

Retained unresolved semantic questions, preserved exactly as raised in `32_`:
- Who/what creates it — is it a distinct command, or a special case of an existing one?
- How does it differ from `REVISION_REQUESTED` in practice?
- Is it truly terminal, or can a `REJECTED` `EditVersion` return to review?
- Does it mean the human is abandoning this specific `EditVersion`, or abandoning the entire branch/editing effort?
- How would it interact with a revision-loop cap (Decision 3) — does reaching `REJECTED` reset, bypass, or interact with the lineage count at all?

Not implemented, not given semantics, and not deleted from future consideration — retained specifically for the scenario in which an actual product requirement for an explicit "abandon this cut" action emerges.

---

## 16. Important Retained Architectural Observations

Preserved from `32_`, unchanged:

**Review / human authority.** Review itself is not an AI Decision or AI Execution action, per CVOS-P8's own taxonomy, which classifies AI actions only. Human review input is human authority, outside that taxonomy. A deterministic aggregation of human per-clip decisions (e.g., "all `KEEP`" ⇒ move toward Final Approval) is not equivalent to an AI-generated Decision. A future Implementation Contract should state this explicitly rather than force-fitting `Review`/`approveEdit` into CVOS-P8's AI-only Recommendation/Decision/Execution categories.

**EditVersion freshness.** `EditVersion` currently has the shape `{ id, edit_plan_id, manifest, generated_at }` (verified directly against `src/113_EditVersion.js` in this pass) and no explicit version number, `supersedes`-style pointer, or "current" marker. Multiple `EditVersion`s can currently coexist for one `EditPlan` (retrievable via `EditEngine.getAllForPlan`). The relationship between multiple `EditVersion`s and any notion of a "current" one remains an unresolved future design concern, independent of the six decisions above.

**Revision semantics.** A revision never mutates an existing `EditPlan`; it always creates a new `EditPlan` version via `supersedes_version` (verified against `src/209_EditPlanEngine.js`). This is existing, tested, unmodified Slice 5 behavior and is not affected by any decision in this record.

**requestRevision semantics.** Still requires future definition of whether `requestRevision → createEditPlan` is automatic (chained within one command) or remains two separate commands/steps (this is `32_`'s OD-07, still open, not resolved by any of the six decisions above). Also unresolved: whether a new `EditVersion` is generated automatically as part of a revision, or requires a separate, later `generateRoughCut` call — the existing Slice 5 pattern (no automatic chaining between `createEditPlan` and `generateRoughCut`) is the closest available precedent, but nothing mandates Slice 6 follow it.

**Publication / Delete.** Slice 6 does not own, and this record does not grant it, any authority over: Publication, Publication Authorization, Delete, actual rendered video file output, or cross-OS integration. These boundaries are unchanged by this document (see also `31_` §11, which found this boundary already sufficiently defined by existing governance).

---

## 17. Governance Synchronization Gap

Retained exactly as characterized in `32_`: this is a **governance synchronization gap**, not a demonstrated behavioral defect.

Current situation, unchanged by this record:

```
ADR-022
   ↓
leaves stale-plan editing to Implementation Gate

CVOS_Slice5_Implementation_Contract_v1.md §5
   ↓
explicitly resolves it as EDITING / REVISION, not EXECUTED-class

src/209_EditPlanEngine.js
   ↓
implements that resolution (verified in this pass — the code's own inline
comments cite Contract v1 §5, not ADR-022's text, as authority)
```

The human owner has authorized (Decision 6) a future formal synchronization of this into ADR-022's own text. This record does not perform that synchronization. ADR-022 remains, as of this document, unmodified and still reading "left to the Implementation Gate" rather than carrying the actual resolution.

Slice 6 depends on this rule operationally (per `32_` §14): `requestRevision`'s call into `EditPlanEngine.createEditPlan(revisionOf, ...)` is governed by exactly this rule whenever a revision is requested against an `EditVersion` whose underlying `EditPlan` has gone stale in the interim. The dependency is behavioral (Slice 6 relies on the rule functioning as implemented) but not textual (Slice 6's own correctness does not require ADR-022's prose to be corrected first, since the implementation already follows Contract v1 §5 regardless of ADR-022's current wording).

---

## 18. Decision Dependency Map

```
Decision 1 — Review schema (A2: append-only, per-round)
        │
        ├── affects revision-round representation
        │     (each new round = a new Review record)
        │
        └── affects future approval representation
              (if/when Final Approval is later implemented,
               its Implementation Contract will need to decide
               whether approval attaches to a Review record,
               an EditVersion field, or both)

Decision 2 — Final Approval scope (B2: Rough Cut Review only)
        │
        └── determines that approval freshness (Decision 4)
            is NOT active in Slice 6, and determines that
            Decision 5 (REJECTED) only needs to account for
            the Rough Cut Review portion of the state machine

Decision 3 — Revision cap scope (C1: per EditPlan lineage)
        │
        ├── depends partly on Review-round semantics (Decision 1)
        │     for any future C2-style alternative reconsideration
        │
        └── depends on requestRevision/createEditPlan chaining
            semantics (OD-07, still open) to define what actually
            increments the count

Decision 4 — Approval freshness (deferred)
        │
        └── deferred as a direct consequence of Decision 2 = B2;
            will need to be resolved before, and as part of,
            whichever future slice/phase implements Final Approval

Decision 5 — REJECTED state (E2: not added)
        │
        └── largely independent; a low-priority documentation
            cleanup item (Architecture §14 vs. AI Production
            Contract §G) rather than a dependency of the other
            five decisions

Decision 6 — ADR-022 synchronization (A: authorized, not performed here)
        │
        └── a separate governance task; Slice 6's `requestRevision`
            operationally depends on the underlying rule (already
            implemented) but not on ADR-022's text being corrected
```

This map is explanatory only and introduces no new implementation requirement beyond what the six decisions above already state.

---

## Non-Authorizations

This Decision Record does **NOT** authorize:

- Slice 6 source implementation
- ReviewEngine implementation
- Review schema coding
- revision-loop coding
- Final Approval coding
- approval freshness coding
- REJECTED-state coding
- tests of any kind
- package rebuild
- ADR-022 modification
- real GAS validation
- real video-provider integration
- PublicationEngine implementation
- cross-OS integration

---

## 20. Next-Gate Status

- Decision Gate: **RESOLVED**
- Slice 6 Implementation Authorization: **NOT GRANTED**
- Next required process: translate the six approved decisions above into a formal Slice 6 Implementation Contract (a Slice-6 equivalent of `CVOS_Slice5_Implementation_Contract_v1.md`), including the still-open sub-decisions explicitly flagged as future work (Decision 3's numeric cap and enforcement point; OD-07's `requestRevision`/`createEditPlan` chaining; the final-field-level `Review` schema within the A2 shape). An appropriate readiness/authorization gate must then be run on that Contract before any implementation begins.

This task does not make Slice 6 ready, and does not grant implementation authorization.

---

## 22. Final Execution Report

1. File exists: `33_ContentVideoOS_Slice6_Decision_Record.md` — created in this task.
2. Only this one new file was created.
3. No existing file was modified.
4. No source code, test, package, or ADR was modified.
5. Slice 6 implementation remains **NOT AUTHORIZED**.
6. The six approved decisions recorded in §5 match exactly: D-A → A2, D-B → B2, D-C → C1 (scope only, no number), D-D → Deferred (not D1), D-E → E2, D-6 → A (authorization to synchronize, not performed here).
7. All non-selected alternatives from `32_` are retained in §§11–15: A1/A3 (Review model), B1/B3 (Final Approval), C2/C3/C4 (revision loop counting), D1/D3 (approval freshness), E1 (REJECTED state) — none deleted, none labeled incorrect.
8. Stopping here. No implementation task is proposed or begun.

**Files created:** `33_ContentVideoOS_Slice6_Decision_Record.md`
**Files modified:** NONE
**Production code modified:** NONE
**Tests modified:** NONE
**Governance / ADR modified:** NONE
**Slice 6 implementation:** NOT AUTHORIZED
