package com.businessos.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "workflow_execution")
public class WorkflowExecution {

    @Id
    private String id;

    @Column(name = "workflow_id")
    private String workflowId;

    @Column(name = "workflow_name")
    private String workflowName;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    /** idle / running / waiting_input / paused / completed / failed */
    private String status;

    @Column(name = "current_node_id")
    private String currentNodeId;

    /** JSON: accumulated context from previous steps */
    @Column(name = "context_json", columnDefinition = "TEXT")
    private String contextJson;

    /** JSON: completed node IDs + results */
    @Column(name = "completed_nodes_json", columnDefinition = "TEXT")
    private String completedNodesJson;

    @Column(name = "heartbeat_interval_sec")
    private Integer heartbeatIntervalSec;

    @Column(name = "last_heartbeat_at")
    private LocalDateTime lastHeartbeatAt;

    @Column(name = "next_heartbeat_at")
    private LocalDateTime nextHeartbeatAt;

    /** JSON: pending interaction — what the workflow is asking the user */
    @Column(name = "pending_interaction", columnDefinition = "TEXT")
    private String pendingInteraction;

    @Column(name = "cycle_count")
    private Integer cycleCount;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    public WorkflowExecution() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (status == null) status = "idle";
        if (cycleCount == null) cycleCount = 0;
        if (heartbeatIntervalSec == null) heartbeatIntervalSec = 60;
        if (completedNodesJson == null) completedNodesJson = "[]";
        if (contextJson == null) contextJson = "{}";
        if (startedAt == null) startedAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters
    public String getId() { return id; }
    public String getWorkflowId() { return workflowId; }
    public String getWorkflowName() { return workflowName; }
    public String getEnterpriseId() { return enterpriseId; }
    public String getStatus() { return status; }
    public String getCurrentNodeId() { return currentNodeId; }
    public String getContextJson() { return contextJson; }
    public String getCompletedNodesJson() { return completedNodesJson; }
    public Integer getHeartbeatIntervalSec() { return heartbeatIntervalSec; }
    public LocalDateTime getLastHeartbeatAt() { return lastHeartbeatAt; }
    public LocalDateTime getNextHeartbeatAt() { return nextHeartbeatAt; }
    public String getPendingInteraction() { return pendingInteraction; }
    public Integer getCycleCount() { return cycleCount; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getErrorMessage() { return errorMessage; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setWorkflowId(String workflowId) { this.workflowId = workflowId; }
    public void setWorkflowName(String workflowName) { this.workflowName = workflowName; }
    public void setEnterpriseId(String enterpriseId) { this.enterpriseId = enterpriseId; }
    public void setStatus(String status) { this.status = status; }
    public void setCurrentNodeId(String currentNodeId) { this.currentNodeId = currentNodeId; }
    public void setContextJson(String contextJson) { this.contextJson = contextJson; }
    public void setCompletedNodesJson(String completedNodesJson) { this.completedNodesJson = completedNodesJson; }
    public void setHeartbeatIntervalSec(Integer heartbeatIntervalSec) { this.heartbeatIntervalSec = heartbeatIntervalSec; }
    public void setLastHeartbeatAt(LocalDateTime lastHeartbeatAt) { this.lastHeartbeatAt = lastHeartbeatAt; }
    public void setNextHeartbeatAt(LocalDateTime nextHeartbeatAt) { this.nextHeartbeatAt = nextHeartbeatAt; }
    public void setPendingInteraction(String pendingInteraction) { this.pendingInteraction = pendingInteraction; }
    public void setCycleCount(Integer cycleCount) { this.cycleCount = cycleCount; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", id);
        m.put("workflowId", workflowId);
        m.put("workflowName", workflowName);
        m.put("enterpriseId", enterpriseId);
        m.put("status", status);
        m.put("currentNodeId", currentNodeId);
        m.put("contextJson", contextJson);
        m.put("completedNodesJson", completedNodesJson);
        m.put("heartbeatIntervalSec", heartbeatIntervalSec);
        m.put("lastHeartbeatAt", lastHeartbeatAt != null ? lastHeartbeatAt.toString() : null);
        m.put("nextHeartbeatAt", nextHeartbeatAt != null ? nextHeartbeatAt.toString() : null);
        m.put("pendingInteraction", pendingInteraction);
        m.put("cycleCount", cycleCount);
        m.put("startedAt", startedAt != null ? startedAt.toString() : null);
        m.put("completedAt", completedAt != null ? completedAt.toString() : null);
        m.put("updatedAt", updatedAt != null ? updatedAt.toString() : null);
        m.put("errorMessage", errorMessage);
        return m;
    }
}
