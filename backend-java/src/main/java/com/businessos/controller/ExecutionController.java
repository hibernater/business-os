package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.repository.EnterpriseAssetRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/executions")
public class ExecutionController {

    private final EnterpriseAssetRepository assetRepo;

    public ExecutionController(EnterpriseAssetRepository assetRepo) {
        this.assetRepo = assetRepo;
    }

    @GetMapping
    public Map<String, Object> listExecutions() {
        String enterpriseId = TenantContext.get();
        List<EnterpriseAsset> records = assetRepo.findByEnterpriseIdAndAssetTypeOrderByCreatedAtDesc(
                enterpriseId, "execution_record");

        List<Map<String, Object>> result = records.stream().map(a -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", a.getId());
            map.put("name", a.getName());
            map.put("content", a.getContent() != null ? a.getContent() : "{}");
            map.put("skillId", a.getSourceSkillId() != null ? a.getSourceSkillId() : "");
            map.put("createdAt", a.getCreatedAt() != null ? a.getCreatedAt().toString() : "");
            return map;
        }).toList();

        return Map.of("executions", result, "total", result.size());
    }
}
