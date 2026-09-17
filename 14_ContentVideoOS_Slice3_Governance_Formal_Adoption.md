# Content Video OS — Slice 3 Governance Formal Adoption

**文件编号：** 14
**性质：** 治理正式追认任务。唯一改动：`00_ContentVideoOS_Architecture_Governance_v0.1.md` 新增 ADR-019、ADR-020 两行（append-only，ADR-001~018 逐字未动）。未修改 `12_`、未重建 `09_`/`10_`、未修改任何代码。
**日期：** 2026-09-14
**依据：** `13_ContentVideoOS_Slice3_Governance_Evidence_Reconciliation.md`

---

## A. Task Scope

正式追认两项治理决议进入现行 §15 ADR 表格：**ADR-019**（Runtime-Blocked Development Policy）与 **ADR-020**（Shoot / Take Execution Lifecycle）。这是「现在正式採纳」（CURRENT FORMAL ADOPTION），不是「找回並还原原始遗失文件」——`13_` 已确认没有任何一份缺失文件的证据强度够到可以「还原」（最高只到 R2）。

---

## B. Pre-Adoption Governance State

本任务开始前重新独立核对（不依赖 `12_`、不依赖既有记忆）：§15 实测仅有 ADR-001 至 ADR-018，`grep -c "^| ADR-"` = 18，序列连续无跳号无重复。

---

## C. Why Adoption Was Required

`13_` 的结论：Slice 3 的代码实作与测试证据强（98/98 本轮独立重跑通过、两独立 process persistence 含二进制核对本轮独立重跑通过），但这两项决议从未正式进入 §15——ADR-019 只在 `11_`/`12_` 的叙述中出现，源码零引用；ADR-020 虽有 6 个源码档案的具体引用且与代码行为逐条对应，但同样从未出现在 §15。`13_` 的建议：不还原（证据不到 E2/R3），改为另开一个正式授权的治理任务来追认——本任务即为该任务。

---

## D. ADR-019 — Final Adopted Decision Summary

**Runtime-Blocked Development Policy。** 三层判准：`CAN_CONTINUE`（domain/engine/测试/local persistence/Mock 与 Local adapter 可现在本地实作与验证）、`MUST_WAIT`（真实 Sheets/Drive adapter 行为可在既有 Port/Adapter 边界内设计与撰写，但状态停在 `IMPLEMENTED, RUNTIME UNVERIFIED`，不得等同于 `RUNTIME VERIFIED`）、`REQUIRES_REAL_RUNTIME`（真实 GAS 执行、Sheets 并发/schema 演进、Drive 上传/大档/身份行为、真实 GAS 配额，只能靠真实 runtime 证据证明）。Domain→Engine→Port/Adapter 边界（ADR-004）与 AI Provider port 边界（ADR-010）维持不变，不得变成对 GAS/Sheets/Drive 或真实外部 AI 的硬依赖。完整文字见 §15 ADR-019 行。

---

## E. ADR-020 — Final Adopted Decision Summary

**Shoot / Take Execution Lifecycle。** `Shoot.shoot_state` 只有 `IN_PROGRESS`/`COMPLETE` 两值（无 `NOT_STARTED`）；`startShoot` 复用既有 `canStartShoot()`（`production_state === AUTHORIZED` 或已 `IN_PROGRESS` 且 `authorization_valid === true`），不重复/不削弱既有授权逻辑；`recordTake` 产生不可变的 `Take`，补拍是新记录而非覆写；`verifyTake` 是纯技术验证（走既有 AI Provider port），绝非创意审核／Final Approval／发布核准；`Shot.captureStatus` 维持既有三值 `NOT_STARTED → CAPTURED → VERIFIED`；**`RECAPTURE_NEEDED` 明确不是任何实体的持久化状态**；`completeShoot` 只代表拍摄 session 本身结束，不代表 ProductionPlan／创意核准／发布任何一层完成；`production_state`（ADR-015）维持唯一 canonical 欄位，`authorization_valid`/`invalidation_reason`/`invalidated_at` 不变；`MediaAsset.source_file_ref` 维持 provider-neutral（ADR-004/016），不得是 Google Drive File ID。完整文字见 §15 ADR-020 行。

---

## F. Provenance

两条新 ADR 皆在正文内写入明确的 *Provenance* 段落，引用 `13_ContentVideoOS_Slice3_Governance_Evidence_Reconciliation.md`，並明确声明「现在正式採纳」，同时明确指出原始 `09_`/`10_`（及 ADR-019 对应的 Runtime Strategy 类文件）**未被找回**。

**CURRENT FORMAL ADOPTION — NOT HISTORICAL RESTORATION.**

本轮对 §15 全文 grep 核对：不含 `restored`／`recovered`／`reconstructed original`／`previously existed` 等字样（零命中）。

---

## G. Consistency Verification

| Validation | 结果 | 说明 |
|---|---|---|
| A — ADR 编号 | **PASS** | 20 条 ADR，001–020 连续、无跳号、无重复 |
| B — ADR 列表 | **PASS** | 两行皆有明确 Title 与 `APPROVED` 状态 |
| C — Provenance | **PASS** | 两行皆引用 `13_`，皆无违规措辞 |
| D — 与既有 ADR 一致性 | **PASS** | ADR-019 未新增 `AUTHORIZATION_INVALIDATED` 作为值；ADR-020 明确重申 `production_state`（ADR-015）为唯一 canonical 欄位，媒体边界与 ADR-004/016 一致 |

---

## H. Code Alignment（唯读核对，未修改任何代码）

- 这份 repo 是扁平结构，本身没有 `src/`/`test/`/`scripts/` 子目录可被本任务动到；`107_Shoot.js`／`108_Take.js`／`206_ShootEngine.js` 时间戳仍是压缩包原始的 `Sep 12 23:03`，本任务全程对代码零写入。
- ADR-019/020 内文描述的行为与既有代码逐条一致，沿用 `13_` 的独立测试结果：98/98 pass、两独立 process persistence（含二进制 `Buffer` 核对）、provider 边界乾净、`RECAPTURE_NEEDED`／`AUTHORIZATION_INVALIDATED` 皆非被赋值字串、`shoot_state` 确实只有两值。

---

## I. Historical Integrity

- `12_ContentVideoOS_Session_Handoff_Checkpoint.md`：本轮核对仍为 146 行，含那句已知不准确的「ADR 数量 20」陈述，**逐字未动**——它的错误陈述本身是证据，不是要被抹除或改写的东西。
- 未创建 `09_...` 或 `10_...` 任何档案。
- 两条新 ADR 皆不宣称「原件复原」，只宣称「现在正式採纳」。

---

## J. Final State

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3 Implementation: IMPLEMENTED
Slice 3 Code Verification: PASS
Slice 3 Governance Evidence: FORMALLY ADOPTED
ADR-019: FORMALLY ADOPTED
ADR-020: FORMALLY ADOPTED
Runtime: BLOCKED
Slice 4+: NOT AUTHORIZED
Other OS Changes: NONE
```

**本任务到此为止，不自动进入下一个 Gate。** 下一个任务是另一个独立授权的 `CVOS — Slice 3 Final Completion / Governance Closure Gate`，届时会重新核对 Implementation + Evidence + Governance + Persistence + Authority boundaries 是否都已充分闭环。
