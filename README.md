# Business OS — AI 原生企业经营工作台

> 把中小企业的日常工作流变成可自动执行的 AI 原生系统，最终演进为**企业数字孪生**。

## 产品愿景

产业带中小企业缺少体系化的经营方法论与数字化能力。Business OS 以 **Skill**（可执行工作流）为核心载体：

1. 通过对话交互，帮企业把经营方法论沉淀为 Skill
2. Skill 可手动/定时/事件驱动地自动执行
3. 执行结果持续更新企业状态模型，逐步构建企业数字孪生

## 功能全景

| 层级 | 功能 | 说明 |
|------|------|------|
| **P0 核心循环** | 交互式 Skill 执行 | 引导式问答 → 计划确认 → 分步执行 → 记忆沉淀 |
| | 对话式 Skill 创建 | 用自然语言描述，AI 自动生成 YAML 工作流 |
| | 企业上下文注入 | Skill 执行时自动加载企业资产与偏好 |
| | 执行历史 & 记忆持久化 | 保存每次执行结果与用户偏好 |
| | 定时自动执行 | Cron / 间隔调度，自动运行 Skill |
| **P1 产品深度** | 5 个预装 Skill | 爆款选品、每日复盘、退款分析、客户分群、定价策略 |
| | Tool 系统 (10 个工具) | 5 内置 + 5 电商数据 mock，Skill 步骤可调用 |
| | 文件上传 | CSV/Excel/图片等企业资产上传 |
| | Markdown 导出 | 对话 & 执行结果一键导出 |
| **P2 产品广度** | 实时通知推送 | Server-Sent Events，Skill 完成即时提醒 |
| | 数据看板 | 资产、执行、对话等核心指标概览 |
| | 电商平台对接 | Mock 数据层，预留真实 API 接入 |
| | 团队协作 | 成员管理、角色权限、操作审计 |
| **P3 长远目标** | Skill 市场 | 发布 / 搜索 / 安装共享 Skill |
| | 移动端适配 | 响应式布局，移动端侧滑菜单 |
| | 企业数字孪生 | 五维状态模型（商品/客户/运营/团队/财务）可视化 |
| | **数字孪生飞轮** | Skill 执行结果自动提取 → 结构化回写 → 孪生积累 |
| | **任务/工作流管理** | Skill（方法论）与 Task（执行实例）分离，独立管理 |

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
├── backend-java/        # Java 后端 (端口 8080)
│   └── src/main/java/com/businessos/
│       ├── controller/  # REST API (Chat, Skill, Asset, Schedule, Marketplace, Team, Dashboard, DigitalTwin...)
│       ├── service/     # ChatService, AiEngineClient, NotificationService, AuditService
│       ├── model/       # JPA 实体
│       ├── repository/  # Spring Data JPA
│       ├── middleware/   # JWT 过滤器, 多租户上下文
│       └── config/      # Security, CORS
├── ai-engine/           # Python AI 引擎 (端口 8081)
│   ├── agent/           # MainAgent, Planner, SkillCreator
│   ├── runner/          # SkillRunner (状态机), EnterpriseContext, TwinUpdater, TaskLifecycle
│   ├── skills/presets/  # 预装 Skill YAML (含 twin_dimensions 声明)
│   ├── tools/           # Tool Registry, 内置工具, 电商 mock 工具
│   └── scheduler/       # APScheduler 定时引擎
├── frontend/            # React 前端 (端口 3000)
│   └── src/
│       ├── components/  # Chat, Skills, Assets, Dashboard, Team, Notifications, Tasks
│       ├── stores/      # Zustand (auth, chat)
│       └── lib/         # API 客户端
├── sql/                 # 数据库迁移脚本 (V1~V4)
├── docker-compose.yml   # PostgreSQL + Redis
└── .env.example         # 环境变量模板
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
# 后续迁移:
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V2__team_audit_log.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V3__skill_marketplace.sql
docker exec bos-postgres psql -U bos -d business_os -f /docker-entrypoint-initdb.d/V4__task_management.sql
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
       Java 后端(8080)     ← JWT 鉴权, 多租户隔离, 任务管理
         ↕ NDJSON 流式
       Python AI 引擎(8081) ← Skill 执行, Tool 调用, 调度, 孪生回写
         ↕
       通义千问 LLM
         ↕
       PostgreSQL / Redis   ← 企业资产, 执行记录, 偏好, 状态模型, 任务记录
```

## License

MIT
