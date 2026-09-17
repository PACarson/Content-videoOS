# Content Video OS — Slice 4 G2 Semantic Resolution: verifyTake ↔ analyzeMedia

**文件编号：** 17（已确认未与既有档案冲突）
**性质：** 纯语意澄清任务——零代码修改、零 ADR 新增、未重开 Slice 3、未实作 Slice 4。
**日期：** 2026-09-14

---

## A. Executive Decision

**G2 CLOSED — Option B**（更精确地说：两者是操作在不同输入、不同管线阶段上的独立 domain 命令；是否共用底层 AI 能力只是可选的实作细节，不影响 domain 语意）。

这不是本轮新做出的判断——**关键证据显示这个问题其实在 Slice 3 实作当时就已经被明确回答过**，只是 `AI Production Contract §J` 的 open-question 条目从未被回头标记为已解决。见 B/C 节。

---

## B. Source-of-Truth Analysis

依权威顺序核对，本轮**没有发现任何层级之间的冲突**：

| 层级 | 来源 | 内容 |
|---|---|---|
| 1. 冻结架构 | Architecture Governance §3 | ShootEngine 的失效模式被明确定义为「in-field, no connectivity」——尚未离场（offload）前就要能判断 Take 是否技术上可用 |
| 2. 正式 ADR | **ADR-020**（`00_...Architecture_Governance_v0.1.md` §15） | `verifyTake` = 纯技术验证，明确排除创意判断；由 AI Provider port 执行 |
| 3. Implementation Map | `01_`§1「MediaAnalysisEngine」子章节 | `analyzeMedia` 的 owner 是 MediaAnalysisEngine，输入输出与 ShootEngine 完全分开描述 |
| 4. 正式治理报告 | `13_`/`14_`/`15_`/`16_` | 皆未触及本问题的具体答案，只把它列为待解的 G2 |
| 5. 既有实作 | `001_ports.js`（93行 `AIProviderPort.verifyTake` 文件说明）＋`206_ShootEngine.js`（119-138行 `verifyTake` 本体） | **本轮找到的决定性证据**，见下 |
| 6. 历史叙述 | `00_ContentVideoOS_AI_Production_Contract.md` §J | 提出这个问题本身的原始条目（`open question`，从未标记关闭） |

**重要说明：** 第 5 层（既有实作）给出的答案，不是「实作凌驾于架构之上」——`001_ports.js` 的注解本身**直接引用第 1 层的 Architecture §3**（"no connectivity in the field"）来解释为什么两者必须分开。也就是说，这是实作忠实执行冻结架构原则后，用比架构原文更明确的语言把答案写了出来；不是下位来源推翻上位来源，而是下位来源精确地示范了上位来源早就蕴含的答案。

---

## C. verifyTake 精确定义

**逐字引用 `001_ports.js` 第 81-89 行（`AIProviderPort.verifyTake` 的官方说明）：**

> TECHNICAL check ShootEngine calls from `verifyTake`. This is never a creative-quality judgment (that is MediaAnalysisEngine/Review's job, later slices) — only technical capture integrity (duration/audio-presence/orientation/etc, whatever `technicalMetadata` was recorded with the Take). It runs against `technicalMetadata`, NOT against any imported binary file — Slice 3's pipeline runs `verifyTake` before any MediaAsset exists (Architecture §3: ShootEngine's failure mode is explicitly about "no connectivity in the field", i.e. before the footage is ever offloaded).

**`206_ShootEngine.js` 第 119-138 行实作行为：**

- **输入：** `takeId` → 读取该 `Take` 的 `technicalMetadata`（在场记录时就有的最小技术读数，例如 `{ durationSec, hasAudio, orientation }`——**不是**已汇入的二进制媒体）
- **前置条件：** `take.verificationResult` 必须为 `null`（已验证过的 Take 不可重複验证——一次性、不可变，ADR-020 §4）
- **输出：** `{ result: 'VERIFIED'|'FLAGGED', details }`，直接**写入同一笔 Take 记录**的 `verificationResult`/`verifiedAt` 栏位（不是产生新记录）
- **主体：** 一笔具体的 `Take`（一次拍摄执行事实）
- **生命周期效应：** 若 `VERIFIED`，`Shot.captureStatus → VERIFIED`；若 `FLAGGED`，`Shot.captureStatus` 停在 `CAPTURED`（不产生新状态，允许之后补拍）
- **事件：** `TakeVerified`
- **时间点：** 在片场、离线汇入之前

---

## D. analyzeMedia 精确定义

**依据 `01_`§1「MediaAnalysisEngine」＋ `AI Production Contract` AI Authority 表 ＋ 11 栏位 `MediaAnalysis` schema：**

- **输入：** 一个已存在的 `MediaAsset`（原始二进制档案本身，已经汇入、有 `source_file_ref`）
- **输出：** 一笔全新的、**独立、append-only、有版本号**的 `MediaAnalysis` 记录（`analysis_id`、`asset_id`、`analysis_version`、`quality`、`content_type`、`audio_quality`、`visual_quality`、`relevance`、`flags[]`、`generated_by`、`created_at`）——**不修改 `MediaAsset` 本身**，只是让 `MediaAsset.status` 从 `IMPORTED` 前进到 `ANALYZED`（纯记录性质，非授权/审批）
- **主体：** 一个 `MediaAsset`（已归档的媒体内容）
- **生命周期效应：** 明确**「informational — no gate」**（`00_Product_Understanding_Report.md`）——不影响任何 Shoot/Shot/Take/ProductionPlan 状态
- **事件：** `MediaAnalyzed`
- **时间点：** Shoot 已经 offload、`MediaAsset` 已存在之后，作为批次分析

---

## E. Comparison Matrix

| | `verifyTake` | `analyzeMedia` |
|---|---|---|
| Command | `verifyTake(takeId)` | `analyzeMedia(assetId)`（规划中，未实作） |
| Event | `TakeVerified` | `MediaAnalyzed`（规划中） |
| Input | `Take.technicalMetadata`（现场读数，非二进制） | `MediaAsset`（已汇入的二进制内容） |
| Output | 写入同一笔 `Take`（一次性，不可变） | 全新一笔 `MediaAnalysis`（append-only，可多版本） |
| Owner | `ShootEngine`（Slice 3） | `MediaAnalysisEngine`（Slice 4） |
| AI Role | 纯技术 pass/fail（blur/exposure/audio/orientation 类） | 描述性特徵分类（quality/content_type/relevance/flags），仍是 Recommendation 层级 |
| Human Role | 无——ShootEngine 自身逻辑依 AI 结果决定要不要推进 `captureStatus` | 无——`informational, no gate` |
| Lifecycle Effect | **有**：可推进 `Shot.captureStatus → VERIFIED` | **无**：仅 `MediaAsset.status → ANALYZED` 的记录性标记 |
| Persistence | 同一笔 Take 上的栏位，一次性写入后不可变 | 独立实体，append-only 版本化 |
| 时间点 | 片场、离线前 | 汇入之后、批次分析 |

---

## F. Shared Capability Analysis

两者在概念上都可以被归类为「AI 驱动的技术性检查」，因此存在一种可能性：底层可以共用同一个 `AIProviderPort` 实作里的某个 helper（例如共用一段「侦测音讯是否静音/削波」的逻辑）。**但这至多是共用底层基础设施，不是共用 domain 命令**——两者的输入结构不同（`technicalMetadata` 这个结构化 metadata blob，vs. 实际二进制内容或从中萃取的特徵），运行阶段不同（有没有 `MediaAsset` 都不一定一样），输出去处也完全不同（写回 `Take` vs. 建立全新 `MediaAnalysis`）。是否要在未来 Slice 4 实作时让 `MockAIProvider`／真实 provider 内部共用某段程式码，是纯粹的实作选择，**不需要、也不应该**因此新增一个跨越两者的 domain 抽象层。

---

## G. Domain Ownership

| Command | Domain Object | Domain Owner | Output | Lifecycle Effect |
|---|---|---|---|---|
| `verifyTake` | `Take` | `ShootEngine`（Slice 3，已 CLOSED） | `Take.verificationResult` | `Shot.captureStatus` 条件式推进 |
| `analyzeMedia` | `MediaAsset` | `MediaAnalysisEngine`（Slice 4，CONDITIONALLY AUTHORIZED） | 新 `MediaAnalysis` 记录 | 无（仅 `MediaAsset.status` 记录性更新） |

两者 owner 不同、subject 不同、output 目的地不同——domain ownership 清楚不重叠。

---

## H. Lifecycle Analysis

- `verifyTake`：一次性、不可变、**有**门槛效应（决定 Shot 是否需要补拍），但这个门槛效应是 `ShootEngine` 自己的 `if (outcome.result === 'VERIFIED')` 逻辑做的，AI 本身只回传技术评估，不直接改状态。
- `analyzeMedia`：可重複执行、append-only、**没有**任何门槛效应——`MediaAnalysis ≠ Human Approval`、`MediaAnalysis ≠ Edit Plan`、`MediaAnalysis ≠ Publication`，这三个等式在现有文件里都成立，本轮未发现任何反例。

---

## I. AI Authority Analysis

两者的 AI 都停留在 ADR-010 的 **Recommendation** 层级：

- `verifyTake` 的 AI 只回传 `{result, details}`，实际状态变更由 `ShootEngine` 的确定性代码执行——AI 没有直接写入任何 lifecycle 栏位的权限。
- `analyzeMedia` 的 AI 输出被 Product Understanding Report 明文定性为「informational — no gate」，与 AI Production Contract 的「AI Media Analyst … Must NOT: Delete, move, or alter the source file」一致——不构成任何形式的核准。

两者都没有、也不应该被允许触碰 `production_state`、`AUTHORIZED`，或任何 Final Approval / Publication 层级的语意。

---

## J. Slice 3 Boundary

`verifyTake` 完全留在 `ShootEngine`（Slice 3）内，本轮**零代码改动**。Slice 3 维持 `CLOSED`，这次澄清没有理由、也没有必要重开它。

---

## K. Slice 4 Boundary

`analyzeMedia` 的定义域完全落在 `MediaAnalysisEngine`（Slice 4）——这次澄清没有把任何 Slice 3 责任「追溯性地」并入 Slice 4，反而更清楚地划出两者的分界，让未来 Slice 4 实作时不会误以为可以重用/依赖 `Take.technicalMetadata` 或 `verifyTake` 的既有逻辑。

---

## L. Slice 5 / Slice 6 Containment

`MediaAnalysis` 不是 `EditPlan`；`analyzeMedia` 不会挑选最终剪辑用的片段、不会建构时间轴、不会执行剪辑、不会产生 Rough Cut（那些是 Slice 5）；也不涉及人工审核、核准、驳回、复审循环、Final Approval（那些是 Slice 6）。**Slice 5、Slice 6 维持 `NOT AUTHORIZED`，本次澄清不构成、也无意构成对它们的授权。**

---

## M. ADR Assessment

**NO ADR REQUIRED。**

理由：这次澄清没有变更、也没有正式扩张任何 lifecycle、authority、ownership 或跨领域边界——ADR-020（`verifyTake` 语意）与既有的 Slice 4 权威定义（`01_`/AI Production Contract 的 `analyzeMedia`/`MediaAnalysis` 规格）本来就已经蕴含着这个答案；本报告只是把两份既有、独立、彼此一致的规格并排对照，正式关闭 `AI Production Contract §J` 里那个从未被标记完成的旧问题。没有新决策产生，因此不建立新 ADR——这与本专案一贯的原则一致（不为了记录清楚而无谓新增治理条目）。

`AI Production Contract §J` 原文本身**不做修改**（冻结文件原则不变）；这份新报告（`17_`）作为该 open question 的正式关闭记录。

---

## N. Implementation Impact（供未来 Slice 4 实作参考，本轮不实作）

- `MediaAnalysisEngine.analyzeMedia(assetId)` 应该独立读取 `MediaAsset`（透过既有 `MediaStorageAdapterPort`／`StorageAdapterPort`），产生新的 `MediaAnalysis` 记录——**不应该**去调用 `ShootEngine.verifyTake` 或读取 `Take.technicalMetadata` 作为其输入的一部分。
- 若未来 `MockAIProvider`／真实 AI provider 的实作内部想要共用某个底层工具函式（例如共用的音讯/画面基础检测），这是纯粹的实作细节，可以自由决定，不需要、也不应该因此让 `verifyTake` 与 `analyzeMedia` 的 domain 契约产生耦合。
- `MediaAsset.latest_analysis_id`（既有栏位，目前恒为 `null`）应该在 `analyzeMedia` 首次执行后指向最新一笔 `MediaAnalysis`——这是既有 schema 已经预留好的欄位，不需要新决策。

---

## O. Final G2 Decision

**Option B（精确版）：`verifyTake` 与 `analyzeMedia` 是两个独立的 domain 命令，作用在不同的对象（`Take` vs. `MediaAsset`）、不同的管线阶段（片场现场、离线前 vs. 汇入之后）、有不同的生命周期效应（一个会推进 Shot 状态、一个纯粹是记录性质）。它们「可能」在最底层共用某种 AI 分析基础设施，但这至多是可选的实作细节，不构成、也不应该被拿来合併两者的 domain 契约。**

---

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

Slice 4 implementation authorization may now proceed through a separate implementation gate. 本任务不实作 Slice 4。
