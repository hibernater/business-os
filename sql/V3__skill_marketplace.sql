-- V3: Skill 市场

CREATE TABLE IF NOT EXISTS skill_marketplace (
    id              VARCHAR(36) PRIMARY KEY,
    skill_id        VARCHAR(100) NOT NULL,
    name            VARCHAR(200) NOT NULL,
    description     TEXT,
    author_enterprise_id VARCHAR(36) REFERENCES enterprise(id),
    author_name     VARCHAR(100),
    category        VARCHAR(50),
    tags            TEXT[],
    yaml_content    TEXT NOT NULL,
    version         INT DEFAULT 1,
    install_count   INT DEFAULT 0,
    rating          NUMERIC(2,1) DEFAULT 0,
    status          VARCHAR(20) DEFAULT 'published',
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_marketplace_category ON skill_marketplace(category);
CREATE INDEX idx_marketplace_name ON skill_marketplace(name);
