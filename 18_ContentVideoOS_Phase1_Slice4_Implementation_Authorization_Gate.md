# CVOS — Phase 1 Slice 4 Implementation Authorization Gate

**文件编号：** 18（已确认未与既有档案冲突）
**性质：** 实作前最终授权稽核——零代码修改、零 ADR 新增、未重开 Slice 3、未实作 MediaAnalysisEngine 或任何 Slice 5/6 内容。
**日期：** 2026-09-14

---

## 1. Gate Purpose

在正式撰写任何 `MediaAnalysisEngine` 代码之前，重新核对 repository 现有的 authoritative architecture / governance / implementation evidence，确认 Slice 4 的 scope、domain contract、AI authority、persistence/versioning、event、testing、deferment 边界是否已经足够明确到可以安全授权实作，而不需要在写代码的过程中现场猜测任何 domain 决定。

---

## 2. Evidence Read（本轮实际核对，含新查核项目）

延续 `13_`~`17_` 已建立的证据基础，本轮额外新查核：

- ADR 表格全文搜索「MediaAnalysis」→ 零专属 ADR（预期内，规格目前停留在 `01_`/AI Production Contract 层级）
- `00_ContentVideoOS_AI_Production_Contract.md`／`00_...Architecture_Governance...`／`01_...Implementation_Map.md`／`00_...Product_Understanding_Report.md` 全文搜索「idempoten」→ **零命中**（见 §17）
- `002_aiGenerationLifecycle.js` 开头说明：「The generic, fully-automatic state machine for **any** AI-generated intermediate artifact」——确认 `GENERATION_FAILED` 不是 ContentIdea/Concept/Script 专属，而是通用机制（见 §16）
- `00_...Product_Understanding_Report.md` 第 87/111/166 行的 MediaAnalysis 相关叙述——与 AI Production Contract 的 11 栏位表交叉核对，**没有发现冲突**（见 §8）

其余项目（`001_ports.js`、`206_ShootEngine.js`、`207_MediaEngine.js`、`109_MediaAsset.js`、ADR-004/005/010/014/015/019/020、`16_`、`17_`）本轮沿用先前已独立核实的证据，不重複列出行号——细节见对应报告。

---

## 3. Authority Order

沿用既定顺序，本轮**没有发现任何层级冲突**：Frozen Architecture/AI Production Contract > 已核准 ADR > `01_` Implementation Map > 正式治理报告（`13_`-`17_`）> 既有实作 > 历史报告。所有来源在 MediaAnalysis 相关内容上彼此一致。

---

## 4. Current Repository State

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED
Slice 4: CONDITIONALLY AUTHORIZED
G2 verifyTake ↔ analyzeMedia: CLOSED
Slice 5: NOT AUTHORIZED
Slice 6: NOT AUTHORIZED
Runtime: BLOCKED — EXPLICITLY CONTAINED
Other OS Changes: NONE
```

---

## 5. Slice 4 Scope Confirmation

重申 `16_` 已确立、本轮未变动的结论：**Slice 4 = `MediaAnalysisEngine`**，不含 `EditPlanEngine`/`EditEngine`（Slice 5）、`ReviewEngine`（Slice 6）、Human Review、AI Revision、Final Approval、Publication、Analytics、Learning。权威来源：ADR-014、`01_`§3 Slice 表、`11_` 自身的下一步引用（三方交叉一致，见 `16_`C 节）。

---

## 6. analyzeMedia Contract

`analyzeMedia`：对一个**已经 import 完成**的 `MediaAsset` 做 AI-assisted 分析，产生一笔全新的、versioned 的 `MediaAnalysis` record。

明确不是：Take verification（那是 `verifyTake`/Slice 3）、creative approval、human review、edit decision、edit plan、rough cut generation、publication decision——`00_Product_Understanding_Report.md` 第166行明文：`AI Media Analysis | MediaAnalysis | MediaAnalysisEngine | informational — no gate`。

---

## 7. MediaAsset Boundary

输入对象是 `MediaAsset`，不是 `Take`/`Shot`/`ProductionPlan`/`Script`/`ContentConcept`。`verifyTake` 走 `Take.technicalMetadata`（片场现场，`MediaAsset` 可能都还不存在）；`analyzeMedia` 走已汇入的 `MediaAsset`（见 `17_`，G2 已关闭，此处不重开）。Slice 4 **不需要**重新执行 Slice 3 的技术验证职责。

---

## 8. MediaAnalysis Data Contract

**11 栏位表**（`00_ContentVideoOS_AI_Production_Contract.md`）：`analysis_id`、`asset_id`（ref→MediaAsset）、`analysis_version`（append-only 递增）、`quality`（enum：GOOD/ACCEPTABLE/POOR）、`content_type`（enum：PRIMARY/B_ROLL/BACKUP/IRRELEVANT）、`audio_quality`（enum：GOOD/NOISY/CLIPPED/SILENT）、`visual_quality`（enum：STABLE/SHAKY/BLURRED/OVEREXPOSED/UNDEREXPOSED）、`relevance`（enum：HIGH/MEDIUM/LOW）、`flags`（text[]，例：best_take/duplicate_of/pause/mistake/strong_reaction/broll_candidate/good_opener）、`generated_by`（provenance）、`created_at`。

本轮交叉核对 `00_Product_Understanding_Report.md`（第87/111/166行）：只有概念性描述（"AI-generated, versioned observations about a MediaAsset"），**没有另一份竞争性栏位清单**——**无冲突**。**不新增未记载栏位**——实作应严格照这 11 栏位走。

---

## 9. Versioning / Immutability

契约明确：`MediaAsset v(不变) → MediaAnalysis v1 → v2 → v3...`——重新分析**永远**产生新版本，绝不覆写（`01_`§1 Tests 项：「re-analysis appends a new version, never overwrites」）。`MediaAsset` 本身在这个过程中不变；旧版本 `MediaAnalysis` 保持可稽核。版本识别沿用既有项目惯例（如 `analysis_version` 整数递增，比照 `Take`/ADR-020 不可变模式的同一种设计语言）——**不需要发明新机制**。

---

## 10. MediaAnalyzed Event

事件名称：`MediaAnalyzed`，语意「一笔 MediaAnalysis 已经为某个 MediaAsset 产生並持久化」。明确不是 `MediaApproved`/`EditPlanReady`/`RoughCutReady`/`ReviewApproved`/`PublicationAuthorized`——那些都是后续阶段的事件，本 gate 不涉及。沿用既有 `EventLog` 基础设施（`003_EventLog.js`，Slice 1-3 已验证），不需要新事件系统。

---

## 11. AI Authority

`MediaAnalysisEngine` = AI-assisted analysis = **Recommendation / informational** 层级（ADR-010）。明确 MUST NOT：authorize Production Go、authorize Shoot、变更 `ProductionPlan.production_state`、approve 一个 Take/Shot、authorize Edit、authorize Publication、删除或修改原始 `MediaAsset` 二进制、自动执行任何下游后果性动作。分析结果可以描述/分类/侦测/建议，但「Analysis 本身不是核准」——与 AI Production Contract「AI Media Analyst … Must NOT: Delete, move, or alter the source file」完全一致，本轮未发现任何允许扩权的文字。

---

## 12. verifyTake ↔ analyzeMedia Boundary

| Dimension | verifyTake | analyzeMedia |
|---|---|---|
| Domain object | Take | MediaAsset |
| Input | `technicalMetadata` | 已 import 的 `MediaAsset` |
| Stage | Shoot 现场／`MediaAsset` 尚不存在前 | Media Import 之后 |
| Purpose | 技术验证 | 媒体分析 |
| Output | Take verification result（写回同一笔 Take） | 新版本化 `MediaAnalysis` |
| Lifecycle effect | 可推进 `Shot.captureStatus` | 无（纯记录性质） |
| Human approval | 无 | 无 |
| Creative judgment | 无（纯技术 pass/fail） | 有描述性观察／建议，但非核准 |
| Slice | 3（CLOSED） | 4 |

G2 已于 `17_` 正式 CLOSED；本 gate 确认：以上边界与未来实作规划**完全一致，没有任何计划中的设计违反这个结论**（例如没有计划让 `analyzeMedia` 去调用 `ShootEngine.verifyTake` 或读取 `Take.technicalMetadata`）。两者未来若要共用底层 AI 基础设施，纯属实作细节，不影响 domain contract。

---

## 13. Persistence Boundary

沿用既有 `Domain/Engine → Storage Port → Adapter` 分层（ADR-004）。`MediaAnalysis` 是结构化数据，走既有 `StorageAdapterPort`——**不需要新的 binary media adapter**（`MediaStorageAdapterPort` 已经在 Slice 3 为 `MediaAsset.source_file_ref` 建好，`MediaAnalysis` 本身不含二进制内容，不需要它）。不得出现 `MediaAnalysisEngine → Google Sheets API` 这种跳过 adapter 边界的直接依赖。

---

## 14. Runtime Boundary（依 ADR-019）

`CAN_CONTINUE`（本地可做）：domain 逻辑、`MediaAnalysis` 实体与版本机制、`analyzeMedia` 命令验证、`MediaAnalyzed` 事件、Mock AI Provider 的确定性启发式、本地持久化、两独立 process 测试。`MUST_WAIT`/`REQUIRES_REAL_RUNTIME`：无新增项目——Slice 4 不引入任何新的 Google/GAS/Sheets/Drive/真实 AI 依赖。不得宣称 `REAL GAS/SHEETS/DRIVE/AI PROVIDER VERIFIED`，除非真的有 runtime 证据。

---

## 15. AI Provider Boundary

`MediaAnalysisEngine → AIProviderPort → Mock/Test Provider`——沿用 Slice 3 已验证的既有抽象（`001_ports.js`），不直接接 Gemini/OpenAI/等真实 API。Mock/确定性 provider 可以验证 domain contract 正确性，但不能宣称真实 AI 品质已验证。

---

## 16. Failure / Retry Semantics

架构里已经有一个**通用、非 Slice-3-专属**的机制可以直接沿用：`002_aiGenerationLifecycle.js` 明文自称是「the generic, fully-automatic state machine for **any** AI-generated intermediate artifact」——`AI_GENERATED → AI_VALIDATED → AI_RECOMMENDED → READY`，结构验证失败时停在 `GENERATION_FAILED`（清楚标记、可重试，不会静默卡住或半途污染）。

**这不是自动等于「MediaAnalysis 必须套用这个精确的四态包装」**——`MediaAnalysis` 目前的 11 栏位表本身没有一个 `status` 栏位在跑这四态。这是本轮找到的唯一需要在实作时决定的细节（见 §22），但无论怎么选，两种做法都不需要新治理决策：(a) 直接重用整个 lifecycle wrapper；或 (b) 更简单地——AI 分析失败时根本不产生 `MediaAnalysis` 记录、也不发 `MediaAnalyzed` 事件，让调用端知道要重试。两者都不会污染 `MediaAsset`、都不会产生半完成记录、都不会误发 `MediaAnalyzed`、都不会覆写先前成功的分析——因为 `MediaAnalysis` 本来就是 append-only，失败的尝试不创造记录，不存在「覆写」的风险。

---

## 17. Idempotency Assessment

全文搜索「idempoten」在四份权威文件里**零命中**——字面上确实没有被讨论过。但**实质行为已经被明确定义**：「重新分析永远产生新版本，绝不覆写」（`01_`§1）本身就是一个完整、无歧义、对重複呼叫安全的契约——同一个 `MediaAsset` 被 `analyzeMedia` 呼叫两次（不管是刻意重新分析还是意外重複请求），结果都是多一笔 `MediaAnalysis` 版本，不会破坏任何既有记录、不会产生不一致状态、不会违反 immutability。

**结论：OPEN（字面未提及）但 NON-BLOCKING**——不需要在实作前另外制定复杂的去重政策；现有的 append-only 设计已经让「重複呼叫」这件事在语意上是安全的。

---

## 18. Testing Authorization

未来实作应至少涵盖（本轮不写测试，仅确认架构可支持）：

- **Domain：** 合法 `MediaAsset` 可被分析；`MediaAnalysis` 建立且正确指向该 `MediaAsset`；分析结果持久化；`MediaAnalyzed` 依既有 event 模型记录。
- **Versioning：** 第二次分析不覆写第一次；版本维持可稽核；可依契约辨识最新版本。
- **Immutability：** `MediaAsset`／原始二进制／先前的 `MediaAnalysis` 皆不变。
- **AI boundary：** engine 走 `AIProviderPort`，domain 内不直接实作 provider；mock provider 可确定性验证行为。
- **Negative tests：** 不存在的 `MediaAsset`、无效引用、AI provider 失败、格式错误的 provider 回应、意图修改原始 `MediaAsset`/媒体的尝试（应被拒绝）。
- **Persistence：** 沿用既有的「全新 process 读回既有资料」模式（Slice 1-3 已验证的两独立 process persistence 测试范式，直接套用即可，不需要新测试基础设施）。

架构对以上全部可测，沿用既有 `MockAIProvider`/`LocalFileStorageAdapter`/两进程 persistence 惯例。

---

## 19. Slice 5/6 Isolation

本轮 review 未来 implementation 预计触及的范围（见 §20），**没有发现任何 EditPlan/Timeline/Clip 选取/Cut points/Rough Cut/Review UI/Human Approval/Revision/Publication/Analytics/Learning 的规划痕迹**——这些持续保持 `DEFERRED — Slice 5/6`（或更后）状态。`Slice 5: NOT AUTHORIZED`、`Slice 6: NOT AUTHORIZED` 本轮不变动。

---

## 20. Expected Implementation Impact（本轮不创建，仅列出预期范围）

**New：** `MediaAnalysisEngine`（新档，编号应落在既有 2xx 引擎序号之后，例如 `208_`）、`MediaAnalysis` 实体（新档，命名/编号应落在既有 1xx 序号之后，例如 `110_`）、对应测试（6xx 序号）、两独立 process persistence demo（7xx 序号）。

**Potentially touched（唯讀依赖，不修改）：** `001_ports.js`（若要新增 `AIProviderPort.analyzeMedia` 方法签章——这是新增方法，不是修改既有 `verifyTake` 方法本身）、`401_system.js`（wiring，新增 engine 的组装）、`302_MockAIProvider.js`（新增 `analyzeMedia` 的确定性实作，不改动既有 `verifyTake` mock 逻辑）。

**Slice 3 files：预期零改动**——`107_Shoot.js`/`108_Take.js`/`206_ShootEngine.js`/`109_MediaAsset.js`（读取，不写入）/`303_LocalMediaStorageAdapter.js` 皆不应被修改。若实作过程中发现真的需要改动这些档案，必须依 §21（Slice 3 边界原则）STOP 並报告，不得默默动手。

---

## 21. Governance Impact

**No new ADR required。** G2 已经 CLOSED 且未产生新的 architecture decision（`17_`）；本轮进一步核对（idempotency、failure semantics、11 栏位一致性）同样没有发现任何需要新 ADR 才能解决的架构层级问题——找到的唯一细节（§16 是否套用通用 AI Generation Lifecycle wrapper）是实作层级的选择，两种做法都在既有架构授权范围内，不构成新的治理决策。

---

## 22. Open Questions

| # | 问题 | 分类 | 是否阻断 |
|---|---|---|---|
| 1 | `MediaAnalysis` 是否要套用 `002_aiGenerationLifecycle.js` 的通用 `AI_GENERATED→...→READY/GENERATION_FAILED` 包装，还是用更简单的「失败就不产生记录」模式 | G1（实作细节） | **否**——两种做法都安全、都在既有架构授权范围内，实作时择一並在证据报告里说明选择即可 |
| 2 | Idempotency 未被字面提及 | 见 §17 | **否**——append-only 设计已让重複呼叫在语意上安全 |
| 3 | （沿用 `17_`）`verifyTake` 与 `analyzeMedia` 是否共用底层 AI 能力 | G2，**已于 `17_` CLOSED** | 否——已关闭 |

**没有发现任何 G3/G4 级别的问题。**

---

## 23. Final Authorization Decision

**SLICE 4: AUTHORIZED FOR IMPLEMENTATION**

判准逐项核对（§23 A-K，任务书原文）：A 范围明确（仅 `MediaAnalysisEngine`）✓；B `analyzeMedia` 输入/输出/owner/lifecycle 已足够明确 ✓；C `MediaAsset`/`MediaAnalysis` 边界清楚 ✓；D AI 边界=informational/recommendation，无 approval/execution 权限 ✓；E G2 结论未被任何规划中的设计违反 ✓；F persistence 走既有 Storage Port/Adapter，边界明确 ✓；G versioning 语意明确（append-only，无缺口）✓；H runtime 未被假装已验证 ✓；I 可定义可执行的 deterministic/local 验证计画 ✓；J Slice 5/6 持续 `NOT AUTHORIZED` ✓；K 无未解决的 architecture-level blocker ✓。

与上一轮 `16_`（`CONDITIONALLY AUTHORIZED`）的差异：当时唯一的实质缺口（G2）已经在 `17_` 正式关闭；本轮新查核的两个小问题（§22 #1/#2）都是 G1 级、可在实作时自行决定並记录，不需要像 G2 那样另开专门的语意核对 gate——因此这次可以给出不带条件的 `AUTHORIZED`，而不是再一次 `CONDITIONALLY AUTHORIZED`。

---

## 24. Explicit Deferments（明确保留，非本次授权范围）

- Slice 5（`EditPlanEngine`/`EditEngine`）、Slice 6（`ReviewEngine`）：`NOT AUTHORIZED`，需各自独立 gate。
- Slice 2 既有 organic staleness deferment（`editConcept`/`editScript` 指令不存在）：与 Slice 4 无依赖关系，不受本次影响。
- Slice 4 内部的 G1 级实作选择（§22 #1）：留给实作阶段决定並记录，不需要额外治理动作。
- Runtime 真实验证（GAS/Sheets/Drive/真实 AI）：持续 `BLOCKED — EXPLICITLY CONTAINED`，与 Slice 4 是否能实作无关。

---

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED

Slice 4: AUTHORIZED FOR IMPLEMENTATION
G2 verifyTake ↔ analyzeMedia: CLOSED

Slice 5: NOT AUTHORIZED
Slice 6: NOT AUTHORIZED

Runtime: BLOCKED — EXPLICITLY CONTAINED
Other OS Changes: NONE
```

This Gate authorizes Slice 4 implementation only. It does NOT itself implement Slice 4. 下一步须是一个新的、独立的 `CVOS — Phase 1 Slice 4 Implementation Task`。
