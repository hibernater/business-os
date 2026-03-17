-- V6: 工作流 Mock 数据
-- 工作流定义 + 执行实例 + 关联的 skill_execution（工作流任务）

-- ============================
-- 1. 创建工作流表（若 JPA 已创建则跳过）
-- ============================
CREATE TABLE IF NOT EXISTS workflow (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL,
    name            VARCHAR(200),
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'draft',
    trigger_type    VARCHAR(20) DEFAULT 'manual',
    cron_expr       VARCHAR(100),
    nodes_json      TEXT,
    edges_json      TEXT,
    created_at      TIMESTAMP,
    updated_at      TIMESTAMP,
    last_run_at     TIMESTAMP,
    run_count       INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workflow_execution (
    id                      VARCHAR(36) PRIMARY KEY,
    workflow_id             VARCHAR(36),
    workflow_name           VARCHAR(200),
    enterprise_id           VARCHAR(36) NOT NULL,
    status                  VARCHAR(30) DEFAULT 'idle',
    current_node_id         VARCHAR(64),
    context_json            TEXT,
    completed_nodes_json    TEXT DEFAULT '[]',
    heartbeat_interval_sec  INT DEFAULT 60,
    last_heartbeat_at      TIMESTAMP,
    next_heartbeat_at      TIMESTAMP,
    pending_interaction     TEXT,
    cycle_count             INT DEFAULT 0,
    started_at              TIMESTAMP,
    completed_at            TIMESTAMP,
    updated_at              TIMESTAMP,
    error_message           TEXT
);

-- skill_execution 需有 workflow_execution_id 列（V4 或后续迁移可能已加）
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS workflow_execution_id VARCHAR(36);
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS workflow_node_id VARCHAR(64);

-- ============================
-- 2. 工作流定义
-- ============================
INSERT INTO workflow (id, enterprise_id, name, description, status, trigger_type, cron_expr, nodes_json, edges_json, created_at, updated_at, last_run_at, run_count) VALUES
('wf_001', 'ent_default', '每日经营晨报', '每天拉取数据→分析经营状况→生成日报→异常时告警', 'active', 'scheduled', '0 9 * * *',
 '[{"id":"n1","type":"skill","label":"平台数据同步","skill_id":"fetch_platform_data","config":{}},{"id":"n2","type":"skill","label":"每日经营看板","skill_id":"inquiry_daily","config":{}},{"id":"n3","type":"condition","label":"是否异常","skill_id":null,"config":{"expression":"日营收或转化率异常"}},{"id":"n4","type":"skill","label":"异常检测告警","skill_id":"anomaly_alert","config":{}},{"id":"n5","type":"skill","label":"智能汇总","skill_id":"generate_summary","config":{}}]',
 '[{"id":"e1","from":"n1","to":"n2","condition":null},{"id":"e2","from":"n2","to":"n3","condition":null},{"id":"e3","from":"n3","to":"n4","condition":"异常"},{"id":"e4","from":"n3","to":"n5","condition":null},{"id":"e5","from":"n4","to":"n5","condition":null}]',
 NOW() - INTERVAL '14 days', NOW(), NOW() - INTERVAL '2 hours', 12),

('wf_002', 'ent_default', '客户增长分析', '客户数据→分群→有高价值新客时生成跟进计划→汇总', 'active', 'manual', NULL,
 '[{"id":"n1","type":"skill","label":"平台数据同步","skill_id":"fetch_platform_data","config":{}},{"id":"n2","type":"skill","label":"客户分群运营","skill_id":"customer_segmentation","config":{}},{"id":"n3","type":"condition","label":"有高价值新客?","skill_id":null,"config":{"expression":"分群结果含高价值新客"}},{"id":"n4","type":"skill","label":"流失挽回策划","skill_id":"retention_campaign","config":{}},{"id":"n5","type":"skill","label":"智能汇总","skill_id":"generate_summary","config":{}}]',
 '[{"id":"e1","from":"n1","to":"n2","condition":null},{"id":"e2","from":"n2","to":"n3","condition":null},{"id":"e3","from":"n3","to":"n4","condition":"是"},{"id":"e4","from":"n3","to":"n5","condition":null},{"id":"e5","from":"n4","to":"n5","condition":null}]',
 NOW() - INTERVAL '7 days', NOW(), NOW() - INTERVAL '3 days', 3),

('wf_003', 'ent_default', '竞品监控与应对', '竞品监控→有变动则通知运营→运营确认→定价策略→选品→汇总', 'active', 'scheduled', '0 10 * * 1-5',
 '[{"id":"n1","type":"skill","label":"竞品监控分析","skill_id":"competitor_monitor","config":{}},{"id":"n2","type":"condition","label":"有重大变动?","skill_id":null,"config":{"expression":"竞品价格或销量显著变化"}},{"id":"n3","type":"notification","label":"通知运营","skill_id":null,"config":{"channel":"企微","message_template":"竞品有变动，请确认"}},{"id":"n4","type":"human_task","label":"运营确认","skill_id":null,"config":{"assignee":"运营","description":"确认是否调整应对策略"}},{"id":"n5","type":"skill","label":"智能定价策略","skill_id":"pricing_strategy","config":{}},{"id":"n6","type":"skill","label":"爆款选品分析","skill_id":"product_selection","config":{}},{"id":"n7","type":"skill","label":"智能汇总","skill_id":"generate_summary","config":{}}]',
 '[{"id":"e1","from":"n1","to":"n2","condition":null},{"id":"e2","from":"n2","to":"n3","condition":"是"},{"id":"e3","from":"n2","to":"n7","condition":null},{"id":"e4","from":"n3","to":"n4","condition":null},{"id":"e5","from":"n4","to":"n5","condition":null},{"id":"e6","from":"n5","to":"n6","condition":null},{"id":"e7","from":"n6","to":"n7","condition":null}]',
 NOW() - INTERVAL '5 days', NOW(), NULL, 0)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    nodes_json = EXCLUDED.nodes_json,
    edges_json = EXCLUDED.edges_json,
    updated_at = EXCLUDED.updated_at;

-- ============================
-- 3. 工作流执行实例
-- ============================
INSERT INTO workflow_execution (id, workflow_id, workflow_name, enterprise_id, status, current_node_id, completed_nodes_json, context_json, last_heartbeat_at, started_at, completed_at, updated_at) VALUES
('wfexec_001', 'wf_001', '每日经营晨报', 'ent_default', 'completed', 'n5',
 '["n1","n2","n3","n5"]', '{}',
 NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' - INTERVAL '180 seconds', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours'),

('wfexec_002', 'wf_002', '客户增长分析', 'ent_default', 'waiting_input', 'n4',
 '["n1","n2","n3"]', '{"n2":{"result":"A类2家，B类3家，高价值新客5人"}}',
 NOW() - INTERVAL '1 hour', NOW() - INTERVAL '1 hour' - INTERVAL '120 seconds', NULL, NOW()),

('wfexec_003', 'wf_001', '每日经营晨报', 'ent_default', 'running', 'n2',
 '["n1"]', '{"n1":{"result":"已同步1688/淘天/拼多多/抖音数据"}}',
 NOW() - INTERVAL '30 seconds', NOW() - INTERVAL '2 minutes', NULL, NOW())
ON CONFLICT (id) DO NOTHING;

-- 为 waiting_input 设置 pending_interaction
UPDATE workflow_execution SET pending_interaction = '{"type":"human_task","node_id":"n4","message":"请确认是否根据高价值新客制定跟进计划？","options":[{"edge_id":"e_ok","label":"确认执行"},{"edge_id":"e_skip","label":"暂不执行"}]}' WHERE id = 'wfexec_002';

-- ============================
-- 4. 工作流任务（skill_execution 带 workflow_execution_id）
-- ============================
INSERT INTO skill_execution (id, enterprise_id, skill_id, skill_name, user_id, trigger_type, status, current_step, total_steps, workflow_execution_id, workflow_node_id, started_at, completed_at, duration_ms, output_summary, updated_at) VALUES
-- wfexec_001 已完成：4 个 skill 节点
('task_wf_001_1', 'ent_default', 'fetch_platform_data', '平台数据同步', NULL, 'scheduled', 'completed', 2, 2, 'wfexec_001', 'n1',
 NOW() - INTERVAL '2 hours' - INTERVAL '180 seconds', NOW() - INTERVAL '2 hours' - INTERVAL '150 seconds', 30000, '已同步1688/淘天/拼多多/抖音', NOW() - INTERVAL '2 hours'),
('task_wf_001_2', 'ent_default', 'inquiry_daily', '每日经营看板', NULL, 'scheduled', 'completed', 3, 3, 'wfexec_001', 'n2',
 NOW() - INTERVAL '2 hours' - INTERVAL '150 seconds', NOW() - INTERVAL '2 hours' - INTERVAL '90 seconds', 60000, '日营收4.2万，转化18%', NOW() - INTERVAL '2 hours'),
('task_wf_001_3', 'ent_default', 'generate_summary', '智能汇总', NULL, 'scheduled', 'completed', 2, 2, 'wfexec_001', 'n5',
 NOW() - INTERVAL '2 hours' - INTERVAL '90 seconds', NOW() - INTERVAL '2 hours', 90000, '晨报已生成', NOW() - INTERVAL '2 hours'),

-- wfexec_002 等待输入：3 个已完成
('task_wf_002_1', 'ent_default', 'fetch_platform_data', '平台数据同步', 'user_default', 'manual', 'completed', 2, 2, 'wfexec_002', 'n1',
 NOW() - INTERVAL '1 hour' - INTERVAL '120 seconds', NOW() - INTERVAL '1 hour' - INTERVAL '100 seconds', 20000, '数据已同步', NOW() - INTERVAL '1 hour'),
('task_wf_002_2', 'ent_default', 'customer_segmentation', '客户分群运营', 'user_default', 'manual', 'completed', 3, 3, 'wfexec_002', 'n2',
 NOW() - INTERVAL '1 hour' - INTERVAL '100 seconds', NOW() - INTERVAL '1 hour' - INTERVAL '40 seconds', 60000, 'A类2家B类3家，高价值新客5人', NOW() - INTERVAL '1 hour'),

-- wfexec_003 执行中：1 个已完成，1 个运行中
('task_wf_003_1', 'ent_default', 'fetch_platform_data', '平台数据同步', NULL, 'scheduled', 'completed', 2, 2, 'wfexec_003', 'n1',
 NOW() - INTERVAL '2 minutes', NOW() - INTERVAL '2 minutes' + INTERVAL '35 seconds', 35000, '已同步各平台数据', NOW() - INTERVAL '90 seconds'),
('task_wf_003_2', 'ent_default', 'inquiry_daily', '每日经营看板', NULL, 'scheduled', 'running', 2, 3, 'wfexec_003', 'n2',
 NOW() - INTERVAL '90 seconds', NULL, NULL, '正在生成今日经营数据...', NOW() - INTERVAL '10 seconds');
