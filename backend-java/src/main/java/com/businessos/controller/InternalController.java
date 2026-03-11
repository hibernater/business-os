package com.businessos.controller;

import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.model.entity.EnterpriseState;
import com.businessos.model.entity.SkillExecution;
import com.businessos.repository.EnterpriseAssetRepository;
import com.businessos.repository.EnterpriseStateRepository;
import com.businessos.repository.SkillExecutionRepository;
import com.businessos.service.NotificationService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 内部 API：供 Python AI Engine 调用，不需要 JWT 认证。
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private static final Logger log = LoggerFactory.getLogger(InternalController.class);
    private final EnterpriseAssetRepository assetRepo;
    private final EnterpriseStateRepository stateRepo;
    private final SkillExecutionRepository execRepo;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public InternalController(
            EnterpriseAssetRepository assetRepo,
            EnterpriseStateRepository stateRepo,
            SkillExecutionRepository execRepo,
            NotificationService notificationService) {
        this.assetRepo = assetRepo;
        this.stateRepo = stateRepo;
        this.execRepo = execRepo;
        this.notificationService = notificationService;
    }

    @GetMapping("/assets")
    public Map<String, Object> getAssets(@RequestParam String enterpriseId) {
        List<EnterpriseAsset> assets = assetRepo.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        List<Map<String, Object>> result = assets.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("assetType", a.getAssetType());
            map.put("name", a.getName());
            map.put("content", a.getContent() != null ? a.getContent() : "");
            map.put("source", a.getSource() != null ? a.getSource() : "");
            return map;
        }).toList();
        return Map.of("assets", result);
    }

    @GetMapping("/memory")
    public Map<String, Object> getMemory(
            @RequestParam String enterpriseId,
            @RequestParam(required = false, defaultValue = "") String skillId) {
        // 获取保存的偏好（asset_type = preference，name 含 skill_id）
        List<EnterpriseAsset> prefs = assetRepo.findByEnterpriseIdAndAssetTypeOrderByCreatedAtDesc(
                enterpriseId, "preference");
        Map<String, String> preferences = new HashMap<>();
        for (EnterpriseAsset pref : prefs) {
            if (skillId.isEmpty() || (pref.getSourceSkillId() != null && pref.getSourceSkillId().equals(skillId))) {
                if (pref.getContent() != null && pref.getContent().startsWith("{")) {
                    try {
                        @SuppressWarnings("unchecked")
                        Map<String, String> parsed = new com.fasterxml.jackson.databind.ObjectMapper()
                                .readValue(pref.getContent(), Map.class);
                        preferences.putAll(parsed);
                    } catch (Exception ignored) {}
                }
            }
        }
        return Map.of("preferences", preferences, "recentExecutions", List.of());
    }

    @PostMapping("/scheduled-run")
    public Map<String, Object> scheduledRun(@RequestBody Map<String, String> body) {
        String skillId = body.getOrDefault("skillId", "");
        String enterpriseId = body.getOrDefault("enterpriseId", "");
        // 回调 Python 的 auto-run 接口
        try {
            org.springframework.web.reactive.function.client.WebClient client =
                    org.springframework.web.reactive.function.client.WebClient.create("http://localhost:8081");
            Map<String, String> reqBody = new HashMap<>();
            reqBody.put("skill_id", skillId);
            reqBody.put("enterprise_id", enterpriseId);
            String result = client.post()
                    .uri("/api/internal/auto-run")
                    .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                    .bodyValue(reqBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .block();
            return Map.of("status", "ok", "result", result != null ? result : "null");
        } catch (Exception e) {
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    /**
     * 数字孪生回写接口：Skill 执行完成后，Python 回调此接口更新企业状态维度。
     * 这是让"执行 → 积累 → 洞察"飞轮转起来的关键接口。
     */
    @PostMapping("/twin/update")
    public Map<String, String> updateTwin(@RequestBody Map<String, Object> body) {
        String enterpriseId = (String) body.getOrDefault("enterpriseId", "");
        String skillId = (String) body.getOrDefault("skillId", "");
        String skillName = (String) body.getOrDefault("skillName", "");

        if (enterpriseId.isEmpty()) return Map.of("status", "error", "message", "missing enterpriseId");

        @SuppressWarnings("unchecked")
        Map<String, Object> dimensions = (Map<String, Object>) body.getOrDefault("dimensions", Map.of());

        try {
            EnterpriseState state = stateRepo.findByEnterpriseId(enterpriseId).orElseGet(() -> {
                EnterpriseState s = new EnterpriseState();
                s.setEnterpriseId(enterpriseId);
                return s;
            });

            for (Map.Entry<String, Object> entry : dimensions.entrySet()) {
                String dimName = entry.getKey();
                @SuppressWarnings("unchecked")
                Map<String, Object> dimData = (Map<String, Object>) entry.getValue();

                String currentJson = getDimensionState(state, dimName);
                Map<String, Object> current = parseJson(currentJson);
                Map<String, Object> merged = new HashMap<>(current);

                for (Map.Entry<String, Object> kv : dimData.entrySet()) {
                    String key = kv.getKey();
                    Object val = kv.getValue();
                    if (val == null) continue;

                    if ("+1".equals(val.toString())) {
                        int prev = 0;
                        if (merged.containsKey(key)) {
                            try { prev = Integer.parseInt(merged.get(key).toString()); } catch (Exception ignored) {}
                        }
                        merged.put(key, prev + 1);
                    } else {
                        merged.put(key, val);
                    }
                }

                setDimensionState(state, dimName, objectMapper.writeValueAsString(merged));
            }

            state.setUpdatedAt(LocalDateTime.now());
            stateRepo.save(state);

            log.info("Digital twin updated for enterprise={} skill={} dims={}",
                    enterpriseId, skillId, dimensions.keySet());

            notificationService.send(enterpriseId, "twin_updated",
                    "数字孪生已更新",
                    skillName + " 执行结果已同步到企业数字画像",
                    Map.of("skillId", skillId, "dimensions", dimensions.keySet().toString()));

            return Map.of("status", "ok");
        } catch (Exception e) {
            log.error("Twin update failed: {}", e.getMessage());
            return Map.of("status", "error", "message", e.getMessage());
        }
    }

    private String getDimensionState(EnterpriseState state, String dimension) {
        return switch (dimension) {
            case "product" -> state.getProductState();
            case "customer" -> state.getCustomerState();
            case "operation" -> state.getOperationState();
            case "team" -> state.getTeamState();
            case "financial" -> state.getFinancialState();
            default -> "{}";
        };
    }

    private void setDimensionState(EnterpriseState state, String dimension, String json) {
        switch (dimension) {
            case "product" -> state.setProductState(json);
            case "customer" -> state.setCustomerState(json);
            case "operation" -> state.setOperationState(json);
            case "team" -> state.setTeamState(json);
            case "financial" -> state.setFinancialState(json);
        }
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    @PostMapping("/tasks/create")
    public Map<String, Object> createTaskInternal(@RequestBody Map<String, String> body) {
        String enterpriseId = body.getOrDefault("enterpriseId", "");
        if (enterpriseId.isEmpty()) return Map.of("status", "error", "message", "missing enterpriseId");

        SkillExecution task = new SkillExecution();
        task.setEnterpriseId(enterpriseId);
        task.setSkillId(body.getOrDefault("skillId", ""));
        task.setSkillName(body.getOrDefault("skillName", ""));
        task.setTriggerType(body.getOrDefault("triggerType", "manual"));
        task.setStatus("pending");
        try {
            task.setTotalSteps(Integer.parseInt(body.getOrDefault("totalSteps", "0")));
        } catch (NumberFormatException e) {
            task.setTotalSteps(0);
        }
        task.setUserId(body.get("userId"));
        task.setScheduleId(body.get("scheduleId"));

        execRepo.save(task);
        log.info("Task created: id={} skill={} trigger={}", task.getId(), task.getSkillId(), task.getTriggerType());

        notificationService.send(enterpriseId, "task_created",
                "任务已创建", task.getSkillName() + " 已加入执行队列",
                Map.of("taskId", task.getId(), "skillId", task.getSkillId()));

        Map<String, Object> result = new HashMap<>();
        result.put("status", "ok");
        result.put("taskId", task.getId());
        return result;
    }

    @PostMapping("/tasks/{id}/progress")
    public Map<String, String> updateTaskProgress(@PathVariable String id, @RequestBody Map<String, Object> body) {
        return execRepo.findById(id).map(task -> {
            String newStatus = (String) body.get("status");
            if (newStatus != null) task.setStatus(newStatus);

            Object step = body.get("currentStep");
            if (step != null) task.setCurrentStep(Integer.parseInt(step.toString()));

            Object total = body.get("totalSteps");
            if (total != null) task.setTotalSteps(Integer.parseInt(total.toString()));

            String errorMsg = (String) body.get("errorMessage");
            if (errorMsg != null) task.setErrorMessage(errorMsg);

            String summary = (String) body.get("outputSummary");
            if (summary != null) {
                task.setOutputSummary(summary.length() > 500 ? summary.substring(0, 500) : summary);
            }

            String outputData = (String) body.get("outputData");
            if (outputData != null) task.setOutputData(outputData);

            if ("completed".equals(newStatus) || "failed".equals(newStatus)) {
                task.setCompletedAt(LocalDateTime.now());
                if (task.getStartedAt() != null) {
                    task.setDurationMs((int) ChronoUnit.MILLIS.between(task.getStartedAt(), task.getCompletedAt()));
                }
            }

            execRepo.save(task);

            if ("completed".equals(newStatus) || "failed".equals(newStatus)) {
                String title = "completed".equals(newStatus) ? "任务完成" : "任务失败";
                String content = task.getSkillName() + ("completed".equals(newStatus) ? " 执行完成" : " 执行失败");
                notificationService.send(task.getEnterpriseId(), "task_updated",
                        title, content,
                        Map.of("taskId", id, "status", newStatus));
            }

            return Map.of("status", "ok");
        }).orElse(Map.of("status", "error", "message", "task not found"));
    }

    @PostMapping("/memory/save")
    public Map<String, String> saveMemory(@RequestBody Map<String, Object> body) {
        String enterpriseId = (String) body.getOrDefault("enterpriseId", "");
        String skillId = (String) body.getOrDefault("skillId", "");
        String memoryType = (String) body.getOrDefault("memoryType", "preference");
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) body.getOrDefault("data", Map.of());

        if (enterpriseId.isEmpty()) return Map.of("status", "error", "message", "missing enterpriseId");

        try {
            String content = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(
                    data.getOrDefault("preferences", data));
            String name = "Skill偏好: " + data.getOrDefault("skill_name", skillId);

            EnterpriseAsset asset = EnterpriseAsset.builder()
                    .enterpriseId(enterpriseId)
                    .assetType(memoryType)
                    .name(name)
                    .content(content)
                    .source("skill_execution")
                    .sourceSkillId(skillId)
                    .build();
            assetRepo.save(asset);
        } catch (Exception e) {
            return Map.of("status", "error", "message", e.getMessage());
        }
        return Map.of("status", "ok");
    }
}
