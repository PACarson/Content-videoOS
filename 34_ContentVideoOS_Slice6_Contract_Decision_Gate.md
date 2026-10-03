# CVOS Slice 6 Contract Decision Gate

**Nature of this document:** READ / ANALYZE / DOCUMENT ONLY. No code, test, ADR, package, fixture, or runtime change is made in this task. This gate converts the 12 Open Decisions in `CVOS_Slice6_Implementation_Contract_v1.md` into an explicit, evidence-backed human decision package. No open decision is resolved here.

---

## 4. Current Governance Status

- Slice 5 = **CLOSED**
- Slice 5 baseline = **82-file integrated package**
- Slice 5 tests = **143/143**
- Slice 6 Readiness Gate (`31_`) = **NOT READY**
- Slice 6 Decision Gate (`32_`) = **RESOLVED** (converted into human decisions)
- Slice 6 Decision Record (`33_`) = six decisions **APPROVED**, all non-selected alternatives retained
- Slice 6 Implementation Contract v1 (`CVOS_Slice6_Implementation_Contract_v1.md`) = **DRAFT / NOT IMPLEMENTATION-AUTHORIZED**
- Slice 6 implementation authorization = **NOT GRANTED**

Nothing in this document implies Slice 6 is authorized. This gate exists to move the Contract's 12 Open Decisions to a state where the human owner can decide them, nothing more.

---

## 5. Approved Decisions That Must Not Be Reopened

Re-verified against `33_` and `CVOS_Slice6_Implementation_Contract_v1.md` in this pass; no contradiction found in either document or in re-checked source (`src/113_EditVersion.js`, `src/209_EditPlanEngine.js`, `src/210_EditEngine.js`, `00_ContentVideoOS_Architecture_Governance_v0.1.md` §3/§15/§17, `00_ContentVideoOS_AI_Production_Contract.md` §F/§G/§J). All six are treated as locked.

- **D-A** — Review model = **A2**, append-only, versioned Review; one immutable record per review round, linked to an `EditVersion`. A1/A3 are not reopened as live choices here. The field-level schema within A2's shape is what OD-R7 (and its dependents OD-R8–R10, R12) still resolve.
- **D-B** — Slice 6 scope = **B2**, Rough Cut Review only. Final Approval is deferred. No `FINAL_APPROVED` or `FINAL_REVIEW` state is introduced anywhere in this document.
- **D-C** — Revision loop scope = **C1**, counted per `EditPlan` lineage (`supersedes_version` chain). The numeric maximum and enforcement mechanics remain OPEN (OD-R1–R4).
- **D-D** — Approval freshness = **Deferred**, tied to the future Final Approval scope. Not resolved as D1 ("no mechanism ever") anywhere below.
- **D-E** — REJECTED state = **E2**, not introduced. No decision below reintroduces a terminal `REJECTED` state.
- **D-6** — ADR-022 synchronization = **Approved**, as a separate governance task, not performed here or in any document to date.

---

## 6. The 12 Open Decisions

### Group A — Review / EditVersion Data Model

#### OD-R7 — Review Field-Level Schema

**Evidence:** Architecture §2 Domain Model: "Review — 1 per EditVersion review round" (cardinality only). AI Production Contract §G defines the per-clip decision vocabulary (`KEEP`/`REMOVE`/`REPLACE`/`CHANGE_ORDER`/`CHANGE_CAMERA`/`CHANGE_B-ROLL`/`CHANGE_MUSIC`/`CHANGE_CAPTION`/`CHANGE_HOOK`/`CHANGE_DURATION`/`CHANGE_PACING`) and the state machine (`HUMAN_REVIEW ⇄ REVISION_REQUESTED/AI_REVISION → FINAL_REVIEW → FINAL_APPROVED`, of which only the Rough-Cut-Review portion is in scope per D-B). No document anywhere in the corpus defines a field-level record shape for `Review`. Re-confirmed by direct grep across the Product Understanding Report, Architecture doc, and AI Production Contract in this pass: zero occurrences of a `Review` schema.

**Known constraint:** D-A already fixes the entity as append-only, versioned by round, linked to one `EditVersion`. What remains undecided is everything inside that shape.

**What remains undecided:** Review identity (field name/type); `EditVersion` linkage field; review round identity (see OD-R10, a distinct decision, cross-referenced not duplicated); lifecycle/status representation; timestamps; how a human's aggregate decision is recorded; findings linkage (see OD-R9, cross-referenced); revision linkage (how this round connects to any resulting `EditPlan` revision); any other minimum field.

**Candidate options** (none selected):

- **OPTION A — Minimal Review record.** Only what is structurally required by D-A: an identity field, an `EditVersion` linkage field, a round marker, and a findings container. No status field, no reviewer field, no timestamp beyond what persistence infrastructure already provides implicitly (e.g., via `storage.append`'s own bookkeeping, if any). Smallest possible surface area; leaves lifecycle/status entirely to be derived from the findings themselves (e.g., "all `KEEP`" is computed on read, not stored).
- **OPTION B — Review record with explicit round metadata.** Adds an explicit `round` (or `supersedes_review_id`-style) field, an explicit `status` field carrying the Rough-Cut-Review-scoped lifecycle value, and an explicit timestamp. Makes round identity and lifecycle state queryable directly rather than derived, at the cost of two fields whose values must be kept consistent with the underlying findings/history.
- **OPTION C — Review record designed for richer auditability.** Adds, beyond Option B, a reviewer-identity field (contingent on OD-R8), a revision-linkage field (an explicit pointer to whatever `EditPlan` revision resulted from this round, if any, once OD-R5 is decided), and richer per-finding structure (contingent on OD-R9). This option's exact shape cannot be finalized independently of OD-R8, R9, and R5 — it is presented as a direction, not a concrete schema.

**Distinguishing what's required vs. optional:**
- *Required by current architecture:* an `EditVersion` linkage (Domain Model §2's cardinality statement requires this at minimum) and some representation of the per-clip decision vocabulary already governed by AI Production Contract §G (the vocabulary values themselves are fixed; how they're stored is not).
- *Required by D-A specifically:* an identity that supports "one immutable record per round" — i.e., something that lets round N and round N+1 be told apart and both remain readable.
- *Useful but optional:* reviewer identity, explicit status field, revision-linkage field — none is structurally forced by D-A or by any frozen architecture document.
- *Future Final Approval concern, not Slice 6's:* any field that would represent Final-Approval-level lifecycle state (`FINAL_REVIEW`, `FINAL_APPROVED`) is out of scope per D-B and must not appear in whatever schema is chosen here.

---

#### OD-R8 — Reviewer Identity

**Evidence:** No document in the corpus (Architecture, AI Production Contract, Product Understanding Report, any numbered gate/report `01_`–`33_`) names a `reviewer_id`, user account concept, or any identity infrastructure for a human operator. Every prior slice (`ProductionPlanEngine`'s `authorizeProductionGo`, `EditPlanEngine`'s human-authorized `createEditPlan` calls, `EditEngine`'s human-triggered `generateRoughCut`) treats "the human" as an implicit, singular, undifferentiated actor — no command in any Slice 1–5 source file takes an operator/user identifier as a parameter.

**Candidate directions** (none selected):

- **Required reviewer identifier.** Every `Review` record carries a mandatory field identifying who reviewed. Improves auditability (who approved/rejected what) and is necessary groundwork if CVOS ever becomes multi-operator. Cost: introduces an identity concept that does not exist anywhere else in the system today — nothing currently produces or validates such an identifier, so this option would require inventing an identity source, not just a field.
- **Optional reviewer identifier.** Field exists but may be null/absent. Lower cost than "required," but creates an inconsistent audit trail (some rounds attributable, others not) and defers rather than resolves the identity-source question.
- **Operator identity only** (a fixed, single, system-wide "the operator" concept, not a per-person identifier). Matches CVOS's current implicit single-operator assumption exactly; adds no new infrastructure; provides no differentiation if multiple people ever use the same CVOS instance.
- **Platform/account identity** (tied to whatever runtime eventually authenticates users — e.g., a Google account under the GAS/Sheets/Drive runtime named in ADR-016). This is the only option that would plausibly integrate with the actual Phase-1 runtime baseline, but ADR-019 has the real GAS/Sheets/Drive runtime as globally `BLOCKED` in this development environment (re-confirmed: `31_`'s §11 and the underlying two Runtime Verification Gates found sandbox access to `script.google.com`/`sheets.googleapis.com`/`drive.google.com` returns HTTP 403 `host_not_allowed`) — so this option's actual identity source cannot be exercised or tested in the current environment, only stubbed.
- **No identity field in Slice 6.** Consistent with every prior slice's implicit-single-operator treatment; simplest; explicitly defers the multi-user question entirely, the same way `EditProject` deferred a speculative lifecycle field until evidence required one (`CVOS_Slice5_Implementation_Contract_v1.md` §1 precedent).

**Discussion:**
- *Auditability:* higher with a required identifier; CVOS-P6/P7's emphasis on preserving "who decided what" as history is compatible with wanting reviewer identity, but no document elevates this to a requirement for Slice 6 specifically.
- *Multi-user future readiness:* only the "required identifier" and "platform/account identity" options position the system for a future multi-operator CVOS; the others would require a schema migration later if that need materializes.
- *Privacy/minimality:* "no identity field" and "operator identity only" are the most minimal; a required per-person identifier is the most information-carrying and would need its own handling if CVOS ever stores anything privacy-sensitive about reviewers (not currently a concern named in any document).
- *Current runtime reality:* re-confirmed in this pass — **the current CVOS runtime has no stable identity source at all.** Real GAS/Sheets/Drive integration remains `BLOCKED` (ADR-019); the local/Node test harness used through Slice 1–5 has no user/session concept whatsoever. Any option beyond "no identity field" or "operator identity only" would be speculative relative to what the runtime can actually supply today.

---

#### OD-R9 — Findings Representation

**Evidence:** AI Production Contract §G's per-clip vocabulary table is the only governed content here; no persisted shape is specified. Decision Record `33_` explicitly retained OPTION A3 (separate `ReviewItem`/`Finding` entity) as a non-selected alternative to D-A's A2, precisely because the Implementation Contract's §10/§13 identified this as still open within A2's own shape (a `findings[]` field's internal structure was left undecided even after A2 was chosen at the entity level).

**Candidate models** (none selected):

- **Embedded findings inside Review** (a `findings[]` array field on the single `Review` record for that round). Matches A2 directly — no second entity. Simplest persistence; findings for one round are read/written atomically with the round itself.
- **Separate `ReviewItem`/`Finding` entity** (one row per per-clip decision, referencing the parent `Review`). This would partially reopen toward A3's shape even while keeping `Review` itself as the round-level A2 entity — i.e., A2-for-Review plus a child entity purely for findings is a hybrid not explicitly named in `32_`'s three original candidates, but is a logically available combination of A2 (round-level immutability) with A3's granularity (finding-level rows). Higher auditability and queryability (e.g., "show me every `REMOVE` decision across all rounds for this `EditPlan` lineage"), at the cost of a second new entity.
- **Structured array** (a typed, schema-validated array field, e.g., each element requiring `{clip_ref, action}` at minimum) versus **free-form notes plus structured decision** (a mandatory `action` value from the governed vocabulary, plus an optional free-text `comment`, with no other structure imposed). The structured-array approach is easier to test and query deterministically; the free-form approach is more flexible for human reviewers who may want to leave nuanced feedback beyond the fixed vocabulary, but is harder to assert deterministic outcomes against in tests.
- **Minimal decision-only Review** (no per-clip granularity at all — a single aggregate decision per round: e.g., "approve" or "request revision," with the "why" left entirely to prose/`comment`, never itemized per clip). This is the least granular option and arguably under-uses the vocabulary AI Production Contract §G already defines, but is the cheapest to implement and test.

**Trade-off discussion:**
- *Auditability:* highest with a separate `ReviewItem` entity; lowest with "minimal decision-only."
- *Schema complexity:* lowest with "minimal decision-only" or "embedded structured array"; highest with a separate child entity.
- *Queryability:* a separate entity supports direct per-clip queries; an embedded array requires reading and filtering the parent `Review` record; "minimal decision-only" supports no per-clip queries at all.
- *Immutability:* all candidates are equally compatible with A2's round-level immutability, since none of them proposes mutating a `Review` (or its findings) after creation — the choice here is about internal shape, not about whether the containing record is append-only.
- *Future Final Approval needs:* out of scope for this decision per D-B, but worth noting that if Final Approval is ever built as a separate future slice, a richer findings model (separate entity, structured array) would likely be easier to extend than "minimal decision-only," since the latter would need retrofitting to support per-clip detail if that later becomes a requirement.
- *Slice 6 minimum scope:* AI Production Contract §G's aggregation rule ("if every decision is `KEEP`, the version moves to `FINAL_REVIEW`") presupposes *some* per-clip granularity exists to aggregate over — this weighs against "minimal decision-only" as a candidate that could satisfy the letter of §G's existing rule, though it is not this document's place to select among the remaining options on that basis.

---

#### OD-R10 — Review Round Identity

**Evidence:** Domain Model §2's "1 per EditVersion review round" phrasing implies multiple rounds are possible per `EditVersion`, but defines no identity mechanism for telling rounds apart. `EditPlan`'s own precedent (`version` integer + `supersedes_version` pointer, `src/112_EditPlan.js`, re-verified) is the closest analogous mechanism in the existing codebase, but AI Production Contract/Architecture never states that `Review` must follow the same pattern.

**Candidate mechanisms** (none selected):

- **Explicit `review_round` field** (an integer, incremented per round for a given `EditVersion`) — directly queryable, requires the writer to compute "what's the next round number" correctly (a small but real correctness burden, comparable to how `EditPlanEngine.createEditPlan` already computes the next `version` for a lineage).
- **Sequential Review version number** — functionally similar to the above, differing only in naming/framing (a `Review`-scoped `version` rather than a `round`); the distinction is largely nominal unless a future decision gives "round" and "version" different meanings (e.g., "round" tracks human review cycles while "version" tracks something else).
- **Unique Review ID plus chronological ordering** — no explicit round-number field at all; round identity is derived purely from `created_at` (or an equivalent monotonic marker) ordering among all `Review` records for one `EditVersion`. Avoids a computed-field correctness burden at write time, at the cost of needing a defined tie-breaking rule if two records could ever share a timestamp (unlikely under a single-writer model, but not ruled out by anything decided so far).
- **Linkage through previous Review** (a `supersedes_review_id`/`previous_review_id` pointer, directly mirroring `EditPlan.supersedes_version`'s reference-based pattern rather than a version *number*). Makes the round sequence traceable as a linked chain rather than a counted sequence; round "number" would then be derivable by walking the chain rather than stored directly.
- **Another deterministic identity mechanism** — not otherwise specified; retained as a category in case repository evidence during actual implementation surfaces a better fit than the four above.

**Interaction with other concerns:**
- *A2 append-only Review:* all five candidates are compatible with append-only rounds; none requires mutating a prior round's record.
- *EditVersion:* round identity is scoped per `EditVersion` (per Domain Model §2's own phrasing), so whichever mechanism is chosen must be computed/interpreted relative to one specific `EditVersion`'s set of `Review` records, not globally.
- *`requestRevision`:* the round that triggers a `requestRevision` outcome is the round whose record this identity mechanism must uniquely pick out — this matters for OD-R5 (chaining), since whatever downstream `createEditPlan` call results needs to be traceable back to the specific round that requested it, if OD-R7's "revision linkage" field (Option C) is chosen.
- *Future revision cycles:* if OD-R6 results in automatic new-`EditVersion` generation per revision, round identity for the *new* `EditVersion` restarts independently (each `EditVersion` has its own round sequence, per Domain Model §2's "per EditVersion" phrasing) — this is a structural consequence of the cardinality statement already governed, not a new decision.
- *Testability:* a numeric field (round or version) is the easiest to assert deterministically in a test ("the second call produces round 2"); pure chronological ordering requires either mocking time or asserting relative order rather than absolute values.
- *Two-process persistence:* any of the five candidates must survive a fresh-process reload correctly ordering/identifying rounds — this is a testable property regardless of which mechanism is chosen, but the exact assertions differ (a stored round number is a direct equality check; chronological ordering requires a comparison-based check).

**Concept separation, explicit:** review round identity is **not** the same concept as `EditPlan` version, `EditVersion` identity, or the OD-R2 "revision iteration" counting unit. A single review round could, depending on OD-R5/OD-R6, correspond to zero, one, or (in principle, if some future design allowed it) more than one `EditPlan`/`EditVersion` generation event — these remain four independently-identified concepts unless a future decision explicitly merges any of them.

---

#### OD-R11 — EditVersion Current Marker

**Evidence, re-verified directly against source in this pass:** `src/113_EditVersion.js`'s actual shape is exactly `{ id, edit_plan_id, manifest, generated_at }` — no `version`, no `supersedes`, no `status`, no `current`/`latest` marker of any kind. `EditEngine.getAllForPlan(editPlanId)` (`src/210_EditEngine.js`) returns every `EditVersion` ever generated for a given `EditPlan`, with no indication of which, if any, is "the one currently under review" or "the most recent." Multiple `EditVersion`s can coexist for one `EditPlan` today with no ambiguity at the storage level (each has its own `id`), but with no system-level concept of "current" at all.

**The question:** does Slice 6 need an explicit mechanism to identify the `EditVersion` currently subject to Review, or is direct-by-`id` reference (which a `Review` record would carry regardless, per OD-R7) already sufficient?

**Candidate directions** (none selected):

- **OPTION A — No stored current marker; `Review` explicitly references a specific `EditVersion` ID.** Under this option, "which `EditVersion` is under review" is simply whatever `edit_version_id` a given `Review` record points to (OD-R7's linkage field) — there is no separate, independently-maintained notion of "the current one" anywhere on `EditVersion` itself. If two `EditVersion`s exist for one `EditPlan`, both remain independently reviewable (or not) purely based on which one a `Review` record happens to reference; nothing prevents (or needs to prevent) two different `Review` chains existing for two different `EditVersion`s of the same `EditPlan` under this option.
- **OPTION B — Add a deterministic current/latest mechanism** (e.g., a computed rule such as "the `EditVersion` with the latest `generated_at` for a given `edit_plan_id` is current," or an explicit stored pointer on `EditPlan` naming its current `EditVersion`). This would give the system an unambiguous single answer to "what should a human be reviewing right now for this `EditPlan`," which A doesn't provide by itself if multiple `EditVersion`s exist un-referenced by any `Review`.
- **OPTION C — Add explicit lifecycle/status semantics to `EditVersion`** (e.g., a `status` field distinguishing "generated, not yet reviewed" / "under review" / "superseded by a newer EditVersion"). This is a heavier change than B — B only orders/selects among existing immutable records, while C would introduce a semantic state machine onto an entity (`EditVersion`) that today has none at all.

**Classification, per the task's explicit instruction to address this:**
- OPTION A is **not a Slice-6-required change** and **not an architectural change** — it requires nothing beyond what OD-R7 already needs to decide (a linkage field on `Review`). It is the option under which `EditVersion` itself remains exactly as Slice 5 left it, completely untouched.
- OPTION B, if chosen, would be a **Slice-6-scoped addition** at minimum (something Slice 6 would need, to know which of several `EditVersion`s a human should be shown), but touches an entity (`EditVersion`) that Slice 5 already closed and tested at 143/143 — any change to `EditVersion`'s shape, even an additive one, is a modification to a closed slice's own entity and would need to be evaluated against Slice 5's own immutability/regression discipline (§14 below).
- OPTION C would be the most **architecturally significant** of the three — introducing a status/lifecycle concept to `EditVersion` for the first time is a materially bigger change than B's simple selection rule, and risks (per the task's explicit caution) blurring into lifecycle territory that overlaps with what `Review`/Rough-Cut-Review-completion is supposed to represent (see OD-R12 immediately below, which raises the same blurring risk from the other direction).

**Explicit caution, as instructed:** this document does not introduce a "current" marker merely because it would be convenient for a future UI to show "the current rough cut." Whether Option A's direct-reference approach is actually sufficient for Slice 6's real Rough Cut Review workflow, or whether B/C's added mechanism is genuinely required, depends on a product-level question (can more than one `EditVersion` legitimately be "live" for review at once, or is that always an error state?) that no document in the corpus answers. That question is left to the human decision, not inferred here.

---

#### OD-R12 — Rough Cut Review Approval-Like Field

**Evidence:** Architecture §3's ReviewEngine invariant: "`FINAL_APPROVED` is terminal for that EditVersion's own content." AI Production Contract §G's aggregation rule: "if every decision is `KEEP`, the version moves to `FINAL_REVIEW`." Both of these describe transitions that, per D-B, are **out of Slice 6's scope** (`FINAL_REVIEW`/`FINAL_APPROVED` are Final-Approval-lifecycle states). But AI Production Contract §G's diagram places `HUMAN_REVIEW → FINAL_REVIEW` (the all-`KEEP` outcome) as the very next step *after* the Rough-Cut-Review portion that Slice 6 does implement — meaning Slice 6's own state machine (§5 of the Implementation Contract: `HUMAN_REVIEW`, `REVISION_REQUESTED`, `AI_REVISION`) must have *some* way of representing "this round's outcome was: no revision needed" even though the *next* state (`FINAL_REVIEW`) is explicitly out of scope.

**The five concepts to keep distinct, per the task's explicit instruction:**
1. **Human review feedback** — the per-clip findings themselves (OD-R9).
2. **Revision request** — the `REVISION_REQUESTED` outcome, already a governed state within Slice 6's scope.
3. **Rough Cut Review completion** — the fact that a round concluded with no revision requested (the all-`KEEP` case) — this is the concept OD-R12 is actually about.
4. **Final Approval** — `FINAL_REVIEW`/`FINAL_APPROVED` — explicitly deferred, out of scope (D-B).
5. **Publication Authorization** — a separate, later gate, out of scope regardless of D-B (owned by `PublicationEngine`, Phase 2).

**Candidate options** (none selected):

- **OPTION A — Review records only findings/decision; no approval-like field on `EditVersion` at all.** Under this option, "Rough Cut Review completion" (concept 3) is represented purely as a property of the `Review` record itself (e.g., derivable from its findings being all-`KEEP`, or from whatever OD-R7 status field, if any, is chosen) — `EditVersion` gains no field of any kind. This keeps `EditVersion` exactly as Slice 5 left it (consistent with OD-R11 Option A's minimalism) and avoids any risk of an `EditVersion`-level field being mistaken for a Final Approval marker.
- **OPTION B — Review has a review-level decision/status field, but `EditVersion` itself has no approval state.** Similar to A, but makes concept 3 explicit and directly queryable on the `Review` record (e.g., a `status` value meaning "clean — no revision requested," distinct from `REVISION_REQUESTED`) rather than purely derived from findings content. Still does not touch `EditVersion`.
- **OPTION C — `EditVersion` receives a Slice-6 lifecycle field** (e.g., something like `review_status` or `reviewed: true/false` on `EditVersion` itself, updated once a `Review` round concludes cleanly). This is the option the task flags as carrying real risk.

**Explicit risk identification for OPTION C, as required:** any field added to `EditVersion` that captures "this rough cut passed review" sits one short conceptual step from being read — by a future implementer, or by whoever eventually builds Final Approval/Publication — as a stand-in for approval. Even if named carefully (e.g., avoiding the word "approved"), a boolean or status field on `EditVersion` meaning "review concluded cleanly" is functionally adjacent to what Final Approval's own `approval_status` (named but never implemented, per AI Production Contract §F) would eventually need to represent. Choosing OPTION C would require an explicit, written safeguard (e.g., a naming convention and a test asserting the field is never conflated with `FINAL_APPROVED` in downstream logic) to avoid Slice 6 accidentally becoming a de facto substitute for the Final Approval gate that D-B just deferred. This document does not propose that safeguard's exact form — it only names the risk, per instruction, so the human decision-maker can weigh it explicitly rather than discover it after the fact.

---

## 7. Group B — Revision Loop Limit

All four items below operate strictly under the already-approved D-C (`revision scope = EditPlan lineage`, via `supersedes_version`). C1 itself is not reopened; C2/C3/C4 remain retained alternatives in `33_` §13 only, not live choices here.

#### OD-R1 — Numeric Maximum

**Evidence:** AI Production Contract §J poses this as an open question with no candidate number anywhere in any document. `27_`'s ISSUE-08 confirms the question is real and assigned to Slice 6, again with no number attached. No document — including this one — has evidence sufficient to responsibly propose a specific figure.

**What would be needed to choose responsibly, stated rather than guessed:** actual usage data or an explicit product judgment about how many AI-assisted revision attempts a human is expected to tolerate before the workflow should force a different kind of intervention (per §J's own framing, "requiring the human to edit outside the system entirely"). None of the numbered gates/reports in this corpus record any such data, because Slice 6 has not yet been used by anyone.

**Discussion of plausible ranges, without selecting one:**
- *Small cap (e.g., low single digits).* Would force human escalation quickly; minimizes the risk named in §J (an unbounded loop) most aggressively; risks being reached during entirely ordinary, non-runaway editing work if a human simply wants several rounds of ordinary refinement.
- *Moderate cap (e.g., high single digits to low double digits).* Balances the two concerns above; still arbitrary without usage evidence.
- *Larger cap (e.g., several dozen).* Functions closer to "effectively unlimited for normal use, but still catches a genuinely runaway loop"; provides less protection against the specific failure mode §J worries about if a real degenerate loop could plausibly reach even a large number quickly (e.g., an automated `AI_REVISION` step looping without human pacing).
- *Unlimited / no enforced cap.* Directly available as CANDIDATE C4 in `32_`/`33_` (retained, not reopened as the *scope* decision, since D-C already fixed scope to "per lineage" — but "no cap" remains available as an answer to *this specific* sub-question, OD-R1, independent of D-C's scope framing: a lineage-scoped cap of literally "no maximum" is a coherent combination, not a contradiction of D-C).

**This document does not select a value.** Per instruction, this is stated as insufficiently evidenced for this gate to resolve, and is left entirely to the human decision.

---

#### OD-R2 — Counting Event

**Evidence:** `32_`'s Decision C analysis and `CVOS_Slice6_Implementation_Contract_v1.md` §6 both flag that `RevisionRequested` events, new `EditPlan` versions, new `EditVersion`s, and completed `Review` rounds are not guaranteed to produce the same count, depending on how OD-R5/OD-R6 chaining is eventually decided.

**Candidate units** (none selected): a `RevisionRequested` event firing; a new `EditPlan` version being created (`createEditPlan(revisionOf=...)` succeeding); a new `EditVersion` being generated (`generateRoughCut` succeeding); a `Review` round completing with a "request revision" outcome.

**Worked examples showing these are not interchangeable**, assuming (hypothetically, not as any decision) that `requestRevision` does *not* automatically chain into `createEditPlan` (one candidate answer to OD-R5, not selected here):

```
Round 1: human requests revision  → RevisionRequested fires   (count=1 if counting events)
         (human separately triggers createEditPlan later)      → EditPlan v2 created (count=1 if counting plan versions — same moment, different unit)
Round 1 (retry): human requests revision again before
         createEditPlan is ever called for v2               → RevisionRequested fires again (count=2 if counting events)
                                                                → but EditPlan version count is still only 1, since no new plan was created between the two requests
```

Under "count `RevisionRequested` events," the above sequence already shows 2; under "count new `EditPlan` versions," it shows 1. Which is "the" revision count is exactly what OD-R2 must decide, and the answer materially changes what OD-R1's eventual number would even be counting.

**Explicit non-conflation, as instructed:** revision count (OD-R2's unit) is not the same concept as `EditPlan` version number (an existing, already-governed field), `Review` round number (OD-R10), or total `EditVersion` count for a plan (a simple `getAllForPlan(...).length`, already computable today). All four are distinct, independently meaningful numbers unless a future decision explicitly declares two of them identical.

---

#### OD-R3 — Enforcement Point

**Evidence:** `CVOS_Slice6_Implementation_Contract_v1.md` §6 (OD-R3) names candidate locations without selecting one; no document commits to a specific engine boundary for this check.

**Candidate points** (none selected): inside `ReviewEngine.requestRevision` (checked before the human's revision request is even recorded); before `EditPlanEngine.createEditPlan` is invoked (checked at the moment a new plan would actually be created, regardless of what triggered that call); before `EditEngine.generateRoughCut` is invoked (checked one step further downstream, at rough-cut generation time rather than plan-creation time); at `Review` submission itself (checked even earlier, before a human's decision is finalized, which would be unusual since the cap is about *AI* revision attempts, not human review submissions per se — retained as a logical possibility, not a natural fit); another deterministic command boundary not yet named.

**Discussion, per instruction:**
- *What operation is blocked:* depends entirely on the chosen point — blocking at `requestRevision` prevents the human's revision request from being recorded at all past the cap; blocking at `createEditPlan` would still let a `Review` record itself exist (recording "revision requested") while refusing to generate the next plan version; blocking at `generateRoughCut` would allow an (N+1)th `EditPlan` to exist without ever being turned into a reviewable `EditVersion`.
- *Whether a Review can still be recorded past the cap:* only under the `createEditPlan`- or `generateRoughCut`-enforcement points, not under a `requestRevision`-enforcement point (which would need to reject the request before any `Review` round is finalized).
- *Whether the user can explicitly override:* a separate question from *where* enforcement sits — an override mechanism (see OD-R4) could in principle be layered onto any of these points, but the enforcement point determines what exactly the override would need to unblock.
- *Whether enforcement is hard or advisory:* also logically separate from *where* it sits (see OD-R4) — this decision (OD-R3) only fixes the location, not the severity of what happens there.
- *How stale/unverifiable states interact with it:* if the (N+1)th `createEditPlan` call would itself be targeting a stale/unverifiable source plan, ADR-022's existing rule (revising is EDITING/REVISION, permitted) and this cap's enforcement are independent checks that could both apply to the same call — nothing in any document establishes an ordering or precedence between them, and this is flagged as an interaction to be explicitly designed once both OD-R3 and the enforcement mechanics are chosen, not resolved here.

---

#### OD-R4 — Cap Behavior

**Evidence:** AI Production Contract §J's own phrasing — "requiring the human to edit outside the system entirely" — is the only textual hint at intended behavior, and it points toward some form of forced escalation rather than either silent continuation or silent blocking, but stops short of specifying a mechanism.

**Candidate behaviors** (none selected): a hard stop requiring human intervention (the system refuses to proceed further via the enforcement point chosen in OD-R3, and requires some explicit human action — undefined — to unblock); a warning that does not block (the cap is informational only, and the operation proceeds regardless — this option, taken to its limit, converges toward "no enforced cap," OD-R1's "unlimited" candidate, though warning-without-blocking and "no cap at all" are not identical if the warning itself is a persisted/visible artifact); an explicit override mechanism (the hard stop can be bypassed by a specific, deliberate human action, distinct from simply continuing to click "request revision" — the exact shape of such an override is undefined); a termination of the revision loop entirely (rather than a "stop and wait," the system could mark the lineage as closed to further AI-assisted revision, forcing any further work to happen "outside the system," per §J's literal words, with no path back in for that lineage).

**Human authority, kept explicit as instructed:** none of these candidates permits an AI action to autonomously override a human-imposed (or human-approved) cap — whichever behavior is chosen, the cap's enforcement and any override of it must remain a human-authorized action, never something `AI_REVISION` or any other AI-driven step can bypass on its own. This principle is not itself an open question — it follows directly from CVOS-P7/P8 (human remains final authority) — but the *mechanism* implementing it is.

---

## 8. Group C — Revision Chaining

#### OD-R5 — requestRevision → createEditPlan

**Evidence:** Architecture §3 and `27_`'s ISSUE-07 resolution establish that `requestRevision` is *expected* to eventually result in a call to `EditPlanEngine.createEditPlan(revisionOf, reviewFeedback)` — the existing, tested Slice 5 seam — but no document states whether that call happens automatically, as part of the same command, or as a separate, later, independently-triggered step.

**Candidate models** (none selected):

- **OPTION A — `requestRevision` records the human decision only; a separate command starts the new EditPlan.** `ReviewEngine.requestRevision` writes the `Review` record (with its `REVISION_REQUESTED` outcome, per whatever OD-R7/R9 schema is chosen) and emits `RevisionRequested`, and stops there. Some later, separately-invoked action (a distinct command, possibly outside `ReviewEngine` entirely) is responsible for actually calling `createEditPlan`.
- **OPTION B — `requestRevision` deterministically creates the next EditPlan.** `ReviewEngine.requestRevision` itself calls `EditPlanEngine.createEditPlan(revisionOf, reviewFeedback)` synchronously, as part of handling the same command — a human's single action (submitting revision feedback) results immediately in a new `EditPlan` version existing.
- **OPTION C — `requestRevision` creates a revision-request record/event, and a separate deterministic orchestration step consumes it.** A middle ground between A and B: the `RevisionRequested` event (already governed, Architecture §4–5) is treated as the actual trigger, consumed by some orchestration logic (which may or may not live inside `ReviewEngine`) that then calls `createEditPlan` — decoupled in time and in code location from the original `requestRevision` call, but still automatic rather than requiring a distinct human-initiated command.

**Discussion for each option, per instruction:**
- *Authority boundary:* all three remain within the human-authorized zone established in §4/§11 below — the human's own `requestRevision` action is what ultimately causes the new plan, regardless of which option is chosen; the difference is purely about *when/how* that causation is wired, not *whether* it remains human-authorized.
- *Event semantics:* Option C most directly uses the existing `RevisionRequested` event as a genuine trigger (rather than as a side-effect notification only, which is closer to how B would use it); Option A leaves the event's consumer entirely undefined.
- *Retry/idempotency:* Option B's synchronous coupling means a failure partway through (e.g., `createEditPlan` throwing) must be handled as part of the same command's error path; Options A/C separate the two steps, which could make partial-failure states easier to reason about (a recorded `Review`/event with no resulting `EditPlan` yet is a valid, inspectable intermediate state) but also introduces the possibility of a `Review` existing with no corresponding revision ever actually happening if the separate step is never triggered.
- *User control:* Option A gives the human the most explicit control (two distinct actions, two distinct moments of intent); Option B gives the least explicit control (revision is chained automatically the instant feedback is submitted); Option C sits in between depending on how "automatic" the orchestration step actually is.
- *Testability:* Option B is simplest to test (one command, one deterministic outcome); Options A and C both require testing the two steps independently and, separately, testing that they compose correctly when both occur.
- *Failure handling:* covered under retry/idempotency above.
- *Relation to C1 revision cap:* whichever option is chosen materially affects OD-R2 (the counting event) and OD-R3 (the enforcement point) — e.g., Option B makes "count `RevisionRequested` events" and "count new `EditPlan` versions" equivalent by construction (since one always immediately causes the other), which would resolve part of OD-R2's worked-example ambiguity above; Options A/C would not.

---

#### OD-R6 — Automatic New EditVersion

**Evidence:** Same absence of governing text as OD-R5, one layer further downstream — no document states whether a newly created `EditPlan` revision automatically triggers `EditEngine.generateRoughCut`.

**Candidate models** (none selected):

- **OPTION A — New EditPlan only; EditVersion generation is explicit.** A revision produces a new `EditPlan` version (via whichever OD-R5 model is chosen) and stops there; a separate, later, explicitly-invoked action is required to call `generateRoughCut` and produce a new `EditVersion`. This mirrors the existing Slice 5 pattern exactly — Slice 5 itself never chains `createEditPlan` and `generateRoughCut` automatically (re-confirmed against `src/209_EditPlanEngine.js`/`src/210_EditEngine.js` in this pass).
- **OPTION B — New EditPlan automatically triggers `generateRoughCut`.** The revision flow produces both a new `EditPlan` version and a new `EditVersion` from it, in one continuous, automatic sequence, with no separate human or system action required in between.
- **OPTION C — Deterministic orchestration may trigger generation only after explicit authorization/command.** A middle ground: the system may be *capable* of automatically generating a new `EditVersion` once a new `EditPlan` exists, but only does so upon a distinct, explicit trigger (a command, a flag, or similar) rather than unconditionally — giving a future implementer or operator control over whether the automatic chaining actually fires in a given case.

**Explicit non-conflation, as instructed:** `EditPlan` creation and `EditVersion` generation are treated here as two distinct lifecycle steps, exactly as Slice 5 itself already treats them (they are two separate commands, on two separate engines, with `generateRoughCut` classified as the EXECUTED-class action per CVOS-P8/P9 while `createEditPlan` is classified as a Decision, per Contract v1 §3–5 — re-confirmed unchanged in this pass). None of the three candidate models above merges these into a single conceptual step; they differ only in whether the *second* step is triggered automatically by the *first*, manually, or conditionally.

**Respecting Slice 5 authority boundaries, as instructed:** whichever option is chosen, `generateRoughCut` remains an EXECUTED-class action (§10 below) — this decision does not, and must not, reclassify it as something else merely because it might now be triggered automatically as part of a revision flow rather than by a direct, separate human/system call. If OPTION B or C is chosen, whatever triggers the automatic call must itself satisfy CVOS-P9's re-validation requirement (the upstream `EditPlan`'s provenance must still be checked before `generateRoughCut` proceeds) exactly as it already does when `generateRoughCut` is called directly today — this is not a new requirement invented here, but an explicit reminder that automating the trigger does not exempt the call from existing, frozen governance.

---

## 9. Cross-Decision Dependencies

| Decision | Depends on | Can affect |
|---|---|---|
| OD-R7 | D-A | OD-R8, OD-R9, OD-R10, OD-R12, test design |
| OD-R8 | OD-R7 | auditability |
| OD-R9 | OD-R7 | persistence/test complexity |
| OD-R10 | OD-R7 | revision loop counting (OD-R2), review lifecycle |
| OD-R11 | OD-R7, OD-R10 | EditVersion lifecycle, whether a "current" concept exists for Review to bind against |
| OD-R12 | D-B, D-D, D-E | authority boundary (§11), risk of Final-Approval blurring |
| OD-R1 | D-C | OD-R2, OD-R3, OD-R4 |
| OD-R2 | D-C | OD-R1, OD-R3, OD-R4 |
| OD-R3 | OD-R1, OD-R2 | OD-R4 |
| OD-R4 | OD-R1, OD-R2, OD-R3 | user override semantics |
| OD-R5 | D-C | OD-R6, OD-R2 (whether RevisionRequested-count and EditPlan-version-count converge) |
| OD-R6 | OD-R5 | EditVersion generation/execution boundary, OD-R11 (whether multiple live EditVersions become common) |

**Additional dependency surfaced during this pass, not present in the task brief's initial list:** OD-R6 → OD-R11. If OPTION B or C of OD-R6 is chosen (automatic or conditionally-automatic new-`EditVersion` generation), multiple `EditVersion`s per `EditPlan` become the *normal*, expected case for any lineage with more than one revision round — which materially raises the practical stakes of OD-R11 (whether a "current" marker is needed), since under OD-R6-Option-A (fully manual generation) multiple live `EditVersion`s might be rarer and less urgent to disambiguate, while under OD-R6-Option-B they would exist after essentially every revision. This dependency is traced directly from re-reading OD-R6's and OD-R11's evidence side by side in this pass; it is not a new architectural direction, only a connection between two already-identified open items.

---

## 10. Important Concept Separation

- **EditPlan** — AI-generated creative/editing decision (CVOS-P8: Decision-class). Governed, closed, unmodified by Slice 6.
- **EditPlan version** — a specific point in an `EditPlan`'s lineage, identified by `version`/`supersedes_version`. Governed, closed, unmodified by Slice 6.
- **EditVersion** — the structured rough-cut execution artifact generated from an `EditPlan` (CVOS-P8/P9: Execution-class, via `generateRoughCut`). Governed, closed at the entity level (§8 of the Implementation Contract); OD-R11 asks only whether a *new*, additive concept ("current") is needed on top of it.
- **Review** — the immutable human review record for one review round against one `EditVersion` (D-A: A2). Not yet field-level specified (OD-R7 and dependents).
- **Review round** — a specific human review cycle within one `EditVersion`'s review history (OD-R10). Distinct from `EditPlan` version and from `EditVersion` identity.
- **Revision iteration** — the unit OD-R2 will define for enforcing the D-C/OD-R1 cap. Not automatically identical to `Review` round, `EditPlan` version, or `EditVersion` count — see OD-R2's worked example above for a case where these diverge.
- **Final Approval** — deferred (D-B); not Slice 6; not represented by any field this document proposes adding to `EditVersion` or `Review` (see OD-R12's risk discussion).
- **Publication Authorization** — Phase 2, `PublicationEngine`'s own gate; not Slice 6 regardless of how D-B/OD-R12 resolve.
- **Execution** — `generateRoughCut` remains an EXECUTED-class action (CVOS-P8/P9) under every candidate considered in OD-R6; none of the three options reclassifies it.

None of these six-plus-two concepts is merged with another anywhere in this document.

---

## 11. Authority Boundary

Restated, unmodified, from `31_`/`32_`/`33_`/the Implementation Contract, and re-confirmed against CVOS-P7/P8/P9 in this pass:

- AI may generate `EditPlan`s (Decision-class, CVOS-P8).
- AI may generate structured `EditVersion` manifests (Execution-class, CVOS-P8/P9).
- The human performs Rough Cut Review — entering per-clip findings is human authority, not an AI action, and is outside CVOS-P8's AI-only taxonomy.
- `Review` records the human's decisions; it does not itself constitute an AI recommendation, decision, or execution.
- Any aggregate transition derived from human review (e.g., "all `KEEP`" moving toward the next stage) must be deterministic and non-AI — a mechanical consequence of human input, never an independent AI judgment.
- Final Approval is deferred (D-B) — nothing in this gate's 12 decisions may be resolved in a way that quietly implements it.
- Publication Authorization is deferred — same caveat.
- AI must not self-approve its own work — no candidate considered anywhere in §6–8 above permits an AI-only path to a Review-completion or approval-like outcome without a human's own findings driving it.
- AI must not silently bypass revision caps — explicitly named as a constraint on OD-R4's candidates; no candidate there permits an autonomous AI override.
- AI must not silently regenerate stale/unverifiable artifacts as an autonomous side effect — this is unchanged, existing ADR-022/CVOS-P9 governance, and none of OD-R5/OD-R6's candidates proposes exempting an automatically-triggered `generateRoughCut` (should OD-R6-B/C be chosen) from the same provenance re-validation every `generateRoughCut` call already requires.

---

## 12. Immutability Requirements

- Old `EditPlan`s are not mutated — unaffected by anything in this gate; existing Slice 5 behavior, unchanged.
- Old `EditVersion`s are not silently overwritten — unaffected by OD-R11's candidates: even OPTION B/C (adding a "current"/status concept) would, if chosen, need to be implemented as an *additive* field or a *separate* selection mechanism, never as a rewrite of an existing `EditVersion` record's core content (`id`, `edit_plan_id`, `manifest`, `generated_at` must remain exactly as generated).
- `Review` records are append-only under A2 (D-A, locked) — every candidate considered for OD-R7 through OD-R10 preserves this; none proposes mutating a prior round's record.
- Historical human decisions remain readable — a direct consequence of A2's immutability, unaffected by which OD-R7/R9 schema is eventually chosen.
- Revision creates new versions/records rather than rewriting history — unaffected; this is existing, tested Slice 5 behavior for `EditPlan`, and is required (not merely preferred) for `Review` under D-A.

**Where an option under consideration would introduce mutable state, named explicitly:** OD-R11 OPTION B, if implemented as a *stored, updatable* "current" pointer on `EditPlan` (rather than a *computed* rule such as "latest `generated_at`"), would be the one place in this entire decision set where a field's value could legitimately change after being first written — e.g., "current `EditVersion`" being reassigned as new ones are generated. This is flagged explicitly, per instruction, rather than allowed to hide behind a name like "current": if OD-R11-B is chosen and implemented as a mutable pointer, it would be the first mutable field introduced anywhere in the `EditPlan`/`EditVersion`/`Review` cluster, a genuine departure from every other entity's append-only precedent, and would warrant its own explicit justification at decision time (not supplied by this document). A *computed*, non-stored version of OD-R11-B (deriving "current" from existing immutable data, e.g., by `generated_at` ordering, with nothing new persisted) would avoid this concern entirely and remains available as a sub-variant of Option B, not separately enumerated above because it does not change B's classification, only its implementation.

---

## 13. Stale / Unverifiable Boundary

Carried forward, unmodified, unweakened by anything in this gate:

- A stale `EditPlan` is never deleted — it remains readable at all times (ADR-022, unchanged).
- Unverifiable provenance is never treated as automatically valid (ADR-022, unchanged).
- A stale/unverifiable execution must not proceed — `generateRoughCut` against a stale/unverifiable `EditPlan` remains blocked exactly as Slice 5 already implements, regardless of how OD-R5/OD-R6 chaining is decided (§8 above).
- Revising a stale plan is EDITING/REVISION, not execution — `CVOS_Slice5_Implementation_Contract_v1.md` §5's rule, unmodified, unchanged, and not re-litigated by any candidate in this gate.
- Final Approval freshness (the CVOS-P9 scenario for `EditVersion`/`FINAL_APPROVED`) remains deferred to future scope (D-D) — nothing in Group A or Group B above reopens or resolves it. ADR-022 itself is not redesigned in this file, and no candidate above proposes touching it.

---

## 14. Implementation Consequence Matrix

No change listed below is performed in this task. For each item, what would have to change *after* a human decision is made:

| ID | Source files likely affected | Schema changes | Tests required | Two-process reload tests | Governance sync needed | Package rebuild eventually required |
|---|---|---|---|---|---|---|
| OD-R7 | New `114_Review.js` (or equivalent numbering); `211_ReviewEngine.js`; `001_ports.js` (if a new port method is needed); `401_system.js` wiring | New `Review` entity | Persistence create/read tests | Yes | Slice 6 Implementation Contract's OPEN DECISION section (§3) would need updating to DECIDED | Yes, eventually |
| OD-R8 | Same `Review` entity file; possibly `211_ReviewEngine.js` command signatures | Adds/omits a reviewer field on `Review` | Field-presence/absence tests | Yes (if field stored) | Contract §3 update | Yes, eventually |
| OD-R9 | Same `Review` entity file; possibly a new `115_ReviewItem.js` if a child-entity option is chosen | Findings shape; possibly a second entity | Findings serialization/round-trip tests; malformed-finding handling tests | Yes | Contract §3/§10 update | Yes, eventually |
| OD-R10 | `211_ReviewEngine.js` (round-number computation, or chain-walking logic) | Round identity field or reference | Round-numbering correctness tests across multiple rounds | Yes | Contract §3 update | Yes, eventually |
| OD-R11 | `112_EditPlan.js` and/or `113_EditVersion.js` (if B/C chosen); `209_EditPlanEngine.js`/`210_EditEngine.js` (selection logic) | Additive field on `EditPlan` or `EditVersion` (B/C only); none if A | Selection-correctness tests (B/C); none new if A | Yes (if B/C) | Contract §8 (currently documents the "no marker" fact) would need updating; potentially a Slice-5-regression note since `EditVersion`/`EditPlan` are closed entities | Yes, eventually |
| OD-R12 | `113_EditVersion.js` (if C chosen); `211_ReviewEngine.js` | Additive field on `EditVersion` (C only); none if A/B | Authority-boundary static-scan test (mirroring `test/612_editEngine.test.js`'s pattern) confirming no field is misused as a Final-Approval substitute | Yes (if C) | Contract §9/§2 cross-reference; a new Governance Gap entry would likely be warranted if C is chosen, flagging the blurring risk explicitly | Yes, eventually |
| OD-R1 | Wherever OD-R3 places enforcement | A stored or computed counter, depending on OD-R2 | Cap-boundary tests (at, just under, just over) | Yes | Contract §6 update | Yes, eventually |
| OD-R2 | `209_EditPlanEngine.js` and/or `211_ReviewEngine.js`, depending on chosen unit | Possibly a counter field, or purely computed from existing `supersedes_version` chain length | Counting-correctness tests under the chosen unit | Yes | Contract §6 update | Yes, eventually |
| OD-R3 | Whichever engine/command is chosen as the enforcement point | None directly (enforcement logic, not new persisted data) | Enforcement-point tests (confirming the block happens exactly where specified, not elsewhere) | Not directly, unless persistence of a "blocked" state is introduced | Contract §6 update | Yes, eventually |
| OD-R4 | Same as OD-R3 | Possibly an override-tracking field, if an explicit override mechanism is chosen | Cap-behavior tests (hard stop, warning, override paths, as applicable) | Yes, if any override/escalation state is persisted | Contract §6 update | Yes, eventually |
| OD-R5 | `211_ReviewEngine.js`, `209_EditPlanEngine.js` | None new, beyond whatever OD-R7/R9 already add | Chaining-behavior tests (A/B/C-specific); failure/idempotency tests | Yes | Contract §7 update | Yes, eventually |
| OD-R6 | `211_ReviewEngine.js`, `210_EditEngine.js` | None new | Auto-generation tests (B/C-specific); confirms `generateRoughCut`'s existing CVOS-P9 re-validation still fires even when auto-triggered | Yes | Contract §13/§16 update | Yes, eventually |

No file listed above has been created, modified, or scaffolded in this task.

---

## 15. Test Consequence Matrix

No test listed below is written in this task.

**Review persistence** — create Review; read Review; fresh-process read; append second Review; verify first Review remains unchanged (byte-for-byte, mirroring the existing `EditPlan` immutability test pattern).

**Review identity** — unique Review ID uniqueness/collision test; correct `EditVersion` linkage (a `Review` always points to exactly the `EditVersion` it was created against); correct round identity (whichever OD-R10 mechanism is chosen behaves correctly across 2+ rounds).

**Findings** — empty findings (a round with zero per-clip findings, if that is even a valid state under the chosen OD-R9 model); multiple findings; a malformed finding (an action value outside the AI Production Contract §G vocabulary, if structured validation is chosen); deterministic serialization (the same findings input always persists and reloads identically).

**Revision** — revision count under the chosen OD-R2 unit; lineage traversal (walking `supersedes_version` correctly, re-using Slice 5's existing tested traversal logic where possible); cap boundary (the Nth attempt succeeds, the (N+1)th is handled per OD-R4); cap exceeded; override behavior, if OD-R4 selects an override-capable option.

**Chaining** — `requestRevision` behavior under the chosen OD-R5 option; `createEditPlan` behavior when invoked via the chosen chaining path; `generateRoughCut` behavior under the chosen OD-R6 option, including confirming its existing CVOS-P9 provenance re-check still executes; failure/idempotency behavior for whichever option introduces multi-step sequencing (A/C under OD-R5, B/C under OD-R6).

**Authority** — no AI self-approval (a static/textual authority-boundary scan, mirroring `test/612_editEngine.test.js`'s existing pattern, applied to whatever new `ReviewEngine` source is eventually written); no hidden Final Approval (confirms `FINAL_APPROVED`/`FINAL_REVIEW` terms do not appear anywhere in Slice 6 source while D-B holds); no autonomous cap bypass (confirms no code path lets an AI-driven step skip the OD-R3/OD-R4 enforcement).

**Persistence** — an independent two-process run (write in Process A, read in fresh Process B), matching the `701`…`710` pattern already established through Slice 5; confirms old records unchanged and new records correctly visible after reload.

---

## 16. Governance Impact

Decisions likely to require the listed follow-on governance action once made (none performed here):

- **All of OD-R7–R12:** require an update to `CVOS_Slice6_Implementation_Contract_v1.md`'s corresponding OPEN sections, converting them to DECIDED, before an Implementation Authorization Gate could responsibly be opened.
- **OD-R11/OD-R12, if B/C options are chosen for either:** likely require a new Governance Gap entry (an addition to the Contract's §21-style register, not a modification of any existing ADR) flagging the "additive change to a closed Slice 5 entity" concern (OD-R11) and/or the "risk of Final-Approval blurring" concern (OD-R12) explicitly, so a future reader does not need to rediscover these risks from scratch.
- **OD-R1–R4, once resolved:** likely warrant a dedicated short section of the eventual Implementation Contract update (not a new ADR — this is implementation-parameter detail, not frozen architecture, unless the human owner decides otherwise).
- **None of the 12 decisions, on the evidence gathered in this gate, appears to require a new ADR number** — all twelve resolve within the space already carved out by Architecture §3 (ReviewEngine's existence) and by the D-A/D-B/D-C/D-D/D-E decisions already approved in `33_`. This is an observation, not a decision — if the human owner concludes otherwise for any item (most plausibly OD-R11 or OD-R12, given their proximity to closed-slice entities and to the Final-Approval boundary), that would itself be a new, explicit governance decision, not something inferred by this document.
- **The already-approved ADR-022 synchronization task (D-6) is preserved exactly as authorized-not-performed** — nothing in this gate's 12 decisions changes its status, scope, or urgency, and it remains a wholly separate governance task from the 12 items above.
- **Test Governance (Architecture §14) update:** GG-02 (the `REJECTED` documentation inconsistency) remains unresolved by this gate and is not newly addressed here — its resolution path (a future §14 wording correction) is unaffected by any of the 12 decisions above, since D-E already fixed the substantive question (no `REJECTED` state) in `33_`.

---

## 17. Decision Table

| ID | Decision | Current status | Human decision required |
|---|---|---|---|
| OD-R1 | Numeric revision maximum | OPEN | YES |
| OD-R2 | Counting event | OPEN | YES |
| OD-R3 | Enforcement point | OPEN | YES |
| OD-R4 | Cap behavior | OPEN | YES |
| OD-R5 | requestRevision → createEditPlan | OPEN | YES |
| OD-R6 | Automatic EditVersion generation | OPEN | YES |
| OD-R7 | Review field-level schema | OPEN | YES |
| OD-R8 | Reviewer identity | OPEN | YES |
| OD-R9 | Findings representation | OPEN | YES |
| OD-R10 | Review round identity | OPEN | YES |
| OD-R11 | EditVersion current marker | OPEN | YES |
| OD-R12 | Rough Cut approval-like field | OPEN | YES |

---

## 18. Required Final Status

**Decision Gate Status:** READY FOR HUMAN DECISION

**Implementation Authorization:** NOT GRANTED

**Slice 6 Implementation:** NOT AUTHORIZED

**Code Changes:** NONE

**Test Changes:** NONE

**ADR Changes:** NONE

**Package Changes:** NONE

**Next step:** Human decides OD-R1 through OD-R12. After those decisions are recorded, update the Implementation Contract through a separate controlled step and run the Slice 6 Implementation Readiness/Authorization Gate.
