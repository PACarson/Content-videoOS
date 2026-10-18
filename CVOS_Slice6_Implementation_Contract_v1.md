# CVOS Slice 6 Implementation Contract

**Status: DRAFT — NOT YET IMPLEMENTATION-AUTHORIZED**

- Slice 5 = **CLOSED**
- Slice 6 Decision Gate = **RESOLVED** (`33_ContentVideoOS_Slice6_Decision_Record.md`)
- Slice 6 Implementation = **NOT AUTHORIZED**
- This Contract does **not** authorize coding.
- A subsequent Implementation Authorization / Readiness Gate is required before any Slice 6 source, test, or fixture is written.
- This Contract is not "approved." It is a draft translation of already-approved human decisions into implementable requirements, plus an explicit register of what remains open. It becomes authorized only by a distinct, later, explicit human act.

**Authority order used in drafting this Contract:** (1) existing ADRs / frozen architecture, (2) `33_ContentVideoOS_Slice6_Decision_Record.md`, (3) `32_ContentVideoOS_Slice6_Decision_Gate.md`, (4) `31_ContentVideoOS_Slice6_Readiness_Gate.md`, (5) `CVOS_Slice5_Implementation_Contract_v1.md`, (6) existing Slice 5 source/tests, consulted only for factual compatibility. Where these conflicted, the conflict is preserved below as a Governance Gap (§21), never silently resolved, and no new human decision is invented anywhere in this document.

---

## 1. Purpose of This Contract

This Contract translates the six decisions approved in `33_` into implementable contractual requirements, while keeping four categories strictly separate throughout:

- **DECIDED** — requirements already approved by the human owner.
- **OPEN** — questions that must still receive an explicit human decision before implementation.
- **DEFERRED** — questions intentionally postponed to a later slice/phase.
- **OUT OF SCOPE** — things explicitly excluded from Slice 6.
- **GOVERNANCE GAP** — existing documentation inconsistencies that this Contract does not silently repair.

---

## 2. Slice 6 Scope

**DECIDED** (Decision Record `33_`, Decision 2 = B2):

Slice 6 scope is **Rough Cut Review only.**

Vertical boundary:

```
Idea
 → Production Package
 → Production Go
 → Media
 → AI Analysis
 → EditPlan
 → EditVersion / Rough Cut Manifest
 → Rough Cut Review
```

Slice 6 does **not** implement Final Approval. Accordingly, this Contract does not introduce, as Slice 6 implementation requirements, any of:

- `FINAL_REVIEW`
- `FINAL_APPROVED`
- publication authorization
- `PublicationEngine`
- publication lifecycle
- final-approval freshness/invalidation mechanism
- cross-OS integration
- a real video provider
- actual video rendering

These may be documented below as future dependencies (§12, §16, §17), but none is converted into a Slice 6 implementation requirement by this Contract.

---

## 3. Review Model

**DECIDED** (Decision Record `33_`, Decision 1 = A2):

Review is **append-only and versioned by review round.**

Implementable requirement:

- For every review round, create a new, immutable `Review` record.
- Link each `Review` record to exactly the `EditVersion` being reviewed in that round.
- Preserve every historical `Review` record — none is ever mutated after creation.
- Never mutate an earlier `Review` record to represent the outcome of a later round; a later round is always a new record.
- The design must not foreclose a future evolution toward a separate `ReviewItem`/`Finding` entity (Decision Record `33_` §11.1, OPTION A3) if a later requirement (granular per-clip audit, per-finding analytics, finding-level lifecycle) makes that justified. This Contract does not adopt A3 now; it only requires that A2's shape not make a future move to A3 structurally impossible (e.g., by embedding findings in a way that cannot later be normalized into child rows without a breaking migration of historical data — the exact mitigation, if any, is left to implementation, not decided here).

### OPEN DECISION — Review Field-Level Schema

**Partially updated since initial draft:** the overall schema *shape* is now DECIDED as R7-C ("audit-oriented Review record" — identity, EditVersion linkage, explicit round metadata, Rough-Cut-Review-scoped status, timestamp, a required reviewer field, and a revision-linkage field), per `35_` section A1. Reviewer identity's required/value semantics are also DECIDED as R8-B (modified) — a required, non-null, non-empty, operator-supplied identifier, no formal identity infrastructure required — per `35_` section A2. The findings container is also DECIDED as R9-A (an embedded structured `findings[]` array on the `Review` record — container/ownership model only), per `35_` section A3. Review round identity is also DECIDED as R10-A (an explicit integer `review_round` scoped to the `Review`'s `edit_version_id` — round identity mechanism only), per `35_` section A4. The exact field *names/types* and the remaining sub-questions below are still OPEN and are not resolved by R7-C/R8-B/R9-A/R10-A alone:

- exact field names beyond already-established canonical identifiers (`id`, `edit_version_id` as the linkage field, by analogy with `EditVersion.edit_plan_id`'s naming convention — this analogy is offered as a naming precedent, not as an approved field name), and beyond `review_round`, whose name is DECIDED by OD-R10 = R10-A (see the round identity block below)
- ~~review round identity representation (an integer `round` field; a `supersedes_review_id`-style pointer mirroring `EditPlan.supersedes_version`; or a round number derived implicitly by counting existing `Review` rows for the `EditVersion` — none selected)~~ — **DECIDED (OD-R10 = R10-A, "Explicit `review_round` Integer"):** each `Review` carries an explicit integer `review_round`, scoped to its exact `edit_version_id`, starting at 1 and assigned by `ReviewEngine` when the `Review` is created — never supplied by the caller. This fixes the round identity mechanism only; the decided boundary and the items that remain OPEN are stated in the block below. See `35_` section A4 for full text and rationale.
- review status/state representation (whether `Review.status` is its own field carrying values from the Rough-Cut-Review portion of the AI Production Contract §G vocabulary, or whether status is derived rather than stored — not selected)
- ~~human reviewer identity~~ — **DECIDED (OD-R8 = R8-B modified, "Required Custom Reviewer Identity"):** a reviewer field is required, non-null, non-empty, and operator-supplied (e.g. `"Operator 1"`, `"Carson"`); no formal authentication/identity infrastructure is required in Slice 6; the value must not be hardcoded into the schema. See `35_` section A2 for full text and rationale. (This supersedes `33_`'s OD-06, which had left the question fully open.)
- ~~review findings / per-clip decisions representation~~ — **DECIDED (OD-R9 = R9-A, "Embedded Structured Findings Array"):** `findings[]` is an embedded structured array on the immutable `Review` record for the round; this fixes the container/ownership model only. The internal field-level schema of `findings[]` entries remains OPEN (see §10). See `35_` section A3 for full text and rationale.
- timestamps (a `submitted_at`/`decided_at`-style field is plausible by analogy with `EditVersion.generated_at` and `MediaAnalysis`'s own timestamp field, but no specific field name or set of timestamps is selected)
- relationship to a revision request (whether "a revision was requested in this round" is a value of `Review.status`, a separate boolean, or purely inferable from the existence of a subsequent `EditPlan` version referencing this round — not selected)
- whether any approval-like field exists for Rough Cut Review specifically (distinct from Final Approval, which is out of scope per §2) — e.g., a `HUMAN_REVIEW` round that results in "all `KEEP`" moving the `EditVersion` toward `FINAL_REVIEW` per AI Production Contract §G; whether that transition needs its own recorded field on `Review` or is purely a state-machine transition with no additional field — not selected

**Review round identity (OD-R10 = R10-A) — decided boundary and remaining OPEN items.** Recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A4.

*Decided:*

1. The field is the integer `review_round`, scoped to the exact `edit_version_id` of its `Review`: rounds are counted per `EditVersion`.
2. The first round for an `EditVersion` is round 1.
3. `ReviewEngine` assigns the round when it creates the `Review` record.
4. A caller must not specify the round.
5. `review_round` is a persisted business fact, not a value derived on the fly from `created_at`.
6. `review_round` must not be conflated with `EditPlan.version`, with `EditVersion` identity (`EditVersion.id`), or with EditPlan-lineage revision counting (scope fixed by D-C = C1; counting unit still governed by OD-R2, which remains OPEN).
7. R10-A resolves only the round identity mechanism. It does not complete the `Review` schema: the other sub-questions listed above remain as stated.
8. R10-B (Sequential Review Version Number), R10-C (Unique Review ID + Deterministic Chronological Ordering) and R10-D (Explicit Previous Review Linkage) remain recorded in `35_` section A4 as historical candidates and future reference; none is permanently excluded.

*Remaining OPEN — not decided by OD-R10; to be defined in this Contract against the actual code and runtime boundary, and left OPEN where the evidence is insufficient:*

- whether round numbers must be strictly unique per `edit_version_id` and continuous (no gaps);
- how duplicate rounds are avoided when more than one `Review` could be created concurrently for the same `EditVersion`;
- how a round is allocated when `Review` creation fails or is retried;
- whether transactions, locks or other concurrency control are needed;
- the field names, types and schema of the other `Review` fields that are not yet decided (everything other than `review_round`, whose name and integer type are decided above);
- the concrete name of the `Review` identity field (`review_id` / `id`), which follows this Contract's existing identity-field convention (first bullet above) — no field is added merely because an example shows it;
- the definition and ordering rules of `created_at` (see also the timestamps bullet above);
- whether a `previous_review_id`-style linkage (R10-D) is ever added.

*Code precedent, not proof of safety:* `EditPlanEngine.createEditPlan` allocates `EditPlan.version` as the maximum existing version for the `EditProject` plus one: it reads the existing records and then appends, with no lock, transaction or uniqueness check, and no Slice 5 test exercises concurrent or duplicate allocation. This is a code precedent only. It is not evidence of concurrency safety, and this Contract does not claim that the concurrency question for Review rounds is resolved.

*Dependencies, no other decision made:* OD-R2 (one candidate counting event is "a completed review round", §6), OD-R5, OD-R6 and OD-R11 remain OPEN. R10-A neither decides them nor presumes their outcome.

**Candidate schema shapes** (presented as options, not requirements, consistent with `32_`'s three candidate models for Decision A — see `33_` §11.1 for the full retained analysis):

```
// Illustrative only — no field name, type, or presence is approved, except as explicitly marked DECIDED on a line below.
Review {
  id
  edit_version_id
  review_round        // DECIDED (OD-R10 = R10-A): field name review_round and integer type are locked; scoped to edit_version_id, starting at 1, assigned by ReviewEngine at creation, never caller-supplied; uniqueness/continuity/allocation/concurrency rules still OPEN
  status              // vocabulary TBD, scoped to Rough Cut Review only
  reviewer            // DECIDED: required, non-null, non-empty, operator-supplied (OD-R8 = R8-B modified); exact field name/type still TBD
  findings            // DECIDED: embedded structured array on this Review record (OD-R9 = R9-A); internal field-level schema of findings[] entries still OPEN
  created_at          // or equivalent timestamp field(s), TBD
}
```

This illustration exists only to make the open questions concrete; it is not a schema this Contract adopts.

---

## 4. Human Authority Boundary

**DECIDED** (governing principle, carried forward unmodified from CVOS-P7/P8 and Decision Record `33_` §16):

- Review decisions are human authority. A per-clip decision entered during `HUMAN_REVIEW` is the human's own input, not an AI action, and is therefore outside CVOS-P8's Recommendation/Decision/Execution taxonomy entirely (that taxonomy classifies AI actions; a human's own input is not an AI action).
- AI does not approve a rough cut. Nothing in Slice 6's implementation may cause a `Review` to reach an approved-equivalent outcome (within the Rough Cut Review portion of the state machine — see §2, Final Approval itself is out of scope) without a human having entered the underlying per-clip decisions that deterministically produce that outcome.
- AI may generate an `EditPlan` (a Decision, per CVOS-P8, within a human-authorized workflow — Slice 5's own classification, unchanged) and an `EditVersion`/rough-cut manifest (an Execution, per CVOS-P8 — Slice 5's own classification, unchanged, and re-confirmed by `31_`'s and `32_`'s authority-boundary analysis).
- AI must not, under any Slice 6 implementation:
  - autonomously approve the Review;
  - bypass human review of any kind;
  - convert a revision request into an approval outcome;
  - publish anything;
  - authorize publication.
- A deterministic transition triggered by human-entered Review data (e.g., "every finding is `KEEP`" ⇒ move toward `FINAL_REVIEW`, per AI Production Contract §G's own rule) is not itself an AI-generated decision — it is a mechanical consequence of human input, and must not be described or implemented as if it were an independent AI judgment.

This boundary is a DECIDED requirement, not an open question — it follows directly from CVOS-P7/P8, which are frozen architecture, and is not altered by any of the six Decision Record items.

---

## 5. Review Lifecycle

**DECIDED** (Decision Record `33_`, Decisions 2 and 5):

The Slice 6 review lifecycle, scoped to Rough Cut Review only, uses exactly the following states, drawn from the already-governed vocabulary in AI Production Contract §G, restricted to the portion this Contract's scope covers:

```
HUMAN_REVIEW
REVISION_REQUESTED
AI_REVISION
```

- No terminal `REJECTED` state is added (Decision Record `33_`, Decision 5 = E2).
- `FINAL_APPROVED` and `FINAL_REVIEW` are not implemented in Slice 6 (§2, Decision 2 = B2).
- No new state is added merely to simplify implementation. If implementation discovers a state genuinely required, it does not have authority to add one under this Contract — see §20, the Open Decision Register, as the mechanism for escalating any such discovery.
- **GOVERNANCE GAP, carried forward, not resolved here:** Architecture §14 (Test Governance) lists `REJECTED` among the states "this document proposed" for state-transition testing, while AI Production Contract §G's actual ReviewEngine state-machine diagram contains no `REJECTED` state. This Contract does not adopt `REJECTED`, and does not modify Architecture §14. See GG-02 (§21).

---

## 6. Revision Loop

**DECIDED — scope only** (Decision Record `33_`, Decision 3 = C1):

Revision counting belongs to the `EditPlan` lineage — the chain determined by following `supersedes_version` back to the original `EditPlan` for that editing effort. This is the scope decision; it is final for this Contract's purposes.

**OPEN — must be explicitly resolved before implementation.** None of the following is selected by this Contract:

- **OD-R1 — Numeric maximum.** No number is approved. Not 3, 5, 10, 20, or any other value.
- **OD-R2 — Counting event.** Candidates, none selected: a `RevisionRequested` event; the creation of a new `EditPlan` revision (a `createEditPlan(revisionOf, ...)` call); the generation of a new `EditVersion`; a completed review round. These may not all produce the same count (per `32_` §6) and the relationship between them is itself unresolved (see OD-R5, OD-R6 below).
- **OD-R3 — Enforcement point.** Candidates, none selected: inside `ReviewEngine.requestRevision`; inside `EditPlanEngine.createEditPlan`; a shared domain rule invoked by both; another explicitly justified boundary.
- **OD-R4 — Limit behavior.** Candidates, none selected: hard block (the operation is refused once the cap is reached); a warning that does not block; a forced human-escalation path (matching AI Production Contract §J's own phrasing, "requiring the human to edit outside the system entirely"); an explicit human override mechanism.
- **OD-R5 — Chaining.** Whether `requestRevision` automatically triggers `EditPlanEngine.createEditPlan`, or whether these remain two separate commands invoked independently, is unresolved (`32_`'s OD-07, carried forward unchanged).
- **OD-R6 — Automatic new EditVersion.** Whether a revision automatically triggers a subsequent `generateRoughCut` call to produce a new `EditVersion`, or whether that remains a separate, later, explicitly invoked step, is unresolved.

This Contract does not invent answers to OD-R1 through OD-R6. All six require an explicit human decision, and all six are required before implementation (see §20).

---

## 7. Request Revision Semantics

**DECIDED** (already established by existing governance and Decision Record `33_`, not newly decided here):

- `requestRevision` is a human-authorized review action — it originates from the human's own per-clip decisions during `HUMAN_REVIEW`, not from an AI judgment (§4).
- `requestRevision` does not, itself or via any downstream call it triggers, mutate the existing `EditPlan`. Any resulting new `EditPlan` revision follows the existing, tested, append-only versioning model (`supersedes_version`, `src/209_EditPlanEngine.js`, unchanged by this Contract).
- The existing Slice 5 stale-plan revision semantics remain applicable and are not weakened, narrowed, or reinterpreted by Slice 6: **revising a stale/unverifiable `EditPlan` is EDITING/REVISION, not an EXECUTED-class action**, per `CVOS_Slice5_Implementation_Contract_v1.md` §5. This rule is not modified here, and ADR-022 is not modified here (see GG-01, §21).

**OPEN** (not decided by this Contract, listed here for cross-reference — full detail in §6):

- The exact chaining between `ReviewEngine.requestRevision` and `EditPlanEngine.createEditPlan` (OD-R5).
- Whether a new `EditVersion` is generated automatically as part of that chain (OD-R6).

---

## 8. EditVersion Contract (as inherited from Slice 5 — documented, not modified)

**FACT**, re-verified directly against `src/113_EditVersion.js` in this drafting pass, unchanged by Slice 6:

Current shape:

```
EditVersion {
  id,
  edit_plan_id,
  manifest,
  generated_at
}
```

Current facts, all unmodified by this Contract:

- `EditVersion` is append-only in the existing implementation — every `generateRoughCut` call produces a new row via `storage.append`; no code path mutates an existing `EditVersion` record.
- Multiple `EditVersion`s may exist for one `EditPlan` (retrievable via `EditEngine.getAllForPlan`).
- There is currently no explicit `EditVersion` version number.
- There is currently no `supersedes_version`-style field on `EditVersion`.
- There is currently no explicit "current" marker distinguishing one `EditVersion` from others generated for the same `EditPlan`.
- There is currently no approval field of any kind on `EditVersion` (AI Production Contract §F names an `approval_status` concept, but it was never implemented in Slice 5 — `src/113_EditVersion.js`'s own header comment states this omission is deliberate, reserved for Slice 6/Final Approval).

**This Contract does not add any of the above fields to `EditVersion`** merely because a future `ReviewEngine` might find them convenient. If Slice 6 implementation determines one is actually needed (e.g., to know which `EditVersion` a `Review` should attach to when more than one exists for an `EditPlan`), that need is classified as an Open Decision (see OD-R7 and related items, §20) rather than silently added.

---

## 9. Approval Freshness

**DEFERRED** (Decision Record `33_`, Decision 4 — explicitly not D1, not D2, not D3):

- Slice 6 does not implement an approval-freshness or invalidation mechanism.
- None of the three candidate mechanisms recorded in `33_` (D1 — no mechanism; D2 — ADR-022-style identity-comparison extension; D3 — ADR-015-style orthogonal validity flag) is selected by this Contract.
- CVOS-P9 remains the governing principle, unmodified: the historical fact of approval must never be erased, and downstream authorization to use an approved artifact may need to be revalidated if the artifact's upstream inputs later drift.
- Because Slice 6 does not implement Final Approval (§2), there is no terminal, forward-authorizing approval fact for this mechanism to protect within Slice 6's own scope. The exact mechanism (among D1/D2/D3, or another not yet identified) will be decided when Final Approval is brought into scope in a future slice/phase — not as part of this Contract.
- This deferral is not a decision that "no freshness mechanism is ever needed" — it is a statement that the question does not need to be answered to implement Rough Cut Review, and answering it now would be answering a question about a capability (Final Approval) not yet in scope.

---

## 10. Review Findings

**DECIDED — container/ownership model only** (OD-R9 = R9-A, "Embedded Structured Findings Array"; recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A3): the `Review` record for each review round contains an embedded structured `findings[]` array. The findings container is part of that round's immutable `Review` record (consistent with Decision 1 = A2, §3). No separate `ReviewItem`/`Finding` entity is introduced in Slice 6; a future evolution toward separate finding entities is preserved (§3's non-foreclosure requirement; R9-B is retained in `35_` section A3). R9-A determines only the container/ownership model of findings. The internal field-level schema of "findings[]" remains OPEN and must be resolved during the Contract implementation-definition stage. No finding-level fields are authorized by this decision.

**OPEN — internal field-level schema of `findings[]` entries** (Decision Record `33_`, consequence of Decision 1 = A2, not A3; not resolved by OD-R9 = R9-A):

Because A2 (a single, round-versioned `Review` record) was selected rather than A3 (a separate `ReviewItem`/`Finding` entity), a structured `findings[]` representation on the `Review` record was a plausible shape — and its container model is now selected as R9-A above — but the exact structure of its entries is not decided by this Contract and must not be silently locked by implementation.

Fields that might plausibly appear in a `findings[]` entry — presented strictly as examples, none approved:

- a clip/media-asset reference (which element of the rough cut this finding concerns)
- an action value, drawn from AI Production Contract §G's existing vocabulary (`KEEP`, `REMOVE`, `REPLACE`, `CHANGE_ORDER`, `CHANGE_CAMERA`, `CHANGE_B-ROLL`, `CHANGE_MUSIC`, `CHANGE_CAPTION`, `CHANGE_HOOK`, `CHANGE_DURATION`, `CHANGE_PACING` — this vocabulary itself is already governed and not open; only whether/how it is captured per-finding is open)
- a free-text comment
- a timing/location reference within the manifest
- a reviewer decision field distinct from the action value, if some findings need a separate accept/reject nested judgment
- a severity/priority indicator, if some findings need to be distinguished from others in urgency

None of these fields is assumed approved, and none is approved by OD-R9 = R9-A. OD-R9 is registered in §17 (DECIDED — container/ownership model only; finding-level schema OPEN).

---

## 11. Immutability

**DECIDED**, restating existing governance plus the new Slice 6 requirement, none of it weakened:

| Entity | Immutability rule |
|---|---|
| `EditPlan` | Existing append-only versioning (`supersedes_version`), unchanged, not touched by Slice 6. |
| `EditVersion` | Existing append-only records, unchanged, not touched by Slice 6 (§8). |
| `Review` | **New requirement, this Contract:** append-only, one new immutable record per review round (§3). No operation in Slice 6 may mutate an earlier `Review` record to represent the outcome of a later review round. |
| Review events | Append-only, where governed — consistent with the existing event-log pattern (`003_EventLog.js`) already used for every other command/event pair in this system. |
| Human decision history | Must not be silently overwritten. The specific per-clip decisions a human entered in round N must remain reconstructable from round N's own `Review` record after round N+1 exists. |

---

## 12. Stale / Unverifiable Boundary

**DECIDED — carried forward unmodified:**

- The existing Slice 5 provenance rule (ADR-022) is not weakened, reinterpreted, or extended by this Contract: stale detection, unverifiable detection, provenance identity, and `analysis_id`-based identity semantics all continue to operate exactly as implemented in `EditPlanEngine.checkProvenance`, untouched by Slice 6.
- Because Final Approval is deferred (§2, §9), this Contract does **not** invent a new `EditVersion` approval-freshness mechanism as part of the stale/unverifiable boundary.
- **`EditPlan` provenance freshness** (ADR-022 — an `EditPlan`'s own `media_provenance` no longer matching `MediaAsset.latest_analysis_id`) and **Final Approval freshness** (CVOS-P9's `EditVersion`/`FINAL_APPROVED` scenario, §9 above) are explicitly **not the same problem** and are not conflated anywhere in this Contract. The former is fully governed and unmodified; the latter is deferred in full.

---

## 13. EditEngine / Rough Cut Boundary

**DECIDED — carried forward unmodified from Slice 5:**

- `EditEngine` does not become a real video renderer as a consequence of Slice 6. `EditVersion.manifest` remains a structured, non-file representation, exactly as implemented in Slice 5.
- Slice 6 may consume the structured rough-cut manifest / `EditVersion` (read-only, via existing accessors such as `EditEngine.getAllForPlan`) for the purpose of presenting it to a human reviewer and recording their decisions. This Contract does not add or modify any `EditEngine` method.
- No real video provider is introduced by this Contract.
- No rendering-provider port is added to `AIProviderPort` or any other port unless a separate, future, explicit decision authorizes it. `AIProviderPort` remains at `generateEditPlan` per the existing Slice 5 implementation, and ReviewEngine's own documented external dependency is "None" (Architecture §3) — nothing in this Contract changes that.

---

## 14. Publication / Delete Boundary

**OUT OF SCOPE — explicitly preserved:**

Slice 6 does not own, and this Contract grants it no authority over:

- `PublicationEngine`
- publication authorization
- publishing
- takedown
- deletion (no `delete` method exists anywhere in `StorageAdapterPort` today, and this Contract does not add one)
- original media deletion
- cross-OS integration

These remain future scope, outside this Contract entirely, consistent with `31_`'s §11 finding that this boundary is already sufficiently defined by existing governance and requires no Slice 6-specific decision.

---

## 15. Test Contract (requirements to prove later — no tests written here)

No test is written by this Contract. The following categories are identified as what a future Slice 6 test suite will need to prove, once the corresponding Open Decisions (§20) are resolved:

**Review persistence**
- Create a `Review` record for a given round.
- Reload a `Review` record after a fresh process start (see §16, two-process persistence).
- A second review round creates a new `Review` record rather than mutating the first.
- The first `Review` record remains byte-for-byte unchanged after the second round is created.

**Human authority**
- No code path allows an AI-generated action alone (with no human-entered per-clip decision) to move a `Review`/`EditVersion` toward an approved-equivalent outcome.
- No autonomous Final Approval exists (trivially true while Final Approval itself is out of scope, but worth a static/textual authority-boundary check analogous to `test/612_editEngine.test.js`'s pattern — confirming ReviewEngine's source contains no `FINAL_APPROVED`/`FINAL_REVIEW` terms while those remain out of scope).
- No autonomous publication exists (a static/textual check confirming ReviewEngine's source contains no `PublicationEngine`/`PUBLISHED`/cross-OS terms, mirroring the equivalent check already proven for `EditEngine`).

**Revision lineage**
- Revision counting correctly follows the `EditPlan`'s `supersedes_version` chain (testable once OD-R2 defines the counting event).
- Numeric-cap enforcement behavior remains untestable, and must remain unimplemented, until OD-R1 through OD-R4 are explicitly resolved.

**requestRevision**
- `requestRevision` semantics can only be meaningfully tested once OD-R5 (chaining) and OD-R6 (automatic new `EditVersion`) are decided; testing the wrong assumed chaining behavior would test an unapproved design.

**State machine**
- Transitions among `HUMAN_REVIEW`, `REVISION_REQUESTED`, `AI_REVISION` behave as specified.
- No `REJECTED` state exists anywhere in the implementation.
- No `FINAL_APPROVED` state exists anywhere in the implementation.

**Persistence**
- A fresh two-process persistence demonstration, consistent with the Slice 1–5 standard (§16).

**Regression**
- All existing Slice 1–5 tests (143/143 as of Slice 5's close) remain passing, unmodified.

No numeric test count is assigned, since implementation has not started and the exact schema/enforcement decisions (§20) will determine how many distinct test cases are actually required.

---

## 16. Two-Process Persistence

**DECIDED — carried forward as the existing CVOS standard, unmodified:**

Slice 6 cannot claim persistence readiness from same-process tests alone, consistent with the standard already applied to every prior slice (the `701`…`710` two-process demo pairs).

Future implementation must demonstrate:

```
Process A
  write Review / revision state
        ↓
  process terminates
        ↓
Process B
  fresh reload
        ↓
  historical Review still readable, byte-for-byte unchanged
```

The exact test harness (file naming, exact assertions) remains an implementation concern, not decided by this Contract.

---

## 17. Open Decision Register

| ID | Decision | Status | Required Before Implementation? |
|---|---|---|---|
| OD-R1 | Numeric revision maximum | OPEN | YES |
| OD-R2 | Revision counting event | OPEN | YES |
| OD-R3 | Revision cap enforcement point | OPEN | YES |
| OD-R4 | Behavior at cap | OPEN | YES |
| OD-R5 | `requestRevision` → `createEditPlan` chaining | OPEN | YES |
| OD-R6 | Automatic new `EditVersion` after revision | OPEN | YES |
| OD-R7 | Review field-level schema (identifiers, status field, timestamps — see §3) | **DECIDED — R7-C** (audit-oriented Review record: identity, EditVersion linkage, explicit round metadata, Rough-Cut-Review-scoped status, timestamp, reviewer field, revision-linkage field). Recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A1. Exact field names/types not yet finalized — see §3 below. | Partially — field-level naming still needed |
| OD-R8 | Reviewer identity representation | **DECIDED — R8-B (modified): "Required Custom Reviewer Identity"** — every Review record must carry a non-null, non-empty, operator-supplied reviewer identifier (e.g. `"Operator 1"`, `"Carson"`); no formal authentication/identity infrastructure required in Slice 6; the value must not be hardcoded into the schema. Recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A2. | NO — this item is resolved |
| OD-R9 | Review findings representation (see §10) | **DECIDED — R9-A: Embedded Structured Findings Array** — `Review` contains an embedded structured `findings[]` array that is part of the immutable `Review` record for that review round; no separate `ReviewItem`/`Finding` entity in Slice 6 (future evolution toward separate finding entities preserved). R9-A determines only the container/ownership model of findings. The internal field-level schema of "findings[]" remains OPEN and must be resolved during the Contract implementation-definition stage. No finding-level fields are authorized by this decision. Recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A3. | Partially — finding-level field schema still needed |
| OD-R10 | Review round identity representation (see §3) | **DECIDED — R10-A: Explicit "review_round" Integer** — each `Review` carries an explicit integer `review_round`, scoped to its exact `edit_version_id`, starting at 1 and assigned by `ReviewEngine` during `Review` creation (never supplied by the caller); distinct from `EditPlan.version`, `EditVersion` identity and EditPlan-lineage revision counting. R10-A resolves only the round identity mechanism; it does not complete the `Review` schema. Uniqueness, continuity, allocation (including failed creation/retry) and concurrency rules remain OPEN and must be defined in this Contract; the `createEditPlan` max-version-plus-one pattern is a code precedent only, not proof of concurrency safety. R10-B/C/D retained as historical candidates and future reference. Full boundary in §3; recorded in `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, section A4. | Partially — uniqueness/continuity/allocation/concurrency invariants still needed; naming of the other `Review` fields still needed (the `review_round` name is decided) |
| OD-R11 | Whether `EditVersion` needs a "current"/superseded marker so `Review` can unambiguously bind to the intended version when more than one `EditVersion` exists for an `EditPlan` (§8) | OPEN | YES |
| OD-R12 | Whether a Rough-Cut-Review-scoped approval-like field is needed on `Review` (distinct from Final Approval, out of scope per §2) to represent "this round's all-`KEEP` outcome" (§3) | OPEN | YES |

**Governance synchronization note (added post-draft, not an implementation action):** OD-R7, OD-R8, OD-R9 and OD-R10 were resolved by explicit human decision after this Contract was first drafted; their status is updated above to keep this register consistent with `35_ContentVideoOS_Slice6_Human_Decision_Worksheet.md`, which remains the canonical record of the decision text and rationale (OD-R9 resolves the findings container/ownership model only; finding-level fields remain OPEN; OD-R10 resolves the round identity mechanism only; uniqueness, continuity, allocation and concurrency rules remain OPEN). This update does not convert the Contract's overall status to approved, does not authorize implementation, and does not modify any ADR. OD-R1 through OD-R6, OD-R11 and OD-R12 remain OPEN, unchanged.

**Carried-forward constraints (recorded together with OD-R9 — dependency / implementation constraints, NOT new decisions; neither reopens OD-R7 or OD-R8):**

1. **Reviewer identity semantics (relates to OD-R8 = R8-B modified, still DECIDED).** "reviewer" is an operator-supplied human-readable identifier, not an authenticated identity. It is required, non-null, non-empty, operator-supplied and not hardcoded; formal authentication is not required in Slice 6. This semantics is sufficient for Rough Cut Review but MUST NOT be interpreted as authenticated identity for future higher-authority gates such as Final Approval or Publication Authorization.
2. **Revision-linkage timing (relates to OD-R7 = R7-C, still DECIDED; depends on OD-R5, still OPEN).** R7-C includes a revision-linkage field, but `Review` is immutable. The exact value/creation mechanism depends on OD-R5 (`requestRevision` orchestration semantics). Therefore: OD-R5 is not decided by this note; whether a `Review` may be updated after creation is not decided here; `Review` immutability must not be broken; the Slice 5 `EditPlan` schema must not be modified in order to populate the linkage; the linkage's creation semantics are to be resolved only after OD-R5 is decided. This is an OPEN dependency note, not a reopening of OD-R7.

No additional item was manufactured to lengthen this table. OD-R11 and OD-R12 are added beyond the ten named in the task brief because direct re-verification of `src/113_EditVersion.js` and AI Production Contract §G during drafting surfaced them as genuinely unresolved implementation-blocking questions not otherwise captured by OD-R1–OD-R10 (OD-R11 restates §8's "current marker" gap as an actionable decision item; OD-R12 restates §3's "approval-like field" open question as one). Both trace directly to material already present in `31_`/`32_`/`33_`, not to a new architectural direction.

---

## 18. Governance Gaps

**GG-01**

ADR-022 does not yet contain the stale-plan revision ruling that `CVOS_Slice5_Implementation_Contract_v1.md` §5 already establishes ("revising a stale/unverifiable EditPlan is EDITING/REVISION, not an EXECUTED-class action").

Status: **AUTHORIZED FOR SEPARATE GOVERNANCE SYNCHRONIZATION — NOT PERFORMED.** (Authorized by Decision Record `33_`, Decision 6 = A; not performed by this Contract or any prior document.)

**GG-02**

Architecture §14 (Test Governance) references a `REJECTED` state, while AI Production Contract §G's Review state machine does not contain one.

Status: **DOCUMENTATION INCONSISTENCY — NOT RESOLVED HERE.**

**GG-03**

Architecture §17 (Project State / phase ordering) and AI Production Contract §G differ on whether Final Approval is inside ReviewEngine's Phase-1-authorized scope.

Status: **SCOPE DOCUMENTATION TENSION — RESOLVED FOR SLICE 6 BY HUMAN DECISION B2, BUT SOURCE DOCUMENTS NOT MODIFIED.** (Architecture §17 and AI Production Contract §G remain exactly as written; this Contract's own scope in §2 is binding for Slice 6 implementation purposes only.)

**GG-04** *(PENDING — PROPOSED gap entry, recorded 2026-10-16; discovered during the OD-R11 read-only analysis; not a decision)*

Architecture §2 (Domain Model, line "EditVersion — 1:1 with each EditPlan version") and AI Production Contract §F (`plan_id`: "1:1, same version number") describe `EditVersion` as paired 1:1 with each `EditPlan` version, and Architecture §3 says a render failure "must not silently retry into a duplicate EditVersion". The Slice 5 implementation does not enforce this: `EditEngine.generateRoughCut` has no duplicate guard, and `612_editEngine.test.js` (lines 126–135) asserts that two calls on the same valid `EditPlan` produce two distinct `EditVersion` records with identical manifests. `31_`/`32_`/`33_`/`34_`/`35_` already treat "more than one `EditVersion` per `EditPlan`" as the premise of OD-R11 / OD-R6, and `32_` reads the 1:1 wording as "one row per `generateRoughCut` call".

Status: **PENDING — NOT RESOLVED HERE.** Possible resolutions (clarify the governance text, enforce the pairing in a future change, or accept N-per-plan) are not selected; any of them is for the human owner. Relevant to OD-R11 and OD-R6.

**GG-05** *(PENDING — PROPOSED gap entry, recorded 2026-10-16; discovered during the OD-R11 read-only analysis; not a decision)*

`35_` section A5 states that, if implemented as a mutable re-assignable pointer, R11-C "would be the first mutable field introduced anywhere in the EditPlan/EditVersion/Review cluster", and calls this "a structural departure from every precedent set so far in this codebase". The first statement holds for that cluster; the second is broader than the code supports: `MediaAnalysisEngine.analyzeMedia` (`src/208_MediaAnalysisEngine.js:65-90` in `Content-videoOS-Canonical-Layered-Slice5.zip`) already appends a new immutable `MediaAnalysis` and then updates the mutable pointer `MediaAsset.latest_analysis_id`, as separate non-atomic writes, and `610_mediaAnalysisEngine.test.js` covers only failures that occur before the first write.

Status: **DOCUMENTATION INCONSISTENCY — NOT RESOLVED HERE.** `35_` section A5 is not edited by this entry; the human owner should read the A5 statement together with this precedent when deciding OD-R11.

None of GG-01 through GG-05 is silently fixed by this Contract. No ADR, Architecture document, or AI Production Contract text is modified here.

---

## 19. Retained Alternatives

All non-selected alternatives considered during the Slice 6 decision process — for Review model (A1, A3), Final Approval scope (B1, B3), revision-loop counting (C2, C3, C4), approval freshness (D1, D3), and the `REJECTED` state (E1) — remain retained in full, with their complete consequence/risk/dependency analysis, in `33_ContentVideoOS_Slice6_Decision_Record.md` §§11–15. This Contract does not repeat that analysis. **All non-selected alternatives remain retained in the Decision Record and are not superseded merely because this Contract chooses an implementation direction for the decided items.** If a future requirement makes a retained alternative newly relevant (e.g., Final Approval entering scope, a runaway-revision-loop incident, `PublicationEngine` beginning to consume a `FINAL_APPROVED` fact), the retained analysis in `33_` is the starting point, not a fresh analysis from zero.

---

## 20. Implementation Authorization Boundary

**Implementation Authorization: NOT GRANTED**

This Contract is a draft specification until the Open Decisions in §17 (OD-R1 through OD-R12) are explicitly resolved by the human owner and a subsequent Implementation Authorization / Readiness Gate passes. It is not "ready to implement," not "implementation approved," and not "production ready." No source code, test, fixture, or package artifact may be created on the strength of this document alone.

---

## Final Execution Report

1. Exactly one new file was created: `CVOS_Slice6_Implementation_Contract_v1.md`.
2. No existing file was modified.
3. No source code was modified.
4. No test was modified.
5. No ADR was modified.
6. No package was rebuilt; no ZIP was created.
7. All six decisions from `33_` are represented: Decision 1 (A2, §3), Decision 2 (B2, §2), Decision 3 (C1 scope only, §6), Decision 4 (Deferred, §9), Decision 5 (E2, §5), Decision 6 (authorized-not-performed, GG-01/§18).
8. C1 carries no invented numeric maximum (§6, OD-R1 explicitly open).
9. Decision 4 remains recorded as Deferred, not as D1 (§9, explicit statement that deferral ≠ "no mechanism ever").
10. Decision 2 (B2) remains Rough Cut Review only (§2).
11. Decision 5 (E2) means no `REJECTED` state (§5).
12. Decision 1 (A2) remains append-only Review per round (§3).
13. All remaining open decisions are marked OPEN in the register (§17), none silently resolved.
14. Slice 6 remains **NOT AUTHORIZED** (§20).

**Files created:** `CVOS_Slice6_Implementation_Contract_v1.md`
**Files modified:** NONE
**Production code modified:** NONE
**Tests modified:** NONE
**Governance / ADR modified:** NONE
**Package rebuilt:** NONE
**Slice 6 implementation:** NOT AUTHORIZED
