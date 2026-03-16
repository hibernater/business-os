package com.businessos.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow")
public class Workflow {

    @Id
    private String id;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    /** draft / active / paused */
    private String status;

    /** manual / scheduled / event */
    @Column(name = "trigger_type")
    private String triggerType;

    @Column(name = "cron_expr")
    private String cronExpr;

    /** JSON: [{id, type, label, skillId?, config?}] */
    @Column(name = "nodes_json", columnDefinition = "TEXT")
    private String nodesJson;

    /** JSON: [{id, from, to, condition?}] */
    @Column(name = "edges_json", columnDefinition = "TEXT")
    private String edgesJson;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_run_at")
    private LocalDateTime lastRunAt;

    @Column(name = "run_count")
    private Integer runCount;

    public Workflow() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (status == null) status = "draft";
        if (triggerType == null) triggerType = "manual";
        if (runCount == null) runCount = 0;
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters
    public String getId() { return id; }
    public String getEnterpriseId() { return enterpriseId; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public String getStatus() { return status; }
    public String getTriggerType() { return triggerType; }
    public String getCronExpr() { return cronExpr; }
    public String getNodesJson() { return nodesJson; }
    public String getEdgesJson() { return edgesJson; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public LocalDateTime getLastRunAt() { return lastRunAt; }
    public Integer getRunCount() { return runCount; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setEnterpriseId(String enterpriseId) { this.enterpriseId = enterpriseId; }
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setStatus(String status) { this.status = status; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }
    public void setCronExpr(String cronExpr) { this.cronExpr = cronExpr; }
    public void setNodesJson(String nodesJson) { this.nodesJson = nodesJson; }
    public void setEdgesJson(String edgesJson) { this.edgesJson = edgesJson; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setLastRunAt(LocalDateTime lastRunAt) { this.lastRunAt = lastRunAt; }
    public void setRunCount(Integer runCount) { this.runCount = runCount; }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("enterpriseId", enterpriseId);
        map.put("name", name);
        map.put("description", description);
        map.put("status", status);
        map.put("triggerType", triggerType);
        map.put("cronExpr", cronExpr);
        map.put("nodesJson", nodesJson);
        map.put("edgesJson", edgesJson);
        map.put("createdAt", createdAt != null ? createdAt.toString() : null);
        map.put("updatedAt", updatedAt != null ? updatedAt.toString() : null);
        map.put("lastRunAt", lastRunAt != null ? lastRunAt.toString() : null);
        map.put("runCount", runCount);
        return map;
    }
}
