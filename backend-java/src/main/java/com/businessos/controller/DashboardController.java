package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.repository.ConversationRepository;
import com.businessos.repository.EnterpriseAssetRepository;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final EnterpriseAssetRepository assetRepo;
    private final ConversationRepository convRepo;

    public DashboardController(EnterpriseAssetRepository assetRepo, ConversationRepository convRepo) {
        this.assetRepo = assetRepo;
        this.convRepo = convRepo;
    }

    @GetMapping
    public Map<String, Object> getDashboard() {
        String enterpriseId = TenantContext.get();
        List<EnterpriseAsset> allAssets = assetRepo.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);

        // 资产统计（按类型）
        Map<String, Integer> assetCounts = new LinkedHashMap<>();
        for (EnterpriseAsset a : allAssets) {
            String type = a.getAssetType() != null ? a.getAssetType() : "other";
            assetCounts.merge(type, 1, Integer::sum);
        }

        // 执行记录统计
        List<EnterpriseAsset> executions = allAssets.stream()
                .filter(a -> "execution_record".equals(a.getAssetType()))
                .toList();
        int totalExecutions = executions.size();

        // 按 Skill 统计执行次数
        Map<String, Integer> skillExecCounts = new LinkedHashMap<>();
        for (EnterpriseAsset a : executions) {
            String skillId = a.getSourceSkillId() != null ? a.getSourceSkillId() : "unknown";
            skillExecCounts.merge(skillId, 1, Integer::sum);
        }

        // 最近执行
        List<Map<String, String>> recentExecutions = executions.stream()
                .limit(5)
                .map(a -> Map.of(
                        "id", a.getId(),
                        "name", a.getName() != null ? a.getName() : "",
                        "createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : ""
                ))
                .toList();

        // 偏好数量
        long preferenceCount = allAssets.stream()
                .filter(a -> "preference".equals(a.getAssetType()))
                .count();

        // 对话统计
        int conversationCount = convRepo.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId).size();

        Map<String, Object> result = new HashMap<>();
        result.put("assetCounts", assetCounts);
        result.put("totalAssets", allAssets.size() - totalExecutions);
        result.put("totalExecutions", totalExecutions);
        result.put("skillExecCounts", skillExecCounts);
        result.put("recentExecutions", recentExecutions);
        result.put("preferenceCount", preferenceCount);
        result.put("conversationCount", conversationCount);
        return result;
    }
}
