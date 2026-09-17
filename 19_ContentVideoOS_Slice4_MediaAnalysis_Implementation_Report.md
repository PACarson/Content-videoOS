# CVOS — Phase 1 Slice 4 (MediaAnalysisEngine) Implementation Report

**文件编号：** 19（已确认未与既有档案冲突）
**日期：** 2026-09-14
**范围：** Slice 4 = MediaAnalysisEngine only。Slice 3 未修改；Slice 5/6 未实作。

---

## 1. Implementation Scope

实作 `analyzeMedia`：对已 import 的 `MediaAsset` 做 AI-assisted 分析，产生新的 versioned `MediaAnalysis` record，並透过既有 `MediaAnalyzed` 事件与既有 Storage Port 持久化。范围与 `16_`/`18_` 授权的完全一致，未扩张。

---

## 2. Authoritative Evidence Used

`00_ContentVideoOS_AI_Production_Contract.md`（11 栏位 MediaAnalysis schema、AI Authority 表）、`01_ContentVideoOS_Phase1_Implementation_Map.md`§1（MediaAnalysisEngine 子章节）、ADR-004（storage split）、ADR-010（AI 权限三分）、ADR-014（Phase 1 范围）、ADR-015（`production_state` canonical）、ADR-019（Runtime-Blocked Policy）、ADR-020（Shoot/Take 语意，含 G2 边界）、`16_`/`17_`/`18_`（Slice 4 治理链）、既有实作（`001_ports.js`、`002_aiGenerationLifecycle.js`、`109_MediaAsset.js`、`207_MediaEngine.js`、`302_MockAIProvider.js`、`401_system.js`、`609_mediaEngine.test.js`、`705_`/`706_`）。

---

## 3. Files Added / Modified

**新增：**

| 档案 | 用途 |
|---|---|
| `110_MediaAnalysis.js` | `MediaAnalysis` 领域实体（栏位验证 + `toRecord`） |
| `208_MediaAnalysisEngine.js` | `MediaAnalysisEngine`：`analyzeMedia`、`get`、`getAllForAsset` |
| `610_mediaAnalysisEngine.test.js` | 16 个确定性测试，见 §13 |
| `707_reload-demo-slice4-write.js` / `708_reload-demo-slice4-read.js` | 两独立 process persistence demo |

**修改（皆为附加，逐一核实未动到既有文字）：**

| 档案 | 改动 |
|---|---|
| `001_ports.js` | `AIProviderPort` 新增 `analyzeMedia(mediaAsset)` 方法签章（附加在 `verifyTake` 之后，`verifyTake` 本身文字未动） |
| `302_MockAIProvider.js` | `MockAIProvider` 新增 `analyzeMedia` 确定性实作（附加在 `verifyTake` 之后，`verifyTake` 本身文字未动） |
| `401_system.js` | 新增 `MediaAnalysisEngine` import 与 wiring（附加一行 require + 附加一行组装，其余未动） |

**未修改（本轮核实）：** `src` 内所有 Slice 1-3 档案时间戳仍是压缩包原始时间 `2026-09-12 23:03:33`（见 §15），`12_`/`00_ContentVideoOS_Architecture_Governance_v0.1.md`（Slice 3 那两条 ADR 之后本轮未再动）皆未触碰。

---

## 4. MediaAnalysis Contract

严格 11 栏位，逐一对照 AI Production Contract：`id`（对应 Contract 的 `analysis_id`——沿用本专案 `id` 主键惯例，ADR-015 `production_state` vs `status` 已有先例，见 `110_` 档头注解）、`asset_id`、`analysis_version`、`quality`、`content_type`、`audio_quality`、`visual_quality`、`relevance`、`flags`、`generated_by`、`created_at`。**未新增任何栏位。**

---

## 5. analyzeMedia Flow

```
MediaAsset（既有，已 import）
      ↓  storage.read
MediaAnalysisEngine.analyzeMedia(assetId)
      ↓  aiProvider.analyzeMedia(asset)   — 未通过则整个流程在此中止，见 §11
      ↓  validateMediaAnalysisFields
      ↓  查询既有版本，取 max(version)+1
      ↓  storage.append('media_analyses', record)
      ↓  storage.update('media_assets', assetId, {status:'ANALYZED', latest_analysis_id})
      ↓  eventLog.record('MediaAnalyzed', ...)
      → 回传新 MediaAnalysis
```

---

## 6. Versioning Behavior

Append-only：`analysis_version` 取既有记录里该 `asset_id` 的最大版本号 +1（无既有记录则为 1）。**从不覆写**——测试 `610_` 第 3/4 项证实第二次分析产生 v2，v1 的记录逐位元不变（`assert.deepEqual`）。

---

## 7. AI Provider Boundary

`MediaAnalysisEngine → AIProviderPort.analyzeMedia → MockAIProvider`（或未来真实 provider），domain 层完全不知道具体 provider 是谁。`610_` 有专属测试确认 `sys.aiProvider instanceof AIProviderPort`。零直接外部 AI API 呼叫。

---

## 8. AI Authority Boundary

`analyzeMedia` 的回传值只包含 6 个分析结果栏位（`quality`/`content_type`/`audio_quality`/`visual_quality`/`relevance`/`flags`/`generated_by`），完全没有能力设定 `production_state`、`AUTHORIZED`、或任何 Shoot/Take/Shot 栏位——`208_MediaAnalysisEngine.js` 里没有任何一行代码引用这些栏位名称（除了解释性注解，`610_` 测试用精确的赋值语法正则而非泛字串搜索核实这点，避免把注解误判为违规）。`MediaAsset.status → 'ANALYZED'` 是本引擎唯一会写的 MediaAsset 栏位，且是纯记录性质。

---

## 9. MediaAsset Immutability

`610_` 测试逐一核对 `id/hash/source_file_ref/media_type/duration_sec/orientation/shoot_id/shot_id/take_id/equipment_id/capture_timestamp` 十一个既有欄位在分析前后完全相同；原始二进制内容用 `retrieveBinary` 取回后与写入时的 bytes 做 `Buffer.compare`，本轮独立重跑结果一致（见 §14 的进程级证据，效力更强——不只是同一 process 内比对，是跨真实 process 边界比对）。

---

## 10. MediaAnalyzed Event

`eventLog.record('MediaAnalyzed', {id, assetId, version})`——每次成功分析恰好一次，`610_` 测试验证两次分析各自产生一笔事件且 `version` 正确递增。失败的分析**不**产生这个事件（见 §11）。

---

## 11. Failure / Retry Behavior

**设计选择（如实作授权 `18_`§16 所述明确记录於此）：** 没有重用 `002_aiGenerationLifecycle.js` 的四态包装（`AI_GENERATED→...→GENERATION_FAILED`）——因为权威 11 栏位 schema 没有 `status` 欄位可以承载这四态，新增一个会违反「不新增未记载栏位」的要求。改採更简单的方式：AI provider 呼叫失败（抛出例外）或回传格式不正确（`validateMediaAnalysisFields` 判定无效）时，**在任何持久化动作之前直接抛出例外**——不产生 `MediaAnalysis` 记录、不发 `MediaAnalyzed` 事件、`MediaAsset` 维持原状（`610_` 测试逐一验证：状态仍是 `IMPORTED`、`latest_analysis_id` 仍是 `null`、既有的前一次成功分析纹丝不动）。

---

## 12. Idempotency / Re-analysis Behavior

沿用 `18_`§17 的既有结论：架构从未使用「idempotent」这个字，但 append-only 设计本身就让重複呼叫安全——重複呼叫 `analyzeMedia` 只会产生多一个版本，不会破坏任何东西。`610_` 测试对同一个 `MediaAsset` 呼叫两次，确认得到 v1、v2 两个独立记录且互不覆写。

---

## 13. Test Results（本轮独立重新执行）

```
node --test
# tests 114
# pass 114
# fail 0
# cancelled 0
# skipped 0
# duration_ms ≈ 855-891（两次实测皆在此区间）
```

114 = 既有 98（Slice 1/2/3 regression，全部持续通过）+ 新增 16（`610_mediaAnalysisEngine.test.js`，涵盖 §18.1-18.8 全部类别：成功分析、re-analysis 版本化、MediaAsset 不可变性、原始二进制不可变性、provider 失败（两种情境：例外/格式错误）、provider 边界、无效输入、event 正确性，外加 G2 边界测试与三个静态边界检查）。

**过程记录：** 第一次执行时，我自己写的第 114 个测试（检查 `production_state`/`AUTHORIZED` 字串）誤判了自己档案里解释「本引擎不会做这件事」的说明性注解——这是我的测试写太粗糙，不是代码有问题；已改用精确的赋值语法正则修正（比照本专案既有的 `RECAPTURE_NEEDED`-在注解里-不算违规 的判例），修正后 114/114 全过。据实记录，不掩盖。

---

## 14. Two-Process Persistence Evidence（本轮独立重跑，全新临时目录、两次分开的 node 呼叫）

```
Process 1（node scripts/707_reload-demo-slice4-write.js <dir>）：
  import 一个 MediaAsset，呼叫 analyzeMedia 两次
  → mediaAssetId, analysisV1Id, analysisV2Id, originalBytesBase64

Process 2（完全独立的第二次 node 呼叫，node scripts/708_reload-demo-slice4-read.js ...）：
  mediaFound: true, mediaStatus: "ANALYZED"
  mediaLatestAnalysisId: 与 Process 1 的 analysisV2Id 相同
  v1Found: true, v1Version: 1
  v2Found: true, v2Version: 2
  totalVersionsForAsset: 2（无幻影记录，无遗漏）

二进制核对：额外直接读取磁碟上的 .bin 档案，对 62 bytes 做 Buffer.compare(diskBytes, expectedBytes)
  → true（逐字节相同，不只是比对 base64 字串）
```

**持久化验证：PASS。**

---

## 15. Static Boundary Checks

- Slice 5/6 可执行实作（`EditPlanEngine`/`RoughCutEngine`/`ReviewEngine`/`FinalApproval`/`PublicationEngine`/`AnalyticsEngine` 类别的 class/function）：全 repo 搜索零命中。
- Google API（`DriveApp`/`SpreadsheetApp`/`UrlFetchApp`/`ScriptApp`）：全 repo domain/engine 层零命中（只在既有 `30x_` adapter 与断言其缺席的测试里出现）。
- `production_state = 'AUTHORIZED'` 赋值：全 repo 仍然只有一处（`204_ProductionPlanEngine.js:158`，`authorizeProductionGo` 内部），本轮未新增第二处。
- Slice 3 档案时间戳：`107_Shoot.js`／`108_Take.js`／`109_MediaAsset.js`／`206_ShootEngine.js`／`207_MediaEngine.js`／`303_LocalMediaStorageAdapter.js` 皆仍是压缩包原始时间 `2026-09-12 23:03:33`，本轮零改动。

---

## 16. Runtime Verification Status

维持 `BLOCKED`。本轮只做了本地验证（`node --test`、两独立 process persistence）。

---

## 17. Deferred Runtime Verification

真实 GAS 执行、Sheets 读写/併发行为、Drive 上传/大档行为、真实外部 AI provider 品质——皆未尝试，也未宣称已验证（ADR-019 `REQUIRES_REAL_RUNTIME` 层级，与 Slice 1-3 处境相同）。

---

## 18. Governance Impact

**无新增 ADR。** 本轮实作完全落在 `16_`/`17_`/`18_` 已授权的范围内；`18_`§16/§17 已经预先分析过的两个 G1 级选择（failure semantics 不套用四态包装、idempotency 靠 append-only 设计而非新机制）在实作时依原计画採用，未产生新的治理决策。`00_ContentVideoOS_Architecture_Governance_v0.1.md` 本轮**未修改**（Slice 4 目前没有专属 ADR，符合预期——`16_`/`18_`已确认这不是必要的）。

---

## 19. Slice 5/6 Isolation

`EditPlanEngine`/`EditEngine`/`ReviewEngine`/Human Review/AI Revision/Final Approval/Publication/Analytics/Learning：本轮零实作、零新增档案、零依赖引入。`Slice 5: NOT AUTHORIZED`、`Slice 6: NOT AUTHORIZED` 不变。

---

## 20. Final Implementation Status

**Implementation Truth：** PASS — 本地实作与全部本轮独立重跑的测试／两进程验证一致。
**Governance Truth：** PASS — 实作维持在 `16_`/`17_`/`18_` 授权范围内，无新增治理决策，无 frozen 内容被改动。
**Runtime Truth：** BLOCKED — 真实 GAS/Sheets/Drive/外部 AI 未被验证，也未被宣称已验证。

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED

Slice 4: IMPLEMENTED — LOCAL VERIFICATION PASS
G2 verifyTake ↔ analyzeMedia: CLOSED

Slice 5: NOT AUTHORIZED
Slice 6: NOT AUTHORIZED

Runtime: BLOCKED — EXPLICITLY CONTAINED
Other OS Changes: NONE
```

「Slice 4: IMPLEMENTED — LOCAL VERIFICATION PASS」不代表真实 runtime 已验证。本任务到此为止，不自动开始 Slice 5。
