# Content Video OS — Phase 1 Slice 4 Authorization Gate

**文件编号：** 16（已确认未与既有档案冲突）
**性质：** 纯治理/授权稽核任务——本轮零代码修改、零测试增删、未重开 Slice 3、未连线任何外部服务。
**日期：** 2026-09-14

---

## A. Executive Decision

**SLICE 4 CONDITIONALLY AUTHORIZED**

**在说明理由之前，有一个比"是否授权"更重要的发现必须先讲清楚：**

任务书本身（§7-§23）探索的内容——EditPlanEngine、Rough Cut 生成、Rough Cut Review、Human Review、AI Revision Loop、Edit Version 生命周期、Stale Approval——**这些实际上不是 Slice 4，而是 Slice 5（EditPlanEngine/EditEngine）与 Slice 6（ReviewEngine）**。这不是我的猜测，而是三个独立权威来源交叉确认的结果：

1. `01_ContentVideoOS_Phase1_Implementation_Map.md` §3「Slice breakdown」表格明文：`4 | MediaAnalysisEngine | Slice 3`、`5 | EditPlanEngine, EditEngine | Slice 4`、`6 | ReviewEngine (Rough Cut Review only) | Slice 5`（表格里的「Depends on」栏）。
2. **ADR-014**（Phase 1 scoping principle，APPROVED，冻结）原文定义 Phase 1 的完整垂直切片是「`Idea → Production Package → Production Go → Media → AI Analysis → Rough Cut Review`」——"AI Analysis" 这个阶段就是 Slice 4，对应 MediaAnalysisEngine；"Rough Cut Review" 是这条切片的*终点*，涵盖 Slice 5+6，不是 Slice 4 的内容。
3. `11_ContentVideoOS_Slice3_Completion_Evidence_Handoff.md` 自己的结尾（本项目上一份报告，而非本轮新写）已经明确写着：「下一个 Gate：`CVOS — Phase 1 Slice 4 Authorization Gate`**（MediaAnalysisEngine 等）**」。

所以本次 gate 实际要回答的问题是：**MediaAnalysisEngine 是否可以被授权实作**——不是 EditPlan/RoughCut/Review 那一整条链。任务书 §7-§23 的探索内容我在 F/附录节里保留並整理，作为**给 Slice 5/6 未来 gate 的预先侦察**，但不会把它们当成本次授权的对象，也不会因为任务书本身用了较宽的"Slice 4"框架就跟着扩大授权范围。

**在这个（正确、狭窄的）范围下，MediaAnalysisEngine 本身的定义质量相当高**——见 C/D/E 节——只有一个非阻断性的小型未决问题（见 J 节），因此判定 CONDITIONALLY AUTHORIZED 而非直接 NOT AUTHORIZED；但因为确实存在一个尚未在文件里正式关闭的开放问题，还没到可以毫无保留地宣告"零悬念"的 AUTHORIZED。

---

## B. Current State

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED
Slice 3 Code Verification: PASS
Slice 3 Governance: FORMALLY ADOPTED
ADR-019: FORMALLY ADOPTED
ADR-020: FORMALLY ADOPTED
Runtime: BLOCKED — EXPLICITLY CONTAINED
Slice 4+: NOT AUTHORIZED（本轮之前）
Other OS Changes: NONE
```

Slice 3 视为稳定基线，本轮未重新打开。

---

## C. Authoritative Scope Reconstruction

**权威来源（按权重排序）：**

1. **ADR-014**（冻结，APPROVED）——Phase 1 整体垂直切片定义，见 A 节引文。
2. `01_ContentVideoOS_Phase1_Implementation_Map.md` §1「MediaAnalysisEngine」子章节（第 102-110 行）：
   - **Responsibility：** AI batch analysis of imported footage
   - **Owner：** MediaAnalysisEngine
   - **Commands：** `analyzeMedia`
   - **Events：** `MediaAnalyzed`
   - **State：** append-only `MediaAnalysis` versions
   - **Persistence：** MediaAnalysis repository
   - **Dependencies：** Mock AI Provider adapter——**明确限定 Phase 1 只做确定性启发式**（档案 metadata 得出的 duration/orientation、一个占位的 quality/relevance 值），"do not attempt to solve every computer-vision problem"
   - **Tests：** 重新分析会追加新版本、绝不覆写；毁损档案要被标记，不能被静默跳过
3. `00_ContentVideoOS_AI_Production_Contract.md`：
   - AI Authority 表：`AI Media Analyst | 输入 MediaAsset(raw) | 输出 MediaAnalysis(metadata, tags, recommendations) | 禁止 Delete/move/alter the source file`
   - `MediaAsset.status` 三值 `IMPORTED/ANALYZED/ARCHIVED`（Slice 3 只产生 `IMPORTED`，`ANALYZED` 由 Slice 4 负责推进）
   - 完整 **MediaAnalysis** 栏位表（11 个栏位，见 D 节）
4. `00_ContentVideoOS_Product_Understanding_Report.md`：MediaAnalysis 定义为「AI-generated, versioned observations about a MediaAsset」，MediaAnalysisEngine 职责「AI batch analysis of footage」，与上述一致，无矛盾。

**结论：** 四个独立文件（ADR-014、01_、AI Production Contract、Product Understanding Report）对 Slice 4 = MediaAnalysisEngine 的描述完全一致，没有找到任何一处文字支持把 Slice 4 理解为更大的范围。

---

## D. Scope Matrix

| Capability | Explicitly in Slice 4? | Evidence | Depends on Slice 3 | New Governance Needed? | Authorized? |
|---|---|---|---|---|---|
| Media Analysis（`analyzeMedia` / `MediaAnalysis` 实体） | **YES** | `01_`§1 MediaAnalysisEngine；`01_`§3 表第4行；ADR-014「AI Analysis」阶段；`11_` 自身的下一步引用 | Yes（消费 Slice 3 产出的 `MediaAsset`） | No（沿用既有 `AIProviderPort`/ADR-010、既有 `StorageAdapter`/ADR-004） | **YES**（见 K） |
| `MediaAsset.status → ANALYZED` 转换 | **YES** | AI Production Contract `status` 栏位定义 | Yes | No | **YES** |
| Edit Plan generation（`createEditPlan`/`EditPlanEngine`） | **NO — Slice 5** | `01_`§3 表第5行 | 依赖 Slice 4 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |
| Rough Cut generation（`generateRoughCut`/`EditEngine`） | **NO — Slice 5** | `01_`§3 表第5行 | 依赖 Slice 4/5 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |
| Rough Cut Review / Human Review（`ReviewEngine`） | **NO — Slice 6** | `01_`§3 表第6行；ADR-014 把「Rough Cut Review」列为 Phase 1 垂直切片的终点 | 依赖 Slice 5 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |
| AI Revision Loop | **NO — Slice 6**（ReviewEngine 内的修订循环） | `01_`§1 ReviewEngine：`REVISION_REQUESTED⇄AI_REVISION⇄HUMAN_REVIEW` | 依赖 Slice 5/6 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |
| Edit Version 生命周期 / Stale Approval | **NO — Slice 5/6** | ADR-005（EditVersion Review + Publication 两条独立、嵌套的状态机） | 依赖 Slice 5 | 可能需要（届时评估） | **OUT OF SCOPE**（未来 gate） |
| Media 选取 / timeline 构建 / 剪辑指令 | **NO — Slice 5**（EditPlan 内容） | AI Production Contract §F Edit Plan Schema | 依赖 Slice 4/5 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |
| Review comments | **NO — Slice 6** | `01_`§1 ReviewEngine | 依赖 Slice 5 | 本 gate 不涉及 | **OUT OF SCOPE**（未来 gate） |

---

## E. Lifecycle / Authority Analysis（限定在正确范围的 Slice 4）

- **AI 权限（ADR-010 Recommendation/Decision/Execution 框架下）：** `MediaAnalysisEngine` 的输出是 `MediaAnalysis`（metadata/tags/recommendations）——纯 **Recommendation** 层级，不是 Decision、更不是 Execution。AI Production Contract 明确禁止它「Delete, move, or alter the source file」——不能对原始媒体做任何破坏性动作，与 Slice 3 已确立的「original media immutable」原则完全一致，不需要新的豁免。
- **版本机制：** `MediaAnalysis` 是 append-only，`analysis_version` 递增，重新分析产生新记录而非覆写旧记录——这跟 `Take` 的不可变模式（ADR-020）是同一种设计语言，实作上没有新概念需要发明。
- **人类审批边界：** MediaAnalysisEngine 的输出是「informational — no gate」（`00_Product_Understanding_Report.md` 第166行明确标注），也就是说 Slice 4 本身**不产生**任何新的人类审批关卡——第一个新增的人类关卡要等到 Slice 6（Rough Cut Review）才出现。这个 gate 的授权范围内不涉及任何新的人类授权语意，风险面因此比任务书原本探索的 Edit Plan/Review 范围小得多。
- **失败语意：** 「毁损档案要被标记，不能被静默跳过」——已有明确的失败表达方式（沿用既有的 flag-not-skip 惯例，与 `ADR-018`（`GENERATION_FAILED`）系出同源，不需要新状态机）。

---

## F. Governance Gap Analysis

| # | 问题 | 分类 | 说明 |
|---|---|---|---|
| 1 | Shoot Mode 的快速 take 验证（`verifyTake`）与 MediaAnalysisEngine 的深度批次分析，是同一个底层 AI 能力用不同方式调用，还是两个真正不同的能力？ | **G2** | 这是 `00_ContentVideoOS_AI_Production_Contract.md` §J 自己列出的既有 open question（原文件明确标注为未决，不是本轮新发现）。两种答案都不需要新架构决策——两者都已经走 `AIProviderPort` 这个既有边界，差别只在实作内部要不要共用一个 helper。不阻断实作开始。 |
| 2 | MediaAnalysis 的 `quality`/`content_type`/`audio_quality`/`visual_quality`/`relevance` 五个 enum，Mock AI Provider 要用什么具体规则产生数值 | **G1** | 属于实作细节（如同 Slice 1-3 的 Mock 规则一样，由实作时决定并写进测试），不需要治理决策 |
| 3 | `flags` 栏位（`best_take`/`duplicate_of`/`pause`/`mistake`/`strong_reaction`/`broll_candidate`/`good_opener`）的判定规则 | **G1** | 同上，实作细节 |

**没有发现任何 G3/G4 级别的问题。** 以下是本轮明确排除、不属于本次 Slice 4（MediaAnalysisEngine）授权范围、因此不在此列的问题（它们是真实存在的开放问题，但属于 Slice 5/6，留给对应的未来 gate）：Edit Plan 数据模型完整性（已在 AI Production Contract §F 里相当完整，供未来参考）、Edit Version 版本化、Rough Cut Review 生命周期、AI Revision Loop 是否需要最大迭代次数上限（`00_...md`§J 已列为 open question，但那是 Slice 6 的问题）。

---

## G. Runtime Boundary（依 ADR-019）

- **`CAN_CONTINUE`：** `MediaAnalysisEngine` 领域逻辑、`MediaAnalysis` 实体、`analyzeMedia` 命令、`MediaAnalyzed` 事件、Mock AI Provider 的确定性启发式、本地持久化、两独立 process 测试——全部可以现在本地实作与验证，不需要等待。
- **`MUST_WAIT` / `REQUIRES_REAL_RUNTIME`：** 无——Slice 4（正确范围）完全不涉及任何新的 Google/GAS/Sheets/Drive 或真实外部 AI 依赖；它读的 `MediaAsset`（Slice 3 产物）与写的 `MediaAnalysis`，两者都走既有的、已经本地验证过的 `StorageAdapter` 边界。**Runtime BLOCKED 对 Slice 4 的实作与验证没有任何新的阻碍**，处境与 Slice 1-3 完全相同。

---

## H. Testability Analysis

未来实作应至少覆盖（本轮不实作，仅确认架构可支持）：

- `analyzeMedia`：合法 `MediaAsset` → 产生 `MediaAnalysis` v1；再次分析 → 产生 v2（不覆写 v1）；对应损毁/缺失媒体 → 标记失败而非静默跳过。
- 持久化：`MediaAnalysis` 记录、`MediaAsset.status`/`latest_analysis_id` 更新，皆可用既有 `StorageAdapter` 模式做两独立 process 验证（与 Slice 1-3 完全相同的既有模式，不需要发明新的测试基础设施）。
- AI 权限：确认 `analyzeMedia` 无法设定 `AUTHORIZED`、无法触碰 `production_state`、无法修改/删除原始 `MediaAsset` 二进制。

架构对以上全部可测——沿用既有的 `MockAIProvider`/`LocalFileStorageAdapter`/两进程 persistence 模式，不需要新的测试基础设施。

---

## I. Cross-OS / Slice 5+ Containment

- 全 repo 本轮搜索：零处 Property/Reminder/Rider/Finance/Compliance/Inventory/Procurement/PersonalLifeOS 等其他 OS 名称的实作痕迹（延续 `15_` 已确认的乾净状态，本轮未新增任何代码，结论不变）。
- Slice 5/6（`EditPlanEngine`/`EditEngine`/`ReviewEngine`）与 Phase 2+（Publication/Analytics/Learning）：本轮**没有授权**，也没有在本报告中被当作已授权对象讨论——C/D 节的交叉引用是为了**划清楚 Slice 4 的边界**，不是提前授权它们。

---

## J. Required Conditions / Open Decisions

**Condition 1（非阻断，可在实作期间解决）：** 在实作 `analyzeMedia` 时，明确记录「它与 `verifyTake` 是否共用同一个底层 AI 能力」这个决定（哪种答案都可以，只需要在代码注解或测试里说清楚，不需要新 ADR）——这是本轮找到的唯一开放项（G F 节 #1），来自专案自己既有的 open-question 清单，不是本轮新制造出来的门槛。

不需要在实作开始前解决；只需要在完成时的证据报告里说明最终选择即可。

---

## K. Final Authorization State

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED
Slice 3 Code Verification: PASS
Slice 3 Governance: FORMALLY ADOPTED
ADR-019: FORMALLY ADOPTED
ADR-020: FORMALLY ADOPTED

Slice 4 (MediaAnalysisEngine): CONDITIONALLY AUTHORIZED
Slice 5 (EditPlanEngine, EditEngine): NOT AUTHORIZED — separate future gate
Slice 6 (ReviewEngine): NOT AUTHORIZED — separate future gate

Runtime: BLOCKED — EXPLICITLY CONTAINED
Slice 5+: NOT AUTHORIZED
Other OS Changes: NONE
```

授权只涵盖 **Slice 4 = MediaAnalysisEngine**（`analyzeMedia`、`MediaAnalysis` 实体、`MediaAsset.status→ANALYZED` 转换、既有 adapter 边界内的持久化）。本 gate 不自动开始实作；也不因为探索过 Slice 5/6 内容就一併授权它们——那些需要各自独立的 Authorization Gate。
