# Content Video OS — Slice 5 Authorization Gate: Readiness Audit

**文件编号：** 27
**性质：** 纯只读稽核任务——本任务未修改任何生产代码、测试、脚本、README、ADR 或治理文件。不是实作任务，本报告的任何结论都不构成 Slice 5 实作授权。

---

## 1. Executive Summary

Slice 5（`EditPlanEngine` + `EditEngine`）的范围边界本身**异常清晰**——这在很大程度上是 Slice 4 自己的授权过程（`16_`/`18_`/`20_`）已经把边界问题处理掉的直接结果：三个独立权威来源（`01_`§3 Slice 表、ADR-014、`16_`自身的排除性 Scope Matrix）交叉一致，且本轮重新核对全部成立。领域契约本身（EditPlan/EditVersion 栏位 schema、engine 职责/命令/事件、AI 权限三分层、人类关卡序列）在既有 Phase 0 冻结文件里**具体到栏位级别**，不是抽象原则——这比典型的"下一个 Slice 该做什么"更具体。

但本轮稽核发现**一个实质性、需要人类决定的规格缺口**（Issue-01：EditPlan schema 没有任何欄位记录"这个决定是根据哪个/哪些 MediaAnalysis 版本做的"，但 CVOS-P9 与 EditPlanEngine 自己命名的 failure mode 都明确要求侦测"MediaAsset 被重新分析后 EditPlan 变成 stale"——没有溯源欄位，这个既有不变量无法被干净地实作，只能靠实作者自行发明欄位）。另外还有几个较轻量、性质上更接近 Slice 4 当初"G1 级留给实作时决定"的细节缺口（Issue-02～04）。

**Gate Disposition: `CONDITIONALLY READY — HUMAN DECISIONS REQUIRED`**（见 §16）——不是 `NOT READY`，因为没有发现任何矛盾或安全控制缺失；也不是无条件 `READY`，因为 Issue-01 这类缺口如果留给实作者自行静默决定，会重演 Slice 4 当初"MediaAsset.status=ANALYZED 到底是不是新发明状态"那种、事后才发现的治理风险。

---

## 2. Scope and Non-Goals

本任务：稽核 repo/治理/ADR/Slice 4 实作/既有测试证据，判断 Slice 5 是否已充分定义到可以交给一个独立的 Implementation Authorization Gate 去做实作授权决定。

本任务不是：Slice 5 实作、Slice 5 授权本身、架构升级、ADR 修改。本轮**没有修改任何档案**——全程只读（`view`/`grep`/只读执行 `node --test`）。

---

## 3. Repository / Governance Evidence

- **Canonical package/working-copy 路径：** `/home/claude/review/canonical/`（对应已交付的 `Content-videoOS-Canonical-Layered-ADR021.zip`，`26_` 已核实 SHA-256 一致）。[E1]
- **Layered 结构：** `src/`/`test/`/`scripts/` 三层齐全，本轮 `node --test` 重新确认 114/114 pass, 0 fail。[E1]
- **ADR-014**（Phase 1 scoping principle）：本轮重新读取原文，定义 Phase 1 垂直切片为 `Idea → Production Package → Production Go → Media → AI Analysis → Rough Cut Review`，Publication/Analytics/Content Learning 明确延后。[E1]
- **ADR-019/ADR-020/ADR-021：** 本轮重新确认三者皆存在于 §15，状态 `APPROVED`，与 Slice 5 范围无冲突（ADR-019/020 是 Shoot/Take 相关，ADR-021 是纯 package 结构，三者都不触及 EditPlan/EditEngine 领域内容）。[E1]
- **Slice 5 范围跨文件一致性：** `01_`§3 Slice 表（`5 | EditPlanEngine, EditEngine | Slice 4`，即依赖 Slice4）、Architecture Governance §3 组件定义、`16_`§C/§D（三方交叉确认 Slice 4 边界时同步确认了 Slice 5 边界）——本轮逐一重新核对，**三份文件对 Slice 5 = EditPlanEngine+EditEngine 的定义完全一致，没有发现任何冲突**。[E1]
- **未追踪/重複/过期/冲突档案：** 本轮未发现——`canonical/` 下没有游离档案，没有第二份 Edit 相关档案版本（因为 Slice 5 目前完全没有任何档案，见 §5）。[E1]

---

## 4. Slice 4 Input Contract Findings

逐项核实（对象：`src/208_MediaAnalysisEngine.js`、`src/110_MediaAnalysis.js`、`src/109_MediaAsset.js`、`src/001_ports.js`）：

| # | 问题 | 发现 | Evidence |
|---|---|---|---|
| 1 | `analyzeMedia` 接受/返回什么 | 接受 `assetId`；内部读取 `MediaAsset`，透过 `aiProvider.analyzeMedia(asset)` 取得 7 个分析欄位，组装成 11 欄位 `MediaAnalysis` 记录并 `append` | E1 |
| 2 | `MediaAnalysis` 存什么 | 11 栏位：`id/asset_id/analysis_version/quality/content_type/audio_quality/visual_quality/relevance/flags/generated_by/created_at`（§F 前一节，Contract §E 已冻结） | E1 |
| 3 | 如何引用 `MediaAsset` | 透过 `asset_id` 外键；不重複、不嵌入 MediaAsset 内容 | E1 |
| 4 | Versioning 是否 append-only | 是——`analysis_version` 取既有最大值 +1，只 `append`，从不 `update`/删除既有记录 | E1 |
| 5 | Provider 失败/无效输入处理 | Provider 抛例外 或 结构验证失败，两者都在任何持久化动作之前拦截，不留部分状态（本轮 `21_` 已验证的既有结论） | E3（`21_`已验证，本轮未重跑，仅重新读取代码确认逻辑仍然一致） |
| 6 | 发出什么事件、什么条件下 | `MediaAnalyzed`，仅在成功持久化后发出一次 | E1 |
| 7 | Slice 4 是否产生任何 approval/authorization state | 否——`00_Product_Understanding_Report.md`第166行明文：`AI Media Analysis \| MediaAnalysis \| MediaAnalysisEngine \| informational — no gate` | E1 |
| 8 | Slice 5 能否透过明确、稳定的 API 消费 `MediaAnalysis` | **能**——`208_` 公开方法只有 3 个：`analyzeMedia(assetId)`、`get(id)`、`getAllForAsset(assetId)`；Slice 5 可呼叫 `getAllForAsset` 取得某 MediaAsset 的全部分析版本 | E1 |
| 9 | Slice 5 是否要处理"缺失/失败/过期/多版本"的 MediaAnalysis | 多版本：`getAllForAsset` 天然支持（回传全部版本，含历史）。缺失：`getAllForAsset` 对不存在的 asset 回传空阵列（本轮读代码确认，非猜测）。过期（stale）：**这正是 Issue-01（§6/§14）——策略层面明确要求侦测，但缺乏欄位级机制** | E1（能力）＋ 见 Issue-01（机制缺口） |
| 10 | Slice 4 实际实作是否符合已批准治理契约 | 是——`21_`（`PASS WITH EXPLICIT GAPS`）已逐栏位核对 11 欄位 contract 全部 MATCH；本轮抽查 `110_`/`208_` 源码与该报告描述一致，未发现新的不一致 | E3（`21_`历史证据）＋E1（本轮抽查确认无漂移） |

**结论：** Slice 4 提供给 Slice 5 的输入契约是明确、稳定、可实际调用的——这不是"假设"，是可执行、已验证的 API 表面。唯一的缺口不在 Slice 4 这一端，而在"Slice 5 该如何记录自己用了哪个版本"这一端（Issue-01）。

---

## 5. Slice 5 Scope and Boundary Findings

权威来源：ADR-014、`01_`§3 Slice 表、Architecture Governance §3（EditPlanEngine/EditEngine 组件定义）、`16_`§D Scope Matrix。

| 能力 | In/Out | 依据 | 备注 |
|---|---|---|---|
| Edit plan generation | **IN**（Slice 5） | `01_`§1 EditPlanEngine；Architecture §3 | `createEditPlan` |
| Edit plan persistence + versioning | **IN** | Architecture §3「Persistence: Owns EditPlan」；AI Generation Lifecycle（§C）到 `READY` | |
| Edit plan validation | **IN**（隐含） | Architecture §14「AI schema validation: no AI Provider output enters domain state unvalidated」——通用规则，Slice5 需比照 Slice4 的 `validateMediaAnalysisFields` 模式自行实作对应校验 | 沿用既有模式，非新发明 |
| Edit execution / rendering | **IN**（Slice 5，但 Phase 1 简化为 manifest，非真实渲染） | Architecture §3 EditEngine；`01_`§1「simplified assembly mechanism...structured manifest」 | 见 §8 |
| Render output persistence | **IN** | Architecture §3「Persistence: Owns EditVersion」 | |
| Edit version lifecycle | **部分 IN**——只到 `AI_ROUGH_CUT` | AI Production Contract §G Review Lifecycle 图；`01_`§1「EditVersion enters `AI_ROUGH_CUT`」 | `HUMAN_REVIEW`起是 Slice 6 |
| Source media selection | **IN**（EditPlan 内容） | §F schema `selected_clips`/`broll_insertions` | |
| Timeline / clip ordering | **IN** | 同上（`selected_clips` 为 ordered list） | |
| Transitions / audio / subtitles(captions) / titles / effects | **IN**（schema 已列欄位：`transitions`/`music`/`audio_treatment`/`captions`；无独立"titles"欄位） | §F Edit Plan Schema 逐栏位 | "titles"未见对应欄位——见 Issue-05 |
| Export format / render settings | **部分 IN** | `platform_format` 欄位存在，但真实渲染参数因 Phase1 走 manifest 简化而不适用 | |
| Retry / failure handling | **IN**（需实作） | Architecture §3 EditEngine failure mode「Render failure or timeout — must be observable and must not silently retry into a duplicate EditVersion」 | |
| Human review | **OUT — Slice 6** | Architecture §3 ReviewEngine；`01_`§1 ReviewEngine 区块 | |
| Rough Cut Review | **OUT — Slice 6** | ADR-014 把 Rough Cut Review 列为 Phase1 垂直切片*终点*，非 Slice5 内容 | |
| Final Approval | **OUT**（甚至超出 Slice 6——`01_`§1 明文 `FINAL_REVIEW`/`FINAL_APPROVED` 在 Phase1 不建） | `01_`§1 ReviewEngine「your authorization §15, ADR-014」 | |
| Publication Authorization / Publication | **OUT — Phase 2+** | ADR-014；Architecture §3 PublicationEngine | |
| Analytics / Learning | **OUT — Phase 2/3** | 同上 | |

**没有发现任何权威来源之间的冲突。** 唯一的小缺口（"titles"欄位、export/render settings 在 manifest 简化下如何对应）见 Issue-05/06，性质是"细节未完全铺到欄位级"，不是范围本身的歧义。

---

## 6. MediaAnalysis → EditPlan Contract

- **可用欄位：** `MediaAnalysis` 11 欄位全部可用（§4）。[E1]
- **哪些欄位意在影响 EditPlan：** AI Responsibility Matrix 明确「AI Edit Planner \| MediaAsset + MediaAnalysis **set**, ContentConcept \| EditPlan」——"set"（複数）暗示一个 EditPlan 通常综合多个 MediaAsset（可能也是多个 analysis 版本）的分析结果，不是单一分析记录。`quality`/`content_type`/`relevance`/`flags` 这些欄位最直接对应"该不该选这段素材"的决策依据；`audio_quality`/`visual_quality` 对应`selected_clips`/`broll_insertions`的取舍。[E1，但"哪个欄位对应哪个决策"是**合理推论**，原文未逐欄位明确连线，标记 E4]
- **是 Recommendation、事实 metadata、还是执行指令：** `MediaAnalysis`本身是 informational（§4 第7点），`EditPlan`则是"Decision"层级（AI Responsibility Matrix，CVOS-P8）——即 MediaAnalysis 是事实性输入，EditPlan 是基于它产生的结构化决策，两者层级不同，契约本身用 CVOS-P8 的三层划分清楚区分。[E1]
- **MediaAnalysis 版本是否被"钉住"或动态选取：** **未定义/未回答**——这正是 Issue-01 的核心。[Gap]
- **分析缺失/失败/过期/被取代时怎么办：** 缺失/多版本——见 §4 第9点（API 层面能处理）；过期（stale）——CVOS-P9 与 EditPlanEngine 自己的 named failure mode（"The plan references a MediaAsset since re-analyzed as unusable"）都明确要求侦测並标记为需要人类/下一轮 AI 处理的显式条件，**但没有说明"过期"要怎么被侦测出来**（没有欄位记录 EditPlan 建立当下参照的是哪个 analysis_version）。[E1，Gap]
- **EditPlan 是否保留对确切输入版本的溯源：** **否**——§F schema 14 个欄位里没有任何一个记录"用了哪个/哪些 MediaAnalysis id 或 version"。`generated_by`只是 provider 名称字串，不是输入溯源。[E1，Gap——**Issue-01**]
- **该契约能否在不发明欄位/行为的前提下被实作：** **不能，针对 staleness 侦测这一项**——若要遵守 CVOS-P9 与已命名的 failure mode，实作者势必要自行决定怎么记录/比对"分析版本是否已变"，而这个决定目前没有任何欄位或既有先例可循。其余欄位（`selected_clips`等）都能照 schema 直接实作，不需要发明。
- **是否需要新 ADR 或明确契约决定：** **建议需要**——性质上类似当初 Slice4 的 G2（`verifyTake`↔`analyzeMedia`边界）问题，適合用一次小型 Semantic Resolution 处理，不需要动到 Frozen Architecture 本体。

---

## 7. EditPlan Contract

对照任务书逐项（对象：AI Production Contract §F，Architecture Governance §2/§3）：

| 项目 | 状态 | 证据 |
|---|---|---|
| Identity / ownership | 已定义 | `plan_id`；`edit_project_id → EditProject`（1 per Concept） |
| Versioning | 已定义 | `version` int；`supersedes_version`（nullable, self-ref） |
| Draft/ready/invalid/superseded 状态 | **部分已定义** | `status` 栏位"mirrors AI Generation Lifecycle (§C)"：`AI_GENERATED→AI_VALIDATED→AI_RECOMMENDED→READY`（或 `GENERATION_FAILED`）——没有独立的"superseded"值，取而代之是靠 `supersedes_version` 这个自引用栏位表达版本链，两者语意不冲突但需要实作者理解这是"用不同机制表达同一概念"，非新发明 |
| Source MediaAsset 引用 | 已定义 | `selected_clips`/`broll_insertions` 内的 `asset_id` |
| MediaAnalysis 引用 | **未定义** | 见 Issue-01 |
| Timeline 表示法 | 已定义 | `selected_clips`：ordered list of `{asset_id, in, out}` |
| Clip 边界与排序 | 已定义 | 同上（`in`/`out` + 顺序） |
| 音轨/视觉轨语意 | 已定义（欄位级） | `music: {track_ref, level_curve}`、`audio_treatment: text`、`transitions: list` |
| Edit instructions vs render instructions | 已区分 | EditPlan＝decision-only（"decisions only, no rendering"，Architecture §3）；render 是 EditEngine 的事 |
| Validation rules | **原则已定义，细则未定义** | Architecture §14「AI schema validation」通则；没有 EditPlan 专属的欄位级校验规则列表（类比 Slice4 的 `VALID_QUALITY`等 enum 校验，Slice5 需要自己列出等价的欄位校验，比照既有模式） |
| Reproducibility / provenance | **部分缺口** | 同 Issue-01 |
| Mutation / immutability | 已定义 | append-only 由 AI Generation Lifecycle + `supersedes_version` 机制保证（与 MediaAnalysis 同一模式） |
| Failure behavior | 已定义 | `GENERATION_FAILED` 状态；EditPlanEngine failure mode 明列 stale-state 情境 |
| Event semantics | 已定义 | `EditPlanCreated`，欄位未逐一列出但可比照 `MediaAnalyzed` 既有模式 |
| Idempotency | **未明确定义** | 没有找到"重複呼叫 createEditPlan"的既有 idempotency 规则，但 Architecture §14 有"Duplicate execution tests"通则可参照 |
| Stale-plan detection | **未定义机制**（政策已定义） | 见 Issue-01 |

**EditProject：** 只有聚合层级定义（"1 per Concept"，"stable container"），**没有欄位级 schema**——见 Issue-02。

---

## 8. EditEngine Execution Contract

1. **是确定性本地引擎、provider adapter、还是编排层：** Architecture §3 明确列「External dependencies: Video Editing Engine adapter」——架构上定位为 **provider adapter 模式**（与 AIProviderPort 同类，但是独立的 adapter 类型）。[E1]
2. **是编辑二进位还是产生给其它渲染器的执行计划：** 是后者的简化版——`01_`§1 明确：Phase 1 用「structured manifest (ordered clip list + timing)」取代真实渲染档，「Proving `Media → Analysis → Edit Plan → Rough Cut → Human Review` is the goal, not NLE-grade output」。[E1]
3. **是否已定义任何渲染 provider：** 否——Architecture §11 明确 `Video Editing Engine | ... | TBD`；§10 item 3 `OPEN — PENDING ARCHITECTURAL DECISION`。**这是治理文件自己承认的既有开放项，不是 Slice5 新引入的缺口**——与 AI Provider 当初的 TBD 状态性质相同（§10 item 4 明确"a deterministic mock is confirmed acceptable for early slices"；Video Editing Engine 那一行没有逐字重複这句话，但 `01_`已经用「per your authorization §14」单独授权了同等的简化路径）。[E1]
4. **Source MediaAsset 是否维持不可变：** 是——`208_`/`110_`皆确认 Slice4 从不修改原始二进位或 MediaAsset 身份栏位（`21_`已验证），EditEngine 若比照既有模式（只读 MediaAsset，只写 EditVersion），不需要新的不变性规则。[E3，沿用既有验证]
5. **渲染输出存放位置：** EditVersion 记录本身有 `preview_ref: path/URI` 栏位；实际存放机制沿用既有 `MediaStorageAdapterPort`（`303_`）的既有模式，未见需要新 adapter 类型的证据。[E1+E4]
6. **输出身份/版本/溯源如何运作：** `EditVersion.plan_id`（1:1 同版本号）——溯源到 Plan 本身清楚；但溯源到"这个 render 是用哪个 manifest 内容产生的"没有独立欄位（隐含就是同一条 Plan 记录本身，因为 1:1，问题不大）。
7. **部分失败与重试如何处理：** Architecture §3 明确「Render failure or timeout — must be observable and must not silently retry into a duplicate EditVersion」——政策清楚，具体去重机制（例如靠 idempotency key 还是靠"先查后建"）未指定，比照 Architecture §14「Duplicate execution tests」的既有精神，应该是可以留给实作时决定的 G1 级细节。
8. **是否幂等：** 政策上要求"不能静默重试出重複 EditVersion"，但没有指定具体幂等键机制——见上一点，同一缺口。
9. **成功执行是否与人类审核区分：** 是——EditEngine 的 Invariant 明确「Never marks its own output `FINAL_APPROVED` or `PUBLISHED`」；`01_`§1 EditPlanEngine+EditEngine 测试项目「`generateRoughCut` never marks its own output approved」直接对应。[E1]
10. **是否需要任何外部 provider 依赖：** 架构上"是"（Video Editing Engine adapter），但 Phase1/Slice5 实作层面"否"（manifest 简化路径不需要真实外部服务）。[E1]

**结论：** EditEngine 的执行模型在 **Phase 1/Slice 5 的实作层面已经足够清楚**（manifest 替代真实渲染，明确授权）；在**真实 runtime 层面**仍然 TBD，但这与 Slice 1-4 全部既有的 Runtime BLOCKED 状态性质相同，不是 Slice 5 独有或新增的缺口。

---

## 9. AI Authority and Human Gates

- **AI 可以 recommend 什么：** 依 CVOS-P8，AI Edit Planner 的输出（EditPlan）本身就是"Decision"层级（不是单纯 Recommendation），但仍然「never means the other takes were deleted」「never means the video was published」——即 Decision ≠ Execution。[E1]
- **AI 可以生成/修订什么：** EditPlan 生成与修订（`createEditPlan` 双重用途）；AI Revision Engine（Architecture §3 未独立列出——**注意**：§3 逐一列出的是 EditPlanEngine/EditEngine/ReviewEngine/PublicationEngine/AnalyticsEngine/ContentLearningEngine，AI Production Contract §A 的 Responsibility Matrix 另外列了一个"AI Revision Engine"角色，但 Architecture Governance §3 组件清单里**没有一个独立的"AI Revision Engine"组件**——修订能力实际上是 `01_`§1 描述的、透过 ReviewEngine 呼叫 EditPlanEngine 的既有 `createEditPlan` 达成，不是一个第三个独立引擎。这是 AI Production Contract（早期、更概念性的文件）与 Architecture Governance（后期、组件级权威文件）之间一个措辞层级的差异，不是矛盾——**本轮判定 Architecture Governance §3 为权威（组件级设计文件），"AI Revision Engine"是 AI Production Contract 里的角色/职能命名，不是要求一个额外的第四个 Slice5 组件**。[E1+E4，见 Issue-07]
- **AI 是否可以修改已持久化的 EditPlan 记录：** 否——append-only（同 MediaAnalysis 模式），修订永远产生新版本，不修改既有记录。[E1，依 §7 分析]
- **AI 是否可以启动渲染/执行：** 是——`generateRoughCut`不需要人类批准即可执行（Architecture §3「no human approval required — Phase 0D」），但这个"执行"本身被明确限定为"decisions only, no rendering"之后的**下一步**、且被 CVOS-P8 定性为 Execution 层级，只是这一层的 Execution 本身在 CVOS-P7/P8 架构下被允许在 Rough Cut 生成这一步自动进行（区别于 Publication 那种需要人类关卡才能 Execute 的动作）——这个"Rough Cut 生成不需要人类关卡，但 Publication 需要"的差异化，本身是既有、已批准的架构决定（Phase 0D），不是 Slice5 引入的新颖之处。[E1]
- **是否需要人类授权才能跨越某个 execution 边界：** 是——Rough Cut 生成本身不需要（上述），但 Rough Cut**之后**的任何进展（FINAL_APPROVED、Publication）都需要，且都在 Slice 5 范围之外。
- **Provider 输出是否在落地/执行前被验证：** 是（原则）——Architecture §14「no AI Provider output enters domain state unvalidated」，Slice5 需要比照 Slice4 的 `validateMediaAnalysisFields`模式自行实作等价校验（细则未列出，但模式已有先例）。
- **失败是否可能留下部分/误导性记录：** 与 Slice4 相同性质的既有开放问题（本轮 `21_`Finding-02同类缺口）——`storage.append`→`storage.update`→`eventLog.record`序列若中途失败，理论上可能留下部分状态；这不是 Slice5 独有，是既有 LocalFileStorageAdapter 的既有特性。
- **设计是否保留人类对 review/approval 的控制权：** 是——ReviewEngine（Slice 6）完整拥有 `HUMAN_REVIEW`起的全部关卡，Slice5 的两个 Engine 都不产生、也不能产生任何 approval/final/publication 语意（Architecture §3 Invariant 逐一明写）。[E1]

**结论：** AI 权限三层（Recommendation/Decision/Execution）与人类关卡序列在既有契约里划分得非常清楚，Slice5 的两个 engine 各自的 invariant 也都明写"绝不做什么"，没有发现会让 Slice5 意外吸收 Human Review/Final Approval/Publication 语意的风险。

---

## 10. Versioning / Staleness / Immutability

| 项目 | 状态 |
|---|---|
| MediaAsset 不可变性 | 已验证（Slice4，`21_`），Slice5 只读取，不需要新规则 |
| EditPlan 版本历史 | 已定义（`version`+`supersedes_version`，比照 MediaAnalysis 的 append-only 模式） |
| Render 输出版本历史 | 已定义（`EditVersion.plan_id` 1:1） |
| Input provenance | **未定义**（Issue-01） |
| Stale EditPlan 侦测 | 政策已定义（CVOS-P9 + named failure mode），**机制未定义**（Issue-01） |
| Stale approval 保护 | 不适用于 Slice5 本身（approval 是 Slice6 的事），但 Slice5 的输出会是 Slice6 staleness 检查的输入之一 |
| Upstream 变更后的处理 | 政策明确："surfaces the staleness as an explicit condition"，不可静默失效或对过期状态执行 |
| Plan/Render 可重现性 | 部分——`selected_clips`等欄位本身具确定性描述能力，但因为没有溯源到确切 MediaAnalysis 版本，**技术上无法百分之百重现"当初为何做出这个决定"**（这也是 Issue-01 的延伸影响） |
| Supersession vs mutation | 已定义（`supersedes_version`，不是直接 mutate） |
| Retry 不重複产生 | 政策已定义（EditEngine invariant），机制未定义（同 EditEngine §8 分析） |

**是否可以直接沿用 Slice2/3 既有规则：** 不能不假思索直接套用——Slice2/3 的 staleness 规则（`authorization_valid`/`invalidation_reason`/`invalidated_at`，ADR-015）是针对 `ProductionPlan`量身定制的欄位组合；EditPlan 的等价机制**没有被这份文件直接指定**，需要单独决定（可能类似、但不能假设完全相同），这正是 Issue-01 所涉及的决定範围之一。

---

## 11. Persistence / Events / Ports

- **Repository 介面：** 沿用既有 `StorageAdapterPort`（`001_ports.js`）模式——本轮确认没有任何证据显示 EditPlan/EditVersion 需要不同的介面形状，与 MediaAnalysis 走同一套 `append`/`get`/`getAllForXxx`模式即可。[E1+E4]
- **Persistence 边界：** EditPlanEngine 专属拥有 EditPlan；EditEngine 专属拥有 EditVersion（Architecture §3 逐一列明），与既有"每个 engine 专属拥有自己的实体"惯例一致。
- **Event 名称与 payload：** 名称已定义（`EditPlanCreated`/`RoughCutGenerated`），**payload 欄位未逐一列出**（比照 `MediaAnalyzed`的既有先例，应包含至少 `plan_id`/`version`或`version_id`，具体留给实作时比照既有模式决定，性质上是 G1 级细节）。
- **Event 时序：** 沿用 Slice4 既有模式（先落地记录，成功后才发事件）应该可以直接套用，本轮未发现反对证据。
- **Transaction / 部分写入行为：** 见 §9——与既有 `21_`Finding-02同一类别的既有开放问题，非 Slice5 独有。
- **Idempotency keys：** 未定义（见 §7/§8）。
- **跨聚合引用：** `EditPlan.edit_project_id`、`selected_clips[].asset_id`——都是既有模式的外键引用，没有发现需要新的跨聚合机制。
- **Local adapter vs 未来 runtime adapter：** Video Editing Engine 需要一个新的 adapter *类型*（区别于既有 3 个 port class），但 Phase1 简化路径下，这个 adapter 是否需要真的实作成一个独立 `class VideoEditingEnginePort`，还是可以像 `EquipmentEngine`的"确定性 rule-based logic, not an AI call"（ADR-008）先例一样，先做成纯本地确定性方法、暂不建立 port 抽象——**这是一个具体的、留给实作时决定的设计问题，本轮判定它不是阻断性缺口，但应该被明确记录成一个待决定项**（Issue-04）。
- **错误传播：** 沿用既有模式（例外往上抛，不吞错误），未发现反对证据。

---

## 12. Local Verification Matrix

| 测试 | 分类 | 备注 |
|---|---|---|
| Valid EditPlan generation | Proposed test only | 比照 `610_`模式：给定 MediaAsset+MediaAnalysis+Concept，产生结构正确的 EditPlan |
| Invalid inputs | Proposed test only | 比照既有"malformed provider response"模式 |
| Missing MediaAnalysis | Proposed test only | `getAllForAsset`回传空阵列时的行为需要定义並测试 |
| Multiple MediaAnalysis versions | Proposed test only | 需要先决定 Issue-01 才能写出有意义的断言 |
| Provider failure | Proposed test only | 比照 `610_`"provider exception leaves no record"模式 |
| Invalid provider output | Proposed test only | 比照既有 schema 校验失败模式 |
| EditPlan versioning | Proposed test only | 比照 MediaAnalysis 的"re-analysis creates v2, v1 untouched"模式 |
| Stale input handling | **Requires prior decision**（Issue-01） | 在 Issue-01 决定之前无法写出有意义的断言 |
| Source media immutability | Existing test（可延伸） | `610_`已有 MediaAsset 不可变断言模式可直接复用 |
| Render success/failure | Proposed test only | |
| Retry/idempotency | Proposed test only（机制未定，见§8/§11） | |
| Output persistence | Proposed test only | |
| Event correctness | Proposed test only | 比照 `610_`"event recorded exactly once"模式 |
| AI authority boundaries | Proposed test only | 比照 `610_`两个静态检查（Slice5/6禁词、G-boundary）模式，可直接沿用同一手法 |
| Human-gate separation | Proposed test only | 断言 `generateRoughCut`/`createEditPlan`从不产生 `FINAL_APPROVED`/`PUBLISHED`语意 |
| Slice 1–4 既有回归测试 | **Existing test** | 114 个既有测试，本轮重新执行确认 114/114 pass（E1，本轮直接执行） |
| 双进程 persistence | Existing test（既有模式可直接复用） | 比照 `707_`/`708_` |
| Binary integrity | Not applicable | Slice5 走 manifest 简化路径，不产生新的二进位输出，暂不适用；若日后走真实渲染才需要 |

**没有为本任务新增任何测试**——上表全部是分类与既有模式对照，不是本轮产出的测试代码。

---

## 13. Runtime Blockers

沿用既有、不变的 Runtime 状态：Google host 曾回传 HTTP 403 `host_not_allowed`；所需 Google CLI 工具与凭证在本环境不可用；真实 GAS/Sheets/Drive 行为仍未验证。[E3，历史状态，本轮未重新尝试连线——任务本身禁止]

**Slice5 可以被本地验证的部分：** EditPlan/EditVersion 的领域逻辑、versioning、AI 权限边界、事件正确性——全部可以比照 Slice1-4 已经证明可行的模式（Mock provider + Local adapter + `node --test`）在沙盒内完成，不需要真实 runtime。

**仍会保持 BLOCKED 的部分：** 真实 Video Editing Engine 的行为（因为其真实身份本身是 §11 明列的 `TBD`，不只是 credentials 问题）；真实 GAS/Sheets/Drive 的读写行为——与 Slice1-4 完全相同的既有限制，Slice5 不会让这个限制变得更糟，也不会让它消失。

---

## 14. Issue Register

| Issue ID | Severity | Evidence Class | 位置 | Observed Fact | 为何重要 | 需要的决定 | 是否阻断实作 | 是否需要新 ADR | 是否需要人类授权 |
|---|---|---|---|---|---|---|---|---|---|
| **ISSUE-01** | **MAJOR** | E1 | AI Production Contract §F Edit Plan Schema；Architecture §3 EditPlanEngine failure mode；CVOS-P9 | EditPlan 14 个欄位没有任何一个记录所依据的 MediaAnalysis 版本/id，但既有 failure mode 明确要求侦测"MediaAsset 被重新分析后 EditPlan stale" | 若不解决，实作者要嘛自行发明欄位（silent design choice，重演 Slice4 当初 ANALYZED 状态那种事后才厘清的风险），要嘛干脆不做这个已经命名的不变量 | 决定 staleness 侦测机制（例如新增一个溯源欄位，或改用别的比对方式）——性质类似 Slice4 的 G2 语意厘清，建议开一次小型 Semantic Resolution | 否（不阻断"能不能开始实作"，但阻断"能不能干净地实作这一条既有不变量"） | 可能需要（视决定形式而定，小型 ADR 或 Resolution 文件皆可） | 是 |
| **ISSUE-02** | MINOR | E1 | Architecture Governance §2 聚合表；AI Production Contract 目录（缺 EditProject Schema 章节） | `EditProject`只有"1 per Concept"这一句聚合定义，没有欄位级 schema | 实作者需要自行决定最小欄位组合 | 确认一个最小 schema（大概率只需 `id`/`concept_id`/`created_at`），风险低 | 否 | 不一定 | 建议（低优先级） |
| **ISSUE-03** | MINOR | E1 | AI Production Contract §F；§G 修订词汇表 | `createEditPlan`"用于 initial 与 revision 两种情境"的确切参数形状未列出 | 概念行为清楚，但函式签名留白 | 实作时決定（G1 级细节，比照 Slice4 先例可以留给实作） | 否 | 否 | 否 |
| **ISSUE-04** | MINOR | E1+E4 | `001_ports.js`（无 Video Editing Engine port）；ADR-008（EquipmentEngine 确定性逻辑先例） | Phase1 的 EditEngine 是否需要一个新 port 抽象，还是可以像 EquipmentEngine 一样做成纯本地确定性方法 | 影响实作形状，不影响能否实作 | 实作时决定 | 否 | 否 | 否 |
| **ISSUE-05** | MINOR | E1 | AI Production Contract §F Edit Plan Schema | 没有独立的"titles"欄位（`captions`存在，"titles"字面未见） | 若真的需要片头/字卡文字，目前 schema 没有明确容身之处 | 确认是否落在 `captions`或需要新欄位 | 否 | 否 | 建议 |
| **ISSUE-06** | INFORMATIONAL | E1 | AI Production Contract §F | `platform_format`/渲染参数在 manifest 简化路径下如何对应尚未逐一铺开 | Phase1 不产生真实渲染文件，多数渲染参数暂时是"记录但不执行" | 无需现在决定 | 否 | 否 | 否 |
| **ISSUE-07** | INFORMATIONAL | E1+E4 | AI Production Contract §A（"AI Revision Engine"角色）vs Architecture §3（组件清单无此项） | 两份文件对"修订能力"的组织方式描述层级不同（角色 vs 组件） | 可能造成"是否要建第三个引擎"的误解 | 本报告已判定以 Architecture §3 为权威（无需新增组件），建议下一个 gate 明确写清楚，避免重演 Slice4 当初"任务书用词比权威文件宽"的模式 | 否 | 否 | 否 |
| **ISSUE-08** | INFORMATIONAL | E1 | AI Production Contract §J | AI Revision Loop 是否需要最大迭代次数上限——`OPEN`，但归属 Slice6（ReviewEngine）而非 Slice5 | Slice5 的 `createEditPlan`需要能承受被重複呼叫，但上限本身不是 Slice5 该解决的 | 无需 Slice5 阶段解决 | 否 | 否 | 否（留给 Slice6） |
| **ISSUE-09** | INFORMATIONAL | E3 | Architecture §11 | Video Editing Engine 真实 provider 身份 `TBD`——项目级既有开放项 | 与 Slice1-4 全部既有 Runtime-TBD 性质相同，非 Slice5 新增 | 无需现在决定（不影响本地实作） | 否 | 否 | 否 |

**没有发现任何 BLOCKER 级问题、也没有发现任何治理冲突（governance conflict）或已确认缺陷（confirmed defect）——全部 9 项都是"missing specification"或"informational"性质，本报告没有把任何一项误标成代码缺陷。**

---

## 15. ADR / Human Decision Requests

只有 **ISSUE-01** 达到值得独立提请人类决定的份量：

> **请求：** 决定 EditPlan 应如何记录/侦测"其依据的 MediaAnalysis 已经过期（被重新分析）"——可能选项包括（不预设答案，留给人类）：(a) EditPlan 或 `selected_clips`逐条记录当时参照的 `analysis_version`/`analysis_id`；(b) 新增一个 plan 级"as-of"时间戳或版本快照；(c) 其它机制。建议处理形式：比照 Slice4 的 G2 语意厘清（`17_`）模式，开一次小型、聚焦单一问题的 Semantic Resolution，不需要重开整个 Frozen Architecture。

其余 Issue（02–09）性质上都落在"实作时可以合理决定、无需现在拍板"的範围，不提请。

---

## 16. Gate Disposition

```
SLICE 5 READINESS: CONDITIONALLY READY — HUMAN DECISIONS REQUIRED
```

理由：Slice 5 范围本身没有歧义（§5，三方来源交叉一致）；核心领域契约具体到欄位级（§7 EditPlan schema、§8 EditEngine 执行模型在 Phase1 层面已经足够清楚）；AI 权限三层与人类关卡序列被既有 Invariant 逐一保护，没有发现 Slice5 会意外吸收 Human Review/Final Approval/Publication 语意的风险（§9）；没有发现任何 BLOCKER（§14）。但 **ISSUE-01** 是一个具体、有名字、已经被既有治理文件自己点名（CVOS-P9 + EditPlanEngine 自己的 failure mode）却缺乏欄位级机制的缺口——在这一点被明确决定之前就开始实作，风险等同于让实作者自行、静默地做一个本该由治理层拍板的设计选择。

这个 disposition **不构成 Slice 5 实作授权**。

---

## 17. Exact Next-Step Recommendation

1. 人类针对 §15 的请求做出决定（可能只需要一小段文字澄清，不必然需要正式 ADR 编号——由人类判断严重性）。
2. 決定做出后，开一个独立的 **Slice 5 Implementation Authorization Gate**（比照 `18_`对 Slice4 的做法），把 ISSUE-01 的决定结果、以及 ISSUE-02～09 里人类想现在一併拍板的任何一项，正式纳入该 Gate 的授权范围叙述里。
3. 该 Authorization Gate 通过后，才是 Slice 5 实际实作任务（新增 `src/1xx`/`2xx` 实体与引擎档、`test/6xx`测试、必要时 `scripts/7xx`双进程 demo）——本报告不代为拟定那份实作任务书。

---

## Final Response Summary（依任务书§7要求）

1. **Final Gate Disposition：** `CONDITIONALLY READY — HUMAN DECISIONS REQUIRED`（非 READY、非 NOT READY、非 BLOCKED）。
2. **Top findings：** Slice5 范围三方来源交叉一致、无歧义；EditPlan/EditVersion schema 具体到欄位级；唯一实质缺口是 ISSUE-01（MediaAnalysis 版本溯源缺失，影响 CVOS-P9 staleness 不变量能否被干净实作）。
3. **Blockers：** 无。**需要人类决定的项目：** ISSUE-01（§15 已给出请求原文）；其余 8 项为 informational/minor，不要求现在决定。
4. **是否修改任何档案：** **没有。** 本任务全程只读（`view`/`grep`/只读执行 `node --test`）。
5. **实际执行过的测试/检查与结果：** `node --test`（`/home/claude/review/canonical`）→ 114/114 pass, 0 fail, 0 skip；全 repo 静态搜索 Slice5/6 可执行 class/function 定义 → 零命中（确认目前仍是零实作，与 `16_`/`20_`历史记录一致）。
6. **未执行的检查与原因：** 双进程 persistence／binary integrity 未重跑——本轮不涉及任何代码变更，`21_`/`24_`/`26_`已就相同代码给出证据，重跑不会产生新讯息，任务书本身也未要求；未尝试任何真实 GAS/Sheets/Drive 连线——任务书明确禁止，且已知环境限制不变。
7. **Runtime 状态：** `BLOCKED — EXPLICITLY CONTAINED`，未变动，未尝试连接。
8. **确认：** 本任务没有开始 Slice 5 或 Slice 6 的任何实作，没有产生任何一行领域代码或测试代码，没有撰写 Slice 5 实作任务书。停在本报告，等待人类对 §15 做出决定。
