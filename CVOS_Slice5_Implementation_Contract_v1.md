# CVOS — Slice 5 Implementation Contract v1

**文件性质：** 独立交付文件。不写入 repository，不佔用治理文件编号，不修改任何 ADR。综合《Slice 5 Implementation Authorization Gate》的全部发现，以及用户本轮对唯一阻断项（stale-plan revision 语意）与其余非阻断提案的正式裁定。

**状态：**
```
Slice 5 Implementation Contract: COMPLETE
Slice 5 Implementation Authorization: NOT YET GRANTED
```

**本任务未修改任何档案** —— `src/`、`test/`、`scripts/`、schema、治理档、ADR 全部不动。

---

## 1. EditProject Schema

```
EditProject {
  id,
  concept_id,
  created_at
}
```

- **建立方式：** Lazy creation —— 第一次为某 Concept 呼叫 `createEditPlan()` 时，若该 Concept 尚无 EditProject，就地建立一个。不设独立的 `createEditProject` 命令。
- **拥有者：** `EditPlanEngine`（作为 `createEditPlan` 的副作用建立，非独立引擎职责）。
- **状态栏位：** 不设。除非未来出现具体证据证明需要一个真实的生命週期，否则不预先加欄位。
- **版本化：** 不版本化本体——版本化的是它底下的 `EditPlan`。

## 2. EditPlan Schema（18 栏位，含 `media_provenance`）

既有 17 栏位（AI Production Contract §F，冻结不动）：
`plan_id`、`edit_project_id`、`version`、`target_duration_sec`、`platform_format`、`narrative_structure`、`selected_clips`、`broll_insertions`、`captions`、`music`、`audio_treatment`、`transitions`、`pacing_notes`、`reframing`、`status`、`generated_by`、`supersedes_version`。

新增第 18 栏位：

```
media_provenance: [
  { asset_id, analysis_id }
]
```

规则：
- 每个相异 asset 一条记录，只统计实际出现在 `selected_clips` 或 `broll_insertions` 里的 asset；同一 asset 出现多次也只记一条（去重）。
- `analysis_id` 记录的是当时那个确切的 `MediaAnalysis` 身份。
- `analysis_version` 不是比对键——不放进这个结构里当比较依据。
- 是否当前有效，永远拿 `MediaAsset.latest_analysis_id` 现场比对，不是拿 `media_provenance` 自己的历史值互相比较。
- 具体验证/helper 函式的实作形状留给实作时决定，但必须保持以上语意不变。

## 3. `createEditPlan()` —— 初始建立语意

输入：Concept（此时已过 Production Go）＋ 该 Concept 相关 MediaAsset/MediaAnalysis 资料（透过既有 `208_` 的 `get`/`getAllForAsset` 取得）。
行为：若该 Concept 尚无 EditProject，先建立（见 §1）；产生 EditPlan v1，`AI_GENERATED`，`supersedes_version = null`；针对这个新 plan 实际选中的每个相异 asset，捕获 `media_provenance`（见 §6）。

## 4. `createEditPlan()` —— 修订语意

输入：`revisionOf`（既有 EditPlan）＋ 该轮 Review feedback（Contract §G 的 KEEP/REMOVE/REPLACE/... 词彙，或对应的自然语言）。
行为：产生新的 EditPlan v(n+1)，`supersedes_version` 指向被修订的版本；旧版本不被修改、不被删除。新版本依它自己实际选中的内容，重新捕获一份**全新**的 `media_provenance`——不是继承旧版本的记录。

## 5. Stale/Unverifiable 来源计划的修订行为（本轮裁定的核心语意）

> **`createEditPlan()` 从一份 stale 或 unverifiable 的既有 EditPlan 产生新修订版本，本身分类为「EDITING / REVISION——不是 EXECUTED-class 动作」。** 这是 EditPlanEngine 的 Decision-生成行为，不是对该 edit artifact 本身的执行。

边界（不可混淆）：
> **允许修订一份 stale 的计划，不等于允许执行那份 stale 的计划。**

因此：
- 旧的 stale EditPlan 永远保留、永远可读取；
- 永远不会被静默覆写；
- 永远不会被静默当成 current／valid；
- 永远不会被任何 EXECUTED-class 动作直接消费；
- 修订这个动作本身，不会让旧版本从 `STALE` 变成 `VALID`——旧版本的 provenance 不被这次修订改动一个字。

流程：

```
stale Plan v1
    ↓
createEditPlan(revisionOf = v1)
    ↓
new Plan v2
    ↓
capture fresh provenance（只根据 v2 自己实际选中的内容）
    ↓
validate v2 provenance
    ↓
只有 v2 本身 current/valid，才轮到 EXECUTED-class 动作
```

结果状态範例：`v1 = STALE`（不变）；`v2` 依它自己独立捕获的 provenance 单独判定 current/stale/unverifiable，两者互不牵连。

## 6. Provenance 捕获

每一次 `createEditPlan()` 呼叫——不管是初始建立还是修订——都要重新捕获，範围限定在**这一次呼叫产生的这个新 plan**实际选中的 asset 集合（§3/§4/§5 共用同一条规则，不因来源计划是否 stale 而改变）。

## 7. Provenance 验证

在任何 EXECUTED-class 动作（即 `generateRoughCut`）之前：针对该 plan 的每一条 `media_provenance` 记录，确认它能解析到一条真实存在的 `MediaAnalysis` 记录，並比对其 `analysis_id` 与该 asset 当前 `latest_analysis_id` 是否一致。

## 8. Stale / Unverifiable 分类

三分类，不互相静默转换：
- **current/valid**：该 plan 要求的每一条 provenance 都存在，且都与对应 asset 当前 `latest_analysis_id` 相符。
- **stale**：某条记录存在且可解析，但与当前值不符。
- **unverifiable**：某条记录缺失，或无法解析到一条真实存在的 `MediaAnalysis` 记录。

## 9. `generateRoughCut` 执行边界

执行前必须逐一确认：该 plan 所有必要 provenance 记录都存在、都能解析、且都与当前 `latest_analysis_id` 相符。任一条件不满足——不论是 stale 还是 unverifiable——一律中止並报告，不得静默略过、不得猜测性继续、不得区别对待处理。

## 10. EditEngine Manifest 边界

`EditEngine` 消费一份**本身 provenance 已验证为 current/valid 的** `READY` EditPlan，产生 structured manifest 型态的 rough-cut 呈现（Phase 1 简化路径，非真实渲染档）；输出为 EditVersion。绝不在自己的输出上标记 `FINAL_APPROVED` 或 `PUBLISHED`。

## 11. Provider 边界

Phase 1 不新增任何 video-rendering provider port。`EditEngine` 的 manifest 产生逻辑是纯本地确定性方法（比照 `EquipmentEngine`／ADR-008 先例）。真正的外部渲染 provider 整合若日后发生，才需要引入对应的 port 抽象——现在不预先建立。

## 12. Persistence

`EditProject`／`EditPlan`／`EditVersion` 全部沿用既有 `StorageAdapterPort`（`append`/`readAll`/`update` 等既有方法）；`media_provenance` 是 `EditPlan` record 内的一个欄位，不是独立 collection，不需要新的 adapter 类型。

## 13. 必要测试（规格，非测试代码）

- EditProject lazy-creation（含"已存在则不重複建立"）
- EditPlan 初始建立
- EditPlan 修订／supersession
- **修订自 stale/unverifiable 来源**：确认来源 plan 保持 `STALE`/`unverifiable` 不变、新版本拥有独立捕获的 provenance、新版本的有效性判定与来源无关（直接对应本轮 §5 裁定，属新增测试重点）
- Provenance 捕获（单一 asset／多个相异 asset／重複出现去重）
- Staleness 侦测（身分比对，非时间戳／非内容相似度）
- Unverifiable 侦测（缺失／无法解析），且与 stale 明确分开断言
- Stale plan 的保留／可读取（从未被覆写、从未被静默转正）
- `generateRoughCut` 在 stale 时中止
- `generateRoughCut` 在 unverifiable 时中止
- 双进程 persistence（比照 `707_`/`708_`）
- Mock provider 下的确定性行为
- AI 权限边界静态检查（比照 `610_` 的 Slice5/6 禁词模式）
- 既有 114 项 Slice 1-4 回归测试全部维持通过

## 14. 回归要求

既有 114 项测试必须全数维持通过，不得修改其断言。Phase 0 冻结架构、CVOS-P7/P8/P9 原文、ADR-001~022 文字，一个字都不动。任何既有 Slice 1-4 档案只允许纯附加式修改（例如 `401_system.js` 的 wiring 新增一行），不得改动既有方法的既有行为。

## 15. 明确排除项（Slice 5 不含）

`ReviewEngine`、Rough Cut Review 的人类关卡实作、Final Approval、Publication Authorization、Publication、Analytics、跨 OS 整合、真实 video-editor provider 整合、真实 GAS/Sheets/Drive runtime、任何 UI、stale plan 的自动/无人干预重新生成、stale/unverifiable plan 的自动/无人干预执行（§9 的中止规则不得被任何自动化路径绕过）。

---

## Implementation Authorization Checklist

**若之后收到明确的实作授权指令，会被授权的范围：**

- [ ] 新增 domain entity 档案：`EditProject`、扩充后 18 栏位的 `EditPlan`、`EditVersion`
- [ ] 新增 `EditPlanEngine`（`createEditPlan`：初始＋修订，含 §5/§6 的 provenance 捕获语意）
- [ ] 新增 `EditEngine`（`generateRoughCut`：manifest 产生＋§7/§9 的 provenance 验证与执行边界）
- [ ] 新增 §13 所列的必要测试（含"修订自 stale 来源"这一组新断言）
- [ ] 新增两进程 persistence demo script（比照 `707_`/`708_` 模式）
- [ ] 在 `401_system.js` 做纯附加式 wiring（比照 Slice 2/3/4 既有模式）
- [ ] 重新执行並确认全部既有 114 项＋新增测试通过

**即使收到该授权，仍然不在范围内（除非另外、独立地被明确授权）：**

- [ ] 任何 `ReviewEngine`／Rough Cut Review／Final Approval／Publication／Analytics 代码
- [ ] 任何真实外部渲染 provider 整合，或为此新增的 port 类别
- [ ] 任何真实 GAS/Sheets/Drive 连线尝试
- [ ] 任何 UI
- [ ] 任何让 stale/unverifiable plan 自动重新生成或自动执行的路径
- [ ] 对 Slice 1-4 既有档案既有行为的任何修改（只允许纯附加）
- [ ] 对 Phase 0 冻结架构、CVOS-P7/8/9、ADR-001~022 文字的任何修改

---

下一步该做的用户决定，仅仅是：**是否现在明确授权上述「会被授权的范围」开始实作。**

在收到那个明确指令之前：

```
Slice 5 remains NOT AUTHORIZED.
```
