# CVOS Slice 6 Pre-Implementation Decision Gate

**Nature of this document:** READ-ONLY. No implementation, no test-writing, no ADR/governance modification, no schema authorization. This document converts the blocking findings of `31_ContentVideoOS_Slice6_Readiness_Gate.md` into a decision package. Every architectural fork below is presented as neutral options; none is selected, ranked, or recommended by this document.

---

## 1. Current Baseline

- Slice 5: `CLOSED` (not reopened, not touched in this task).
- Slice 5 final integrated package: 82 files (`Content-videoOS-Canonical-Layered-Slice5.zip`), independently re-verified in the prior gate.
- Slice 5 verification: 143/143 tests passed (re-confirmed in `31_`, not re-run in this task — no execution was needed to produce a decision package).
- Slice 6: `NOT READY` (per `31_`).
- Slice 6 implementation: `NOT AUTHORIZED`.
- Source document for this task: `31_ContentVideoOS_Slice6_Readiness_Gate.md`.

---

## 2. Evidence Reviewed

- `30_ContentVideoOS_Session_Handoff_Checkpoint.md` (re-read in full)
- `31_ContentVideoOS_Slice6_Readiness_Gate.md` (re-read in full — treated as the immediate source document, per instruction)
- `00_ContentVideoOS_Architecture_Governance_v0.1.md` — §2 (Domain Model, the `Review` cardinality line), §3 (Engine Ownership Map — ReviewEngine, EditPlanEngine, EditEngine entries), §6 (State Machines), §7 (AI Governance Contract — CVOS-P1–P9), §14 (Test Governance), §15 (ADR-001→022 full text, re-read for ADR-014/019/020/021/022 specifically), §17 (Project State / phase order)
- `00_ContentVideoOS_AI_Production_Contract.md` — §F (Edit Plan / EditVersion schema), §G (Review/Approval State Machine, per-decision vocabulary), §J (Open Questions)
- `00_ContentVideoOS_Product_Understanding_Report.md` — searched for `reviewer`/`review round`/`finding`/`review_id` terminology; none found beyond the single Domain Model cardinality line already known
- `CVOS_Slice5_Implementation_Contract_v1.md` (re-read in full — §5 stale-plan-revision ruling, §10 EditVersion schema formalization, §15 exclusion list)
- Source, re-verified directly (not from memory): `src/111_EditProject.js`, `112_EditPlan.js`, `113_EditVersion.js`, `209_EditPlanEngine.js`, `210_EditEngine.js`, `001_ports.js`, `109_MediaAsset.js`, `110_MediaAnalysis.js`, `208_MediaAnalysisEngine.js`
- `test/612_editEngine.test.js` — re-inspected the authority-boundary static-check pattern (banned-term scan against `src/210_EditEngine.js` and `src/001_ports.js`) that any Slice 6 test plan would need to mirror

No file was modified during this review.

---

## 3. Blocking Decisions Summary

The four blockers named in the task brief are confirmed present in `31_`. Re-checking `31_`'s full Open Decisions table (§13 of that document, 9 items) against this task's four named blockers surfaces **five** items requiring a human decision before an Implementation Contract could be drafted, and one carried-forward governance-synchronization item that is not itself blocking but that Slice 6 depends on:

| Ref in this doc | Corresponds to `31_` OD | Summary |
|---|---|---|
| Decision A | OD-05 | Review data model — no field schema exists for `Review` at all |
| Decision B | OD-01 | Rough Cut Review vs. Final Approval — scope contradiction between Architecture §3/AI Production Contract §G and ADR-014/§17 |
| Decision C | OD-03 | AI Revision Loop maximum — explicitly open, explicitly assigned to Slice 6 |
| Decision D | OD-02 | EditVersion/Review freshness — CVOS-P9's own worked example has no implementing mechanism |
| Decision E (additional, surfaced by re-checking `31_`'s full table) | OD-04 | Whether a true terminal `REJECTED` state is needed, distinct from `REVISION_REQUESTED` — Test Governance §14 names `REJECTED` as a state to test, but ReviewEngine's own state machine (AI Production Contract §G) has no such state |

`31_`'s remaining open items (OD-06 reviewer identity, OD-07 whether `requestRevision` auto-triggers `generateRoughCut`, OD-08 confirmed resolved/out-of-scope, OD-09 project-level provider identity) are folded into the relevant Decision sections below (OD-06/OD-07 appear under Decision A and §10 respectively) rather than treated as separate top-level blockers, since they are narrower sub-questions of the four/five above rather than independent architectural forks.

**No additional blocking item beyond A–E was found in `31_` on re-check.** The investigation in §11 of this document (Publication/Delete boundary) confirms that area is classified `OUT OF SCOPE` / already-sufficiently-bounded by existing governance, not an additional blocker.

---

## 4. Decision A — Review Data Model

### Evidence

- FACT: Architecture §2 Domain Model states: `Review | 1 per EditVersion review round`.
- FACT: Architecture §3 "ReviewEngine" entry: Persistence — "Owns Review." Commands — `submitForReview`, `approveEdit`, `requestRevision`. Events — `ReviewSubmitted`, `EditApproved`, `RevisionRequested`. Invariant: "`FINAL_APPROVED` is terminal for that EditVersion's own content — a later change requires a new version, never a mutated approval."
- FACT: AI Production Contract §G defines a *state machine* (`AI_ROUGH_CUT → HUMAN_REVIEW ⇄ REVISION_REQUESTED/AI_REVISION → FINAL_REVIEW → FINAL_APPROVED`) and a *per-decision vocabulary table* (KEEP/REMOVE/REPLACE/CHANGE_ORDER/CHANGE_CAMERA/CHANGE_B-ROLL/CHANGE_MUSIC/CHANGE_CAPTION/CHANGE_HOOK/CHANGE_DURATION/CHANGE_PACING) — both describe *behavior*, not a persisted record shape.
- DOCUMENTED REQUIREMENT (implicit): AI Production Contract §F lists `EditVersion.approval_status` as "mirrors the Review Lifecycle (§G)" — implying some field somewhere is meant to carry the current lifecycle state.
- IMPLEMENTATION OBSERVATION: `src/113_EditVersion.js` (Slice 5, as built) carries **no** `approval_status` or any other status/lifecycle field. Its own header comment states this omission is deliberate: "Carries no status field of any kind ... which the Contract v1 §8 AI/Human Authority boundary reserves for Slice 6 ... never Slice 5."
- FACT: grep across the Product Understanding Report, Architecture doc, and AI Production Contract found **zero** occurrences of `reviewer`, `review_id`, `review round` (beyond the one cardinality line), or `finding` as a defined term.

### Open Questions

- What is a `Review`'s identity (a `review_id`, or something else)?
- What immutable object does a `Review` attach to — `EditVersion` (per the cardinality note's literal wording) or could it instead need to reference `EditPlan` directly for some fields (e.g., to know which `media_provenance` it is implicitly trusting)?
- Is exactly one `Review` allowed per `EditVersion`, or can an `EditVersion` accumulate multiple `Review` rounds (the cardinality note says "1 per ... review round," which is ambiguous between "exactly one, ever" and "one per round, and there can be several rounds")?
- If multiple rounds are possible, how is round identity represented — a `round` integer field on `Review`, a chain via a `supersedes`-style pointer (mirroring `EditPlan.supersedes_version`), or an implicit round number derived from counting existing `Review` records for that `EditVersion`?
- Who is the reviewer — is a `reviewer_id`/name field needed now, or is CVOS still an implied single-operator system through Phase 1 (the same choice `EditProject` made by omitting a lifecycle field until evidence required one — Contract v1 §1)?
- What are the possible `Review` states — does it need its own state field distinct from the two states already named in AI Production Contract §G (`HUMAN_REVIEW`, `FINAL_REVIEW`, etc.), or does `Review.status` simply mirror the EditVersion Review Lifecycle enum values directly?
- Is a "finding" (a per-clip decision, e.g. `REMOVE` on clip X) part of the `Review` record itself (an array field) or a separate child entity (e.g., `ReviewItem`, one row per clip/element judged)?
- What constitutes "a review decision" at the top level — is it the aggregate of all per-clip findings (all-`KEEP` ⇒ approve), or a separate, explicit top-level field the human sets independently of the per-clip findings?
- How is a revision request represented in the data model — as a `Review.status = REVISION_REQUESTED` value, as a separate `RevisionRequest` record, or purely as the `RevisionRequested` event with no additional persisted record beyond the `Review` itself?
- How is approval represented — a `Review.status = FINAL_APPROVED`-equivalent value, a boolean flag, or a field on `EditVersion` itself (`approval_status`, as named but never implemented in AI Production Contract §F)?
- How is rejection represented — see also Decision E (§3 above / §6 of the original Readiness Gate, OD-04): no `REJECTED` terminal exists in AI Production Contract §G's diagram at all today.
- How are historical `Review` records preserved across a revision loop — does an old `Review` remain readable and immutable once superseded by a new round (mirroring `EditPlan`'s own `supersedes_version` immutability pattern), and if so, by what linking mechanism?

### Candidate Options

**OPTION A1 — `Review` is a single mutable record per `EditVersion`, findings are an embedded array field.**
- Identity: `review_id` = `EditVersion.id` (1:1, no independent key needed) or its own `id` with a unique `edit_version_id` reference.
- Linkage: one `Review` row references exactly one `EditVersion`.
- Lifecycle: `Review.status` cycles through `HUMAN_REVIEW → REVISION_REQUESTED → HUMAN_REVIEW → ... → FINAL_REVIEW → FINAL_APPROVED`, mutating in place each round.
- Immutability: **breaks** the pattern established by every other entity in the system so far (`EditPlan`, `MediaAnalysis`, `Take` are all append-only/versioned, never mutated in place — CVOS-P6). A mutable `Review` would be the first entity in the whole codebase to violate that precedent.
- Compatibility with existing architecture: LOW — contradicts CVOS-P6 ("Approved history is never overwritten") if a rejected/revision-requested state is later overwritten by a subsequent approval on the same record.
- Effect on future revision loops: simplest to query (always one row to find), but loses the individual history of what was said in round 1 vs. round 2 unless findings are also appended-not-overwritten inside the embedded array.
- Effect on approval freshness: a single mutable row makes CVOS-P9-style staleness harder to reason about, since "the record that was approved" and "the record that exists now" become the same row with no way to distinguish them after a later mutation.

**OPTION A2 — `Review` is an append-only, versioned entity, one new record per round (mirrors `EditPlan`'s own `supersedes_version` pattern).**
- Identity: `review_id`, globally unique per round.
- Linkage: `edit_version_id` (the `EditVersion` being reviewed this round) + `round` (integer, or `supersedes_review_id` pointing to the prior round's record, analogous to `EditPlan.supersedes_version`).
- Lifecycle: each `Review` record is created once per round and never mutated again; the *sequence* of `Review` records for one `EditVersion` represents its history.
- Immutability: HIGH — matches every other entity's precedent in this codebase (`EditPlan`, `MediaAnalysis`).
- Compatibility with existing architecture: HIGH — same shape as the `EditPlan.supersedes_version` mechanism already implemented and tested in Slice 5.
- Effect on future revision loops: each round is independently auditable; a maximum-iteration-count decision (Decision C) can count these records directly.
- Effect on approval freshness: the specific `Review` record that reached `FINAL_APPROVED` is permanently identifiable and never mutated — directly supports a CVOS-P9-style freshness check (Decision D) by giving it a fixed thing to compare against.

**OPTION A3 — `Review` (top-level round record) + separate `ReviewItem`/`Finding` child entity (one row per per-clip decision).**
- Identity: `Review.id` (one per round, as in A2) plus `ReviewItem.id` (one per finding), with `ReviewItem.review_id` linking back.
- Linkage: `Review → EditVersion` (as in A2); `ReviewItem → Review`.
- Lifecycle: `Review` itself follows A2's append-only pattern; `ReviewItem` rows are written once, at `submitForReview`-response time, and never mutated.
- Immutability: HIGH, same as A2, with finer-grained auditability (which specific clip/element got which decision, preserved individually).
- Compatibility with existing architecture: HIGH, but is a heavier schema (two new entities instead of one) than anything else introduced by a single slice so far (Slice 5 introduced three: `EditProject`, `EditPlan`, `EditVersion` — but `EditPlan`'s per-clip detail lives in array fields on the one record, not child rows).
- Effect on future revision loops: makes it possible to answer "which specific clips were flagged in round 2" precisely; A1/A2 would only be able to answer this if the array-of-findings field is itself well-structured, which is achievable but not forced by the option's shape.
- Effect on approval freshness: no material difference from A2 on this axis — freshness is a property of the round-level `Review`/`EditVersion` pairing regardless of whether findings are inline or child rows.

**No option above is declared authoritative. This is Decision A itself — see §15 checklist.**

### Consequences

- The choice determines whether Slice 6's Implementation Contract (the eventual Slice-6 equivalent of `CVOS_Slice5_Implementation_Contract_v1.md`) can reuse the exact `supersedes_version`-style pattern already proven in Slice 5 (A2/A3) or must introduce a new, unprecedented mutable-record pattern (A1).
- The choice determines what a maximum-revision-count check (Decision C) would actually count against.
- The choice determines what a staleness/freshness check (Decision D) would compare — a specific immutable `Review` record (A2/A3) vs. a single row whose current state may already have been overwritten (A1).

### Human Decision Required

Which of OPTION A1 / A2 / A3 (or an unlisted fourth shape) should govern the `Review` entity's identity, linkage, and mutability — see DECISION 1 in the final checklist (§15).

---

## 5. Decision B — Rough Cut Review vs Final Approval

### Evidence

**Document group 1 — ReviewEngine owns both gates:**

| Document | Section | Exact semantic meaning | Includes/excludes Final Approval |
|---|---|---|---|
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §3, "ReviewEngine" entry | "Outputs: A Review record; a transition to `FINAL_APPROVED` or a `RevisionRequested` event back to EditPlanEngine." Invariant: "`FINAL_APPROVED` is terminal for that EditVersion's own content." | **Includes** — `FINAL_APPROVED` is named as this engine's own output |
| `00_ContentVideoOS_AI_Production_Contract.md` | §G | "**EditVersion Review Lifecycle** (owned by ReviewEngine — this covers the **Rough Cut Review** and **Final Approval** gates from §8 / Architecture doc §7)" | **Includes**, explicitly, by name, both gates in one sentence |
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §7, CVOS-P7 gate list | Gate #2 "Rough Cut Review" and gate #3 "Final Approval (`HUMAN_FINAL_APPROVAL`)" are listed as two of the five named human-only gates, without engine attribution in this specific list (attribution comes from §3/§G above) | Neutral on its own — attribution comes from the other two documents |

**Document group 2 — Phase 1 vertical slice ends at Rough Cut Review; Final Approval is Phase 2:**

| Document | Section | Exact semantic meaning | Includes/excludes Final Approval |
|---|---|---|---|
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §15, ADR-014 | "Phase 1 is a minimal, real, end-to-end vertical slice — `Idea → Production Package → Production Go → Media → AI Analysis → Rough Cut Review` — not a horizontally-complete layer ... Publication, Analytics, and Content Learning are explicitly deferred past this slice." | **Excludes** — the named endpoint is "Rough Cut Review," full stop; Final Approval is not named as part of the vertical slice's chain, though it is also not explicitly named in the deferred list (only Publication/Analytics/Content Learning are explicitly named as deferred here) |
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §17, Project State, "Proposed implementation phase order" | Phase 1 item 1: "...Rough Cut Review (EditPlanEngine + EditEngine + ReviewEngine, through the Rough Cut Review gate). Explicitly out of scope for Phase 1: **Final Approval polish**, Publication, Analytics, Content Learning..." | **Excludes**, explicitly, by name — "Final Approval polish" is listed in the same out-of-scope sentence as Publication/Analytics/Content Learning |
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §17, Phase 2 description | "Phase 2 — Deepen the slice: Final Approval, then Publication (PublicationEngine, platform adapters)." | **Excludes** — Final Approval is explicitly assigned to Phase 2, listed before Publication |
| `16_ContentVideoOS_Phase1_Slice4_Authorization_Gate.md` (line 79, re-verified) | Slice/Phase cross-reference table | "Rough Cut Review / Human Review (`ReviewEngine`) — NO — Slice 6 ... `01_`§3 表第6行；ADR-014 把「Rough Cut Review」列为 Phase 1 垂直切片的终点" (ADR-014 lists "Rough Cut Review" as the Phase-1 vertical slice's endpoint) | Names Rough Cut Review as the slice's endpoint; does not separately discuss Final Approval's placement in this specific line |

### Document Conflict

DOCUMENTED CONFLICT: AI Production Contract §G explicitly, by name, states ReviewEngine "covers the Rough Cut Review and Final Approval gates" — a direct textual assertion that Final Approval is inside ReviewEngine's scope. Architecture §17's Project State section, in the same governance document (a later/more implementation-oriented section of the very same file), explicitly, by name, lists "Final Approval polish" as out of scope for Phase 1, with Phase 2 separately and explicitly assigned "Final Approval, then Publication."

The word "polish" is the specific point of ambiguity: it could mean (a) refinements to an already-functional Final Approval mechanism that will exist even in Phase 1 in rough form, or (b) the entire Final Approval capability, described dismissively as "polish" because it is not yet needed for a minimal vertical slice. Nothing in any reviewed document defines which reading "polish" carries. No document explicitly says "Final Approval itself is fully out of Phase 1" nor "only cosmetic refinements to Final Approval are deferred" — both readings remain textually available.

### Candidate Interpretations

**OPTION B1 — Slice 6 includes both the Rough Cut Review lifecycle AND the Final Approval lifecycle (full AI Production Contract §G state machine, through `FINAL_APPROVED`).**
- Textual support: AI Production Contract §G's explicit "covers ... Final Approval" statement; Architecture §3's ReviewEngine invariant naming `FINAL_APPROVED` as this engine's own terminal output.

**OPTION B2 — Slice 6 implements Rough Cut Review only (through `HUMAN_REVIEW ⇄ REVISION_REQUESTED/AI_REVISION`); Final Approval (`FINAL_REVIEW → FINAL_APPROVED`) remains deferred to a later phase/slice.**
- Textual support: ADR-014's literal vertical-slice chain ends at "Rough Cut Review"; §17 Project State explicitly places "Final Approval polish" in the Phase-1-out-of-scope list and "Final Approval" itself (not qualified by "polish") at the start of the Phase 2 description.

**OPTION B3 — Slice 6 implements the full state machine including `FINAL_APPROVED`, but treats "Final Approval polish" (deferred) as referring only to *downstream consequences* of Final Approval (i.e., what happens after `FINAL_APPROVED` — feeding `PublicationEngine`, multi-output generation, etc.) rather than the gate transition itself.**
- Textual support: this reading reconciles both document groups by treating "Rough Cut Review" in ADR-014's chain as shorthand for "the whole EditVersion Review Lifecycle culminating in the Rough Cut Review process," and "Final Approval polish" as referring to Phase 2's *deepening* of what Final Approval enables (Publication eligibility) rather than gating the `FINAL_APPROVED` state transition's existence in Slice 6. This is a genuinely available third reading given the documents, not an invented one — but it is also the reading requiring the most interpretive inference, since it requires treating "Rough Cut Review" in ADR-014 as non-literal.

No option is selected. All three remain textually defensible to differing degrees; B3 requires the most inference and is presented for completeness, not because it is better supported than B1/B2.

### Consequences

| Impact area | OPTION B1 (full lifecycle in Slice 6) | OPTION B2 (Rough Cut Review only) | OPTION B3 (full lifecycle, but "polish" = downstream only) |
|---|---|---|---|
| ReviewEngine scope | Full §G state machine, all 3 commands fully wired | `submitForReview`, `requestRevision` fully wired; `approveEdit` either absent or a no-op/deferred stub | Same as B1 |
| State machine | Implements `FINAL_REVIEW → FINAL_APPROVED` now | Implements only up through `HUMAN_REVIEW ⇄ REVISION_REQUESTED/AI_REVISION`; `FINAL_REVIEW`/`FINAL_APPROVED` built later | Same as B1 |
| Approval model | `EditVersion`/`Review` freshness (Decision D) must be resolved now, since `FINAL_APPROVED` exists now | Decision D's approval-freshness sub-questions (CVOS-P9 on `FINAL_APPROVED` specifically) can be deferred along with Final Approval itself | Same as B1 — freshness must be resolved now |
| Human gates | Both gate #2 and gate #3 (CVOS-P7) become live in Slice 6 | Only gate #2 (Rough Cut Review) becomes live; gate #3 (Final Approval) remains un-implemented until whichever later slice/phase takes it up | Same as B1 |
| Revision loop | Same in all three options — the loop mechanics (Decision C) are shared regardless of where Final Approval sits | Same | Same |
| Publication Authorization | `PublicationEngine` (Phase 2, out of scope regardless) could, once built, consume a real `FINAL_APPROVED` fact produced by Slice 6 | `PublicationEngine`, when eventually built, would need Final Approval built first — a dependency gap between "Slice 6 done" and "Publication buildable" that this option makes explicit | Same as B1 |
| Testing | Slice 6's test plan (per `31_`'s §12) must include full approval-lifecycle and freshness tests now | Test plan is smaller for Slice 6 itself; approval/freshness tests move to whatever slice implements Final Approval | Same as B1 |
| Future Phase 2 work | Phase 2 becomes "Publication only" (Final Approval already exists) | Phase 2 becomes "Final Approval, then Publication," matching §17's literal phase-order wording | Phase 2 becomes "Publication only," same as B1, but §17's explicit "Final Approval, then Publication" phase-2 wording would then need to be read as referring only to Final Approval's *downstream integration*, not its initial existence |

### Human Decision Required

Whether Slice 6's implementation scope includes the Final Approval gate (`FINAL_REVIEW → FINAL_APPROVED`) now, or defers it — see DECISION 2 in the final checklist (§15).

---

## 6. Decision C — AI Revision Loop Maximum

### Existing Rule

- FACT: AI Production Contract §J, Open Questions: *"Should the AI Revision Loop (`HUMAN_REVIEW ⇄ AI_REVISION`) have a maximum iteration count before requiring the human to edit outside the system entirely?"* — phrased as an open question, never answered, anywhere in the reviewed corpus.
- FACT: `27_ContentVideoOS_Slice5_Authorization_Readiness_Gate.md`, ISSUE-08, re-confirmed on this pass: explicitly assigns this question to Slice 6 ("归属 Slice6（ReviewEngine）而非 Slice5" — belongs to Slice 6, not Slice 5), not to Slice 5.
- No document names even a candidate number, a candidate unit of counting, or an enforcement mechanism.

### Undefined Semantics

- **What is an iteration?** Not defined. Candidates below (Candidate Model C1–C4) each imply a different answer.
- **What event increments the iteration?** Not defined. Could be `RevisionRequested` (the event fired when a human asks for changes), the creation of a new `EditPlan` via `createEditPlan(revisionOf, ...)`, or the creation of a new `EditVersion` via a subsequent `generateRoughCut`.
- **Does a rejected Review count?** Undefined — depends on whether Decision E (a true `REJECTED` terminal, distinct from `REVISION_REQUESTED`) exists at all; if it doesn't (current AI Production Contract §G has no `REJECTED` state), this question may be moot until Decision E is separately resolved.
- **Does a revision-request count?** Textually the most literal reading of "iteration" in "`HUMAN_REVIEW ⇄ AI_REVISION`" — each full cycle through that loop is one candidate unit — but not confirmed by any document.
- **Does generation of a new EditPlan count?** A `requestRevision` call and a `createEditPlan(revisionOf=...)` call are, per `31_`'s OD-07 (still open), possibly two separate steps or possibly automatically chained — which affects whether counting "new EditPlan versions" and counting "revision requests" would even produce the same number.
- **Does generation of a new EditVersion count?** Same ambiguity as above, one layer further downstream.
- **Scope of the limit** — is it per `EditProject` (the whole Concept's editing lifetime), per `EditPlan` lineage (one `supersedes_version` chain, resetting if, hypothetically, a wholly new initial `EditPlan` were created for the same project), per `Review` round (a limit on one `EditVersion`'s own review cycles before that specific `EditVersion` is abandoned and a fresh one started), per user session (a runtime/UI-level cap unrelated to persisted state), or some other unit entirely? No document specifies.

### Candidate Models

**CANDIDATE C1 — Count `RevisionRequested` events per `EditPlan` lineage (i.e., per chain of `supersedes_version` pointers back to the original v1).**
- Lifecycle consequences: the cap would need to be checked inside `EditPlanEngine.createEditPlan`'s revision path (or by `ReviewEngine.requestRevision` before calling it) — a new authority-boundary decision about which engine enforces the cap.
- State-machine consequences: none to the `EditVersion` Review Lifecycle diagram itself; the cap would sit outside the state machine, as a guard on the transition.
- Persistence implications: countable directly from existing `EditPlan.supersedes_version` chains — no new field required, only a new query (`EditPlanEngine.getAllForProject` already exists and could be reused/extended).
- Authorization implications: raises the question of what happens at the cap — hard block (`createEditPlan` throws), soft warning (allowed but flagged), or forced human override path ("requiring the human to edit outside the system entirely," per §J's own phrasing, suggesting the system should stop generating further AI revisions, not stop the human from doing anything at all).
- UX implications: a project-lifetime cap could be reached across many different `EditVersion`s' review rounds, which may or may not match a human's intuitive sense of "how many times have I asked for changes on *this* cut."
- Deterministic/testable: yes — straightforward to test once the number and enforcement point are fixed.

**CANDIDATE C2 — Count `Review` rounds per `EditVersion` (only revisions requested while looking at one specific rendered cut).**
- Lifecycle consequences: ties the cap to Decision A's `Review` schema directly — needs A2/A3-style round identity (§4) to count cleanly; is awkward under A1 (single mutable record) since a mutated record doesn't obviously preserve a round count unless a separate counter field is added.
- State-machine consequences: cap would gate the `HUMAN_REVIEW → REVISION_REQUESTED` transition specifically for that `EditVersion`.
- Persistence implications: depends entirely on which Decision A option is chosen — could require a `round` field.
- Authorization implications: same options as C1 (hard block / soft warning / forced escalation).
- UX implications: resets naturally each time a wholly new `EditVersion` is generated, which may better match "I'm on my Nth round of tweaking *this specific* rough cut" — but would allow unlimited total revisions across many different generated `EditVersion`s if a human simply asks for a fresh rough cut instead of revising the current one, unless combined with a project-level cap (C1) as well.
- Deterministic/testable: yes, once Decision A is resolved.

**CANDIDATE C3 — Count `EditPlan` versions per `EditProject` (broader than C1: counts every version ever created for the whole Concept, not just one lineage chain, in case a wholly new initial plan is ever created alongside an existing one).**
- Lifecycle consequences: broadest possible scope; would require `EditPlanEngine.getAllForProject` (already exists) with no lineage filtering.
- State-machine consequences: none directly; same external-guard shape as C1.
- Persistence implications: no new field required.
- Authorization implications: same options as C1/C2.
- UX implications: could feel overly restrictive if a human legitimately wants to explore a second, unrelated initial `EditPlan` direction for the same Concept — conflates "revision iteration" with "total plans ever made," which are not obviously the same concept.
- Deterministic/testable: yes.

**CANDIDATE C4 — No system-enforced maximum; count is tracked/displayed only, and "requiring the human to edit outside the system" (§J's own phrasing) is left as a purely human/manual decision, never a system-enforced block.**
- Lifecycle consequences: no new guard logic anywhere; `createEditPlan`/`requestRevision` behave exactly as today, indefinitely.
- State-machine consequences: none.
- Persistence implications: none required, or optionally a simple counter/log for human visibility only.
- Authorization implications: no new authorization boundary is introduced — directly answers §J's open question with "no" rather than picking a number.
- UX implications: places the entire judgment call on the human, consistent with CVOS-P7's general philosophy ("human remains final authority") but leaves §J's own named risk (an unbounded loop) fully unaddressed at the system level.
- Deterministic/testable: trivially — there is nothing to test beyond "the loop is never blocked," though a test could still confirm no accidental cap was introduced.

**No candidate is selected.** The counting unit (C1/C2/C3), the cap number itself, and whether a cap exists at all (vs. C4) are all open. This is Decision C — see §15 checklist.

### Consequences

Summarized inline within each candidate above; the cross-cutting consequence is that **Decision C cannot be fully specified independently of Decision A** (the `Review` schema) if a `Review`-round-scoped cap (C2) is chosen, and depends on OD-07 (§10 below) if the counting unit is "revision requests" vs. "EditPlan versions actually generated," since those two are not guaranteed to be the same number unless `requestRevision` and `createEditPlan` are 1:1 and always chained automatically.

### Human Decision Required

Whether a maximum revision-loop iteration count exists at all, and if so, what unit it counts and what scope it applies over — see DECISION 3 in the final checklist (§15). The final number is explicitly out of scope for this document to propose.

---

## 7. Decision D — EditVersion / Review Freshness

### Existing Identity

- FACT: `EditVersion` identity, per `src/113_EditVersion.js` (Contract v1 §10, retroactively formalized, matching existing tested implementation): `{ id, edit_plan_id, manifest, generated_at }`. `id` is the unique identity; `edit_plan_id` is a reference to the generating `EditPlan`, not an inline copy of its content.
- FACT: `EditVersion` carries **no** version number of its own, no `supersedes`-style pointer, and no status field. Multiple `EditVersion`s for the same `EditPlan` are retrievable via `EditEngine.getAllForPlan(editPlanId)` (existing method), but nothing marks any one of them "current" vs. "superseded" — that concept simply does not exist yet for `EditVersion`, only for `EditPlan` (via `supersedes_version`).

### Existing Versioning

- FACT: `EditPlan` versioning is fully governed — `version` (int), `supersedes_version` (nullable ref to prior `EditPlan`), append-only, never mutated (ADR-022, Contract v1 §4). Re-verified directly against `src/112_EditPlan.js` and `src/209_EditPlanEngine.js` in this pass.
- FACT: `EditVersion` versioning is **not** governed at all beyond the trivial 1:1-per-`generateRoughCut`-call relationship: each call to `generateRoughCut(editPlanId)` produces one new `EditVersion` row; there is no explicit "this supersedes that" relationship between two `EditVersion`s the way there is between two `EditPlan`s.

### Existing Approval Semantics

- FACT: Architecture §3, ReviewEngine invariant: "`FINAL_APPROVED` is terminal for that EditVersion's own content — a later change requires a new version, never a mutated approval. (Independent of CVOS-P9, §7: the approval record itself never changes, but its authorization to be *used* downstream can still be revoked if upstream state drifts.)"
- FACT: CVOS-P9 (§7): "before any EXECUTED-class transition ... the executing engine re-validates that the upstream inputs it depends on are still at the state they were in when the human approved. If they've drifted — the Script changed after the Production Plan was approved, a referenced MediaAsset's analysis changed after an EditPlan was built on it, **an EditVersion's underlying assembly shifted after `FINAL_APPROVED`** — the dependent artifact is flagged and blocked from further execution until a human re-confirms."
- IMPLEMENTATION OBSERVATION: CVOS-P9 explicitly uses "an EditVersion's underlying assembly shifted after `FINAL_APPROVED`" as one of its own three worked examples of the general principle — meaning the *principle* is unambiguously approved governance, already written into the frozen architecture, and does **not** require a new ADR to establish the principle itself. What is missing is only the *mechanism*: no field, no comparison rule, no "what counts as drift" definition exists for this specific case, unlike the other two worked examples (Production Plan re-authorization uses the ADR-015 `authorization_valid` pattern; EditPlan-vs-MediaAnalysis uses the ADR-022 `media_provenance`/identity-comparison pattern).

### Freshness Problem

Answering the fifteen numbered questions from the task brief directly:

1. **What makes an EditVersion uniquely identifiable?** Its `id` field. FACT.
2. **Is EditVersion immutable?** Yes in practice — nothing in `210_EditEngine.js` or the existing tests ever calls `storage.update` on an `edit_versions` record; every `generateRoughCut` call does `storage.append`. FACT (implementation observation, not an explicit written invariant the way `EditPlan` immutability is explicitly stated).
3. **What does a Review actually approve?** Undefined until Decision A is resolved — plausibly "this specific `EditVersion`, by its `id`," but no document states this explicitly since no `Review` schema exists yet. OPEN QUESTION.
4. **Does approval attach to EditVersion identity?** Most likely reading of Architecture §3's invariant ("`FINAL_APPROVED` is terminal for that EditVersion's own content") — but "attach" could mean a field on `EditVersion` itself (`approval_status`, as named in AI Production Contract §F but never implemented) or a field on a separate `Review` record referencing the `EditVersion`'s `id`. Both are compatible with the invariant's wording. OPEN QUESTION.
5. **Does approval attach to an underlying EditPlan?** Not per any document — approval is consistently described as being about the `EditVersion` ("that EditVersion's own content"), not the `EditPlan` that generated it. But since `EditVersion.edit_plan_id` is the only link back, any freshness check would need to traverse that link regardless of where the approval flag itself lives.
6. **What happens when a new EditVersion is generated?** Mechanically: a new row via `generateRoughCut`. Whether an *existing, already-`FINAL_APPROVED`* `EditVersion` for the same `EditPlan` should then be treated as superseded, or whether the two can coexist independently, is undefined — no document addresses two `EditVersion`s for the same `EditPlan`, one approved and one not.
7. **What happens when the EditPlan changes?** Fully governed at the `EditPlan` layer itself (ADR-022 staleness) — but whether that staleness should *propagate* to flag an already-generated `EditVersion` (and any `Review`/approval attached to it) as stale is undefined. This is the core of OD-02/Decision D.
8. **What happens when MediaAnalysis changes?** Same propagation question, one layer further removed (`MediaAnalysis → EditPlan.media_provenance staleness → EditVersion? → Review/Approval?`) — undefined beyond the first hop, which ADR-022 already covers.
9. **Can an old approval remain valid?** Per CVOS-P9's own text (re-quoted above): the *approval record itself* never changes/is never erased ("the historical fact that a human approved it ... is never erased"), but its *forward authorization to be used* can be revoked. So: the record stays valid as a historical fact; whether it stays valid as an *authorization to proceed* is the open question. FACT (principle) + OPEN QUESTION (mechanism).
10. **When must an approval become stale/invalid?** Undefined mechanically. By analogy with ADR-022's identity-based test (not timestamp, not content-similarity), a candidate rule would be: if the `EditVersion`'s `edit_plan_id`'s current provenance status (via `EditPlanEngine.checkProvenance`) is no longer `current` at some later check, any approval resting on that `EditVersion` should be considered not-currently-authorized-for-further-use. This is a **plausible extension by analogy**, not a decision made by any document — presented as PROPOSED OPTION only, not adopted.
11. **Can a stale Review still be read?** By analogy with every other "stale" concept in this system (`EditPlan` staleness: "never deleted, remains readable at all times" — ADR-022), the same principle would very likely extend cleanly — but no document says so explicitly for `Review`. OPEN QUESTION, low controversy.
12. **Can a stale Review be edited?** No document addresses this. A `Review` under Option A2/A3 (append-only) wouldn't be "edited" in place at all — a new round would be created instead, sidestepping the question. Under Option A1 (mutable), this becomes a live and unresolved question. OPEN QUESTION, entangled with Decision A.
13. **Can a stale approval authorize execution?** By direct analogy with ADR-022's Decision — boundary for handling stale/unverifiable plans ("any EXECUTED-class action ... must not proceed while its analysis basis is stale or unverifiable"), the answer would very plausibly be "no" — but Slice 6 introduces no new EXECUTED-class action of its own (per `31_`'s §10, ReviewEngine is advisory/decision-recording, not execution-performing). This question therefore matters primarily for whatever *downstream* engine (Publication, Phase 2) would eventually consume a `FINAL_APPROVED` fact — making it partly a Slice 6 question and partly a future-phase question. OPEN QUESTION.
14. **Does publication authorization require a fresh Review?** Out of Slice 6's own scope (`PublicationEngine`, Phase 2) — but the *answer* would need to be decided before Publication could be built, and Slice 6's own data-model choices (Decision A) will determine what "freshness" even *means* for Publication to check. Flagged for downstream awareness, not a Slice 6 blocker per se.
15. **What artifact identity must be stored to prove freshness?** Undefined — depends on Decision A (what a `Review`/approval record's shape is) and on whether Decision D extends ADR-022's `{asset_id, analysis_id}`-style identity-pair pattern to a `{edit_plan_id, edit_plan_version}`-style pair recorded at approval time, an `{edit_version_id}` direct reference only, or something else.

### Candidate Models

**MODEL D1 — No new freshness mechanism; approval simply persists on `EditVersion`/`Review` with no re-validation, ever.**
- Matches CVOS-P9's letter only partially — satisfies "approval record itself never changes" but does **not** implement the "forward authorization can be revoked" half of CVOS-P9, leaving the exact scenario CVOS-P9 names as a worked example (an approved `EditVersion` whose `EditPlan` later goes stale) completely unguarded.

**MODEL D2 — Extend ADR-022's identity-comparison pattern one layer up: record the `EditPlan`'s version number (or its own provenance-check result) at the moment of approval; re-check `EditPlanEngine.checkProvenance` before treating that approval as currently authorizing anything further.**
- Directly analogous to ADR-022, reusing the "identity, not timestamp or content" comparison principle.
- Would require a new field (on `Review`, `EditVersion`, or a new join concept) recording "the `EditPlan` version/provenance-status this approval was granted against."
- Satisfies both halves of CVOS-P9 for this specific case.

**MODEL D3 — Introduce an ADR-015-style orthogonal validity pair (e.g., `approval_valid: boolean` + `invalidation_reason` + `invalidated_at`) attached to wherever the approval fact lives, flipped by an explicit check rather than always recomputed fresh.**
- Mirrors `ProductionPlan.authorization_valid` (ADR-015) rather than `EditPlan.media_provenance`'s always-fresh-computed approach (ADR-022).
- Would require deciding *when* the flip happens — on a schedule, on next read, or only when explicitly re-checked by a caller (same open question ADR-015 itself resolved for `ProductionPlan` by tying it to `createShot`'s call path, but no equivalent trigger point is obvious for `EditVersion` since Slice 6 introduces no execution step of its own to hang the check on).

**Explicitly not proposed as a default: copying ADR-022 verbatim onto `EditVersion`/`Review`.** Per the task's own instruction, ADR-022's specific mechanism (identity-pair on a specific field, `media_provenance`) is a reusable *concept* (identity-based staleness, not timestamp-based; never silently treated as valid) but its *specific shape* was designed for the `EditPlan`↔`MediaAnalysis` relationship and is not automatically the right shape one layer up.

### Consequences

Entangled with Decision A (what shape a `Review`/approval record has) and Decision B (whether `FINAL_APPROVED` is even in Slice 6's scope at all — if OPTION B2 is chosen, Decision D's most consequential half, "can a stale approval authorize execution," becomes moot for Slice 6 itself and would move to whatever slice eventually implements Final Approval).

### Human Decision Required

Whether an approval-freshness mechanism is required for Slice 6 at all (contingent on Decision B), and if so, which of MODEL D1/D2/D3 (or another shape) should govern it — see DECISION 4 in the final checklist (§15).

---

## 8. Authority Boundary

| Artifact / action | Classification | Basis |
|---|---|---|
| AI-generated `EditPlan` | DECISION | CVOS-P8: "a structured, machine-readable decision inside a workflow a human already authorized" — matches Architecture §3's own description of EditPlanEngine's output |
| AI-generated `EditVersion` / rough-cut manifest | EXECUTION | CVOS-P8: "a system adapter actually performs an external, consequential action." `generateRoughCut` is explicitly named in `31_`'s §10 as "the one EXECUTED-class action Slice 5 introduces (CVOS-P9)," confirmed directly in `src/210_EditEngine.js`'s own header comment |
| `Review` (the record of a human's per-clip decisions) | INFORMATION (about what the human decided) once persisted; the act of deciding itself is HUMAN AUTHORIZATION-adjacent but not itself one of CVOS-P8's three AI-authority tiers, since no AI action occurs in producing it | CVOS-P8 only classifies AI actions into Recommendation/Decision/Execution; a human's own input is outside that taxonomy entirely — `31_`'s §6 reached the same conclusion |
| Review Decision (the aggregate outcome — e.g., "all `KEEP`" ⇒ move toward Final Approval) | Derived from HUMAN AUTHORIZATION (the human's own per-clip inputs), not an independent AI or system judgment | AI Production Contract §G: the aggregation rule ("If every decision is KEEP ... the version moves to FINAL_REVIEW") is a deterministic, non-AI rule applied to human input |
| Human Approval / Final Approval (`approveEdit` → `FINAL_APPROVED`) | HUMAN AUTHORIZATION | CVOS-P7 gate #3, explicitly named human-only |
| Publication Authorization | HUMAN AUTHORIZATION | CVOS-P7 gate #4, explicitly named human-only, owned by `PublicationEngine` — out of Slice 6 scope |
| Execution (rendering, publishing, deleting) | EXECUTION | CVOS-P8, explicit definition; none of these actions exist in ReviewEngine's documented command set |

**Authority ambiguity requiring resolution before implementation:** the classification of "Review Decision" above (a human aggregate outcome, not squarely any of CVOS-P8's three AI-tier categories) is not itself contradictory, but CVOS-P8's own text was written to classify *AI* actions specifically ("AI Recommendation, AI Decision, and AI Execution are three distinct things") — it does not explicitly say how a purely human input/aggregation step should be labeled. This is not a blocking contradiction, but it is a documentation gap: an eventual Slice 6 Implementation Contract would benefit from stating explicitly, in its own terms, that `Review`/`approveEdit` sit in a fourth, human-only category that CVOS-P8 does not itself name, rather than silently trying to force-fit them into "Decision" or "Execution." This observation is recorded here as an IMPLEMENTATION OBSERVATION, not a new blocker requiring a numbered checklist decision, since it does not admit of alternative options the way Decisions A–D do — it is a drafting-clarity note for whoever eventually writes the Slice 6 Implementation Contract.

---

## 9. Immutability / History

| Record type | Mutates in place, or new record/version created? | Basis |
|---|---|---|
| Old `EditPlan`s | New version created (`supersedes_version`); never mutated | FACT — CVOS-P6, ADR-022, `src/209_EditPlanEngine.js` (`storage.append`, never `storage.update`, on `edit_plans`) |
| Old `EditVersion`s | New row created per `generateRoughCut` call; never mutated | IMPLEMENTATION OBSERVATION — confirmed via `src/210_EditEngine.js` (`storage.append` only). Not an *explicitly written* invariant the way `EditPlan`'s is, but consistent with it, and consistent with Architecture §3's own ReviewEngine invariant ("a later change requires a new version, never a mutated approval") |
| Old `Review`s | **UNRESOLVED — depends entirely on Decision A.** OPTION A1 would mutate; OPTIONS A2/A3 would not | OPEN QUESTION |
| Old Review decisions (per-clip findings) | **UNRESOLVED** — same dependency as above | OPEN QUESTION |
| Approvals | Per CVOS-P9's own text: "the approval record itself never changes" — the *fact* of approval, once granted, is FACT-level immutable. What is *not* settled is whether "the approval record" is a field that could theoretically be flipped back (contradicting this) under some future Slice 6 design, versus a design that makes such a flip structurally impossible (e.g., an append-only `Review` round never being reopened) | FACT (principle) + OPEN QUESTION (whether any candidate schema could accidentally violate it) |
| Revision requests | Per Architecture §4-5, `RevisionRequested` is an event (append-only by nature, matching every other event in this system — `003_EventLog.js`'s existing pattern). Whether a corresponding persisted record (beyond the event log) exists and is itself immutable depends on Decision A | FACT (event is immutable) + OPEN QUESTION (whether an additional record exists) |

**Unresolved decisions**: everything under "Old `Review`s" and "Old Review decisions" rows above is contingent on Decision A (§4) and is not separately re-listed as its own checklist item, since resolving Decision A resolves these by construction.

---

## 10. Revision Request Semantics

The task brief's list of possible interpretations is reproduced as decision-relevant questions, not resolved:

- Does `requestRevision` change only `Review.status` (or equivalent), with no other side effect until a separate, later action?
- Or does `requestRevision` *itself* trigger the generation of a new `EditPlan` (calling `EditPlanEngine.createEditPlan(revisionOf, reviewFeedback)` synchronously, as part of the same command)?
- If a new `EditPlan` is generated, is a new `EditVersion` also generated automatically in the same step (i.e., does `requestRevision` also call `EditEngine.generateRoughCut` on the freshly created plan), or does that remain a separate, later action (mirroring the existing `createEditPlan`-then-`generateRoughCut` two-step pattern already established in Slice 5, where nothing chains them automatically today)?
- Is the *existing* `EditPlan` (the one behind the `EditVersion` under review) ever itself "revised" in the sense of being mutated — FACT: no, per Decision A's context and ADR-022's immutability precedent, this is not a live option; a "revision" always means a *new* `EditPlan` version, never an edit to the old one. This specific sub-question is therefore not open — it is already settled by existing, tested Slice 5 behavior (`209_EditPlanEngine.js`'s `createEditPlan` revision path).
- Is the existing `EditVersion` "superseded" by the new one (requiring the supersession-tracking mechanism discussed as absent in Decision D), or do old and new `EditVersion`s simply coexist as independent rows with no formal supersession relationship?
- Does the `Review` record for the old `EditVersion` remain attached to that old `EditVersion` permanently (a closed, historical round), or does it get reassigned/reused for the new `EditVersion`?
- Does the old `Review` become formally "closed" (a terminal, non-reopenable state), or does it simply become dormant with no formal closure step?
- Is a wholly new `Review` round created for the new `EditVersion` (consistent with OPTION A2/A3, §4), or does "request revision" conceptually stay *within* one long-lived `Review` object that simply gains new findings each round (consistent with OPTION A1)?

None of these are resolved by this document. They are direct sub-questions of Decision A (§4) and, to a lesser extent, Decision C (§6, since the answer to "does requestRevision auto-chain into createEditPlan" determines what a revision-loop iteration counter would actually be counting). They are surfaced here as their own section per the task's structure, but are not given a separate numbered checklist item beyond what Decision A/C already cover, to avoid asking the human owner the same underlying question twice under two different headings.

---

## 11. Publication / Delete Boundary

- FACT: `PublicationEngine` owns `authorizePublication`, `publishContent`, `takeDownPublication`, and the entire Publication Lifecycle state machine (Architecture §3, AI Production Contract §G). None of these are Slice 6 commands.
- FACT: ADR-014/§17 place Publication in Phase 2, explicitly after Final Approval, regardless of how Decision B is resolved.
- FACT: "Delete" (CVOS-P7 gate #5) is not attributed to any specific engine anywhere in the reviewed corpus, and `StorageAdapterPort` (`src/001_ports.js`) has no `delete` method at all today — re-confirmed in this pass.
- FACT: original media immutability (CVOS-P4) is unconditional and engine-agnostic — "Source media is immutable. Analysis produces new, separate, referencing records — never a mutation of the source." Nothing about Slice 6 touches this; ReviewEngine has no documented relationship to `MediaAsset` at all (it operates on `EditVersion`/`EditPlan`, which reference media only indirectly through `media_provenance`).
- FACT: the "final rendered output" concept in the reviewed governance is `EditVersion.manifest` (Slice 5's structured, non-file representation) and, later, `ContentOutput` (owned by `PublicationEngine`, Phase 2) — no actual rendered video file exists anywhere in this system yet (Contract v1 §10/§11: Phase 1 produces no real render).

**Classification of this area:** the current architecture defines this boundary **sufficiently** for Slice 6's own purposes — the boundary is "ReviewEngine does not touch Publication, Delete, or media, at all, under any of the Decision B options above." This is not classified as an additional blocking gap; it is one of the few areas of Slice 6's scope with no open question. No change to Slice 6's scope is implied or proposed here.

---

## 12. Test Consequences

For each open decision, the verification category that would become necessary once (and only once) a decision is made — none of these are written here:

- **Decision A resolved (Review schema):** Review-record persistence tests (create/read); if A2/A3, round-identity/versioning tests (analogous to Slice 5's `EditPlan` version-chain tests); if A3, `ReviewItem`/finding-level persistence tests; immutability tests confirming no `storage.update` path exists on `Review`/`ReviewItem` collections (mirroring the "append-only" discipline already tested for `EditPlan`).
- **Decision B resolved (Final Approval in/out of Slice 6):** if included — full state-machine transition tests through `FINAL_APPROVED`, plus an authority-boundary static-source-scan test analogous to `test/612_editEngine.test.js`'s pattern, confirming ReviewEngine's source contains no `PublicationEngine`/`PUBLISHED`/cross-OS terms (mirroring exactly what `612_` already does for `EditEngine`). If excluded — a similar static-scan test confirming `FINAL_APPROVED`/`FINAL_REVIEW` do NOT yet appear in ReviewEngine's source, to keep the boundary honest the way Slice 5's own tests keep Slice 6/Publication terms out of Slice 5.
- **Decision C resolved (revision loop cap):** revision-loop termination tests (confirm the Nth+1 attempt is rejected, or confirm no cap exists and unlimited iterations are explicitly allowed, whichever is decided); a test establishing the counting unit behaves as specified (e.g., counts `Review` rounds vs. counts `EditPlan` versions, per whichever candidate model is chosen).
- **Decision D resolved (freshness):** stale-approval-rejection tests (an approval granted against `EditPlan` v1, where v1 later goes stale, must not silently authorize anything further); a test confirming a stale `Review`/approval remains readable (mirroring ADR-022's "never deleted, always readable" test pattern already proven for `EditPlan`); a test confirming the approval record's own historical fact is never erased or rewritten even once flagged not-currently-authorizing.
- **Decision E resolved (whether `REJECTED` exists):** if yes — a new terminal-state transition test set; if no — nothing new, but Architecture Test Governance §14's own listed test category ("state transition tests... including the states this document proposed (`REJECTED`...)") would need its wording reconciled with ReviewEngine's actual state machine, itself a governance-documentation matter rather than a test-writing matter.
- **Cross-cutting, regardless of which decisions are made:** cross-process persistence tests (a `71x_reload-demo-slice6-write/read.js` pair, matching the established `701`…`710` pattern); full regression confirming the existing 143 Slice 1–5 tests remain unmodified and passing.

---

## 13. Decision Matrix

| ID | Decision | Current Evidence | Options | What Changes | Risk if Unresolved | Human Decision Required |
|---|---|---|---|---|---|---|
| D-A | Review entity schema — identity, linkage, mutability | Architecture §2 (cardinality only); AI Production Contract §G (behavior only, no schema); no field-level schema anywhere in the corpus | A1 (mutable single record) / A2 (append-only, versioned) / A3 (A2 + separate finding entity) | Determines every downstream Review/approval mechanism's shape | Cannot draft a Slice 6 Implementation Contract; any implementation attempt would require inventing a schema unilaterally | Yes |
| D-B | Final Approval in Slice 6's scope or deferred | AI Production Contract §G ("ReviewEngine ... covers ... Final Approval") vs. Architecture §17 ("Final Approval polish" out of Phase 1; "Final Approval, then Publication" in Phase 2) | B1 (both gates in Slice 6) / B2 (Rough Cut Review only) / B3 (both gates in Slice 6, "polish" = downstream integration only) | Determines Slice 6's command set, state-machine completeness, and whether Decision D's approval-freshness mechanism is needed now or later | Slice 6's scope boundary remains textually contradictory; an implementer could justify either full or partial scope from the documents as written | Yes |
| D-C | Revision-loop maximum — existence, unit, scope | AI Production Contract §J (open question); `27_` ISSUE-08 (explicitly assigned to Slice 6) | C1 (per EditPlan lineage) / C2 (per EditVersion/Review round) / C3 (per EditProject, all versions) / C4 (no cap, tracked only) | Determines whether/how the revision loop can terminate without indefinite human intervention | The named risk in §J itself (an unbounded AI/human loop) remains fully unaddressed | Yes |
| D-D | EditVersion/Review approval-freshness mechanism | CVOS-P9 (§7) names the exact scenario as a worked example; no field/mechanism exists for it (unlike its two sibling examples, which do) | D1 (no mechanism) / D2 (ADR-022-style identity-pair extension) / D3 (ADR-015-style orthogonal validity-flag extension) | Determines whether a `FINAL_APPROVED` `EditVersion` can silently continue to be treated as authorized after its underlying `EditPlan` goes stale | CVOS-P9's own text is satisfied only for two of its three worked examples; the third remains unimplemented indefinitely | Yes (contingent on D-B: only fully material if B1/B3 is chosen) |
| D-E | Whether a true terminal `REJECTED` state is needed | AI Production Contract §G's diagram has no `REJECTED` state; Architecture §14 Test Governance lists `REJECTED` among states "this document proposed" to test | E1 (add a `REJECTED` terminal, distinct from `REVISION_REQUESTED`) / E2 (no such state; §14's reference to `REJECTED` is treated as stale/inapplicable to ReviewEngine specifically) | Determines whether an "abandon this EditVersion/branch entirely" path exists, or whether every non-approval outcome must eventually resolve through `REVISION_REQUESTED` | Low urgency; internal documentation inconsistency (§14 vs. §G) persists either way until resolved | Yes, but explicitly lower priority than D-A/B/C/D per the evidence gathered |

No option above is marked "recommended," "best," or "preferred," per instruction.

---

## 14. Governance Gap — ADR-022 / Slice 5 Contract

Carried forward exactly as instructed, not modified, not reinterpreted, not silently synchronized:

FACT: `CVOS_Slice5_Implementation_Contract_v1.md` §5 states explicitly: *"`createEditPlan()` 从一份 stale 或 unverifiable 的既有 EditPlan 产生新修订版本，本身分类为「EDITING / REVISION——不是 EXECUTED-class 动作」"* (revising a stale/unverifiable EditPlan is classified as EDITING/REVISION, not an EXECUTED-class action).

FACT: ADR-022's own text, as written into `00_ContentVideoOS_Architecture_Governance_v0.1.md` §15, still reads: *"whether editing a stale plan is permitted is left to the Implementation Gate"* — i.e., ADR-022 itself does not state the Contract v1 §5 ruling; it explicitly defers the question Contract v1 §5 later answered.

DOCUMENTED CONFLICT (of completeness, not of substance): this is not a contradiction in outcome — nothing in ADR-022's text disagrees with Contract v1 §5's ruling — but a **synchronization gap**: the governing ADR does not itself carry the decision that was actually made and actually implemented (confirmed again in this pass directly against `src/209_EditPlanEngine.js`'s own inline comments, which cite Contract v1 §5, not ADR-022, as authority for this specific behavior).

Per instruction: this document does **not** modify ADR-022, does **not** reinterpret the existing decision, and does **not** silently synchronize it. It is recorded here as a **governance synchronization decision** — i.e., a decision about whether to formally write the Contract v1 §5 ruling into ADR-022's own text — for the human owner to take up separately, using the same rigorous write-in process previously used to adopt ADR-022 itself.

**Does Slice 6 depend on this semantic point? YES — indirectly, through Decision C.** Slice 6's `requestRevision` command is documented (Architecture §3, ISSUE-07's resolution) as calling into `EditPlanEngine.createEditPlan(revisionOf, reviewFeedback)` — the exact same command Contract v1 §5 governs. If a human, during a Slice 6 revision loop, requests a revision against an `EditVersion` whose underlying `EditPlan` has, in the interim, gone stale (per Decision D's scenario), the resulting `createEditPlan(revisionOf=stale_plan, ...)` call is governed by exactly the Contract v1 §5 / ADR-022-gap rule: revising it is permitted (EDITING/REVISION), but nothing about that revision permission extends to letting the *resulting new plan* skip its own fresh provenance check before any subsequent `generateRoughCut`. Slice 6 therefore inherits this exact rule as a live operational dependency, not merely a historical curiosity — but does not need the ADR-022 text itself corrected to function correctly, since the implementation (`209_EditPlanEngine.js`) already follows the Contract v1 §5 ruling regardless of what ADR-022's own prose currently says. The gap is a **documentation-completeness risk** (a future reader of ADR-022 alone, without Contract v1, would not learn this rule), not a **behavioral** risk to Slice 6.

---

## 15. Final Human Decision Checklist

DECISION 1:
What identity, linkage, and mutability model should govern the `Review` entity?

OPTION A:
Single mutable `Review` record per `EditVersion`, with per-clip findings as an embedded array field, updated in place across revision rounds. (OPTION A1)

OPTION B:
Append-only, versioned `Review` — one new immutable record per review round, linked to the `EditVersion` it reviews, mirroring `EditPlan`'s existing `supersedes_version` pattern. (OPTION A2)

OPTION C:
Same as Option B, plus a separate child entity (`ReviewItem`/`Finding`) recording each individual per-clip decision as its own row. (OPTION A3)

---

DECISION 2:
Is the Final Approval gate (`FINAL_REVIEW → FINAL_APPROVED`) part of Slice 6's implementation scope, or deferred to a later phase/slice?

OPTION A:
Slice 6 implements the full EditVersion Review Lifecycle, including Final Approval, now. (OPTION B1)

OPTION B:
Slice 6 implements Rough Cut Review only (`submitForReview`, `requestRevision`, the `HUMAN_REVIEW ⇄ REVISION_REQUESTED/AI_REVISION` loop); Final Approval is built in a later slice/phase. (OPTION B2)

OPTION C:
Slice 6 implements the full lifecycle including Final Approval now, treating "Final Approval polish" (deferred per ADR-014/§17) as referring only to what happens *after* `FINAL_APPROVED` (Publication integration), not the gate transition itself. (OPTION B3)

---

DECISION 3:
Should the AI Revision Loop have a maximum iteration count, and if so, what does it count?

OPTION A:
No maximum — the loop is unbounded; iteration count is tracked for visibility only, never enforced. (CANDIDATE C4)

OPTION B:
A maximum exists, counted per `EditPlan` lineage (the whole chain of revisions back to the original plan for one editing effort). (CANDIDATE C1)

OPTION C:
A maximum exists, counted per `EditVersion`/`Review` round (resets each time a wholly new rough cut is generated). (CANDIDATE C2)

OPTION D:
A maximum exists, counted per `EditProject` (every `EditPlan` version ever created for the whole Concept, across any lineage). (CANDIDATE C3)

*(If Option B, C, or D is chosen, the specific numeric maximum is a separate follow-up decision, not covered here.)*

---

DECISION 4:
Should an approval-freshness/invalidation mechanism be built for `EditVersion`/`Review` in Slice 6 (contingent on Decision 2 including Final Approval)?

OPTION A:
No mechanism — an approval, once granted, is never re-checked against upstream drift. (MODEL D1)

OPTION B:
Extend ADR-022's identity-comparison approach: record the `EditPlan`'s provenance-verified state at approval time; re-check it before treating the approval as currently authorizing anything downstream. (MODEL D2)

OPTION C:
Introduce an ADR-015-style orthogonal validity flag (`approval_valid` / `invalidation_reason` / `invalidated_at`) attached to the approval, flipped on an explicit trigger rather than always recomputed fresh. (MODEL D3)

OPTION D:
Not applicable — defer this entire question, because Decision 2 excluded Final Approval from Slice 6 (Option B in Decision 2).

---

DECISION 5:
Should ReviewEngine's state machine include a true terminal `REJECTED` state, distinct from `REVISION_REQUESTED`?

OPTION A:
Yes — add a `REJECTED` terminal state (abandon this EditVersion/branch entirely, no further revision expected).

OPTION B:
No — every non-approval outcome continues to route through `REVISION_REQUESTED` only, as AI Production Contract §G's current diagram already shows; Architecture §14's mention of `REJECTED` is treated as not applicable to ReviewEngine.

---

DECISION 6 (governance-synchronization, not a Slice 6 blocker per se):
Should the Contract v1 §5 ruling ("revising a stale/unverifiable EditPlan is EDITING/REVISION, not EXECUTED-class") now be written into ADR-022's own text, using the same formal write-in process used to adopt ADR-022 originally?

OPTION A:
Yes — authorize a formal ADR-022 write-in, following the same rigor as its original adoption.

OPTION B:
No — leave ADR-022 as currently written; the rule continues to live only in Contract v1 §5 and in the implementation's own inline documentation.

---

## Files created:
- 32_ContentVideoOS_Slice6_Decision_Gate.md

## Files modified:
- NONE

## Production code modified:
- NONE

## Tests modified:
- NONE

## Governance / ADR modified:
- NONE

## Slice 6 implementation:
- NOT AUTHORIZED
