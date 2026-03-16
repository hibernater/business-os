# Skill vs. 工作流 架构设计

> 本文档记录了 Business OS 中 Skill（原子能力）与 Workflow（工作流）的概念分离、架构设计、数据模型及实现细节。

---

## 一、核心概念

### 1.1 为什么要分离 Skill 和 Workflow？

在 Business OS 早期，Skill 既承担了"原子能力"的角色（如：定价策略、客户分群），也承担了"业务流程"的角色（如：每日运营报告包含数据拉取→分析→生成摘要）。这种混用导致：

- **粒度混乱**：用户无法区分一个"能力"和一个"流程"
- **复用困难**：复杂流程中无法灵活组合/替换单个 Skill
- **状态管理简陋**：一次性执行无法支撑需要持续运行、人工交互的企业级工作流

### 1.2 概念定义

| 概念 | Skill（技能） | Workflow（工作流） |
|------|--------------|-------------------|
| **粒度** | 原子级，单一能力 | 流程级，编排多个 Skill |
| **示例** | 拉取平台数据、客户分群分析、定价策略 | 每日晨报（拉数据→分析→生成报告→推送） |
| **触发** | 手动 / API 调用 | 手动 / 定时 cron / 事件触发 |
| **状态** | 无状态，执行即完成 | 有状态，支持暂停/恢复/人工交互 |
| **生命周期** | 一次性执行 | 持续运行的守护进程，心跳驱动 |

### 1.3 类比

```
Skill = 函数（function）
Workflow = 程序（program），调用多个函数，有控制流
```

---

## 二、数据模型

### 2.1 Workflow（工作流定义）

```
Workflow
├── id (UUID)
├── enterpriseId
├── name            — 工作流名称（如"每日运营晨报"）
├── description     — 自然语言描述
├── status          — draft / active / paused / archived
├── triggerType     — manual / scheduled / event
├── cronExpr        — cron 表达式（scheduled 时使用）
├── nodesJson       — 节点列表 JSON
├── edgesJson       — 边列表 JSON
├── createdAt / updatedAt
```

**节点类型（Node Types）**：

| 类型 | 说明 | 阻塞 | config 字段 |
|------|------|------|------------|
| `skill` | 执行一个 AI Skill | 否 | `skill_id` |
| `condition` | 条件分支 | 是（等用户选择） | `expression` |
| `human_task` | 分配人工任务 | 是（等完成） | `assignee`, `description`, `deadline` |
| `approval` | 审批节点 | 是（等审批） | `approver`, `subject`, `detail` |
| `notification` | 发送通知 | 否（即时继续） | `channel`, `message_template`, `recipients` |
| `wait` | 定时等待 | 是（等时间到） | `wait_type`, `duration_minutes` / `until_time`, `reason` |
| `api_call` | 调用外部 API | 否 | `method`, `url`, `headers`, `body`, `timeout` |
| `sub_workflow` | 触发子工作流 | 否（占位） | `workflow_id` |
| `loop` | 循环迭代 | 否（多次心跳） | `items`, `loop_var` |

**边（Edge）**：
- `{ id, source, target, label? }` — 连接两个节点，label 用于条件分支的标签

### 2.2 WorkflowExecution（工作流执行实例）

```
WorkflowExecution
├── id (UUID)
├── workflowId       — 关联 Workflow
├── workflowName
├── enterpriseId
├── status           — idle / running / waiting_input / paused / completed / failed
├── currentNodeId    — 当前执行到的节点
├── contextJson      — 执行上下文（累积的中间结果）
├── completedNodesJson — 已完成节点列表
├── heartbeatIntervalSec — 心跳间隔（默认 60s）
├── lastHeartbeatAt / nextHeartbeatAt — 心跳管理
├── pendingInteraction — 等待用户输入时的交互描述（JSON）
├── cycleCount       — 已执行的心跳周期数
├── errorMessage     — 失败时的错误信息
├── startedAt / completedAt / createdAt / updatedAt
```

### 2.3 SkillExecution 扩展

```
SkillExecution（已有）
├── ... 原有字段 ...
├── workflowExecutionId  — NEW: 关联所属工作流执行实例
├── workflowNodeId       — NEW: 关联工作流中的节点 ID
```

---

## 三、架构设计

### 3.1 整体流程

```
用户对话描述业务流程
        │
        ▼
  AI 工作流拆解器（Decomposer）
  ┌─────────────────────────────────┐
  │ 自然语言 → 结构化工作流定义      │
  │ (nodes + edges + trigger)       │
  │ LLM 优先，规则引擎兜底           │
  └─────────────────────────────────┘
        │
        ▼
  用户确认/调整 → 保存 Workflow
        │
        ▼
  启动执行 → 创建 WorkflowExecution
        │
        ▼
  心跳驱动执行引擎（Executor）
  ┌─────────────────────────────────┐
  │ 每个心跳周期：                   │
  │ 1. 检查当前节点                  │
  │ 2. 执行 Skill / 评估条件         │
  │ 3. 推进到下一节点                │
  │ 4. 遇到交互点则暂停等待用户输入  │
  │ 5. 到达 end 节点则完成           │
  └─────────────────────────────────┘
```

### 3.2 心跳机制

工作流不是一次性执行完毕，而是通过心跳持续推进：

- **心跳间隔**：默认 60 秒，可按工作流配置
- **心跳触发**：后端定时器 / 外部调用 `/api/workflows/heartbeat`
- **每次心跳**：
  - 查询所有 `status = running` 且 `nextHeartbeatAt <= now` 的执行实例
  - 对每个实例推进一步（执行当前节点）
  - 更新 `lastHeartbeatAt` 和 `nextHeartbeatAt`

### 3.3 用户交互

工作流执行过程中可以暂停并等待用户输入：

```
Executor 遇到需要决策的节点
        │
        ▼
  设置 status = waiting_input
  设置 pendingInteraction = {
    nodeId: "...",
    message: "请确认是否继续执行促销活动？",
    options: [
      { edge_id: "e3", label: "确认执行" },
      { edge_id: "e4", label: "暂时跳过" }
    ]
  }
        │
        ▼
  前端展示交互面板（选项按钮 + 自由输入）
        │
        ▼
  用户回复 → POST /api/workflow-executions/{id}/interact
        │
        ▼
  Executor 根据回复推进到对应分支
```

---

## 四、API 设计

### 4.1 工作流定义

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/workflows` | 列出所有工作流 |
| GET | `/api/workflows/{id}` | 获取单个工作流详情 |
| POST | `/api/workflows` | 创建工作流 |
| PUT | `/api/workflows/{id}` | 更新工作流 |
| DELETE | `/api/workflows/{id}` | 删除工作流 |
| POST | `/api/workflows/{id}/activate` | 激活工作流 |
| POST | `/api/workflows/generate` | AI 拆解自然语言为工作流 |

### 4.2 工作流执行

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workflow-executions` | 启动一次工作流执行 |
| GET | `/api/workflow-executions` | 列出执行记录 |
| GET | `/api/workflow-executions/{id}` | 获取执行详情 |
| POST | `/api/workflow-executions/{id}/interact` | 用户回复交互 |
| POST | `/api/workflow-executions/{id}/pause` | 暂停执行 |
| POST | `/api/workflow-executions/{id}/resume` | 恢复执行 |

### 4.3 AI 引擎端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/workflows/decompose` | AI 将自然语言拆解为结构化工作流 |
| GET | `/api/workflows/presets` | 获取预置工作流模板 |
| POST | `/api/workflows/heartbeat` | 心跳推进所有活跃工作流执行 |

---

## 五、前端实现

### 5.1 工作流页面（workflow-panel.tsx）

三个子视图：
- **列表**：所有工作流卡片，显示状态、Skill 数量、触发方式
- **创建**：对话式界面，用户描述业务流程 → AI 拆解 → 预览流程图 → 确认保存
- **详情**：工作流定义 + 执行历史 + 实时执行状态 + 交互面板

### 5.2 任务管理面板（task-panel.tsx）

双 Tab 分离：
- **独立任务 Tab**：按数字孪生五维度（商品/客户/运营/团队/财务）分组展示
- **工作流 Tab**：按工作流执行实例分组，每组显示工作流名称、状态、进度

每个维度泳道显示：维度图标、标签、描述、任务状态统计（执行中/已完成/失败）。

### 5.3 Skill → 数字孪生维度映射

```typescript
const SKILL_DIMENSION = {
  pricing_strategy: "product",      // 商品
  product_selection: "product",
  competitor_monitor: "product",
  customer_segmentation: "customer", // 客户
  customer_analysis: "customer",
  daily_operations_report: "operation", // 运营
  refund_analysis: "operation",
  // ... 默认归入 "operation"
};
```

---

## 六、预置工作流模板

### 6.1 每日运营晨报（morning_briefing.yaml）

```
start → 拉取平台数据 → 生成运营日报 → condition(异常?) 
  → 是: 生成告警摘要 → end
  → 否: end
```

### 6.2 客户增长分析（customer_growth.yaml）

```
start → 客户数据分析 → 客户分群 → condition(有高价值新客?) 
  → 是: 生成跟进计划 → end
  → 否: end
```

### 6.3 竞品监控与应对（competitive_monitor.yaml）

```
竞品监控 → condition(重大变动?) 
  → 是: 通知运营[notification] → 运营确认[human_task] → 定价策略 → 选品分析 → 汇总报告
  → 否: 汇总报告
```

### 6.4 新品上架全流程（new_product_launch.yaml）

```
选品分析 → 新品方案 → 老板审批[approval] → 详情页优化 → 定价策略 → 
运营上架[human_task] → 等待3天[wait] → 转化率诊断 → 汇总报告 → 通知团队[notification]
```

### 6.5 月度财务审查（monthly_finance_review.yaml）

```
数据同步 → 利润分析 → 成本优化 → 现金流预测 → condition(资金风险?) 
  → 是: 资金预警[notification] → 汇总报告
  → 否: 汇总报告
→ 老板审阅[approval] → 发布财务简报[notification]
```

---

## 七、演进路线

| 阶段 | 目标 | 状态 |
|------|------|------|
| **Phase 1** | Skill 与 Workflow 概念分离，独立数据模型 | ✅ 已完成 |
| **Phase 2** | 对话式工作流创建 + AI 拆解 | ✅ 已完成 |
| **Phase 3** | 有状态工作流执行 + 心跳 + 用户交互 | ✅ 已完成 |
| **Phase 4** | 任务管理按数字孪生维度 + 来源分类 | ✅ 已完成 |
| **Phase 5** | 工作流节点类型扩展（human_task/approval/notification/wait/api_call/loop） | ✅ 已完成 |
| **Phase 6** | 可视化工作流编辑器（拖拽节点） | 🔜 计划中 |
| **Phase 7** | 事件驱动触发（webhook / 数据变更） | 🔜 计划中 |
| **Phase 8** | 工作流市场（企业间共享模板） | 🔜 计划中 |
