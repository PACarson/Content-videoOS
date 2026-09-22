# Content Video OS — Canonical Structure: Human Decision Record

**文件编号：** 23
**性质：** 纯决定记录（Decision Record）——不是 Gate，不是 ADR 修正，不授权任何执行动作。本文件本身没有移动/复制/合併/删除任何档案，没有重新打包，没有修改任何代码/测试/脚本/README/ADR。
**日期：** 2026-09-18

---

## 1. 决定内容（逐字记录用户原文所述）

用户就 `22_ContentVideoOS_Canonical_Package_Structure_Decision_Gate.md` 提出的 Human Decision 请求，正式决定：

> **CVOS Canonical Repository / Package Structure = LAYERED**

自本决定生效后，CVOS 的唯一 canonical structure 为：

- `src/` — production source
- `test/` — tests
- `scripts/` — scripts and tooling
- governance reports / ADRs / README 等文件依既有治理文件约定存放

Flat ZIP 不再被视为可直接开发、测试或作为 canonical source 的 repository package。

**与 `22_` §12 Recommendation 的关系：** 本决定採纳了 `22_` 的 Recommendation（Layered），理由与证据见 `22_` §3/§5/§12——本文件不重复列出，只记录决定本身。

**决定性质的明确限定（用户原文）：** 本决定是对既有 repository convention 的正式确认，**不代表授权重写架构或改变 domain behavior**。

---

## 2. 执行范围——明确未授权（用户原文逐条记录）

用户明确声明本决定**不授权**：

- 搬动、复制、合併或删除任何文件
- 重新打包任何 ZIP
- 修改代码、测试、脚本
- 修改 README
- **修改 ADR**（含新增 ADR 条目，例如把本决定写成一条新的 ADR）

**本文件因此没有触碰 `00_ContentVideoOS_Architecture_Governance_v0.1.md`。** 是否要把这个决定正式提升为一条 ADR（比照 `13_`/`14_` 当时把 ADR-019/020 正式採纳进治理文件的先例），本身也是一个尚待用户另行授权的问题，本文件不代为决定。

**下一步（用户原文）：** 必须另开一个独立的 **Canonical Package Consolidation / Delivery Repair** 执行任务，该任务需要：

1. 明确指定唯一 source of truth；
2. 完成文件身份（identity）核对；
3. 完成版本核对；
4. 完成路径核对；
5. 完成测试可复现性核对；

——完成以上之后，才能生成正式交付包。**这个任务本身尚未被开启**，本文件不预先替它拟定执行步骤或时间表。

---

## 3. Governance State（本决定生效后）

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED

Slice 4: IMPLEMENTED — LOCAL VERIFICATION PASS
Slice 4 Delivery & Governance Reconciliation: PASS WITH EXPLICIT GAPS（见 21_）

G2 verifyTake ↔ analyzeMedia: CLOSED

Slice 5: NOT AUTHORIZED
Slice 6: NOT AUTHORIZED

Runtime: BLOCKED — EXPLICITLY CONTAINED
Other OS Changes: NONE

CANONICAL STRUCTURE: LAYERED（Human Decision，本文件；执行/整併尚未开始，尚无正式 ADR）
```

明确区分（沿用 `22_` §14 的区分方式）：本决定解决的是「未来 canonical 是什么」这个问题；它**没有**、也**不会自动**：

- 让顶层 `Content-videoOS-main.zip` 变得可执行（仍是 `21_`/`22_` 记录的 0/9 状态，物理上没有任何档案被动过）；
- 合併 `001_ports.js`/`302_MockAIProvider.js`/`401_system.js` 的新旧版本；
- 变成对 Slice 5 的授权。

---

## 4. 本文件确认未做的事

- 未移动/复制/合併/删除任何档案。
- 未重新打包任何 ZIP。
- 未修改任何代码/测试/脚本。
- 未修改 README。
- 未修改或新增任何 ADR。
- 未开启 Canonical Package Consolidation / Delivery Repair 任务。
- 未开始 Slice 5 或建立任何 Slice 5 代码/测试。

**本文件到此为止，等待用户另行开启 Consolidation / Delivery Repair 执行任务。**
