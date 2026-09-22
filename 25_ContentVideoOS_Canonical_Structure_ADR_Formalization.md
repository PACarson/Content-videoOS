# Content Video OS — Canonical Structure ADR Formalization

**文件编号：** 25
**性质：** 纯治理记录任务——仅新增一条 ADR，未修改任何既有 ADR、domain 源码、测试、脚本或 README。

---

## 1. 实际检查的 Governance / ADR 文件

- `00_ContentVideoOS_Architecture_Governance_v0.1.md`（canonical working copy 版本，`/home/claude/review/canonical/`）——通读 §15 ADR List 全部 20 条现有条目的确切格式（表格列、粗体标题、Provenance 註脚惯例），並列出全文档章节目录（§1–§17）确认**没有**独立于 §15 之外的 ADR index 或 governance index——§16「File Map」/§17「Project State」皆为 Phase 0 时期的冻结历史内容（§17 明文标注「Initial entry, once `00_Project_State` is created」），不是持续更新的状态追踪区，本轮据此判定不需要、也不应该更新它们。
- `23_ContentVideoOS_Canonical_Structure_Human_Decision_Record.md`、`22_ContentVideoOS_Canonical_Package_Structure_Decision_Gate.md`、`24_ContentVideoOS_Canonical_Package_Consolidation_Delivery_Repair.md`——三者本轮确认存在（本会话自己产出，非重建、非假设），内容与本次 ADR 措辞逐一核对一致。

**没有发现任何既有 ADR（ADR-001~020）与本次决定冲突**——本轮重新确认 22_ 当时的检查结论仍然成立：001-020 无一条涉及目录/档案物理结构。

---

## 2. ADR 编号选择依据

§15 现有条目止于 ADR-020，本轮重新列出全部 20 条标题确认无重複、无跳号、无已被佔用的更高编号。**使用 ADR-021**——不是假设，是本轮实际检查后的结果。

---

## 3. 新增 ADR 所在文件路径

`00_ContentVideoOS_Architecture_Governance_v0.1.md`（canonical working copy：`/home/claude/review/canonical/00_ContentVideoOS_Architecture_Governance_v0.1.md`）§15 ADR List，ADR-020 条目之后、`## 16. File Map` 之前——沿用既有惯例（ADR-019/020 同样是直接加进这个文件的这个表格，从未有独立的单一 ADR 档案）。

**未对顶层 `Content-videoOS-main/` 或内嵌 `content-video-os-slice4.zip` 解压出的两份治理档做任何修改**——这两份本轮核实哈希仍是原始的 `118db9b1...`，与本次编辑前完全相同；本任务只编辑了 canonical working copy 这一份，因为它是 `24_` 已确立、独立验证过的唯一 source of truth。

---

## 4. 实际修改文件清单

| 文件 | 修改内容 |
|---|---|
| `/home/claude/review/canonical/00_ContentVideoOS_Architecture_Governance_v0.1.md` | 附加一行 ADR-021（见 §5），490 行→491 行 |

**没有其它文件被修改。**

---

## 5. 新 ADR 核心决定摘要

**ADR-021 — Canonical Repository / Package Structure = LAYERED**（Status: APPROVED）

- **Context：** 交付的 repo 曾出现顶层 flat 包与内嵌 layered 包並存，造成 package 结构/测试入口/交付方式的歧义；这个问题在 Slice 3 治理核对（`13_`）时就已经被撞见並独立重建过一次但未根治，`21_`（Slice 4）时又发作一次。
- **Decision：** Canonical structure = **LAYERED**——`src/`=production source、`test/`=tests、`scripts/`=scripts/tooling，governance/ADR/README 沿用本文件既有惯例（§14–§16）不变。
- **Consequences：** canonical package 必须保留这个目录结构；canonical ZIP 解压后必须能直接识别出仓库根目录，不需要使用者再去找、解另一个内嵌 ZIP 才拿得到真正的 canonical package；扁平、未分层的导出不应被当作可开发/可测试的 canonical package；未来交付应尽可能在独立解压后重新验证目录结构与本地测试。
- **Scope Boundary：** 只定义 repository/package 结构；不改变 domain model、domain behavior、AI authority、Human Gates 或 event 语意；不授权 Slice 5/6；不改变 Runtime Verification Status；不授权其它 OS 变更；不追溯性宣称 flat 导出从未存在过；不把 package-local 验证等同于真实 GAS/Sheets/Drive 验证。
- **Evidence（Provenance 註脚内容）：** 引用 `22_`（决定的证据与 Recommendation 来源，含追溯至 Slice 1 收尾 `02_`/`03_` 证实 layered 早于本决定即已是既有结构）、`23_`（Human Decision 本身）、`24_`（依此决定建成並独立复核过的 canonical package，Final Gate: PASS）。

完整逐字内容见该档案 §15 新增的 ADR-021 表格列。

---

## 6. 是否修改任何既有 ADR

**没有。** 本轮以两种方式验证：(a) `diff` 新旧版本档案，结果只有一行新增（`451a452`），零删除、零修改；(b) 对插入点之前的全部内容（含 ADR-001~020 逐字）取 md5，编辑前后完全相同。ADR-001~020 一字未动。

---

## 7. 是否修改任何 domain source / tests / scripts

**没有。** 本轮確認：`src/`/`test/`/`scripts/` 全部档案没有任何一个的修改时间晚于 `24_` 打包 canonical ZIP 的时间点；本任务全程只对一份治理文件执行了一次 `str_replace`，没有调用任何会写入 `.js` 档案的操作。README.md、package.json 同样未被触碰。

---

## 8. 验证结果

- `diff`（新旧治理档全文）：只有 1 行新增，0 行删除/修改。
- 插入点前内容 md5（含 ADR-001~020）：编辑前后完全一致。
- 顶层 `Content-videoOS-main/` 与内嵌 `content-video-os-slice4.zip` 解压出的两份治理档 SHA-256：均为原始的 `118db9b1...`，本任务未触碰。
- 新 ADR-021 内容核对：与 `23_` 决定的四个要点（LAYERED、三个目录角色、governance/ADR/README 位置不变、flat ZIP 不再是 canonical package）逐一对应；未意外扩大授权范围（未提及 Slice 5/6 授权、未改变 Runtime 状态字样、未涉及其它 OS）；引用的 `22_`/`23_`/`24_` 档名与本会话实际产出的档名核对一致。

---

## 9. 最终状态

```
Phase 0: FROZEN
Slice 1: COMPLETE
Slice 2: COMPLETE WITH EXPLICIT DEFERMENTS
Slice 3: CLOSED
Slice 4: IMPLEMENTED — LOCAL VERIFICATION PASS
Slice 5: NOT AUTHORIZED
Slice 6: NOT AUTHORIZED
Runtime: BLOCKED — EXPLICITLY CONTAINED
Canonical Structure: LAYERED（现已正式写入 ADR-021，APPROVED）
Other OS Changes: NONE
```

**本任务到此为止，没有开始 Slice 5。**

**一个需要用户知道、本任务未处理的衔接问题（如实记录，不擅自处理）：** 这次编辑的 ADR-021 只存在于 canonical working copy（本任务范围内不得重新打包，见任务禁止事项），因此**已交付的 `Content-videoOS-Canonical-Layered.zip`（`24_`）本身尚未包含 ADR-021**——它此刻只以本报告与本任务对该治理档所做的编辑存在。下一次如果要让已交付的 canonical zip 也反映这条 ADR，需要另一次重新打包（本身应该是很小的动作，因为只有这一份档案变了），但那不在本任务授权范围内，本任务未执行。
