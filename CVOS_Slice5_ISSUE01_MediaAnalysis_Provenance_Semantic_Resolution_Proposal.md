# CVOS Slice 5 ISSUE-01 — MediaAnalysis Provenance Semantic Resolution Proposal

**性质：** 纯调查/方案比较/决策请求草案——不是已批准的架构决定，不修改任何 repository 文件，不代表 ISSUE-01 已关闭，不代表 Slice 5 已获授权。

---

## 1. Task Scope / Non-Goals

范围：厘清 EditPlan 应如何记录其依据的 MediaAnalysis 版本，以及如何据此侦测 stale EditPlan。不涉及：Slice 5 实作、EditPlan schema 的实际修改、ADR 的实际新增、Slice 5 Gate 状态变更。本文件是提交给用户审阅的提案，不是已生效的决定。

---

## 2. Existing Contract Evidence（本轮重新核实，非沿用 `27_` 结论）

| # | 项目 | 核实结果 | 位置 | Evidence |
|---|---|---|---|---|
| 1 | CVOS-P9 完整语句 | 「An approval is valid only against the exact artifact, version, and upstream state that was actually reviewed...before any EXECUTED-class transition (rendering, publishing, or consuming an approved artifact into a new one), the executing engine re-validates that the upstream inputs it depends on are still at the state they were in when the human approved...a referenced MediaAsset's analysis changed after an EditPlan was built on it...the dependent artifact is flagged and blocked from further execution until a human re-confirms.」 | `00_..._Architecture_Governance_v0.1.md` 第 345 行 | E1 |
| 1b | CVOS-P9 cross-cutting rule | 「any state above that authorizes a downstream EXECUTED-class action is gated by a staleness check against its upstream dependencies **at the moment execution is attempted**, not just at the moment approval was granted.」 | 同文件第 322 行 | E1 |
| 2 | EditPlanEngine 的 stale failure mode 原文 | 「Failure mode: The plan references a MediaAsset since re-analyzed as unusable (stale state).」 | 同文件第 207 行 | E1 |
| 2b | Stale-state note（同段落，涵盖三个 engine） | 「ProductionPlanEngine, EditPlanEngine, and ReviewEngine can each be handed a downstream artifact after its upstream source changed...None of them may auto-invalidate silently or execute against outdated state; each surfaces the staleness as an explicit condition」 | 同文件第 264 行 | E1 |
| 3 | EditPlan schema 栏位数量 | **17 栏位**（`plan_id`/`edit_project_id`/`version`/`target_duration_sec`/`platform_format`/`narrative_structure`/`selected_clips`/`broll_insertions`/`captions`/`music`/`audio_treatment`/`transitions`/`pacing_notes`/`reframing`/`status`/`generated_by`/`supersedes_version`）——**更正：`27_`报告与本任务书都写「14 个栏位」，本轮用程式重新逐行计数（`sed`+`grep -c`）确认实际是 17，不是 14。这是一个计数错误，如实更正，不静默沿用。** | `00_..._AI_Production_Contract.md` 第 152–169 行 | E1（本轮重新计数，非沿用旧数字） |
| 4 | MediaAnalysis schema 栏位 | 10 栏位（`analysis_id`/`asset_id`/`analysis_version`/`quality`/`content_type`/`audio_quality`/`visual_quality`/`relevance`/`flags`/`generated_by`/`created_at`——共 11，本轮重新计数：135–145 行共 11 行资料列） | 同文件第 131–145 行 | E1 |
| 5 | `getAllForAsset(assetId)` 实际实作 | `return this.storage.readAll(MEDIA_ANALYSIS_COLLECTION, a => a.asset_id === assetId).slice().sort((a,b) => a.analysis_version - b.analysis_version)`——回传**该 asset 的全部历史版本**，按 `analysis_version` **升冪**排序（最旧在前，最新在最后一个元素） | `src/208_MediaAnalysisEngine.js` 第 100 行起 | E1（本轮重新读取方法体，非只读方法签名） |
| 6 | EditPlan 如何引用 MediaAsset | `selected_clips`/`broll_insertions` 内的 `asset_id` 栏位（非直接引用 MediaAnalysis） | `00_..._AI_Production_Contract.md` 第 159–160 行 | E1 |
| 7 | EditPlan 的 version / supersedes_version 语义 | `version: int`；`supersedes_version: ref → EditPlan (self), nullable; used for revision chains`——修订链靠自我引用表达，不是独立的"superseded"状态值 | 同文件第 155、169 行 | E1 |
| 8 | MediaAnalysis append-only 规则 | 「append-only — re-analysis creates a new record, never overwrites one」 | 同文件第 137 行 | E1 |
| 9 | 现有可用于 provenance 的欄位/机制 | **`MediaAsset.latest_analysis_id`**——「convenience pointer only — MediaAnalysis itself is append-only」，且本轮核实这个指标**确实被正确维护**：`109_MediaAsset.js`第54行初始值`null`，`208_MediaAnalysisEngine.js`第87行在每次成功`analyzeMedia`后更新为`stored.id`（新记录的id）| `00_..._AI_Production_Contract.md`第129行；`src/109_MediaAsset.js`第54行；`src/208_MediaAnalysisEngine.js`第87行 | E1（本轮直接读取三处代码/文件确认，非推论） |
| 10 | 是否存在定义"current/latest analysis"的权威规则 | **存在**——见上一项。`latest_analysis_id`就是这个权威规则的正式代表 | 同上 | E1 |

**关键澄清（本轮分析的转折点）：** 任务书 Workstream A/B 隐含假设"current/latest analysis"这件事可能也没有规则——**这个假设本轮核实为不成立**。第9/10项已经有明确、正确实作的既有机制。**ISSUE-01 真正缺的，不是"怎么知道现在的分析是什么"（已解决），而是"EditPlan 建立当下，怎么记住它当时看到的是哪一个"**——这个重新框定会直接影响 §4/§6 的方案比较与建议。

---

## 3. Exact Semantic Problem

**B1. Provenance**——"这份 EditPlan 当初依据哪些 MediaAnalysis 记录生成？" **现状：完全未定义。** 17 个栏位里没有一个记录这件事。这是既有治理"已定义"与"完全空白"之间最干净的一条线——不是模糊，是真的没有。

**B2. Staleness**——"什么条件使既有 EditPlan 被视为 stale？" **现状：政策已定义（§2 第1/1b/2/2b项），机制未定义（依赖 B1 先被解决）。** 本轮发现一个既有文件本身没有明说、但值得提请人类注意的细节：CVOS-P9 第322行的措辞是「gated...**at the moment execution is attempted**」——这暗示 staleness 检查的**触发时机**可能是"EditEngine 真的要执行 `generateRoughCut` 的那一刻"，而不是"EditPlan 一直被动地标记着 stale/not-stale"。对照 ProductionPlan 既有的两段式处理（第152行：`authorizeProductionGo`**之前**的漂移是"pre-authorization and routine"——Plan 直接重新生成；**之后**的漂移才是 CVOS-P9 正式意义下"block 並要求人类重新确认"）——**EditPlan 是否也应该有类似的两段式区分（`generateRoughCut`执行前 vs 执行后）**，本轮判断为一个合理、有既有先例支持的推论（E4），但既有文件没有为 EditPlan 明确写出这个区分，值得作为 §6 请求的一部分明确提请。

**B3. Current Analysis**——"什么规则决定哪个版本是当前有效版本？" **现状：已解决，不属于 ISSUE-01 范围。** 见 §2 第9/10项——`MediaAsset.latest_analysis_id`已经是这个问题的权威答案，且本轮核实其维护逻辑正确。

**B4. Plan Validity**——"stale 代表删除、不可读、自动失效，还是标记？" **现状：政策已定义。** 第264行明文「None of them may auto-invalidate silently or execute against outdated state; each surfaces the staleness as an explicit condition」——**不是**删除、**不是**静默失效、**不是**变成不可读，而是**显式标记**。既有的、结构上最直接可比照的先例是 ADR-015 对 ProductionPlan 的处理方式：不新增/不覆盖主要生命周期栏位（`production_state`不变），而是另开一组正交的欄位（`authorization_valid`/`invalidation_reason`/`invalidated_at`）表达"是否仍可信"。EditPlan 若採用同样的结构性做法（不动 `status`欄位本身，另开正交欄位表达 staleness），会是一个有直接既有先例支持、而非凭空发明的方案方向。

---

## 4. Provenance Option Comparison

| 维度 | A. Plan-Level Provenance | B. Per-Clip Provenance | C. Snapshot/As-Of | D. Separate Provenance Records |
|---|---|---|---|---|
| 1. 能否追溯精确的 MediaAnalysis 记录 | **能**——直接存 `{asset_id, analysis_id, analysis_version}` | **能**，但只限于实际被选中的 clip/insertion | **不能**——时间戳无法唯一定位特定版本（见下方说明） | 能，但透过额外一层关联 |
| 2. 能否支持一个 EditPlan 用多个素材 | 能，天然（list） | 能，天然（附着在既有的 list 欄位上） | 能（单一 as_of 涵盖全部素材，但精度问题见下） | 能 |
| 3. 能否可靠侦测 stale | 能——比对记录值 vs 当前 `latest_analysis_id` | 能，范围限于被选中的素材 | **不可靠**——见下方 3 点说明 | 能 |
| 4. 历史版本保留/审计 | 完整（若含"考虑过但未选用"的素材） | 不完整——结构上只能覆盖"实际用到"的素材，"考虑过但排除"的素材没有位置存放 | 弱——只知道大概时间点，不知道确切依据哪条记录 | 完整 |
| 5. 对既有 17 栏位 schema 的影响 | 新增 1 个栏位（list of objects）——与既有 `selected_clips`/`broll_insertions` 同一惯用手法 | 修改既有 2 个复合欄位的内部物件结构（`selected_clips`/`broll_insertions` 每个元素多一个 key） | 新增 1 个简单欄位（datetime），改动最小但见 3 | 新增一个独立 aggregate/repository，不动 EditPlan 本体栏位数 |
| 6. 对 Slice 5 scope 的影响 | 小——`EditPlanEngine`本来就要读 MediaAnalysis 才能做决策，记录下来是"顺手"的事，不需要新能力 | 小，同上，且改动范围更窄 | 小，但解决不了真问题（见 3） | 中——需要新增第二个持久化写入路径，引入类似`21_`Finding-02那种"两步写入、中途失败留部分状态"的既有风险类别 |
| 7. 是否需要新 ADR | 建议需要（性质类比 ADR-015——"已经隐含要求的行为，只是还没命名表示法"） | 同左 | 若真的要用这个方案也需要，但因为解决不了真问题，不建议往这个方向走 | 需要，且份量更大（新增 aggregate 本身就是架构层级的事） |
| 8. 实作时是否还需要额外人类决定 | 需要（欄位确切命名/是否含"考虑但未选用"的素材，见 §6） | 需要（同上，但范围更窄） | 不适用（方案本身不推荐） | 需要（新 aggregate 的欄位、生命周期、event 语意都要重新定义——范围远超 ISSUE-01 本身） |
| 9. 主要风险/无法解决的情况 | 若涵盖"考虑但未选用"的素材，需要额外定义"考虑"的边界（AI 读过 = 考虑过？） | 结构性地无法表达"被排除的素材也是决策依据的一部分"——把"素材使用"跟"决策依据"当成同一件事（任务书本身点名的风险） | 时间戳无法应对"同一素材短时间内被重新分析两次"或"多个素材分析时间点不同步"的情况；且回答的是"大概何时"而非"确切哪一条"，**没有真正解决 provenance 问题，只是记录了生成时间** | 范围膨胀成一个新的架构决定，超出 ISSUE-01 这次聚焦的问题（premature engineering——类比 ADR-002 拒绝新增`ContentProject`包装层的理由：既有更简单的结构已经够用时，不需要新增身份层） |

**关于 Option C 的进一步说明（避免只用"简单/不灵活"这种模糊语言）：** 时间戳本身不携带"哪个版本"这个身份信息——要从一个时间戳反推"asset X 在这个时间点的 current 版本是什么"，仍然需要遍历该 asset 的完整历史（`getAllForAsset`）並比对 `created_at`，这跟直接存 `analysis_id`比起来，多绕了一圈却没有多得到任何精确度，还额外引入"如果两个版本创建时间非常接近"的排序歧义风险。这不是"比较简陋"这种主观评价，是这个方案在结构上无法达成 B1 要求的精确度。

---

## 5. Scenario Analysis（精简版——完整 12 项逐一过一遍，只详述有新讯息的场景）

| # | 场景 | 既有规则能否判定 | 缺什么 | 是否属于 ISSUE-01 | 建议归属 |
|---|---|---|---|---|---|
| 1 | 单素材单版本 | 部分（B3已解决，B1未解决） | Provenance 记录 | 是 | 本次决定 |
| 2 | 多素材各自不同版本 | 同上 | 同上 | 是 | 本次决定 |
| 3 | 素材被重新分析产生新版本 | 能判定"发生了" | 判定"对既有 Plan 有何影响"需要 B1 | 是 | 本次决定 |
| 4 | 重新分析结果与旧结果**相同** | **不能**——现有机制（analysis_version递增）无法区分"内容相同的重新分析"与"内容不同的重新分析"，两者都会产生新的 analysis_id | 需要决定 staleness 判准是"身份变了"还是"内容变了" | 是（这是一个之前没被明确提出、值得决定的子问题） | 本次决定（见§6） |
| 5 | 重新分析结果**不同** | 同上（能侦测"变了"，但机制同样待 B1） | 同 3 | 是 | 本次决定 |
| 6 | 新分析产生后，旧 Plan 被**读取**（未执行） | 能（若 B1 解决，读取时可比对並显示 stale 标记，不影响读取本身） | 无新缺口 | 是 | 本次决定的直接应用 |
| 7 | 新分析产生后，旧 Plan 被**执行**（`generateRoughCut`） | 这正是 CVOS-P9 cross-cutting rule（第322行）明确要 gate 的时刻 | 需要 B1 才能在这个时刻做比对 | 是 | 本次决定 |
| 8 | Plan 用多素材，只有部分被重新分析 | 能（若 Provenance 是逐素材记录，可以精确指出哪个素材过期，其余不受影响） | 无新缺口，这正是 Option A/B 优于 Option C 的地方 | 是 | 本次决定的直接应用 |
| 9 | 同一素材被用在多个 clip 片段 | 能——Provenance 若以 `asset_id` 去重记录，一笔就够，不需要每个 clip 片段各自一份 | 无新缺口 | 否（实作细节） | Implementation Gate |
| 10 | 素材完全没有 MediaAnalysis | 现有 `getAllForAsset`回传空阵列（本轮已确认） | 这种素材理论上不该被 EditPlanEngine 选中做决策依据（因为 AI Responsibility Matrix 说输入是"MediaAsset + MediaAnalysis set"）——但"该拒绝还是该跳过"没有明说 | 边缘案例，不是 ISSUE-01 核心 | Implementation Gate |
| 11 | 多历史版本，无 current 规则 | **前提不成立**——§2 已确认 `latest_analysis_id`就是这个规则 | 无 | 否 | 已解决，无需处理 |
| 12 | MediaAnalysis 存在但引用的 MediaAsset 不可用 | 既有不变量（MediaAsset 从不删除）下，这个情境理论上不该发生 | 若真的发生，性质是资料完整性问题，不是 provenance 语意问题 | 否 | 超出范围，暂不处理 |

---

## 6. Minimum Human Decision Set

**本次必须决定：**

1. **Provenance 记录粒度：** Plan-level（Option A）还是 per-clip（Option B）？——本文件建议 A（见 §7），但请人类确认。
2. **Provenance 范围：** 只记录"实际用于 `selected_clips`/`broll_insertions`的素材"，还是也要包含"AI 考虑过但最终排除的素材"？——前者范围小、容易实作；后者审计完整度更高但需要额外定义"考虑过"的边界。
3. **Staleness 判准：** 身份变化（`analysis_id`不同即算 stale）还是内容变化（需要比对具体欄位值）？——本文件倾向身份判准（更简单、更符合"每次重新分析都是全新独立记录"这个既有 append-only 哲学），但这是一个实质选择，不是显而易见的默认值，请人类确认。
4. **是否採用两段式 staleness 处理**（`generateRoughCut`执行前＝routine 可重新生成；执行时＝CVOS-P9 正式 gate，需要人类重新确认）？——本文件认为这个类比 ProductionPlan 既有模式的推论合理，但既有文件没有为 EditPlan 明写这一点，请人类确认是否採纳这个读法。
5. **是否需要新的 EditPlan schema 栏位：** 是（结论无法避免——B1 现状是真空，任何方案都需要新增至少一个欄位或等价机制）。

**可以留给 Implementation Gate 决定（G1 级细节）：**
- 欄位确切命名与内部物件形状。
- Scenario 9/10 的边缘案例处理方式。
- Event payload 是否要包含 provenance 资讯。
- 是否需要在 `001_ports.js`新增任何介面方法，或纯粹是 `EditPlanEngine`内部逻辑。

---

## 7. Recommended Option and Rationale

**建议：Option A（Plan-Level Provenance Field），范围建议限定在"实际用于 `selected_clips`+`broll_insertions`的素材"（即 §6 决定2 的较小范围）。**

理由（逐条对应 §4 比较表，不是笼统的"比较简单"）：
1. 精确度：与 Option B 同级（都能记录确切 `analysis_id`），优于 Option C（时间戳无法达到同等精确度，见 §4 说明）。
2. 结构成本最低：只需新增一个欄位，採用 schema 里已经在用的"list of objects"惯用手法（同 `selected_clips`），不需要像 Option D 那样新增一整个 aggregate 与对应的持久化/事件/一致性负担。
3. 完整度优于 Option B：Plan 级别的记录不受限于"只能挂在 selected_clips 的元素上"，如果日后范围决定要扩大到"考虑但排除"的素材，Option A 的结构可以自然扩展，Option B 结构性地做不到。
4. 与既有 ADR-015 先例一致：都是"既有行为早就隐含要求，只是还没命名表示法"的额外栏位，不是发明新行为。

**建议的程序形式：** 比照 ADR-015 的先例（一条小型、附加性质的 ADR，说明"CVOS-P9 一直都要求这个效果，只是 EditPlan 还没有栏位可以表示它"），而不是像 G2 那样纯粹的语意备忘——因为这次确实涉及对一份 Frozen 文件（§F Edit Plan Schema）的栏位新增，程序上更接近 ADR-015 而非 `17_`。**但采用 ADR 还是其它形式，仍由人类决定，本文件不代为决定。**

---

## 8. Risks / Trade-offs

- 若人类选择"范围只到 selected_clips"（较小范围），未来如果需要更完整的 AI 决策审计（例如"AI 为什么没选那个素材"），需要重新开一次范围扩大的讨论——但这是可控的、渐进式的成本，不是不可逆的架构错误。
- 若人类选择身份判准而非内容判准（§6决定3），Scenario 4（内容相同的重新分析）会被判定为 stale 即使实质内容没变——可能造成"不必要"的重新生成提示。这是一个真实的 trade-off，不是本文件想隐藏的缺点。
- 两段式 staleness 处理（§6决定4）如果没有被採纳，退回单一处理方式会更简单，但可能在"EditPlan 还没被执行、只是安静地放在那里"的阶段就过度频繁地要求人类介入——这与 ProductionPlan 既有的"pre-authorization routine"精神不完全一致，值得权衡。

---

## 9. Items Deferred to Implementation Gate

见 §6"可以留给 Implementation Gate 决定"清单。此外，`27_`报告 Issue-02（EditProject 无栏位级 schema）、Issue-03（`createEditPlan`修订模式参数形状）、Issue-04（EditEngine port 抽象）均维持原判——不在本次 ISSUE-01 聚焦范围内，不在此重複处理。

---

## 10. Proposed Human Decision Request

**决策问题：** EditPlan 应该用什么机制记录它依据的 MediaAnalysis 版本，使 CVOS-P9 与 EditPlanEngine 既有的 stale failure mode 可以被明确、可验证地实作？

**已知事实：**
- EditPlan 现有 17 个栏位，没有一个记录 MediaAnalysis 引用（本轮重新核实，更正先前"14栏位"的计数错误）。
- "现在哪个分析版本是 current"这件事已经有权威答案（`MediaAsset.latest_analysis_id`），不需要重新解决。
- CVOS-P9 与 EditPlanEngine 自己命名的 failure mode 都明确要求 staleness 侦测能力，且要求"显式标记，不可静默失效"。

**需要决定的语意：**（见 §6 五项）

**候选方案：** A（建议）/ B / C（不建议，结构性缺陷）/ D（不建议，范围过大）——详见 §4/§7。

**每个方案的主要影响：** 见 §4 比较表第5–9列。

**Claude 的技术建议：** Option A，范围限定在实际使用的素材，身份判准（非内容判准），比照 ADR-015 形式处理——理由见 §7，逐条对应比较表，非笼统评价。**这是建议，不是决定。**

**仍须用户明确批准的事项：**
1. 是否採纳 Option A（或改选 B/C/D，或提出新方案）。
2. Provenance 范围（仅用到的素材 vs 含考虑后排除的素材）。
3. Staleness 判准（身份 vs 内容）。
4. 是否採纳两段式处理的推论读法。
5. 处理形式（新 ADR／其它）。

---

## 11. Files Modified

**NONE.** 本任务全程只读（`grep`/`view`/`sed`只读取用），没有对 `/home/claude/review/canonical/` 或任何既有档案做过任何写入操作。本报告本身作为独立交付文件提供给用户下载，**没有**被放入 canonical working copy 或任何既有 ZIP——依任务书"只输出报告，不写入 repository"的明确指示，这份文件不算作 repository 的一部分，不佔用下一个 report 编号。

## 12. Slice 5 Implementation Started

**NO.** 没有新增任何领域代码、测试或脚本，没有开始 Slice 5 或 Slice 6 的任何实作，没有变更 `27_`Gate 报告的状态，没有新增或修改任何 ADR。
