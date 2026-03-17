package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.Workflow;
import com.businessos.model.entity.WorkflowExecution;
import com.businessos.model.entity.SkillExecution;
import com.businessos.repository.WorkflowRepository;
import com.businessos.repository.WorkflowExecutionRepository;
import com.businessos.repository.SkillExecutionRepository;
import com.businessos.service.AiEngineClient;
import com.businessos.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/workflows")
public class WorkflowController {

    private final WorkflowRepository workflowRepo;
    private final WorkflowExecutionRepository execRepo;
    private final SkillExecutionRepository skillExecRepo;
    private final AiEngineClient aiClient;
    private final NotificationService notificationService;

    public WorkflowController(
            WorkflowRepository workflowRepo,
            WorkflowExecutionRepository execRepo,
            SkillExecutionRepository skillExecRepo,
            AiEngineClient aiClient,
            NotificationService notificationService) {
        this.workflowRepo = workflowRepo;
        this.execRepo = execRepo;
        this.skillExecRepo = skillExecRepo;
        this.aiClient = aiClient;
        this.notificationService = notificationService;
    }

    @GetMapping
    public Map<String, Object> listWorkflows(@RequestParam(required = false) String status) {
        String eid = TenantContext.get();
        List<Workflow> list;
        if (status != null && !status.isEmpty()) {
            list = workflowRepo.findByEnterpriseIdAndStatusOrderByUpdatedAtDesc(eid, status);
        } else {
            list = workflowRepo.findByEnterpriseIdOrderByUpdatedAtDesc(eid);
        }
        long total = workflowRepo.countByEnterpriseId(eid);
        long active = workflowRepo.countByEnterpriseIdAndStatus(eid, "active");

        Map<String, Object> result = new HashMap<>();
        result.put("workflows", list.stream().map(Workflow::toMap).toList());
        result.put("total", total);
        result.put("active", active);
        return result;
    }

    @GetMapping("/{id}")
    public Map<String, Object> getWorkflow(@PathVariable String id) {
        return workflowRepo.findById(id)
                .map(Workflow::toMap)
                .orElse(Map.of("error", "not_found"));
    }

    @PostMapping
    public Map<String, Object> createWorkflow(@RequestBody Map<String, Object> body) {
        String eid = TenantContext.get();

        Workflow wf = new Workflow();
        wf.setEnterpriseId(eid);
        wf.setName((String) body.getOrDefault("name", "未命名工作流"));
        wf.setDescription((String) body.getOrDefault("description", ""));
        wf.setStatus((String) body.getOrDefault("status", "draft"));
        wf.setTriggerType((String) body.getOrDefault("triggerType", "manual"));
        wf.setCronExpr((String) body.get("cronExpr"));
        wf.setNodesJson((String) body.getOrDefault("nodesJson", "[]"));
        wf.setEdgesJson((String) body.getOrDefault("edgesJson", "[]"));

        workflowRepo.save(wf);

        notificationService.send(eid, "workflow_created",
                "工作流已创建",
                "「" + wf.getName() + "」已创建",
                Map.of("workflowId", wf.getId()));

        Map<String, Object> result = new HashMap<>();
        result.put("status", "ok");
        result.put("workflow", wf.toMap());
        return result;
    }

    @PutMapping("/{id}")
    public Map<String, Object> updateWorkflow(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return workflowRepo.findById(id).map(wf -> {
            if (body.containsKey("name")) wf.setName((String) body.get("name"));
            if (body.containsKey("description")) wf.setDescription((String) body.get("description"));
            if (body.containsKey("status")) wf.setStatus((String) body.get("status"));
            if (body.containsKey("triggerType")) wf.setTriggerType((String) body.get("triggerType"));
            if (body.containsKey("cronExpr")) wf.setCronExpr((String) body.get("cronExpr"));
            if (body.containsKey("nodesJson")) wf.setNodesJson((String) body.get("nodesJson"));
            if (body.containsKey("edgesJson")) wf.setEdgesJson((String) body.get("edgesJson"));
            workflowRepo.save(wf);
            return Map.<String, Object>of("status", "ok", "workflow", wf.toMap());
        }).orElse(Map.of("status", "error", "message", "workflow not found"));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteWorkflow(@PathVariable String id) {
        return workflowRepo.findById(id).map(wf -> {
            workflowRepo.delete(wf);
            return Map.of("status", "ok");
        }).orElse(Map.of("status", "error", "message", "workflow not found"));
    }

    @PostMapping("/{id}/activate")
    public Map<String, Object> activateWorkflow(@PathVariable String id) {
        return workflowRepo.findById(id).map(wf -> {
            wf.setStatus("active");
            workflowRepo.save(wf);
            return Map.<String, Object>of("status", "ok", "workflow", wf.toMap());
        }).orElse(Map.of("status", "error", "message", "workflow not found"));
    }

    @PostMapping("/generate")
    public Map<String, Object> generateWorkflow(@RequestBody Map<String, String> body) {
        String description = body.getOrDefault("description", "");
        try {
            return aiClient.decomposeWorkflow(description);
        } catch (Exception e) {
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    // ===================== Workflow Execution =====================

    @PostMapping("/{id}/start")
    public Map<String, Object> startExecution(@PathVariable String id) {
        String eid = TenantContext.get();
        return workflowRepo.findById(id).map(wf -> {
            WorkflowExecution exec = new WorkflowExecution();
            exec.setWorkflowId(wf.getId());
            exec.setWorkflowName(wf.getName());
            exec.setEnterpriseId(eid);
            exec.setStatus("running");
            exec.setLastHeartbeatAt(LocalDateTime.now());
            exec.setNextHeartbeatAt(LocalDateTime.now().plusSeconds(exec.getHeartbeatIntervalSec() != null ? exec.getHeartbeatIntervalSec() : 60));
            execRepo.save(exec);

            wf.setStatus("active");
            wf.setRunCount(wf.getRunCount() != null ? wf.getRunCount() + 1 : 1);
            wf.setLastRunAt(LocalDateTime.now());
            workflowRepo.save(wf);

            notificationService.send(eid, "workflow_started",
                    "工作流已启动",
                    "「" + wf.getName() + "」开始执行",
                    Map.of("workflowId", wf.getId(), "executionId", exec.getId()));

            Map<String, Object> result = new HashMap<>();
            result.put("status", "ok");
            result.put("execution", exec.toMap());
            return result;
        }).orElse(Map.of("status", "error", "message", "workflow not found"));
    }

    @GetMapping("/executions")
    public Map<String, Object> listExecutions(@RequestParam(required = false) String wfStatus) {
        String eid = TenantContext.get();
        List<WorkflowExecution> list;
        if (wfStatus != null && !wfStatus.isEmpty()) {
            list = execRepo.findByEnterpriseIdAndStatusOrderByUpdatedAtDesc(eid, wfStatus);
        } else {
            list = execRepo.findByEnterpriseIdOrderByUpdatedAtDesc(eid);
        }
        long running = execRepo.countByEnterpriseIdAndStatus(eid, "running");
        long waiting = execRepo.countByEnterpriseIdAndStatus(eid, "waiting_input");

        Map<String, Object> result = new HashMap<>();
        result.put("executions", list.stream().map(WorkflowExecution::toMap).toList());
        result.put("running", running);
        result.put("waitingInput", waiting);
        return result;
    }

    @GetMapping("/executions/{execId}")
    public Map<String, Object> getExecution(@PathVariable String execId) {
        return execRepo.findById(execId).map(exec -> {
            Map<String, Object> result = new HashMap<>(exec.toMap());
            List<SkillExecution> tasks = skillExecRepo.findByEnterpriseIdOrderByStartedAtDesc(exec.getEnterpriseId())
                    .stream()
                    .filter(t -> execId.equals(t.getWorkflowExecutionId()))
                    .toList();
            result.put("tasks", tasks.stream().map(SkillExecution::toMap).toList());
            return result;
        }).orElse(Map.of("error", "not_found"));
    }

    private static final ObjectMapper JSON_MAPPER = new ObjectMapper();

    @PostMapping("/executions/{execId}/interact")
    public Map<String, Object> interact(
            @PathVariable String execId,
            @RequestBody Map<String, String> body) {
        String userResponse = body.getOrDefault("response", "");
        return execRepo.findById(execId).map(exec -> {
            if (!"waiting_input".equals(exec.getStatus())) {
                return Map.<String, Object>of("status", "error", "message", "工作流当前不在等待输入状态");
            }

            try {
                Map<String, Object> context = JSON_MAPPER.readValue(
                    exec.getContextJson() != null ? exec.getContextJson() : "{}",
                    new TypeReference<>() {});

                Map<String, Object> pending = exec.getPendingInteraction() != null
                    ? JSON_MAPPER.readValue(exec.getPendingInteraction(), new TypeReference<>() {})
                    : Map.of();

                String nodeType = (String) pending.getOrDefault("node_type", "condition");
                String nodeId = (String) pending.getOrDefault("node_id", exec.getCurrentNodeId());

                Map<String, Object> nodeCtx = context.containsKey(nodeId)
                    ? new HashMap<>((Map<String, Object>) context.get(nodeId))
                    : new HashMap<>();

                nodeCtx.put("userResponse", userResponse);
                nodeCtx.put("respondedAt", LocalDateTime.now().toString());

                switch (nodeType) {
                    case "approval":
                        boolean approved = "approved".equalsIgnoreCase(userResponse)
                            || userResponse.contains("通过") || userResponse.contains("批准");
                        nodeCtx.put("type", "approval");
                        nodeCtx.put("decision", approved ? "approved" : "rejected");
                        nodeCtx.put("comment", userResponse);
                        break;
                    case "human_task":
                        nodeCtx.put("type", "human_task");
                        nodeCtx.put("status", "done");
                        nodeCtx.put("result", userResponse);
                        break;
                    case "condition":
                    default:
                        nodeCtx.put("type", nodeType);
                        nodeCtx.put("selectedOption", userResponse);
                        break;
                }
                nodeCtx.put("completedAt", LocalDateTime.now().toString());
                context.put(nodeId, nodeCtx);

                // Mark current node as completed
                List<String> completedNodes = JSON_MAPPER.readValue(
                    exec.getCompletedNodesJson() != null ? exec.getCompletedNodesJson() : "[]",
                    new TypeReference<>() {});
                if (!completedNodes.contains(nodeId)) {
                    completedNodes.add(nodeId);
                }

                // Find next node from edges
                List<Map<String, Object>> edges = JSON_MAPPER.readValue(
                    workflowRepo.findById(exec.getWorkflowId())
                        .map(wf -> wf.getEdgesJson() != null ? wf.getEdgesJson() : "[]")
                        .orElse("[]"),
                    new TypeReference<>() {});

                String nextNodeId = null;
                for (Map<String, Object> edge : edges) {
                    if (nodeId.equals(edge.get("from")) && !completedNodes.contains(edge.get("to"))) {
                        nextNodeId = (String) edge.get("to");
                        break;
                    }
                }

                exec.setCompletedNodesJson(JSON_MAPPER.writeValueAsString(completedNodes));
                exec.setContextJson(JSON_MAPPER.writeValueAsString(context));

                if (nextNodeId != null) {
                    exec.setCurrentNodeId(nextNodeId);
                    exec.setStatus("running");
                } else {
                    exec.setStatus("completed");
                }
                exec.setPendingInteraction(null);
                exec.setLastHeartbeatAt(LocalDateTime.now());
                exec.setNextHeartbeatAt(LocalDateTime.now().plusSeconds(5));
                execRepo.save(exec);

            } catch (Exception e) {
                exec.setStatus("running");
                exec.setPendingInteraction(null);
                exec.setLastHeartbeatAt(LocalDateTime.now());
                exec.setNextHeartbeatAt(LocalDateTime.now().plusSeconds(5));
                execRepo.save(exec);
            }

            return Map.<String, Object>of("status", "ok", "execution", exec.toMap());
        }).orElse(Map.of("status", "error", "message", "execution not found"));
    }

    @PostMapping("/executions/{execId}/pause")
    public Map<String, Object> pauseExecution(@PathVariable String execId) {
        return execRepo.findById(execId).map(exec -> {
            exec.setStatus("paused");
            execRepo.save(exec);
            return Map.<String, Object>of("status", "ok", "execution", exec.toMap());
        }).orElse(Map.of("status", "error", "message", "execution not found"));
    }

    @PostMapping("/executions/{execId}/resume")
    public Map<String, Object> resumeExecution(@PathVariable String execId) {
        return execRepo.findById(execId).map(exec -> {
            exec.setStatus("running");
            exec.setNextHeartbeatAt(LocalDateTime.now().plusSeconds(5));
            execRepo.save(exec);
            return Map.<String, Object>of("status", "ok", "execution", exec.toMap());
        }).orElse(Map.of("status", "error", "message", "execution not found"));
    }
}
