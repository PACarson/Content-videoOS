# CVOS — ADR-022 Final Draft & Change Plan

**性质：** 只读治理任务交付物。本文件的 ADR 文本状态明确为 `PROPOSED — PENDING USER APPROVAL`，不是已生效的 ADR，没有写入任何 repository 档案，不构成 Slice 5 实作授权。

---

## 1. Verification Findings

本轮重新、独立核实（不沿用先前报告的数字，逐项标注证据等级）：

| # | 项目 | 核实结果 | 证据等级 |
|---|---|---|---|
| 1 | ADR 编号连续性 | `ADR-001`至`ADR-021`连续无缺号，`021`为当前最新 | E1（本轮重新 `grep`） |
| 2 | ADR-014 Slice Map | Phase 1 垂直切片：`Idea → Production Package → Production Go → Media → AI Analysis → Rough Cut Review`；Slice5(EditPlanEngine+EditEngine)属于其中两段 | E1 |
| 3 | CVOS-P9 准确要求 | 第345行：「An approval is valid only against the exact artifact, version, and upstream state that was actually reviewed...before any EXECUTED-class transition...the executing engine re-validates...If they've drifted...the dependent artifact is flagged and blocked from further execution until a human re-confirms.」第322行 cross-cutting rule：「gated...at the moment execution is attempted」 | E1（本轮重新读取原文，逐字抄录，非转述） |
| 4 | ADR-015 先例 | 用正交欄位对（`authorization_valid`/`invalidation_reason`/`invalidated_at`）表达"是否仍可信"，不动主生命周期栏位；明文「additive clarification of an already-required behavior...Not a reopening of Phase 0」 | E1 |
| 5 | ADR 正式格式/登记位置 | 单一表格，`00_..._Architecture_Governance_v0.1.md` §15，无独立 index 档案 | E1 |
| 6 | AI Production Contract §F 现况 | Edit Plan Schema，17 栏位（见下） | E1 |
| 7 | EditPlan schema 栏位数 | **17**——本轮重新用 `sed -n '153,169p' \| grep -c "^\| "`独立核算，与前两轮报告一致，无新落差 | E1 |
| 8 | `MediaAsset.latest_analysis_id` | 定义於§E（"convenience pointer only"）；`109_MediaAsset.js`第54行初始值为`null`（尚未分析过的素材）；`208_MediaAnalysisEngine.js`每次成功分析后更新为最新记录的 id | E1 |
| 9 | Slice5当前状态 | 全 repo 搜索`*editplan*`/`*editengine*`——**零命中**，确认目前完全没有任何真实 EditPlan/EditEngine 代码或资料存在 | E1（本轮重新搜索确认） |

**本轮核实结果与先前报告没有发现任何不一致。**

---

## 2. Proposed ADR-022 — PENDING USER APPROVAL

> | `ADR-022`（暂定，待正式分配与批准） | **EditPlan MediaAnalysis Provenance, Staleness & Unverifiable-State Handling** (owner-directed, Slice 5 ISSUE-01 Semantic Resolution) | **`PROPOSED — PENDING USER APPROVAL`** |
>
> **Context：** Edit Plan Schema（§F）目前没有任何机制记录一份 EditPlan 依据哪个/哪些 `MediaAnalysis` 记录生成。CVOS-P9（§7）与 `EditPlanEngine`自己命名的 failure mode（"The plan references a MediaAsset since re-analyzed as unusable"）都已经要求这种上游漂移必须能被侦测並在任何后续 EXECUTED-class 动作前被拦截——但目前没有任何欄位让这个要求真正可以被检查。
>
> **Decision — Provenance（只规定语意，不冻结 schema）：** `EditPlanEngine.createEditPlan`必须为每一个**实际出现在**产出结果 `selected_clips`或`broll_insertions`里的、相异的 `MediaAsset`，保留足以确认"当时依据的是哪一条确切 `MediaAnalysis`记录"的资讯；AI 考虑过但未选入这两个结构的素材不需要被记录。**本 ADR 只规定这项能力，不指定欄位名称或物件形状**——这些留给 Implementation Gate（见下方 Deferred Decisions）。`analysis_version`不得被当成跨 asset 的比较键——它是单一 asset 内部的、append-only 的序号，不是全域排序值。
>
> **Decision — Staleness（身份判准）：** 对每一笔被记录的素材，若该素材**当前**的`MediaAsset.latest_analysis_id`已经不等於建立当下记录的那个 `MediaAnalysis`身份，该 EditPlan 对这个素材的分析依据即为 stale——判准是**身份**，不是时间戳，也不是内容相似度比对。即使新记录的欄位数值恰好与旧记录相同，只要身份不同，仍判定为 stale。
>
> **Decision — Unverifiable state（与 stale 明确区分）：** 一份 EditPlan 若其记录的 provenance 缺失、不完整、或无法解析到一条真实存在的 `MediaAnalysis`记录，**不是**一个可以被容忍的"旧资料/legacy"状态——因为 Slice 5 目前尚未实作，系统里不存在任何需要相容迁移的真实 EditPlan 资料。这种情况是**实作缺陷／无法验证状态**。遇到时必须**停止当下操作並明确报告**这个状况；不得被静默当作有效，也不得被静默当作"只是 stale"处理——stale 与 unverifiable 是两个不同的情况（stale＝参照解析得到，但已经不是当前版本；unverifiable＝参照本身根本无法解析或核实）。
>
> **Decision — Stale/Unverifiable Plan 的处理边界：**
> - 旧的、已被取代的 EditPlan **绝不删除**，始终**可读取**。
> - 不得静默覆写它、静默用别的版本取代它、或未经检查就假设它仍然有效。
> - 任何 EXECUTED-class 动作（依 CVOS-P9）在分析依据 stale 或 unverifiable 的情况下**不得继续**——该动作必须停止並报告原因，不得试图绕过或猜测性地继续。
> - 本 ADR 的文字**不应被解读为**目前已经存在一套完整的 stale-resolution workflow——这里只定义"侦测到时必须怎么反应"的边界，不是完整流程。
>
> **Decision — Editing 与 Execution 明确分开：** "允许编辑一份 stale EditPlan"与"允许执行一份 stale EditPlan"是两个不同的问题。本 ADR **不预先决定**前者（编辑 stale plan 是否被允许，留给 Implementation Gate），但**明确不授权**后者——无论后续怎么决定编辑规则，stale/unverifiable 状态下的 EXECUTED-class 动作在本 ADR 下永远不被允许直接进行。
>
> **Consequences：** Edit Plan Schema（§F）未来需要增加 Implementation Gate 最终决定的欄位/结构，才能真正承载上述 Provenance 能力——**这个欄位新增不是本 ADR 生效当下就要做的事**（见 §3/§4）。CVOS-P9 原文、Edit Plan Schema 其余 17 个既有欄位、`MediaAsset.latest_analysis_id`、MediaAnalysis 的 append-only 语意，皆不变。这是对一个既有要求（CVOS-P9＋EditPlanEngine 自己命名的 failure mode）的附加性澄清，不是重开 Frozen Architecture。
>
> **与既有 ADR 的关系：** 结构上比照 ADR-015（当初为 ProductionPlan 新增正交的 validity/invalidation 表示法，理由同样是"CVOS-P9 早就要求这个效果，只是还没有欄位可以表示"）——本 ADR 是同一类型的动作，用於 EditPlan，但范围刻意收得更窄（只规定语意，不像 ADR-015 那样直接命名具体欄位）。

---

## 3. Exact Change Plan

| File | Section | Proposed Change | Reason | Scope |
|---|---|---|---|---|
| `00_ContentVideoOS_Architecture_Governance_v0.1.md` | §15 ADR List | 新增 ADR-022 整条（§2 文本） | 这是全 repo 唯一的 ADR 登记处，ADR-019/020/021 都在这张表里 | **採纳本 ADR 唯一必要的档案变更** |
| `00_ContentVideoOS_AI_Production_Contract.md` | §F Edit Plan Schema | **本 ADR 生效当下不修改** | 本 ADR 刻意只规定语意/能力要求，不指定欄位名称或形状——实际新增欄位是后续、独立的一步（由 Implementation Gate 或专门的小型 schema 更新任务执行），不是採纳 ADR-022 的必要条件 | 不在本次范围——延后 |
| `01_ContentVideoOS_Phase1_Implementation_Map.md` | EditPlanEngine+EditEngine 章节 | 可选：加一行「见 ADR-022」的指标 | 方便未来实作者查找，非必要 | 可选，非必要 |
| `27_ContentVideoOS_Slice5_Authorization_Readiness_Gate.md` | Issue-01 | **不修改** | 既有惯例：历史报告不回头改写；ADR-022 一旦生效是**新的、取代性的证据**，不是拿去修正旧报告 | 不修改 |
| README.md | — | **不修改** | 没有任何操作指令涉及 provenance 的具体呈现 | 不修改 |
| Slice 1–4 既有 `src/`/`test/`/`scripts/` | — | **不修改** | 与本 ADR 无关，Slice5尚不存在任何代码 | 不修改 |

**没有为了"看起来更完整"而扩大这张表的范围**——真正必要的变更只有第一行。

---

## 4. Schema Impact

- **当前 EditPlan schema 栏位数：** 17（§1 第7项，本轮重新核算，证据 E1）。
- **本 ADR 对 schema 的直接影响：** **无**——本 ADR 的 Decision 文字本身不命名任何新欄位，不修改 §F 这张表格。这是本任务 Deliverable C 明确提出的问题（"ADR 是否应只规定语义，而不提前冻结实现结构"）的直接回答：**是，应该只规定语意**——理由是任务书 §3 已经把"最终字段名称、最终 object/schema shape"明确列为要留给 Implementation Gate 的事项；若 ADR 本身就写死一个具体欄位名，等於是本任务自己越权做了那个决定。
- **未来影响（不是本 ADR 自身，是后续步骤）：** Implementation Gate 敲定形状后，§F 会实际新增至少一个能承载"素材 id + 对应分析记录身份"的结构——纯粹举例性质、非本 ADR 决定：类似 `{asset_id, analysis_id}`这样的组合，但具体命名/是否用 list、map 或其它形式，一概留白。
- **不得仅凭栏位数推断 schema 已经被改动：** 本轮核实的"17"就是本 ADR 生效前后**都一样**的数字——本 ADR 通过与否，不影响这个数字，因为本 ADR 本身不碰 schema。

---

## 5. Open Questions / Deferred Decisions

**Deferred to Implementation Gate（任务书 §3 已经列出的，不重複）：** 最终欄位命名/形状、provenance 产生与储存的机制细节、stale plan 是否可编辑、stale-plan 重新生成是自动还是需要人类发起、该重新生成是否需要人类确认、event/UI/操作者呈现方式。

**本轮新发现、值得明确提请用户注意的一项开放问题（不属於任务书 §3 清单，也不是 A–F 已经回答的）：**

> `EditPlanEngine.createEditPlan`被用於"修订既有 plan"这个情境时（即针对一份**已经被判定 stale**的 plan 发起修订），这个"修订"呼叫本身算是 D 条款讲的"EXECUTED-class 动作"（因此在 stale 时同样必须停止並报告），还是算 F 条款讲的"编辑"（因此本 ADR 不预先决定，可能被允许，甚至可能就是"解决 stale 状态"的正常手段）？——A–F 没有直接回答这个问题；本 ADR 草案的 Decision 文字也刻意没有替这个问题预设答案，因为这牵涉"修订"与"执行"两个概念在 EditPlan 生命週期中如何互动，性质上比其它已列出的 G1 级细节更接近一个需要用户或 Implementation Gate 明确表态的语意问题，而不是纯实作手法。

**没有发现其它未被伪装成已批准决策、却其实仍然开放的项目。**

---

## 6. Scope Compliance Declaration

- **No files modified：** 是——本任务全程只读（`grep`/`sed`/`find`），没有对任何 repository 档案执行写入。
- **No code written or changed：** 是。
- **No tests added or changed：** 是。
- **No Slice 5 implementation started：** 是——本轮重新搜索确认 `EditPlan`/`EditEngine`相关档案仍是零命中。
- **No runtime execution performed：** 是——没有执行任何会产生副作用的指令，只有唯读的 `grep`/`sed -n`/`find`。
- **No implementation authorization inferred from this task：** 是——本文件的存在、乃至用户日后批准 §2 的 ADR 文本，都**不**等同 Slice 5 Implementation Authorization Gate 已经通过。

---

## 7. Recommended Next Gate

1. 用户审阅 §2 的 ADR-022 完整文本，批准、要求修改，或否决。
2. 批准后，由一个独立的执行任务把文本实际写入 `00_..._Architecture_Governance_v0.1.md` §15（分配真正编号，很可能是 `022`，但以当时实际检查为准），並把状态从 `PROPOSED`改为 `APPROVED`——本任务不代为执行。
3. §F Edit Plan Schema 的实际欄位新增，留到 Implementation Gate 阶段（或其专属的小型后续任务）一併决定並写入，不需要在这一步就做。
4. 上述两步完成、经独立验证后，才重新开启 **Slice 5 Implementation Authorization Gate**，届时需要一併处理 §5 本轮新发现的"修订 vs 执行"开放问题，以及 `27_`原有 Issue-02～09。
5. 本文件本身**不会**让任何一个 Gate 自动通过——每一步都还是需要用户单独批准。
