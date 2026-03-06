-- V2: 团队协作 - 操作日志

CREATE TABLE IF NOT EXISTS audit_log (
    id              VARCHAR(36) PRIMARY KEY,
    enterprise_id   VARCHAR(36) NOT NULL REFERENCES enterprise(id),
    user_id         VARCHAR(36) NOT NULL,
    user_name       VARCHAR(100),
    action          VARCHAR(50) NOT NULL,
    resource_type   VARCHAR(50),
    resource_id     VARCHAR(100),
    detail          TEXT,
    ip_address      VARCHAR(50),
    created_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_enterprise ON audit_log(enterprise_id, created_at DESC);
