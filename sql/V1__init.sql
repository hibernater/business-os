-- Business OS 核心数据库 Schema
-- V1: 331阶段基础表结构

-- 企业（租户）
CREATE TABLE enterprise (
    id              VARCHAR(36) PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    industry        VARCHAR(100),
    scale           VARCHAR(50),
    platforms       TEXT[],
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 用户
CREATE TABLE "user" (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    username        VARCHAR(100) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    display_name    VARCHAR(100),
    role            VARCHAR(20) NOT NULL DEFAULT 'member',  -- owner / admin / member
    status          VARCHAR(20) DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_user_enterprise ON "user"(enterprise_id);

-- Skill 定义
CREATE TABLE skill (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    skill_type      VARCHAR(20) NOT NULL DEFAULT 'custom',  -- preset / custom
    status          VARCHAR(20) NOT NULL DEFAULT 'draft',    -- draft / confirmed / trial / active / paused
    run_mode        VARCHAR(20) NOT NULL DEFAULT 'manual',   -- manual / scheduled / event / continuous
    version         INT NOT NULL DEFAULT 1,
    -- Skill四件套存储路径 (OSS/本地文件)
    skill_md_path   TEXT,
    reference_path  TEXT,
    scripts_path    TEXT,
    assets_path     TEXT,
    -- 自动化调度配置 (331预留, JSON)
    schedule_config JSONB,
    -- 元数据
    tags            TEXT[],
    execution_count INT DEFAULT 0,
    last_executed_at TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_skill_enterprise ON skill(enterprise_id);

-- 对话会话
CREATE TABLE conversation (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    user_id         VARCHAR(36) NOT NULL REFERENCES "user"(id),
    title           VARCHAR(500),
    summary         TEXT,
    related_skills  TEXT[],
    status          VARCHAR(20) DEFAULT 'active',  -- active / archived
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_conversation_enterprise ON conversation(enterprise_id);
CREATE INDEX idx_conversation_user ON conversation(user_id);

-- 对话消息
CREATE TABLE message (
    id              VARCHAR(36) PRIMARY KEY,
    conversation_id VARCHAR(36) NOT NULL REFERENCES conversation(id),
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    role            VARCHAR(20) NOT NULL,  -- user / assistant / system
    content         TEXT NOT NULL,
    message_type    VARCHAR(30) DEFAULT 'text',  -- text / skill_confirm / step_result / final_report / data_request / action_suggest
    metadata        TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_message_conversation ON message(conversation_id);
CREATE INDEX idx_message_enterprise ON message(enterprise_id);

-- Skill 执行记录
CREATE TABLE skill_execution (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    skill_id        VARCHAR(36) NOT NULL REFERENCES skill(id),
    conversation_id VARCHAR(36) REFERENCES conversation(id),
    user_id         VARCHAR(36) NOT NULL REFERENCES "user"(id),
    input_data      JSONB,
    output_data     JSONB,
    -- 逐Step执行状态
    current_step    INT DEFAULT 0,
    step_results    JSONB,          -- {step_id: {status, result, duration}}
    -- 状态回写 (数字孪生)
    state_updates   JSONB,          -- 写入企业状态模型的变更
    decision_record JSONB,          -- 决策记录
    status          VARCHAR(20) NOT NULL DEFAULT 'running', -- running / waiting_input / completed / failed
    started_at      TIMESTAMP DEFAULT NOW(),
    completed_at    TIMESTAMP,
    duration_ms     INT
);
CREATE INDEX idx_execution_enterprise ON skill_execution(enterprise_id);
CREATE INDEX idx_execution_skill ON skill_execution(skill_id);

-- 企业资产
CREATE TABLE enterprise_asset (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    asset_type      VARCHAR(50) NOT NULL,   -- file / preference / constraint / profile
    name            VARCHAR(200) NOT NULL,
    content         TEXT,                    -- 文本内容或结构化JSON
    file_path       TEXT,                    -- 文件存储路径
    source          VARCHAR(100),            -- 来源：skill_creation / skill_execution / user_upload / auto_extracted
    source_skill_id VARCHAR(36),
    ref_count       INT DEFAULT 0,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_asset_enterprise ON enterprise_asset(enterprise_id);
CREATE INDEX idx_asset_type ON enterprise_asset(enterprise_id, asset_type);

-- 企业状态模型 (数字孪生基座, 331预留)
CREATE TABLE enterprise_state (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id) UNIQUE,
    product_state   TEXT DEFAULT '{}',
    customer_state  TEXT DEFAULT '{}',
    operation_state TEXT DEFAULT '{}',
    team_state      TEXT DEFAULT '{}',
    financial_state TEXT DEFAULT '{}',
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- 决策记忆 (数字孪生基座, 331预留)
CREATE TABLE decision_record (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    skill_id        VARCHAR(36) REFERENCES skill(id),
    execution_id    VARCHAR(36) REFERENCES skill_execution(id),
    decision_type   VARCHAR(50),          -- product_selection / pricing / design / customer_mgmt
    context         JSONB,
    recommendation  JSONB,
    user_choice     JSONB,
    outcome         JSONB,
    outcome_at      TIMESTAMP,
    learning        TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_decision_enterprise ON decision_record(enterprise_id);

-- 插入默认测试数据
INSERT INTO enterprise (id, name, industry, scale, platforms)
VALUES ('ent_default', '测试企业', '收纳', '1000-3000万', ARRAY['1688', '淘天', '拼多多']);

INSERT INTO "user" (id, enterprise_id, username, password_hash, display_name, role)
VALUES ('user_default', 'ent_default', 'admin', '$2a$10$placeholder_hash', '张总', 'owner');
