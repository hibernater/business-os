package com.businessos.model.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "skill_marketplace")
public class SkillMarketplace {

    @Id
    private String id;

    @Column(name = "skill_id", nullable = false)
    private String skillId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "author_enterprise_id")
    private String authorEnterpriseId;

    @Column(name = "author_name")
    private String authorName;

    private String category;

    @Column(name = "yaml_content", nullable = false, columnDefinition = "TEXT")
    private String yamlContent;

    private int version;

    @Column(name = "install_count")
    private int installCount;

    private BigDecimal rating;

    private String status;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (status == null) status = "published";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getSkillId() { return skillId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getAuthorEnterpriseId() { return authorEnterpriseId; }
    public void setAuthorEnterpriseId(String authorEnterpriseId) { this.authorEnterpriseId = authorEnterpriseId; }
    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getYamlContent() { return yamlContent; }
    public void setYamlContent(String yamlContent) { this.yamlContent = yamlContent; }
    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
    public int getInstallCount() { return installCount; }
    public void setInstallCount(int installCount) { this.installCount = installCount; }
    public BigDecimal getRating() { return rating; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
