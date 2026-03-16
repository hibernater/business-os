package com.businessos.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "skill_execution")
public class SkillExecution {

    @Id
    private String id;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    @Column(name = "skill_id")
    private String skillId;

    @Column(name = "skill_name")
    private String skillName;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "trigger_type")
    private String triggerType;

    private String status;

    @Column(name = "current_step")
    private Integer currentStep;

    @Column(name = "total_steps")
    private Integer totalSteps;

    @Column(name = "input_data", columnDefinition = "TEXT")
    private String inputData;

    @Column(name = "output_data", columnDefinition = "TEXT")
    private String outputData;

    @Column(name = "step_results", columnDefinition = "TEXT")
    private String stepResults;

    @Column(name = "state_updates", columnDefinition = "TEXT")
    private String stateUpdates;

    @Column(name = "decision_record", columnDefinition = "TEXT")
    private String decisionRecord;

    @Column(name = "schedule_id")
    private String scheduleId;

    @Column(name = "workflow_execution_id")
    private String workflowExecutionId;

    @Column(name = "workflow_node_id")
    private String workflowNodeId;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "output_summary", length = 512)
    private String outputSummary;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "duration_ms")
    private Integer durationMs;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public SkillExecution() {}

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (status == null) status = "pending";
        if (triggerType == null) triggerType = "manual";
        if (currentStep == null) currentStep = 0;
        if (totalSteps == null) totalSteps = 0;
        if (startedAt == null) startedAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }

    // Getters
    public String getId() { return id; }
    public String getEnterpriseId() { return enterpriseId; }
    public String getSkillId() { return skillId; }
    public String getSkillName() { return skillName; }
    public String getConversationId() { return conversationId; }
    public String getUserId() { return userId; }
    public String getTriggerType() { return triggerType; }
    public String getStatus() { return status; }
    public Integer getCurrentStep() { return currentStep; }
    public Integer getTotalSteps() { return totalSteps; }
    public String getInputData() { return inputData; }
    public String getOutputData() { return outputData; }
    public String getStepResults() { return stepResults; }
    public String getStateUpdates() { return stateUpdates; }
    public String getDecisionRecord() { return decisionRecord; }
    public String getScheduleId() { return scheduleId; }
    public String getWorkflowExecutionId() { return workflowExecutionId; }
    public String getWorkflowNodeId() { return workflowNodeId; }
    public String getErrorMessage() { return errorMessage; }
    public String getOutputSummary() { return outputSummary; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public Integer getDurationMs() { return durationMs; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    // Setters
    public void setId(String id) { this.id = id; }
    public void setEnterpriseId(String enterpriseId) { this.enterpriseId = enterpriseId; }
    public void setSkillId(String skillId) { this.skillId = skillId; }
    public void setSkillName(String skillName) { this.skillName = skillName; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public void setUserId(String userId) { this.userId = userId; }
    public void setTriggerType(String triggerType) { this.triggerType = triggerType; }
    public void setStatus(String status) { this.status = status; }
    public void setCurrentStep(Integer currentStep) { this.currentStep = currentStep; }
    public void setTotalSteps(Integer totalSteps) { this.totalSteps = totalSteps; }
    public void setInputData(String inputData) { this.inputData = inputData; }
    public void setOutputData(String outputData) { this.outputData = outputData; }
    public void setStepResults(String stepResults) { this.stepResults = stepResults; }
    public void setStateUpdates(String stateUpdates) { this.stateUpdates = stateUpdates; }
    public void setDecisionRecord(String decisionRecord) { this.decisionRecord = decisionRecord; }
    public void setScheduleId(String scheduleId) { this.scheduleId = scheduleId; }
    public void setWorkflowExecutionId(String workflowExecutionId) { this.workflowExecutionId = workflowExecutionId; }
    public void setWorkflowNodeId(String workflowNodeId) { this.workflowNodeId = workflowNodeId; }
    public void setErrorMessage(String errorMessage) { this.errorMessage = errorMessage; }
    public void setOutputSummary(String outputSummary) { this.outputSummary = outputSummary; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public void setDurationMs(Integer durationMs) { this.durationMs = durationMs; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Map<String, Object> toMap() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", id);
        map.put("enterpriseId", enterpriseId);
        map.put("skillId", skillId);
        map.put("skillName", skillName);
        map.put("triggerType", triggerType);
        map.put("status", status);
        map.put("currentStep", currentStep);
        map.put("totalSteps", totalSteps);
        map.put("errorMessage", errorMessage);
        map.put("outputSummary", outputSummary);
        map.put("startedAt", startedAt != null ? startedAt.toString() : null);
        map.put("completedAt", completedAt != null ? completedAt.toString() : null);
        map.put("durationMs", durationMs);
        map.put("updatedAt", updatedAt != null ? updatedAt.toString() : null);
        map.put("workflowExecutionId", workflowExecutionId);
        map.put("workflowNodeId", workflowNodeId);
        return map;
    }
}
