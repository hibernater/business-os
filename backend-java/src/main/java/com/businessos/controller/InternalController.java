package com.businessos.controller;

import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.repository.EnterpriseAssetRepository;
import com.businessos.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 内部 API：供 Python AI Engine 调用，不需要 JWT 认证。
 */
@RestController
@RequestMapping("/api/internal")
public class InternalController {

    private final EnterpriseAssetRepository assetRepo;
    private final NotificationService notificationService;

    public InternalController(EnterpriseAssetRepository assetRepo, NotificationService notificationService) {
        this.assetRepo = assetRepo;
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
