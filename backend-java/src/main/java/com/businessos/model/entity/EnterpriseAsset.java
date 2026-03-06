package com.businessos.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "enterprise_asset")
public class EnterpriseAsset {

    @Id
    private String id;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    @Column(name = "asset_type")
    private String assetType;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String content;

    @Column(name = "file_path")
    private String filePath;

    private String source;

    @Column(name = "source_skill_id")
    private String sourceSkillId;

    @Column(name = "ref_count")
    private Integer refCount;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public EnterpriseAsset() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (refCount == null) refCount = 0;
    }

    // getters
    public String getId() { return id; }
    public String getEnterpriseId() { return enterpriseId; }
    public String getAssetType() { return assetType; }
    public String getName() { return name; }
    public String getContent() { return content; }
    public String getFilePath() { return filePath; }
    public String getSource() { return source; }
    public String getSourceSkillId() { return sourceSkillId; }
    public Integer getRefCount() { return refCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // setters
    public void setId(String id) { this.id = id; }
    public void setEnterpriseId(String enterpriseId) { this.enterpriseId = enterpriseId; }
    public void setAssetType(String assetType) { this.assetType = assetType; }
    public void setName(String name) { this.name = name; }
    public void setContent(String content) { this.content = content; }
    public void setFilePath(String filePath) { this.filePath = filePath; }
    public void setSource(String source) { this.source = source; }
    public void setSourceSkillId(String sourceSkillId) { this.sourceSkillId = sourceSkillId; }
    public void setRefCount(Integer refCount) { this.refCount = refCount; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public static Builder builder() { return new Builder(); }

    public static class Builder {
        private final EnterpriseAsset asset = new EnterpriseAsset();
        public Builder id(String id) { asset.id = id; return this; }
        public Builder enterpriseId(String v) { asset.enterpriseId = v; return this; }
        public Builder assetType(String v) { asset.assetType = v; return this; }
        public Builder name(String v) { asset.name = v; return this; }
        public Builder content(String v) { asset.content = v; return this; }
        public Builder source(String v) { asset.source = v; return this; }
        public Builder sourceSkillId(String v) { asset.sourceSkillId = v; return this; }
        public Builder filePath(String v) { asset.filePath = v; return this; }
        public EnterpriseAsset build() { return asset; }
    }
}
