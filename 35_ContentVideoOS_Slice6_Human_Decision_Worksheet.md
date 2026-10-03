# CVOS Slice 6 — Human Decision Worksheet

**Nature of this document:** DOCUMENT PREPARATION ONLY. This worksheet does not decide anything, does not rank options, and does not recommend an answer. It restates the 12 open decisions from `34_ContentVideoOS_Slice6_Contract_Decision_Gate.md` in a dependency-aware order, with blank fields for the human owner to record a selection and rationale. No code, test, ADR, Contract, or package file is modified by this document.

---

## 0. Background — Locked Decisions (not reopened here)

These are already approved in `33_ContentVideoOS_Slice6_Decision_Record.md` and are treated as fixed background constraints throughout this worksheet:

- **D-A = A2** — Review is append-only, versioned by review round; one immutable record per round, linked to an `EditVersion`.
- **D-B = B2** — Slice 6 scope is Rough Cut Review only; Final Approval is deferred.
- **D-C = C1** — Revision counting is scoped to the `EditPlan` lineage (`supersedes_version` chain).
- **D-D = Deferred** — Approval freshness is deferred alongside Final Approval; this is not the same as choosing "no mechanism ever" (D1).
- **D-E = E2** — No terminal `REJECTED` state is added to the Rough Cut Review lifecycle.
- **D-6** — ADR-022 synchronization (writing the stale-plan-revision ruling from `CVOS_Slice5_Implementation_Contract_v1.md` §5 into ADR-022's own text) is authorized as a **separate governance task**, not performed here or by any prior document.

None of the 12 decisions below may reopen any of the six items above.

---

## Decision Order Used in This Worksheet

**Phase A — Review Data Model:** A1 (OD-R7) → A2 (OD-R8) → A3 (OD-R9) → A4 (OD-R10) → A5 (OD-R11) → A6 (OD-R12)

**Phase B — Revision Counting:** B1 (OD-R2) → B2 (OD-R1) → B3 (OD-R3) → B4 (OD-R4)

**Phase C — Revision Chaining:** C1 (OD-R5) → C2 (OD-R6)

This order is used because later decisions depend on concepts fixed by earlier ones — e.g., OD-R2 (what counts as a revision) is presented before OD-R1 (the numeric cap), since a cap number is meaningless without first fixing what it counts.

---

# PHASE A — REVIEW DATA MODEL

---

## A1 — OD-R7: Review Field-Level Schema

### 1. The exact question

What is the minimum immutable Review record required for Slice 6?

### 2. Already-known facts

- D-A (locked): Review is append-only, versioned by review round; one immutable record per round, linked to an `EditVersion`.
- Architecture §2 Domain Model states only "Review — 1 per EditVersion review round" (cardinality, no schema).
- AI Production Contract §G defines the per-clip decision vocabulary (`KEEP`, `REMOVE`, `REPLACE`, `CHANGE_ORDER`, `CHANGE_CAMERA`, `CHANGE_B-ROLL`, `CHANGE_MUSIC`, `CHANGE_CAPTION`, `CHANGE_HOOK`, `CHANGE_DURATION`, `CHANGE_PACING`) and the Rough-Cut-Review-scoped state values (`HUMAN_REVIEW`, `REVISION_REQUESTED`, `AI_REVISION`) — but no field-level record shape anywhere.
- No document in the corpus (Architecture, AI Production Contract, Product Understanding Report, any numbered gate `01_`–`34_`) defines a `Review` schema at the field level.

### 3–4. Options and what each means

**Option R7-A — Minimal Review record.**
Fields: an identity field; an `EditVersion` linkage field; a round marker (mechanism TBD by OD-R10); a findings container (shape TBD by OD-R9). No status field, no reviewer field, no explicit timestamp.
- Purpose: satisfies only what D-A structurally requires — nothing more.
- Benefits: smallest schema surface; nothing to keep consistent beyond the findings themselves; lifecycle/status is computed on read rather than stored.
- Costs: every consumer that wants to know "is this round clean or does it need revision" must recompute it from findings each time, rather than reading a stored value.
- Immutability impact: none — fully compatible with append-only.
- Test impact: fewer field-presence tests; more derived-value tests (recomputing status from findings).
- Future Final Approval impact: none — carries nothing that could be mistaken for an approval marker.
- Unnecessary state: none introduced.

**Option R7-B — Review record with explicit review-round metadata.**
Fields: Option R7-A's fields, plus an explicit `round` (or equivalent) field and an explicit `status` field carrying the Rough-Cut-Review-scoped lifecycle value, plus a timestamp.
- Purpose: makes round identity and lifecycle state directly queryable rather than derived.
- Benefits: simpler reads (no recomputation); easier to test state transitions directly.
- Costs: two additional fields whose values must be kept consistent with the underlying findings/history at write time — a correctness burden not present in R7-A.
- Immutability impact: none — still append-only; the added fields are written once, at creation, like everything else.
- Test impact: adds field-consistency tests (does the stored `status` actually match what the findings imply).
- Future Final Approval impact: none, provided `status`'s vocabulary is restricted to the Rough-Cut-Review-scoped values only (`HUMAN_REVIEW`/`REVISION_REQUESTED`/`AI_REVISION`) and never extended to `FINAL_REVIEW`/`FINAL_APPROVED` without a separate decision.
- Unnecessary state: none if the two added fields are genuinely used; would become unnecessary duplication if nothing ever reads them instead of recomputing from findings.

**Option R7-C — More audit-oriented Review record.**
Fields: Option R7-B's fields, plus a reviewer-identity field (contingent on OD-R8's outcome) and a revision-linkage field (an explicit pointer to whatever `EditPlan` revision resulted from this round, if any — contingent on OD-R5's outcome).
- Purpose: maximizes traceability — who reviewed, what happened as a direct result.
- Benefits: richest audit trail of the three options; most directly answers "who did what, and what did it lead to" without cross-referencing other records.
- Costs: cannot be fully finalized independently of OD-R8 and OD-R5 — its exact shape depends on decisions made elsewhere in this worksheet; largest schema of the three.
- Immutability impact: none — still append-only.
- Test impact: largest test surface of the three (reviewer-field tests, revision-linkage tests, in addition to everything R7-B requires).
- Future Final Approval impact: same caveat as R7-B — no field in this option should carry Final-Approval-scoped vocabulary.
- Unnecessary state: the revision-linkage field would be unused/always-null for any round that doesn't result in a revision (i.e., a clean round) — whether that's "unnecessary" or simply "conditionally populated" is a matter of perspective the worksheet does not resolve.

**Distinguishing mandatory vs. optional, per the task's instruction:**
- *Mandatory, per current architecture:* an `EditVersion` linkage (required by Domain Model §2's cardinality statement) and some representation of the AI Production Contract §G vocabulary.
- *Mandatory, per D-A specifically:* an identity mechanism sufficient to tell round N and round N+1 apart, both remaining independently readable.
- *Optional:* everything else in R7-B/R7-C (explicit status, timestamp, reviewer identity, revision linkage) — none is structurally forced by any frozen document.
- *Not to be silently promoted from Final Approval:* no field representing `FINAL_REVIEW`/`FINAL_APPROVED`-level state may appear in any option here, regardless of which is chosen.

### 5. Concrete consequences
Covered inline above per option (benefits/costs/test impact/immutability impact).

### 6. Dependencies
- Depends on: D-A (locked).
- Affects: OD-R8 (reviewer field only exists if R7-B/C is chosen and OD-R8 says yes), OD-R9 (the findings container's shape is decided separately, but its presence as a field is fixed here), OD-R10 (round identity mechanism must fit within whichever option is chosen), OD-R12 (whether a review-level status field exists here interacts with whether an `EditVersion`-level field is also considered).

### 7. What becomes locked if selected
Whichever option is chosen fixes the base shape every other Phase-A decision's answer must fit inside. Choosing R7-A, for example, would mean OD-R8's "required reviewer identity" option could not be satisfied without effectively upgrading to something like R7-C later.

### Human Decision

Selected option:
R7-C

Decision:
Slice 6 Review schema = R7-C (audit-oriented Review record: identity, EditVersion linkage, explicit round metadata, Rough-Cut-Review-scoped status, timestamp, plus reviewer-identity field and revision-linkage field). Locked as premise for OD-R8 through OD-R12. Exact field names/values remain governed by the remaining decisions and the later Contract update.

Rationale:
[not provided by human owner at time of recording]

Dependencies / follow-up decisions:
OD-R8 (reviewer field content/requiredness), OD-R5 (what the revision-linkage field points to), OD-R9, OD-R10, OD-R12. status vocabulary must stay Rough-Cut-Review-scoped (no FINAL_REVIEW/FINAL_APPROVED, no REJECTED).

---

## A2 — OD-R8: Reviewer Identity

### 1. The exact question

How is human reviewer identity represented on a Review record, if at all?

### 2. Already-known facts

- No document in the corpus names any `reviewer_id`, user-account concept, or identity infrastructure for a human operator.
- Every prior slice (Slice 1–5) treats "the human" as an implicit, singular, undifferentiated actor — no existing command in `src/` takes an operator/user identifier as a parameter.
- The real GAS/Sheets/Drive runtime (which might eventually supply an actual account identity, per ADR-016) remains globally `BLOCKED` in this development environment per ADR-019 — re-confirmed: sandbox access to `script.google.com`/`sheets.googleapis.com`/`drive.google.com` returns HTTP 403 `host_not_allowed`.
- The local/Node test harness used through Slice 1–5 has no user/session concept whatsoever.

### 3–4. Options and what each means

**Option R8-A — Required reviewer identity.** Every `Review` record must carry a populated identifier of who reviewed.
- Requires infrastructure that does not currently exist: an identity source of some kind must be invented or stubbed, since nothing in the current runtime supplies one.

**Option R8-B (original) — Optional reviewer identity.** The field exists but may be null/absent.
- Also requires an identity source to exist for the cases where it is populated; lower cost than R8-A only in that absence is tolerated, not in that the underlying infrastructure gap disappears.
- **Superseded for the final decision below.** This optional/null semantics is preserved here as a retained alternative only, per the preservation requirement (§22 of the originating task). It is not the definition used in the human decision recorded further down this section.

**Option R8-B (modified) — Required Custom Reviewer Identity.** *(This is the definition actually selected — see "Human Decision" below.)*
- Every `Review` MUST contain a non-null, non-empty reviewer identifier.
- Slice 6 does **not** require formal authentication or identity infrastructure (no OAuth, no Google account identity, no user/session infrastructure, no formal authentication system, no globally managed user directory).
- The reviewer identifier may be a human-readable, operator-defined identifier — for example `"Operator 1"`, `"Operator 2"`, `"Carson"`, or another stable human-readable identifier.
- The exact reviewer identifier/value is **operator-supplied at runtime**. It is not fixed by, or hardcoded into, the Review schema itself — the schema's own requirement is only: `reviewer = required, non-null, non-empty identifier`. The schema must not bake in any specific value (e.g., `"Operator 1"`) as a default, constant, or fallback.
- The same human reviewer SHOULD use the same identifier consistently where practical (a convention for operators to follow, not a system-enforced constraint).
- A `Review` MUST NOT omit the reviewer merely because formal account/session identity infrastructure does not exist — required-but-informal is the whole point of this modified option, distinguishing it from both R8-A (which the original worksheet treated as implicitly requiring real infrastructure) and the original R8-B (which tolerated absence).

**Option R8-C — Operator identity only.** A single, fixed, system-wide "the operator" value (not a per-person identifier).
- Requires no new infrastructure — matches the system's current implicit single-operator assumption exactly.

**Option R8-D — No reviewer identity in Slice 6.** No field at all.
- Requires no new infrastructure; explicitly defers the multi-user identity question entirely.

### 5. Concrete consequences

- Auditability: highest under R8-A, lowest under R8-D.
- Multi-user future readiness: R8-A and, to a lesser extent, R8-B position the system for a future multi-operator CVOS; R8-C and R8-D would require a schema migration later if that need materializes.
- Privacy/minimality: R8-C and R8-D are the most minimal.
- Current runtime reality: **only R8-C and R8-D can be satisfied without inventing new infrastructure today, if "infrastructure" means formal authentication/identity.** R8-A and the original R8-B, as originally analyzed, would require stubbing or fabricating an identity source. **R8-B (modified)** changes this calculus: it requires the `reviewer` field to be populated, but explicitly does *not* require formal authentication/identity infrastructure — the value is simply an operator-supplied, human-readable string. Under R8-B (modified), no new infrastructure is required; what is required is that some non-null, non-empty value be supplied by whoever/whatever is operating the system at review time.

### 6. Dependencies
- Depends on: OD-R7 (the field only exists at all if R7-B or R7-C's schema includes it). R7-C — already decided — includes a reviewer field, so OD-R8 governs that field's required/value semantics.
- Affects: auditability characteristics of the eventual `Review` schema; nothing else in the 12-decision set structurally depends on this one.

### 7. What becomes locked if selected
Choosing R8-A or the original R8-B commits the project to solving (or explicitly stubbing) a formal identity-source problem that does not exist anywhere else in CVOS today. **R8-B (modified), the option actually selected, locks something narrower and lighter:** the `Review` schema (already fixed as R7-C) must carry a required, non-null, non-empty `reviewer` value, but no formal identity/authentication infrastructure is required in Slice 6. The identifier's source/value mechanism is left to implementation/runtime, not fixed here, and must not be hardcoded as a schema default or constant.

### Human Decision

Selected option:
R8-B (modified) — Required Custom Reviewer Identity

Decision:
OD-R8 = R8-B (modified): every `Review` record MUST contain a non-null, non-empty reviewer identifier. Formal authentication/identity infrastructure (OAuth, Google account identity, user/session infrastructure, a formal authentication system, a globally managed user directory) is NOT required in Slice 6. The reviewer value is operator-supplied at runtime (e.g. `"Operator 1"`, `"Operator 2"`, `"Carson"`, or another stable human-readable identifier) and must not be hardcoded into the Review schema as a default, constant, or fallback — the schema's requirement is only that the field be present, non-null, and non-empty. The same human reviewer should use the same identifier consistently where practical, as an operator convention rather than a system-enforced rule. Note explicitly: this modifies and supersedes the original R8-B ("optional reviewer identity, may be null/absent") — the field is now required, not optional; only the formal-infrastructure requirement is what R8-A originally implied and is dropped.

Rationale:
Selected R8-B (modified): Required Custom Reviewer Identity. Reviewer identity is mandatory, but Slice 6 does not require formal authentication or identity infrastructure. The reviewer value is operator-supplied and may be a stable human-readable identifier such as Operator 1, Operator 2, or a person's name. This preserves reviewer differentiation and future migration to formal identity without hardcoding a single operator identity into the schema.
（中文简述：审阅者身份为必填，但 Slice 6 不要求正式的身份验证/账号基础设施；实际值由操作者在运行时提供，可以是像 "Operator 1"、"Carson" 这样稳定的可读标识符，不得写死在 schema 里，为日后迁移到正式身份系统保留空间。）

Dependencies / follow-up decisions:
Confirmed consistent with R7-C (already decided): R7-C's Review schema already includes a reviewer field; OD-R8 now fixes that field as required/non-null/non-empty with an operator-supplied value, no formal infrastructure required. Not yet decided, and NOT decided by this entry: OD-R9 (findings representation), OD-R10 (review round identity mechanism), OD-R5 (revision-linkage target), OD-R12 (approval-like field). Implementation-time follow-up (not decided here, not to be inferred as decided): the concrete mechanism by which an operator supplies the reviewer value at runtime (e.g., a config value, a CLI/UI prompt, an environment variable) is left open and must not be hardcoded into the Review schema itself.

---

## A3 — OD-R9: Findings Representation

### 1. The exact question

How are per-clip or per-item review findings represented within (or alongside) a Review record?

### 2. Already-known facts

- AI Production Contract §G's per-clip vocabulary table is the only governed content; no persisted shape is specified anywhere.
- `33_` explicitly retained A3 (a separate `ReviewItem`/`Finding` entity) as a non-selected alternative to D-A's A2 at the *entity* level; this decision (OD-R9) is about the *internal shape* of findings within whatever A2-compliant `Review` record is chosen, not about reopening D-A itself.

### 3–4. Options and what each means

**Option R9-A — Embedded structured findings array inside Review.** A `findings[]` array field on the single `Review` record, each element following a defined structure (e.g., a clip/media reference plus an action value from the governed vocabulary).
- Matches A2 directly — no second entity.
- Findings for one round are read/written atomically with the round itself.

**Option R9-B — Separate ReviewItem/Finding records.** One row per per-clip decision, referencing the parent `Review`. (Note: this combines A2's round-level `Review` immutability with A3's finding-level granularity — a hybrid not separately named as one of `32_`'s original three candidates, but a logically available combination.)
- Higher auditability and queryability (e.g., "every `REMOVE` decision across all rounds for this lineage" becomes a direct query).
- Introduces a second new entity.

**Option R9-C — Minimal structured review decision + notes.** A single mandatory `action`/aggregate-decision value per round, plus an optional free-text `comment`. No per-clip itemization at all.
- Cheapest to implement and test.
- Does not itemize per clip — arguably under-uses the vocabulary AI Production Contract §G already defines at the per-clip level, and would not directly support §G's own aggregation rule ("if every decision is `KEEP`...") unless "every decision" is reinterpreted as a single aggregate value rather than a set of per-clip ones.

**Option R9-D — Another evidence-supported model.** Reserved for a shape not among R9-A/B/C, if implementation-time evidence surfaces one; none is proposed here.

### 5. Concrete consequences

- Auditability: highest with R9-B; lowest with R9-C.
- Queryability: R9-B supports direct per-clip queries; R9-A requires reading and filtering the parent record; R9-C supports none.
- Schema complexity: lowest with R9-C; highest with R9-B (two entities).
- Append-only behavior: all three are equally compatible with A2's round-level immutability — none proposes mutating a `Review` or its findings after creation; the difference is internal shape, not mutability.
- Future extensibility: R9-B is easiest to extend later (e.g., toward per-finding lifecycle tracking) without a breaking migration; R9-C would need the most rework if per-clip granularity later becomes a requirement.
- Whether justified for Slice 6: this worksheet does not decide; the complexity/cost of R9-B vs. the AI Production Contract §G aggregation rule's apparent need for *some* per-clip granularity (which weighs against R9-C specifically) are both presented as evidence, not as a directive to choose the most complex option.

### 6. Dependencies
- Depends on: OD-R7 (findings is one field/concept within whatever base schema R7 fixes).
- Affects: persistence/test complexity directly; indirectly affects OD-R12 (a richer findings model may make a review-level aggregate status, R7-B/C's `status` field, easier to derive correctly).

### 7. What becomes locked if selected
R9-B would introduce a second persisted entity for the whole remaining lifetime of Slice 6 (and any future slice building on it); R9-A/R9-C keep everything inside `Review` itself.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## A4 — OD-R10: Review Round Identity

### 1. The exact question

How does the system identify and order successive review rounds for a given EditVersion?

### 2. Already-known facts

- Domain Model §2's "1 per EditVersion review round" phrasing implies multiple rounds are possible per `EditVersion`, but defines no identity mechanism.
- `EditPlan`'s own precedent (`version` integer + `supersedes_version` pointer, `src/112_EditPlan.js`) is the closest existing analogous mechanism in the codebase, but no document requires `Review` to follow the same pattern.

### 3–4. Options and what each means

**Option R10-A — Explicit `review_round` field.** An integer, incremented per round for a given `EditVersion`.
- Directly queryable; requires correctly computing "the next round number" at write time (a small correctness burden, analogous to how `EditPlanEngine.createEditPlan` already computes the next `version`).

**Option R10-B — Sequential Review version number.** Functionally similar to R10-A, differing mainly in naming/framing (a `Review`-scoped `version` rather than a `round`).
- The distinction from R10-A is largely nominal unless a future decision gives "round" and "version" different meanings.

**Option R10-C — Unique Review ID + deterministic chronological ordering.** No explicit round-number field; order is derived from a monotonic timestamp (or equivalent) among all `Review` records for one `EditVersion`.
- Avoids the computed-field correctness burden at write time.
- Needs a defined tie-breaking rule if two records could ever share a timestamp (unlikely under a single-writer model, but not ruled out by any decision made so far).

**Option R10-D — Explicit previous-review linkage.** A `supersedes_review_id`/`previous_review_id`-style pointer, mirroring `EditPlan.supersedes_version`'s reference-based pattern rather than a version *number*.
- Round sequence becomes traceable as a linked chain; a round "number" would be derivable by walking the chain rather than stored directly.

### 5. Concrete consequences

- Interaction with A2 (locked): all four options are compatible with append-only rounds; none requires mutating a prior round's record.
- Interaction with `EditVersion`: round identity is scoped per `EditVersion` (Domain Model §2), so whichever mechanism is chosen must be interpreted relative to one specific `EditVersion`'s set of `Review` records, not globally.
- Interaction with `requestRevision`: the round that triggers a `requestRevision` outcome is the round whose record this mechanism must uniquely identify — relevant if OD-R7's revision-linkage field (Option R7-C) is chosen.
- Interaction with revision counting (OD-R2): review round identity is **not** the same concept as the OD-R2 counting unit — a round could, depending on OD-R5/OD-R6, correspond to zero, one, or (in principle) more than one `EditPlan`/`EditVersion` generation event.
- Testability: R10-A/B (a numeric field) is easiest to assert deterministically ("the second call produces round 2"); R10-C requires either mocking time or comparison-based assertions.
- Two-process persistence: all four must survive a fresh-process reload correctly ordering/identifying rounds; the exact assertions differ by mechanism (equality check for a stored number vs. comparison-based check for chronological ordering).

### Explicit concept separation (not merged by any option above)
`EditPlan.version` ≠ `EditVersion.id` ≠ `Review` round ≠ revision iteration count (OD-R2's unit). These remain four independently-identified concepts unless a future decision explicitly merges any two of them.

### 6. Dependencies
- Depends on: OD-R7 (round identity is a field/mechanism within whatever base schema R7 fixes).
- Affects: OD-R2 (revision-counting unit) and the Rough Cut Review lifecycle's own bookkeeping.

### 7. What becomes locked if selected
Whichever mechanism is chosen becomes the sole way any future code (including a future revision-cap check) can answer "how many rounds has this EditVersion had" or "what round is this."

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## A5 — OD-R11: EditVersion Current Marker

**This is one of the most carefully handled decisions in this worksheet, per instruction.**

### 1. The exact question

Does Slice 6 need an explicit mechanism to identify the EditVersion currently subject to Review, given that multiple EditVersions can already coexist for one EditPlan?

### 2. Already-known facts, re-verified directly against source

- `src/113_EditVersion.js`'s actual shape: `{ id, edit_plan_id, manifest, generated_at }`. No `version`, `supersedes`, `status`, or `current`/`latest` marker of any kind.
- `EditEngine.getAllForPlan(editPlanId)` returns every `EditVersion` ever generated for a given `EditPlan`, with no indication of which is "current" or "most recent."
- Multiple `EditVersion`s can coexist for one `EditPlan` today with no storage-level ambiguity (each has its own `id`), but with no system-level concept of "current" at all.
- `EditVersion` is a **closed Slice 5 entity** — any change to its shape, even additive, touches an entity that Slice 5 already tested at 143/143.

### 3–4. Options and what each means

**Option R11-A — No current marker; Review explicitly references the exact `EditVersion.id`.** Under this option, "which EditVersion is under review" is simply whatever `edit_version_id` a given `Review` record points to (OD-R7's linkage field). No independently-maintained "current" concept exists on `EditVersion` itself. Two different `Review` chains could exist for two different `EditVersion`s of the same `EditPlan` with nothing preventing or needing to prevent it.
- Not a Slice-6-required change and not an architectural change — requires nothing beyond what OD-R7 already needs (a linkage field on `Review`). `EditVersion` remains exactly as Slice 5 left it.

**Option R11-B — Computed latest/current rule; no mutable stored field.** E.g., "the `EditVersion` with the latest `generated_at` for a given `edit_plan_id` is current" — a rule applied at read time, nothing new persisted.
- Would be a Slice-6-scoped addition (logic, not schema) at minimum, to know which of several `EditVersion`s a human should be shown by default. Touches how `EditVersion` is *queried*, not its stored shape.

**Option R11-C — Stored current marker/status.** A persisted field (e.g., on `EditPlan`, naming its current `EditVersion`, or on `EditVersion` itself) that is written once and can be **reassigned** as new `EditVersion`s are generated.

**Explicit, non-qualified statement of consequence for R11-C (per instruction, not called "better" or "more convenient"):** if implemented as a genuinely mutable, re-assignable pointer, R11-C would be **the first mutable field introduced anywhere in the EditPlan/EditVersion/Review cluster** — every other field in this cluster, across all of Slice 1–5 and every option considered elsewhere in this worksheet, is either write-once-then-immutable or entirely absent. This is a structural departure from every precedent set so far in this codebase, not an incremental addition.

### 5. Concrete consequences

- **Immutability impact:** R11-A: none (nothing added). R11-B: none (nothing stored; a derivation over existing immutable data). R11-C: **direct** — introduces the first genuinely mutable field in this entity cluster, as stated above.
- **Concurrency considerations:** R11-A/B have none beyond what already exists (reads over immutable/append-only data are inherently safe). R11-C introduces a write-conflict surface that does not exist today: two near-simultaneous "generate a new EditVersion" operations could race to update the same "current" pointer, a class of problem nothing in Slice 1–5 has needed to solve because nothing mutable has existed at this layer before.
- **Test impact:** R11-A adds no new tests beyond what OD-R7 already requires. R11-B adds selection-correctness tests (does the computed rule pick the right one). R11-C adds both selection-correctness tests and, if concurrency is a real concern in the eventual runtime, race-condition tests that have no precedent anywhere in the existing 143-test suite.
- **Future Review lifecycle implications:** R11-A keeps `Review`'s own linkage as the single source of truth for "what was reviewed," which remains valid forever, unaffected by whatever else happens to other `EditVersion`s. R11-B/C both introduce a second source of truth (a "current" answer, independent of what any specific `Review` references) that could, in principle, disagree with what a specific `Review` actually reviewed at the time — a reconciliation question neither this document nor any prior document resolves.
- **Whether it is actually necessary:** depends entirely on a product-level question no document in the corpus answers: can more than one `EditVersion` legitimately be "live" for review at once, or is that always an error/transient state? R11-A does not need this question answered to function; R11-B/C both implicitly assume an answer (that there is, or should be, exactly one meaningful "current" one).

### 6. Dependencies
- Depends on: OD-R7 (the linkage field R11-A relies on), OD-R10 (round identity interacts with which `EditVersion` a round belongs to).
- Affects: OD-R6 — if OD-R6 results in automatic new-`EditVersion` generation on every revision, multiple `EditVersion`s per `EditPlan` become the *normal* case rather than an edge case, which raises the practical stakes of this decision considerably (see §Cross-Decision Consequences below).

### 7. What becomes locked if selected
R11-A leaves `EditVersion` completely untouched, permanently, unless revisited later. R11-B adds a read-time rule that must be kept correct as new `EditVersion`s are generated, but adds no new persisted state. R11-C adds a new, mutable, persisted field to a previously fully-immutable entity cluster — a change of a different kind than R11-A/B, not merely a bigger version of the same kind of change.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## A6 — OD-R12: Rough Cut Review Approval-Like Field

**This is a critical authority-boundary decision, per instruction.**

### 1. The exact question

Does Slice 6 need any persisted field that resembles approval — on Review, on EditVersion, or elsewhere — to represent "this round concluded cleanly, no revision requested"?

### 2. Already-known facts, with concepts kept explicitly separate

- Slice 6 = Rough Cut Review only (D-B, locked). Final Approval = deferred (D-B, locked). Publication Authorization = deferred (out of scope regardless of D-B). No `FINAL_APPROVED` state (D-B, locked). No terminal `REJECTED` state (D-E, locked).
- Architecture §3's ReviewEngine invariant: "`FINAL_APPROVED` is terminal for that EditVersion's own content" — a Final-Approval-scoped statement, out of Slice 6's scope.
- AI Production Contract §G's aggregation rule: "if every decision is `KEEP`, the version moves to `FINAL_REVIEW`" — the state it moves *to* (`FINAL_REVIEW`) is out of scope, but the *rule itself* (that an all-`KEEP` round is a distinct, recognizable outcome from a round with a `REVISION_REQUESTED` outcome) is not itself Final-Approval-specific — it describes what happens within the Rough-Cut-Review portion of the lifecycle, at the moment just before the (out-of-scope) next stage would begin.
- Five concepts to keep distinct, per instruction: (1) human review feedback (the findings themselves, OD-R9's concern) — (2) revision request (`REVISION_REQUESTED`, an in-scope, already-governed state) — (3) Rough Cut Review completion (a round concluding with no revision requested — this decision's actual subject) — (4) Final Approval (`FINAL_REVIEW`/`FINAL_APPROVED` — out of scope) — (5) Publication Authorization (a separate, later gate — out of scope regardless).

### 3–4. Options and what each means

**Option R12-A — Review contains human review decision/findings only; no approval-like field anywhere on EditVersion.** Concept (3), "Rough Cut Review completion," is represented purely as a property of the `Review` record (e.g., derivable from its findings being all-`KEEP`, or from an R7-B/C `status` value scoped to `HUMAN_REVIEW`/`REVISION_REQUESTED`/`AI_REVISION` only). `EditVersion` gains no field of any kind.

**Option R12-B — Review itself has a review-level decision/status field; EditVersion remains unchanged.** Similar to A, but makes concept (3) explicit and directly queryable on the `Review` record (e.g., a status value meaning "clean — no revision requested," distinct from `REVISION_REQUESTED`) rather than purely derived from findings content. Still does not touch `EditVersion`.

**Option R12-C — EditVersion receives a Slice-6 lifecycle field** (e.g., something like `review_status` or a boolean, updated once a `Review` round concludes cleanly).

**Explicit risk statement for R12-C, per instruction, not softened:** any field added to `EditVersion` meaning "this rough cut passed review" sits one short conceptual step from being read — by a future implementer, or by whoever eventually builds Final Approval or Publication — as a stand-in for approval. Even with careful naming (avoiding the literal word "approved"), a status field on `EditVersion` meaning "review concluded cleanly" is functionally adjacent to what Final Approval's own `approval_status` (named in AI Production Contract §F, never implemented) would eventually need to represent. Choosing R12-C without an explicit, separately-designed safeguard (a naming convention, a test asserting the field is never conflated with `FINAL_APPROVED` in any downstream logic) risks Slice 6 becoming a de facto substitute for the Final Approval gate that D-B just deferred. This worksheet does not propose that safeguard's form; it only names the risk so it can be weighed explicitly.

### 5. Concrete consequences
Covered inline above per option; the central consequence distinguishing R12-C from A/B is the authority-boundary risk just stated, not a difference in raw implementation cost.

### 6. Dependencies
- Depends on: D-B (locked, Final Approval deferred), D-D (locked, approval freshness deferred), D-E (locked, no REJECTED state).
- Affects: the authority boundary itself (§11 of `34_`) — whichever option is chosen must be re-checked against that boundary before implementation, and if R12-C is chosen, likely warrants its own new Governance Gap entry flagging the risk explicitly (per `34_` §16).

### 7. What becomes locked if selected
R12-A/B keep `EditVersion` untouched by any review-outcome concept, cleanly separating Rough Cut Review from whatever Final Approval eventually looks like. R12-C creates a field whose long-term meaning would need active, ongoing discipline to keep from blurring into Final-Approval territory.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

# PHASE B — REVISION COUNTING

---

## B1 — OD-R2: Revision Counting Unit

**Presented before OD-R1, deliberately** — a numeric cap is meaningless without first fixing what it counts.

### 1. The exact question

What single event or artifact increments "the revision count" for a given EditPlan lineage?

### 2. Already-known facts

- D-C (locked): revision scope is the `EditPlan` lineage (`supersedes_version` chain). This decision is about the *counting unit within* that scope, not the scope itself.
- `RevisionRequested` events, new `EditPlan` versions, new `EditVersion`s, and completed `Review` rounds are not guaranteed to produce the same count, depending on how OD-R5/OD-R6 are eventually decided.

### 3–4. Options and what each means

**Option R2-A — Count `RevisionRequested` events.** Every time the event fires, the count increments, regardless of whether it immediately results in a new `EditPlan`.

**Option R2-B — Count new EditPlan versions.** The count increments only when `createEditPlan(revisionOf=...)` actually succeeds and produces a new version in the lineage.

**Option R2-C — Count new EditVersions.** The count increments only when a new `EditVersion` is actually generated (via `generateRoughCut`) as a consequence of the revision.

**Option R2-D — Count completed Review rounds.** The count increments once per `Review` round that concludes with a "request revision" outcome (contingent on OD-R10's round-identity mechanism).

**Option R2-E — Another deterministic unit.** Reserved; none proposed here.

### 5. Worked example showing these are NOT interchangeable

Hypothetical, assuming (for illustration only, not as any decision) that `requestRevision` does **not** automatically chain into `createEditPlan` (one possible, not-yet-decided answer to OD-R5):

```
Round 1: human requests revision   → RevisionRequested fires        (R2-A count = 1)
         (createEditPlan not yet called)                             (R2-B count = 0 — no new plan version yet)
Round 1 (retry): human requests revision again,
         still before createEditPlan is ever invoked for this round → RevisionRequested fires again (R2-A count = 2)
                                                                       (R2-B count is still 0)
```

Under R2-A the count is already 2 at a point where R2-B's count is still 0. Which is "the" revision count is exactly what this decision fixes, and the chosen answer materially changes what OD-R1's eventual numeric cap would even be measured against.

### 6. Dependencies
- Depends on: D-C (locked, scope).
- Affects: OD-R1 (the cap number is meaningless without this), OD-R3 (enforcement point must check whatever unit is chosen here), OD-R4 (cap behavior operates on this unit's value), and is itself materially affected by OD-R5 (if `requestRevision` and `createEditPlan` are always automatically chained, R2-A and R2-B converge to the same number by construction; if not, they can diverge as shown above).

### 7. What becomes locked if selected
Whichever unit is chosen becomes the fixed denominator for every subsequent cap-related decision (OD-R1, R3, R4) — changing it later would mean recomputing what any previously-chosen numeric cap (OD-R1) actually meant.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## B2 — OD-R1: Numeric Revision Cap

**Per explicit instruction: this worksheet does not invent a number. `34_`'s conclusion — that there is currently insufficient empirical evidence to responsibly choose a numeric maximum — is preserved unchanged.**

### 1. The exact question

Given the counting unit selected in B1 (OD-R2), what — if any — is the maximum number of revisions permitted per EditPlan lineage?

The actual decision to be made here is: **choose a numeric maximum now, OR explicitly decide that the maximum remains unresolved/deferred until sufficient Slice 6 usage evidence exists.**

### 2. Already-known facts

- AI Production Contract §J poses this as an open question with no candidate number anywhere in any document.
- `27_`'s ISSUE-08 confirms the question is real and explicitly assigned to Slice 6, again with no number attached.
- Slice 6 has not been implemented or used by anyone — there is no usage data anywhere in this corpus that could ground a specific figure.
- What *would* be needed to choose responsibly: actual usage data, or an explicit product judgment about how many AI-assisted revision attempts a human should tolerate before the workflow forces a different kind of intervention (per §J's own framing — "requiring the human to edit outside the system entirely"). Neither exists today.

### 3–4. Options and what each means

**Option R1-A — Choose a finite cap now.** A specific number is fixed as part of this decision, based on whatever judgment the human owner brings to it (this worksheet supplies no number and no suggested range with any number attached — see §5 for the *kinds* of consideration each range implies, without a value).

**Option R1-B — Choose a different finite cap now.** Presented as a structurally distinct choice from R1-A only in that two different specific numbers are two different decisions with two different consequences — this worksheet does not distinguish "R1-A's number" from "R1-B's number" by assigning either of them a value; both remain "a human-supplied finite number," and the worksheet does not suggest which range that number should come from.

**Option R1-C — Defer the numeric cap until empirical Slice 6 usage evidence exists.** No enforced maximum is implemented now; the question is revisited once real usage data exists.

### 5. Concrete consequences (kinds of consideration, not a number)

- A **smaller** finite cap forces human escalation sooner, most aggressively limiting the risk §J names (an unbounded loop), but risks being reached during entirely ordinary, non-runaway editing work.
- A **larger** finite cap behaves closer to unlimited for normal use, while still catching a genuinely runaway sequence — but offers less protection against a fast-moving degenerate loop (e.g., an automated `AI_REVISION` step looping without human pacing) if that loop could reach even a large number quickly.
- **R1-C (defer):** avoids committing to an arbitrary, evidence-free number at all. If this path is chosen, `34_`'s §16 (Governance Impact) already identifies what would later be required: a subsequent, separate decision (not a new ADR on the evidence gathered so far) to set the actual number once real usage exists, plus an update to whichever section of the Implementation Contract currently marks OD-R1 as OPEN.

### For each finite-cap path (R1-A/R1-B), the additional rationale needed

Per instruction, this worksheet states what rationale a finite number would need, without supplying it: (a) which counting unit (from B1) the number is measured against; (b) an explicit statement of the trade-off being accepted between "blocks ordinary work too early" and "fails to catch a genuine runaway loop" for that specific number; (c) whether the number is expected to be revisited after real usage data becomes available, or treated as a stable long-term constant.

### Governance path if R1-C is chosen

If the human owner selects R1-C (defer), `34_`'s own analysis (§16, Governance Impact) already establishes that this does **not** require a new ADR on the evidence gathered so far — it resolves within the space already carved out by D-C (locked) and Architecture §3. It would require: an update to `CVOS_Slice6_Implementation_Contract_v1.md`'s OD-R1 entry, converting it from OPEN to "explicitly deferred, no cap enforced, revisit criteria: [to be specified]," and, separately, whatever OD-R3/OD-R4 decisions are made would then govern only what happens if/when a future cap is eventually set — not enforcement in the interim. **This worksheet does not decide whether deferring is acceptable; it only states, factually, what governance step would follow if it is chosen.**

### 6. Dependencies
- Depends on: B1/OD-R2 (the counting unit this number would be measured against).
- Affects: OD-R3 (what is enforced), OD-R4 (what happens at the limit) — both are only exercised at all if a finite cap (R1-A/R1-B) is chosen; both become dormant/inapplicable if R1-C is chosen, pending a future revisit.

### 7. What becomes locked if selected
A finite cap (R1-A/R1-B) makes OD-R3/OD-R4 immediately load-bearing. R1-C leaves OD-R3/OD-R4 as design decisions for enforcement machinery that has no cap to enforce yet — they would still need answers if/when a cap is eventually set, but nothing is enforced in the meantime.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## B3 — OD-R3: Enforcement Point

### 1. The exact question

At which command/engine boundary, if any, is the revision cap (B2/OD-R1) actually checked?

### 2. Already-known facts

- `CVOS_Slice6_Implementation_Contract_v1.md` §6 names candidate locations without selecting one.
- This decision is only load-bearing if B2/OD-R1 selects a finite cap (R1-A/R1-B); if R1-C (defer) is chosen, this decision's answer determines nothing yet, but may still be worth recording as a placeholder for when a cap is eventually set.

### 3–4. Options and what each means

**Option R3-A — Enforce at `requestRevision`.** The check happens before the human's revision request is even recorded.

**Option R3-B — Enforce before `createEditPlan`.** The check happens at the moment a new plan would actually be created, regardless of what triggered that call.

**Option R3-C — Enforce before `generateRoughCut`.** The check happens one step further downstream, at rough-cut generation time.

**Option R3-D — Warning only.** Rather than blocking any specific command, the cap's crossing is surfaced as a warning without preventing any operation.

**Option R3-E — Explicit human override required.** Whatever blocking behavior is chosen (A/B/C) can be bypassed by a distinct, deliberate human action.

**On combinations, per instruction:** these are not necessarily mutually exclusive. R3-D (warning) could be layered before a hard block at R3-A/B/C is reached, effectively "warn early, block later." R3-E (override) is not itself a location — it is a modifier on whichever location (A/B/C) or behavior (D) is chosen elsewhere; it is listed here as a candidate because the task brief lists it as one, but it more properly overlaps with OD-R4 (cap behavior) than with "where" enforcement sits.

### 5. Concrete consequences

- **What gets blocked:** R3-A blocks the human's revision request from being recorded at all past the cap. R3-B still lets a `Review` record exist (recording "revision requested") while refusing to generate the next plan version. R3-C allows an (N+1)th `EditPlan` to exist without ever being turned into a reviewable `EditVersion`.
- **What remains recordable:** only under R3-B or R3-C does a `Review` record documenting the revision request survive past the cap; under R3-A it does not.
- **Whether human override exists:** a separate axis from *where* enforcement sits (see R3-E note above) — could in principle be layered onto any of A/B/C.
- **Idempotency:** if a human retries the same blocked action, R3-A/B/C must each define what happens on retry (does a second attempt count as a second count-increment, or is the blocked attempt simply not counted at all — this is not resolved by choosing a location alone, and interacts with B1/OD-R2's chosen unit).
- **Stale/unverifiable interaction:** if the (N+1)th `createEditPlan` call would itself be targeting a stale/unverifiable source plan, ADR-022's existing rule (revising is permitted, EDITING/REVISION) and this cap's enforcement are independent checks that could both apply to the same call. No document establishes an ordering or precedence between them — this is flagged as an interaction to design explicitly once both this decision and B2 are made, not resolved here.

### 6. Dependencies
- Depends on: B1/B2 (only meaningful once a counting unit and, if applicable, a finite cap exist).
- Affects: B4/OD-R4 (what happens at the point this decision identifies).

### 7. What becomes locked if selected
The chosen location becomes the sole place any future enforcement logic is written; changing it later would mean moving the check to a different engine/command boundary.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## B4 — OD-R4: Cap Behavior

### 1. The exact question

What actually happens when the revision cap (if any, per B2) is reached at the enforcement point (per B3)?

### 2. Already-known facts

- AI Production Contract §J's own phrasing — "requiring the human to edit outside the system entirely" — is the only textual hint at intended behavior, pointing toward some form of forced escalation rather than either silent continuation or silent blocking, but stopping short of specifying a mechanism.
- This decision is dormant (has nothing to govern yet) if B2/OD-R1 selects R1-C (defer, no cap).

### 3–4. Options and what each means

**Option R4-A — Hard stop requiring human intervention.** The system refuses to proceed further via the B3 enforcement point, and requires some explicit human action (undefined by this worksheet) to unblock.

**Option R4-B — Warning + continue.** The cap is informational only; the operation proceeds regardless. Taken to its limit, this converges toward "no enforced cap" (B2's R1-C), though a persisted/visible warning and the complete absence of any cap are not necessarily identical.

**Option R4-C — Human override required.** The hard stop (R4-A) can be bypassed by a specific, deliberate human action distinct from simply repeating the blocked request.

**Option R4-D — Revision loop terminates and requires a new explicit workflow.** Rather than a "stop and wait," the lineage is marked closed to further AI-assisted revision, forcing any further work to happen "outside the system" (§J's literal words), with no path back in for that specific lineage.

**On combinations, per instruction:** R4-A and R4-C are naturally combinable (a hard stop that can be overridden is a coherent single policy, not two conflicting ones). R4-D is a more severe variant of R4-A (no override path at all, vs. an overridable stop). R4-B stands somewhat apart from the other three, since it does not actually stop anything.

### 5. Concrete consequences

Human authority is kept explicit across every option, per instruction: none of R4-A/B/C/D permits an AI action to autonomously override a human-imposed cap. Whichever behavior is chosen, the cap's enforcement and any override of it must remain human-authorized — this follows directly from CVOS-P7/P8 and is not itself an open question; only the specific mechanism is.

### 6. Dependencies
- Depends on: B2 (only meaningful if a finite cap exists), B3 (the location this behavior is triggered from).
- Affects: nothing further downstream in this decision set.

### 7. What becomes locked if selected
The chosen behavior becomes the system's fixed response at the cap boundary; R4-D in particular would make the cap a one-way door for a given lineage, a materially different commitment than R4-A/C's "pause, then optionally continue."

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

# PHASE C — REVISION CHAINING

---

## C1 — OD-R5: requestRevision → createEditPlan Chaining

### 1. The exact question

Does `ReviewEngine.requestRevision` automatically invoke `EditPlanEngine.createEditPlan`, or do these remain separate operations?

### 2. Already-known facts

- Architecture §3 and `27_`'s ISSUE-07 resolution establish that `requestRevision` is *expected* to eventually result in a call to `EditPlanEngine.createEditPlan(revisionOf, reviewFeedback)` — the existing, tested Slice 5 seam — but no document states whether that call happens automatically or as a separate step.

### 3–4. Options and what each means

**Option R5-A — `requestRevision` only records the human decision; new EditPlan creation is explicit.** `requestRevision` writes the `Review` record and emits `RevisionRequested`, and stops there. A separate, later, independently-invoked action calls `createEditPlan`.

**Option R5-B — `requestRevision` deterministically creates the next EditPlan.** `requestRevision` itself calls `createEditPlan(revisionOf, reviewFeedback)` synchronously, as part of handling the same command.

**Option R5-C — `requestRevision` creates a revision-request event consumed by deterministic orchestration.** The `RevisionRequested` event (already governed) is treated as the actual trigger, consumed by orchestration logic (which may or may not live inside `ReviewEngine`) that then calls `createEditPlan` — decoupled in time/location from the original call, but still automatic rather than requiring a distinct human-initiated command.

### 5. Concrete consequences

- **Authority:** all three remain within the human-authorized zone (§11 of `34_`) — the human's own `requestRevision` action is what ultimately causes the new plan, regardless of which option is chosen; the difference is *when/how* that causation is wired, not *whether* it remains human-authorized.
- **Retry/idempotency:** R5-B's synchronous coupling means a failure partway through (e.g., `createEditPlan` throwing) must be handled as part of the same command's error path. R5-A/C separate the two steps — a recorded `Review`/event with no resulting `EditPlan` yet is a valid, inspectable intermediate state, but also introduces the possibility of a `Review` existing with no corresponding revision ever actually happening if the separate step is never triggered.
- **Failure handling:** as above.
- **User control:** R5-A gives the most explicit control (two distinct actions, two distinct moments of intent); R5-B gives the least (revision is chained automatically); R5-C sits in between depending on how automatic the orchestration step actually is.
- **Event semantics:** R5-C most directly uses `RevisionRequested` as a genuine trigger (rather than a side-effect notification, closer to how R5-B would use it); R5-A leaves the event's consumer entirely undefined.
- **Revision cap interaction:** whichever option is chosen materially affects B1/OD-R2 — R5-B makes "count `RevisionRequested` events" and "count new `EditPlan` versions" equivalent by construction (since one always immediately causes the other); R5-A/C would not.
- **Testing implications:** R5-B is simplest to test (one command, one deterministic outcome); R5-A/C both require testing the two steps independently and, separately, testing that they compose correctly when both occur.

### 6. Dependencies
- Depends on: D-C (locked, revision scope).
- Affects: B1/OD-R2 (as noted above), C2/OD-R6 (whether the chain continues further to auto-generate an `EditVersion`).

### 7. What becomes locked if selected
R5-B commits to a single, synchronous, atomic-feeling revision flow; R5-A/C both preserve an intermediate state (a recorded revision request with no plan yet) that some future workflow or UI could expose or act on.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

## C2 — OD-R6: Automatic EditVersion Generation

### 1. The exact question

Does creation of a new EditPlan (via whichever C1/OD-R5 model is chosen) automatically trigger generateRoughCut to produce a new EditVersion?

### 2. Already-known facts

- Same absence of governing text as OD-R5, one layer downstream — no document states whether a newly created `EditPlan` revision automatically triggers `EditEngine.generateRoughCut`.
- Slice 5 itself never chains `createEditPlan` and `generateRoughCut` automatically today (re-confirmed against `src/209_EditPlanEngine.js`/`src/210_EditEngine.js`) — these are two separate commands on two separate engines.
- `generateRoughCut` is classified as an EXECUTED-class action (CVOS-P8/P9); `createEditPlan` is classified as a Decision-class action (Contract v1 §3–5). No option below reclassifies either.

### 3–4. Options and what each means

**Option R6-A — New EditPlan only; `generateRoughCut` remains explicit.** Mirrors the existing Slice 5 pattern exactly — a separate, later, explicitly-invoked action is required to produce a new `EditVersion`.

**Option R6-B — New EditPlan automatically triggers `generateRoughCut`.** Both a new `EditPlan` version and a new `EditVersion` are produced in one continuous, automatic sequence, with no separate human or system action required in between.

**Option R6-C — A deterministic orchestration layer may trigger `generateRoughCut` only under explicit conditions.** The system is *capable* of automatically generating a new `EditVersion` once a new `EditPlan` exists, but only does so upon a distinct, explicit trigger (a command, a flag, or similar) rather than unconditionally.

### 5. Concrete consequences

- **Execution boundary:** unaffected in classification terms by any option — `generateRoughCut` remains EXECUTED-class regardless of what triggers it (§10 of `34_`). If R6-B or R6-C is chosen, whatever triggers the automatic call must still satisfy CVOS-P9's re-validation requirement (the upstream `EditPlan`'s provenance must still be checked before `generateRoughCut` proceeds) — this is not a new requirement, but an explicit reminder that automating the trigger does not exempt the call from existing, frozen governance.
- **Failure handling:** R6-B's automatic chaining means a `generateRoughCut` failure must be handled as part of the same overall revision flow as whatever triggered it; R6-A/C keep the two steps separable.
- **Stale/unverifiable behavior:** unchanged regardless of option — a stale/unverifiable `EditPlan` still blocks `generateRoughCut` exactly as today (ADR-022/CVOS-P9), whether the call is manual (R6-A) or automatic (R6-B/C).
- **User control:** highest under R6-A (fully manual); lowest under R6-B (fully automatic); R6-C is conditional.
- **Testing:** R6-A requires no new chaining tests beyond what already exists; R6-B/C require new tests confirming the automatic trigger fires correctly and still respects CVOS-P9.
- **Interaction with A5/OD-R11:** **explicitly preserved from `34_`, not converted into a recommendation here** — if every revision automatically generates a new `EditVersion` (R6-B, or R6-C when its condition is met), multiple `EditVersion`s per `EditPlan` become the *normal*, expected case for any lineage with more than one revision round, rather than a rare edge case. This materially raises the practical stakes of OD-R11 (whether a "current" marker is needed), since under R6-A (fully manual generation) multiple live `EditVersion`s might be rarer and less urgent to disambiguate, while under R6-B they would exist after essentially every revision. This is stated as a dependency to weigh, not as a reason to prefer any particular combination of answers.

### 6. Dependencies
- Depends on: C1/OD-R5 (whichever chaining model is chosen there governs how R6's trigger, if automatic, would itself be invoked).
- Affects: A5/OD-R11 (as detailed above).

### 7. What becomes locked if selected
R6-A keeps `EditVersion` generation a fully separate, manually-triggered step forever (unless revisited); R6-B commits to always producing a new `EditVersion` on every revision, which — combined with whatever A5/OD-R11 answer is chosen — determines how urgently a "current EditVersion" concept is needed.

### Human Decision

Selected option:
[ ]

Decision:
[ ]

Rationale:
[ ]

Dependencies / follow-up decisions:
[ ]

---

# Cross-Decision Consequences

No combination below is ranked. Each is presented purely as "what this combination would mean architecturally."

### Combination 1 — R11-A + R12-A

`EditVersion` remains exactly as Slice 5 left it (no current marker, no lifecycle field). `Review` carries only findings, with no approval-like field anywhere, and "which EditVersion is under review" is answered purely by direct `id` reference on each `Review` record. Architecturally, this is the combination that changes the least about the existing Slice 5 entity surface — both `EditVersion` and the review-outcome concept live entirely within new, additive structures (`Review`), touching nothing that Slice 5 already closed.

### Combination 2 — R11-B + R12-B

`EditVersion` gains no new persisted field, but a computed "current" rule exists for selection purposes (R11-B), and `Review` gains an explicit review-level status field distinguishing "clean" from "revision requested" outcomes (R12-B). Architecturally, this adds a modest amount of derived logic (the current-selection rule) and a modest amount of explicit schema (the status field) without introducing any new mutable state anywhere.

### Combination 3 — R11-C + R12-C

`EditVersion` gains a mutable "current" pointer (R11-C) and a separate lifecycle/approval-like field (R12-C). Architecturally, this is the combination that most changes the character of the `EditVersion` entity — introducing both the first mutable field in the EditPlan/EditVersion/Review cluster (per A5's analysis) and a field carrying authority-boundary risk (per A6's analysis) on the same entity, simultaneously. Whether that combination is acceptable, redundant, or synergistic is not evaluated here.

---

### Revision-Cap Policy as One Coherent Whole

B1 (counting unit) + B2 (numeric cap or deferral) + B3 (enforcement point) + B4 (cap behavior) together form a single, coherent revision-cap policy — no one of the four can be meaningfully evaluated in isolation from the other three. For example: choosing B1 = "count RevisionRequested events," B2 = a finite cap, B3 = "enforce at `requestRevision`," and B4 = "hard stop" together describe a system that refuses to even record a human's Nth-plus-one revision request outright. Choosing the same B1/B2 but B3 = "enforce before `generateRoughCut`" and B4 = "warning + continue" instead describes a system that always lets a human ask for another revision and always generates the plan, but merely flags (without blocking) when a rough cut is generated beyond the cap. These are materially different systems built from the same four decisions in different combinations — this worksheet does not indicate which combination is more coherent or more desirable, only that all four must be answered together for the policy to be well-defined.

---

## Decision Summary Table

| ID | Decision | Human answer |
|---|---|---|
| OD-R7 | Review schema | R7-C (decided) |
| OD-R8 | Reviewer identity | R8-B (modified) — Required Custom Reviewer Identity (decided) |
| OD-R9 | Findings | [ ] |
| OD-R10 | Review round identity | [ ] |
| OD-R11 | EditVersion current marker | [ ] |
| OD-R12 | Rough Cut approval-like field | [ ] |
| OD-R2 | Revision counting unit | [ ] |
| OD-R1 | Numeric revision cap | [ ] |
| OD-R3 | Enforcement point | [ ] |
| OD-R4 | Cap behavior | [ ] |
| OD-R5 | requestRevision chaining | [ ] |
| OD-R6 | Automatic EditVersion generation | [ ] |

---

## Preservation Note

Every candidate option presented in this worksheet — including every option not ultimately selected — remains recorded here and in `32_`/`33_`/`34_` with its full trade-off analysis. This worksheet is not a recommendation document; it makes no ranking and states no preferred option anywhere above. Nothing here should be read as narrowing the retained-alternatives record already established in `33_` §§11–15 or `34_`'s per-decision analysis — this document only reorganizes and re-presents that material in a dependency-aware, fill-in-the-blank form for the human owner's use.

---

## Required Status

**Decision Worksheet Status:** READY FOR HUMAN INPUT

**Slice 6 Implementation:** NOT AUTHORIZED

**Implementation Contract:** UNCHANGED

**Code:** UNCHANGED

**Tests:** UNCHANGED

**ADR:** UNCHANGED

**Package:** UNCHANGED

**Next step:** human answers OD-R7 through OD-R12, OD-R2, OD-R1, OD-R3, OD-R4, OD-R5 and OD-R6. After the decisions are explicitly recorded, perform a separate controlled Contract update.
