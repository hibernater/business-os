-- V4: 扩展 skill_execution 表，支持任务管理
-- 新增列使执行记录可用于独立的任务/工作流管理

ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS skill_name VARCHAR(128);
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS trigger_type VARCHAR(32) DEFAULT 'manual';
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS total_steps INTEGER DEFAULT 0;
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS schedule_id VARCHAR(64);
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS output_summary VARCHAR(512);
ALTER TABLE skill_execution ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 放宽外键约束：skill_id 和 user_id 可能来自预装 Skill，不在 skill/user 表中
-- 先尝试删除旧外键（如果存在）
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS fk_execution_skill;
ALTER TABLE skill_execution DROP CONSTRAINT IF EXISTS skill_execution_skill_id_fkey;

-- 放宽 user_id 的 NOT NULL 约束（定时/事件触发的任务可能没有明确用户）
ALTER TABLE skill_execution ALTER COLUMN user_id DROP NOT NULL;

-- 索引
CREATE INDEX IF NOT EXISTS idx_execution_status ON skill_execution(enterprise_id, status);
CREATE INDEX IF NOT EXISTS idx_execution_trigger ON skill_execution(enterprise_id, trigger_type);
CREATE INDEX IF NOT EXISTS idx_execution_started ON skill_execution(started_at DESC);
