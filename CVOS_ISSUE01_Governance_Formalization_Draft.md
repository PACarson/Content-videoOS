# CVOS — ISSUE-01 Approved Semantic Decision: Governance Formalization Draft

**性质：** 只读治理草案撰写任务的交付物。本文件里的 ADR 草案文字**尚未生效**——没有写入任何 repository 档案，没有分配正式编号，不构成 ADR 已通过，也不构成 Slice 5 实作授权。

---

## 1. Fresh Verification Results

本轮重新、独立核实（不沿用上一份 Proposal 的陈述）：

| # | 项目 | 核实结果 | 位置 | Evidence |
|---|---|---|---|---|
| 1 | 当前 ADR 编号连续性/最新编号 | `ADR-001`至`ADR-021`连续无缺号，`021`为当前最新（Canonical Structure=LAYERED，本会话稍早正式记录） | `00_..._Architecture_Governance_v0.1.md` §15 | E1（本轮重新 `grep -oE`列出全部 21 个编号） |
| 2 | ADR-015 完整原文 | 「`AUTHORIZATION_INVALIDATED` is **not** a third value of ProductionPlan's primary lifecycle state...A separate, orthogonal field pair — `authorization_valid: boolean`...plus `invalidation_reason` and `invalidated_at`...This is an additive clarification of an already-required behavior...Not a reopening of Phase 0 — CVOS-P9's text is unchanged.」 | 同文件第 446 行 | E1 |
| 3 | ADR-014 对 Slice 5 范围定义 | 「Phase 1 is a minimal, real, end-to-end vertical slice — `Idea → Production Package → Production Go → Media → AI Analysis → Rough Cut Review`」——Slice5(EditPlanEngine+EditEngine)属于这条垂直切片中"→Rough Cut Review"前的两段 | 同文件第 445 行 | E1 |
| 4 | CVOS-P9 相关段落数量与原文 | 全文档 8 处提及；核心定义在第 345 行（"An approval is valid only against the exact artifact, version, and upstream state..."），cross-cutting rule 在第 322 行 | 同文件 | E1 |
| 5 | EditPlan schema 栏位数量 | **17**——本轮用 `sed -n '152,169p' \| grep -c "^\| "`重新独立核算，与上一份 Proposal 的更正结果一致（非新错误，是二次确认） | `00_..._AI_Production_Contract.md` 第 152–169 行 | E1 |
| 6 | `MediaAsset.latest_analysis_id` | 定义於 §E 第 129 行（"convenience pointer only"）；`src/109_MediaAsset.js`第54行初始`null`；`src/208_MediaAnalysisEngine.js`第87行每次`analyzeMedia`成功后更新为新记录的`id` | 上述三处 | E1 |
| 7 | MediaAnalysis append-only/`analysis_id`/`analysis_version` | 11 栏位（本轮重新核算：**第一次尝试因为把表头列一併算入误得12，随即发现並修正范围重算得11**——如实记录这个过程，不是隐藏后才给出正确数字）；`analysis_version`定义为"append-only — re-analysis creates a new record, never overwrites one"，其数值语意是**单一 asset 内部的递增序号**，不是跨 asset 的全域版本号 | 同文件第 135–145 行 | E1 |
| 8 | EditPlanEngine/EditEngine 现有合约中 ISSUE-01 相关内容 | `Failure mode: The plan references a MediaAsset since re-analyzed as unusable (stale state)`（第207行）；Stale-state note（第264行，"surfaces the staleness as an explicit condition"） | `00_..._Architecture_Governance_v0.1.md` | E1 |

**本轮没有发现任何一项与 D1–D5 已批准的语意方向存在实质冲突**——可以继续起草，不需要停下来报告冲突。

---

## 2. Governance Form Recommendation

**建议：新增一条 ADR（若批准，依当前序号将是 `ADR-022`——这是基于当前 §15 止于 `ADR-021`的推算展示，不是本任务自行分配的正式编号）。**

依据：本次决定牵涉对一份 Frozen 文件（AI Production Contract §F Edit Plan Schema）新增一个栏位——这个份量与性质，跟 `17_`（G2，纯边界语意厘清、不动任何 schema、结论是`NO ADR REQUIRED`）不同，反而与 **ADR-015** 的情境几乎一模一样：CVOS-P9 早就要求某个效果，只是当时的 schema 还没有栏位可以代表它。ADR-015 当初就是用一条新 ADR、而不是一份轻量 Resolution 备忘来处理同类情境的。为了保持治理格式的一致性（同类问题用同类程序处理），本任务建议比照 ADR-015 的先例。

---

## 3. Complete Draft

以下文字採用 repository 既有 ADR 条目的格式与用语惯例（比对 ADR-015/ADR-020 的写法）——**这是草案，尚未生效，尚未获得正式编号**：

> | `ADR-02X`（暂定，待正式分配） | **EditPlan MediaAnalysis Provenance & Staleness** (owner-directed, Slice 5 ISSUE-01 Semantic Resolution): the Edit Plan Schema (§F) gains one additional field — illustratively `analyzed_media_refs: list of {asset_id, analysis_id}` — recording, for every distinct `MediaAsset` that actually appears in `selected_clips` or `broll_insertions` at the moment an EditPlan (or an EditPlan revision) is created, the exact `MediaAnalysis` record (`analysis_id`) that informed that inclusion. A `MediaAsset` an AI Edit Planner considered but did not select into either list is not recorded. `analysis_version` is never used as the comparison key across assets — it is a per-asset, append-only sequence number, not a global ordering value. Staleness is determined by **identity**, not content: for each recorded `{asset_id, analysis_id}` pair, if the referenced `MediaAsset`'s current `latest_analysis_id` no longer equals the recorded `analysis_id`, that EditPlan's analysis basis for that asset is stale — even when the newer `MediaAnalysis` record's field values are identical to the recorded one's. A stale EditPlan is never deleted, never rendered unreadable, and never silently treated as superseded; staleness must be surfaced as an explicit, checkable condition, and no EXECUTED-class action (per CVOS-P9, §7) may consume a stale EditPlan's analysis basis without that condition being resolved. This ADR does **not** decide: whether a stale EditPlan is regenerated automatically or only on human-initiated revision; whether such regeneration requires human confirmation; under what conditions, if any, a stale EditPlan may still be edited; or the exact field name, internal object shape, event-payload representation, or UI treatment of staleness — these remain open for the Slice 5 Implementation Authorization Gate. This is an additive clarification of an already-required behavior — CVOS-P9 (§7) and EditPlanEngine's own already-named failure mode ("The plan references a MediaAsset since re-analyzed as unusable") already required this effect; the Edit Plan Schema simply hadn't had a field to represent it. Not a reopening of Phase 0 — CVOS-P9's text, the Edit Plan Schema's other sixteen fields, `MediaAsset.latest_analysis_id`, and MediaAnalysis's append-only semantics are all otherwise unchanged. | `APPROVED`（待用户批准后方可如此标注；本草案本身不预设已通过） |

---

## 4. Schema / Compatibility Impact

**Schema impact：** Edit Plan Schema（§F）将从现有 17 栏位增加为 18 栏位——**本任务不决定最终栏位命名或内部物件结构**；草案里的 `analyzed_media_refs: list of {asset_id, analysis_id}` 只是示例性写法，供用户审阅时参考，最终命名/形状应由用户批准草案时一併确认，或明确留给 Implementation Gate。

**Compatibility / 既有 EditPlan 如何被识别：** 目前系统里**不存在任何真实 EditPlan 记录**（Slice 5 尚未实作）——所以这不是一个"既有资料要不要回填"的迁移问题，而是一个前瞻性的实作设计问题：未来的 Slice 5 实作，如果因为任何原因产生了一个没有这个新栏位（或栏位为空）的 EditPlan 记录，读取端应该怎么对待它？至少有两种处理方向（比较，不选边）：(a) 视为"provenance 未知"，保守地当作需要人类重新确认才能继续下游动作；(b) 视为实作缺陷，因为 Slice 5 一旦被这条 ADR 约束，任何`createEditPlan`产生的记录本来就该带有这个栏位。**本任务不替用户决定 (a) 或 (b)**——这应该留给 Slice 5 Implementation Authorization Gate 明确写清楚。

---

## 5. Cross-Document Impact Matrix

| 文件 | 分类 | 理由 |
|---|---|---|
| `00_ContentVideoOS_AI_Production_Contract.md`（§F Edit Plan Schema） | **必须同步** | 新栏位的权威定义位置，草案批准后需要实际加进这张表 |
| `00_ContentVideoOS_Architecture_Governance_v0.1.md`（§15 ADR List） | **必须同步** | 新 ADR 条目本身的落脚处，与 ADR-021 用同一张表 |
| `01_ContentVideoOS_Phase1_Implementation_Map.md`（EditPlanEngine+EditEngine 章节） | **可能需要** | 可以加一句指向新 ADR 的引用，方便未来实作者一眼看到，但不加也不影响正确性，属于锦上添花 |
| `27_ContentVideoOS_Slice5_Authorization_Readiness_Gate.md` | **不应修改** | 依既有治理惯例（"不重写历史报告"——比照 `12_`已知陈述被后续文件更正、但原文保留不动的先例），`27_`的 Issue-01 应保留其"当时仍是开放问题"的原始记载；新 ADR 一旦正式生效，会是**取代**`27_`该项结论的后续证据，不是回头修改 `27_`本身 |
| README.md | **不应修改** | 没有任何操作性命令涉及 EditPlan provenance 的具体呈现方式，与本决定无直接关联 |
| 既有 `src/`/`test/`/`scripts/`（Slice 1–4） | **不应修改** | 与 Slice 4 及之前完全无关 |
| 本任务上一轮产出的 Semantic Resolution Proposal（未编号档案） | **不应修改** | 是讨论过程的历史存档，不因后续决定而回头改写 |

---

## 6. Unresolved Questions

依照指示，只列**确实尚未决定、且无法安全留给 Implementation Gate**的项目——D1–D4 已批准，不在此重複提出：

1. **§4 提到的"provenance 缺失时如何对待既有 EditPlan"的处理方向（(a) 保守视为需要重新确认，或 (b) 视为实作缺陷）**——这不是 D1–D4 涵盖的范围，也不是显而易见能留给实作者自行拍板的细节，因为它直接决定 Slice 5 上线初期的行为是偏保守还是偏宽松，建议用户在批准草案的同时一併表态，或明确指示"留给 Implementation Gate"。

除此之外，本轮没有发现其它无法安全留给 Implementation Gate 的开放问题——D1–D4 已经把语意决定收得足够窄，`27_`原本的 Issue-02～09 性质上仍然全部是 G1 级细节，不需要在这里重新讨论。

---

## 7. Proposed Next Gate

1. 用户审阅并确认（或修改）§3 的草案文字，包含栏位命名/形状是否维持示例写法。
2. 用户批准后，由后续一个明确的、独立的执行任务，把草案文字实际写入 `00_..._Architecture_Governance_v0.1.md` §15（分配真正的 `ADR-022`）与 `00_..._AI_Production_Contract.md` §F（新增栏位）——**本任务不代为执行这一步**。
3. 该编辑完成、经独立验证（比照 `25_`当初新增 ADR-021 时"diff+md5确认 ADR-001~020 逐字未动"的同一验证纪律）后，才重新开启 **Slice 5 Implementation Authorization Gate**——该 Gate 需要明确引用新 ADR 关闭 ISSUE-01，並重新确认 `27_`其余 Issue-02～09 的处理方式（解决或明确留待实作）。
4. **这个 Gate 本身不会因为本文件的存在而自动通过**——本文件只是让 Issue-01 从"开放的语意问题"变成"有草案可审的治理提案"，中间仍需要用户批准与实际写入两个独立步骤。

---

## 8. Files Modified

**NONE.**

## 9. Slice 5 Implementation Started

**NO.**

---

**区分声明（依任务要求）：**
- **既有事实：** §1 全部内容。
- **用户已批准的语意（D1–D5）：** 本文件通篇引用、未重新开放、未擅自改写。
- **Claude 的程序性建议：** §2（ADR 形式建议）、§3 草案文字本身（含示例栏位命名）、§4(a)/(b) 选项列举、§7 后续步骤建议——全部是建议，不是决定。
- **仍待用户批准的治理文本：** §3 完整草案；§6 唯一一项未决问题。
