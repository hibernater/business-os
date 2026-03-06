package com.businessos.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "skill")
public class Skill {

    @Id
    private String id;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    private String name;
    private String description;

    @Column(name = "skill_type")
    private String skillType;

    private String status;

    @Column(name = "run_mode")
    private String runMode;

    private Integer version;

    @Column(name = "skill_md_path")
    private String skillMdPath;

    @Column(name = "reference_path")
    private String referencePath;

    @Column(name = "scripts_path")
    private String scriptsPath;

    @Column(name = "assets_path")
    private String assetsPath;

    @Column(name = "schedule_config")
    private String scheduleConfig;

    @Column(name = "execution_count")
    private Integer executionCount;

    @Column(name = "last_executed_at")
    private LocalDateTime lastExecutedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public Skill() {
    }

    public Skill(String id, String enterpriseId, String name, String description, String skillType,
                 String status, String runMode, Integer version, String skillMdPath, String referencePath,
                 String scriptsPath, String assetsPath, String scheduleConfig, Integer executionCount,
                 LocalDateTime lastExecutedAt, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.enterpriseId = enterpriseId;
        this.name = name;
        this.description = description;
        this.skillType = skillType;
        this.status = status;
        this.runMode = runMode;
        this.version = version;
        this.skillMdPath = skillMdPath;
        this.referencePath = referencePath;
        this.scriptsPath = scriptsPath;
        this.assetsPath = assetsPath;
        this.scheduleConfig = scheduleConfig;
        this.executionCount = executionCount;
        this.lastExecutedAt = lastExecutedAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String enterpriseId;
        private String name;
        private String description;
        private String skillType;
        private String status;
        private String runMode;
        private Integer version;
        private String skillMdPath;
        private String referencePath;
        private String scriptsPath;
        private String assetsPath;
        private String scheduleConfig;
        private Integer executionCount;
        private LocalDateTime lastExecutedAt;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder enterpriseId(String enterpriseId) {
            this.enterpriseId = enterpriseId;
            return this;
        }

        public Builder name(String name) {
            this.name = name;
            return this;
        }

        public Builder description(String description) {
            this.description = description;
            return this;
        }

        public Builder skillType(String skillType) {
            this.skillType = skillType;
            return this;
        }

        public Builder status(String status) {
            this.status = status;
            return this;
        }

        public Builder runMode(String runMode) {
            this.runMode = runMode;
            return this;
        }

        public Builder version(Integer version) {
            this.version = version;
            return this;
        }

        public Builder skillMdPath(String skillMdPath) {
            this.skillMdPath = skillMdPath;
            return this;
        }

        public Builder referencePath(String referencePath) {
            this.referencePath = referencePath;
            return this;
        }

        public Builder scriptsPath(String scriptsPath) {
            this.scriptsPath = scriptsPath;
            return this;
        }

        public Builder assetsPath(String assetsPath) {
            this.assetsPath = assetsPath;
            return this;
        }

        public Builder scheduleConfig(String scheduleConfig) {
            this.scheduleConfig = scheduleConfig;
            return this;
        }

        public Builder executionCount(Integer executionCount) {
            this.executionCount = executionCount;
            return this;
        }

        public Builder lastExecutedAt(LocalDateTime lastExecutedAt) {
            this.lastExecutedAt = lastExecutedAt;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Builder updatedAt(LocalDateTime updatedAt) {
            this.updatedAt = updatedAt;
            return this;
        }

        public Skill build() {
            return new Skill(id, enterpriseId, name, description, skillType, status, runMode, version,
                    skillMdPath, referencePath, scriptsPath, assetsPath, scheduleConfig, executionCount,
                    lastExecutedAt, createdAt, updatedAt);
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getEnterpriseId() {
        return enterpriseId;
    }

    public void setEnterpriseId(String enterpriseId) {
        this.enterpriseId = enterpriseId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getSkillType() {
        return skillType;
    }

    public void setSkillType(String skillType) {
        this.skillType = skillType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getRunMode() {
        return runMode;
    }

    public void setRunMode(String runMode) {
        this.runMode = runMode;
    }

    public Integer getVersion() {
        return version;
    }

    public void setVersion(Integer version) {
        this.version = version;
    }

    public String getSkillMdPath() {
        return skillMdPath;
    }

    public void setSkillMdPath(String skillMdPath) {
        this.skillMdPath = skillMdPath;
    }

    public String getReferencePath() {
        return referencePath;
    }

    public void setReferencePath(String referencePath) {
        this.referencePath = referencePath;
    }

    public String getScriptsPath() {
        return scriptsPath;
    }

    public void setScriptsPath(String scriptsPath) {
        this.scriptsPath = scriptsPath;
    }

    public String getAssetsPath() {
        return assetsPath;
    }

    public void setAssetsPath(String assetsPath) {
        this.assetsPath = assetsPath;
    }

    public String getScheduleConfig() {
        return scheduleConfig;
    }

    public void setScheduleConfig(String scheduleConfig) {
        this.scheduleConfig = scheduleConfig;
    }

    public Integer getExecutionCount() {
        return executionCount;
    }

    public void setExecutionCount(Integer executionCount) {
        this.executionCount = executionCount;
    }

    public LocalDateTime getLastExecutedAt() {
        return lastExecutedAt;
    }

    public void setLastExecutedAt(LocalDateTime lastExecutedAt) {
        this.lastExecutedAt = lastExecutedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Skill skill = (Skill) o;
        return Objects.equals(id, skill.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Skill{" +
                "id='" + id + '\'' +
                ", enterpriseId='" + enterpriseId + '\'' +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", skillType='" + skillType + '\'' +
                ", status='" + status + '\'' +
                ", runMode='" + runMode + '\'' +
                ", version=" + version +
                ", skillMdPath='" + skillMdPath + '\'' +
                ", referencePath='" + referencePath + '\'' +
                ", scriptsPath='" + scriptsPath + '\'' +
                ", assetsPath='" + assetsPath + '\'' +
                ", scheduleConfig='" + scheduleConfig + '\'' +
                ", executionCount=" + executionCount +
                ", lastExecutedAt=" + lastExecutedAt +
                ", createdAt=" + createdAt +
                ", updatedAt=" + updatedAt +
                '}';
    }
}
