# Business OS — AI 原生企业经营工作台

> 把中小企业的日常工作流变成可自动执行的 AI 原生系统，最终演进为**企业数字孪生**。

## 产品愿景

产业带中小企业缺少体系化的经营方法论与数字化能力。Business OS 以 **Skill**（原子能力）和 **Workflow**（流程编排）为核心载体：

1. 通过对话交互，帮企业把经营方法论沉淀为 Skill
2. 通过 AI 拆解或可视化构建，将多个 Skill 编排成 Workflow（工作流）
3. Skill / Workflow 可手动、定时、事件驱动地自动执行
4. 执行结果持续更新企业状态模型，逐步构建企业数字孪生

## 核心架构

```
Skill = 函数（function）—— 原子级 AI 能力
Workflow = 程序（program）—— 编排多个 Skill，有控制流
Agent = 调度中枢 —— 理解意图，调度 Skill / Workflow
```

Agent 通过 `IntentRouter` 识别用户意图（执行 Skill / 创建 Skill / 自由对话），将请求分发给 `SkillRunner` 或 `SkillCreator`；Workflow 以 DAG 形式编排多个 Skill 节点和控制节点，通过心跳机制持续驱动执行。

## 功能全景

| 层级 | 功能 | 说明 |
|------|------|------|
| **P0 核心循环** | 交互式 Skill 执行 | 引导式问答 → 计划确认 → 分步执行 → 记忆沉淀 |
| | 对话式 Skill 创建 | 用自然语言描述，AI 自动生成 YAML Skill 定义 |
| | 企业上下文注入 | Skill 执行时自动加载企业资产与偏好 |
| | 执行历史 & 记忆持久化 | 保存每次执行结果与用户偏好 |
| | 定时自动执行 | Cron / 间隔调度，自动运行 Skill |
| **P1 Skill 体系** | 33 个预装 Skill | 覆盖 8 大类目：商品管理、客户运营、数据分析、运营推广、定价利润、团队管理、供应链、财务 |
| | Skill 分类 & 分页 | 按类目筛选、分页浏览，快速定位所需能力 |
| | Tool 系统 (10+ 工具) | 内置工具 + 电商数据 mock，Skill 步骤可调用 |
| | 文件上传 | CSV/Excel/图片等企业资产上传 |
| | Markdown 导出 | 对话 & 执行结果一键导出 |
| **P2 工作流引擎** | AI 工作流拆解 | 自然语言描述 → AI 自动拆解为结构化 DAG（LLM 优先，规则兜底） |
| | 可视化工作流构建 | 节点面板（4 大分类 9 种节点）+ 配置面板 + 节点排序/删除 |
| | 9 种节点类型 | skill / condition / human_task / approval / notification / wait / api_call / sub_workflow / loop |
| | 有状态心跳执行 | 心跳驱动持续推进，支持暂停/恢复/人工交互 |
| | 类型专属交互面板 | 审批→批准/驳回、人工任务→完成标记、条件→选项按钮 |
| | 子工作流触发与跟踪 | 真实创建子流程执行实例，轮询状态直至完成 |
| | 5 个预置工作流模板 | 每日晨报、客户增长、竞品监控、新品上架、月度财务审查 |
| **P3 产品广度** | 首页经营驾驶舱 | 今日一眼核心指标 + AI 对话框 + 待办事项 |
| | 企业数字孪生 | 五维状态模型（商品/客户/运营/团队/财务）可视化 |
| | 数字孪生飞轮 | Skill 执行结果自动提取 → 结构化回写 → 孪生持续积累 |
| | 任务管理 | 双 Tab：独立任务按五维度分组 + 工作流任务按执行实例分组 |
| | 实时通知推送 | Server-Sent Events，Skill/Workflow 完成即时提醒 |
| | 电商平台对接 | Mock 数据层，预留真实 API 接入 |
| | 团队协作 | 成员管理、角色权限、操作审计 |
| **P4 长远目标** | Skill 市场 | 发布 / 搜索 / 安装共享 Skill |
| | 工作流市场 | 企业间共享工作流模板 |
| | 拖拽式画布编辑器 | React Flow 集成，拖拽连线编排工作流 |
| | 事件驱动触发 | Webhook / 数据变更 自动触发工作流 |
| | 移动端适配 | 响应式布局，移动端侧滑菜单 |

## 预装内容

### 33 个预装 Skill（按类目）

| 类目 | Skill |
|------|-------|
| 商品管理 | 爆款选品分析、新品企划方案、竞品监控、库存盘点、详情页优化 |
| 客户运营 | 客户分群分析、客户生命周期管理、流失挽回活动策划、评价口碑分析、NPS 满意度调研 |
| 数据分析 | 每日询盘复盘、经营周报、退款趋势分析、异常检测与告警、智能汇总报告、平台数据同步、流量分析、店铺健康诊断 |
| 运营推广 | 转化率优化、大促排期策划、渠道效果分析、营销 ROI 分析 |
| 定价利润 | 智能定价策略、利润分析与预警、成本优化建议 |
| 团队管理 | 团队绩效看板、客服质检分析、培训计划生成 |
| 供应链 | 订单履约检查、物流时效优化、供应商评估 |
| 财务 | 现金流预测、税务筹备提醒 |

### 5 个预置工作流模板

| 模板 | 流程 |
|------|------|
| 每日运营晨报 | 拉取数据 → 生成日报 → 异常判断 → 告警摘要 |
| 客户增长分析 | 客户数据分析 → 客户分群 → 高价值新客跟进 |
| 竞品监控与应对 | 竞品监控 → 重大变动判断 → 通知运营 → 人工确认 → 定价/选品调整 |
| 新品上架全流程 | 选品 → 方案 → 老板审批 → 详情页优化 → 定价 → 运营上架 → 等待 → 诊断 → 通知 |
| 月度财务审查 | 数据同步 → 利润分析 → 成本优化 → 现金流预测 → 风险判断 → 审阅 → 发布 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + Next.js 14 + TailwindCSS + TypeScript + Zustand |
| 后端网关 | Java 17 + Spring Boot 3.2 (Web, JPA, Security, WebFlux) |
| AI 引擎 | Python 3.11 + FastAPI + 通义千问 (Qwen) |
| 数据库 | PostgreSQL 16 + Redis 7 |
| 通信 | NDJSON 流式 (Python↔Java) · SSE (Java↔前端) · JWT 鉴权 |

## 项目结构

```
business-os/
├── backend-java/            # Java 后端 (端口 8080)
│   └── src/main/java/com/businessos/
│       ├── controller/      # REST API (Chat, Skill, Workflow, Asset, Schedule, Team, Dashboard, DigitalTwin...)
│       ├── service/         # ChatService, AiEngineClient, NotificationService, AuditService
│       ├── model/           # JPA 实体 (Workflow, WorkflowExecution, SkillExecution...)
│       ├── repository/      # Spring Data JPA
│       ├── middleware/      # JWT 过滤器, 多租户上下文
│       └── config/          # Security, CORS
├── ai-engine/               # Python AI 引擎 (端口 8081)
│   ├── agent/               # MainAgent, IntentRouter, SkillCreator
│   ├── runner/              # SkillRunner (状态机), EnterpriseContext, TwinUpdater, TaskLifecycle
│   ├── skills/presets/      # 33 个预装 Skill YAML (8 大类目)
│   ├── workflow/            # Decomposer (AI 拆解), Executor (心跳引擎)
│   ├── workflows/presets/   # 5 个预置工作流模板 YAML
│   ├── tools/               # Tool Registry, 内置工具, 电商 mock 工具
│   └── scheduler/           # APScheduler 定时引擎
├── frontend/                # React 前端 (端口 3000)
│   └── src/
│       ├── components/      # Home, Chat, Skills, Workflows, Tasks, Dashboard, Team, Notifications
│       ├── stores/          # Zustand (auth, chat)
│       └── lib/             # API 客户端
├── docs/                    # 架构设计文档 (Workflow 架构、产品设计等)
├── sql/                     # 数据库迁移脚本 (V1~V6)
├── docker-compose.yml       # PostgreSQL + Redis
└── .env.example             # 环境变量模板
```

## 本地开发

### 前置条件

- Docker & Docker Compose
- Java 17 + Maven
- Python 3.11+
- Node.js 20+
- 通义千问 API Key ([申请地址](https://dashscope.console.aliyun.com/))

### 1. 启动数据库

```bash
docker compose up -d
# 验证: docker compose ps → postgres/redis 均 healthy
```

### 2. 初始化数据库

```bash
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V1__init.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V2__team_audit_log.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V3__skill_marketplace.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V4__task_management.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V5__mock_data.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V6__workflow_mock_data.sql
```

### 3. 启动 Python AI 引擎

```bash
cd ai-engine
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DASHSCOPE_API_KEY=你的API_KEY
python main.py
# 验证: curl http://localhost:8081/health
```

### 4. 启动 Java 后端

```bash
cd backend-java
mvn clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar
# 验证: curl http://localhost:8080/health
```

### 5. 启动前端

```bash
cd frontend
npm install && npm run dev
# 打开 http://localhost:3000
```

### 6. 登录

- 用户名：`admin`
- 密码：`admin123`

## 数据流

```
用户 → 前端(3000)
         ↕ REST + SSE
       Java 后端(8080)     ← JWT 鉴权, 多租户隔离, 任务/工作流管理
         ↕ NDJSON 流式          ↕ 心跳调度
       Python AI 引擎(8081) ← Agent 调度, Skill 执行, 工作流拆解/执行, 孪生回写
         ↕
       通义千问 LLM
         ↕
       PostgreSQL / Redis   ← 企业资产, Skill/Workflow 定义, 执行记录, 偏好, 数字孪生状态
```

### 工作流执行流程

```
用户描述业务流程 → AI Decomposer 拆解为 DAG → 保存 Workflow
                                                    ↓
                                            启动 WorkflowExecution
                                                    ↓
                                        ┌── 心跳循环（每 60s）──┐
                                        │  检查当前节点          │
                                        │  ├─ skill → LLM 执行   │
                                        │  ├─ approval → 等审批   │
                                        │  ├─ human_task → 等完成 │
                                        │  ├─ condition → 等选择  │
                                        │  └─ ... 推进到下一节点  │
                                        └────────────────────────┘
```

## License

MIT
