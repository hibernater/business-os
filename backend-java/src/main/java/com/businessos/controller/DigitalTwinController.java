package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.model.entity.EnterpriseState;
import com.businessos.repository.EnterpriseAssetRepository;
import com.businessos.repository.EnterpriseStateRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/digital-twin")
public class DigitalTwinController {

    private final EnterpriseStateRepository stateRepo;
    private final EnterpriseAssetRepository assetRepo;
    private final ObjectMapper objectMapper;

    public DigitalTwinController(
            EnterpriseStateRepository stateRepo,
            EnterpriseAssetRepository assetRepo) {
        this.stateRepo = stateRepo;
        this.assetRepo = assetRepo;
        this.objectMapper = new ObjectMapper();
    }

    @GetMapping
    public Map<String, Object> getDigitalTwin() {
        String eid = TenantContext.get();

        EnterpriseState state = stateRepo.findByEnterpriseId(eid).orElseGet(() -> {
            EnterpriseState s = new EnterpriseState();
            s.setEnterpriseId(eid);
            return stateRepo.save(s);
        });

        List<EnterpriseAsset> allAssets = assetRepo.findByEnterpriseIdOrderByUpdatedAtDesc(eid);

        // 各维度数据
        Map<String, Object> product = buildDimension("product", state.getProductState(), allAssets, "product");
        Map<String, Object> customer = buildDimension("customer", state.getCustomerState(), allAssets, "customer");
        Map<String, Object> operation = buildDimension("operation", state.getOperationState(), allAssets, "execution_record");
        Map<String, Object> team = buildDimension("team", state.getTeamState(), allAssets, "document");
        Map<String, Object> financial = buildDimension("financial", state.getFinancialState(), allAssets, "supplier");

        // 健康度评分
        int health = calculateHealth(allAssets);

        // 活跃度指标
        List<EnterpriseAsset> recentExecs = allAssets.stream()
                .filter(a -> "execution_record".equals(a.getAssetType()))
                .limit(30)
                .toList();
        long last7d = recentExecs.stream()
                .filter(a -> a.getUpdatedAt() != null && a.getUpdatedAt().isAfter(LocalDateTime.now().minusDays(7)))
                .count();

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("health", health);
        result.put("totalAssets", allAssets.size());
        result.put("totalExecutions", recentExecs.size());
        result.put("recentActivityCount", last7d);
        result.put("dimensions", Map.of(
                "product", product,
                "customer", customer,
                "operation", operation,
                "team", team,
                "financial", financial
        ));
        result.put("updatedAt", state.getUpdatedAt() != null ? state.getUpdatedAt().toString() : "");
        return result;
    }

    @PutMapping
    public Map<String, Object> updateState(@RequestBody Map<String, String> body) {
        String eid = TenantContext.get();
        EnterpriseState state = stateRepo.findByEnterpriseId(eid).orElseGet(() -> {
            EnterpriseState s = new EnterpriseState();
            s.setEnterpriseId(eid);
            return s;
        });
        if (body.containsKey("productState")) state.setProductState(body.get("productState"));
        if (body.containsKey("customerState")) state.setCustomerState(body.get("customerState"));
        if (body.containsKey("operationState")) state.setOperationState(body.get("operationState"));
        if (body.containsKey("teamState")) state.setTeamState(body.get("teamState"));
        if (body.containsKey("financialState")) state.setFinancialState(body.get("financialState"));
        state.setUpdatedAt(LocalDateTime.now());
        stateRepo.save(state);
        return Map.of("status", "ok");
    }

    private Map<String, Object> buildDimension(String dimensionName, String stateJson, List<EnterpriseAsset> allAssets, String filterType) {
        Map<String, Object> dim = new HashMap<>();
        dim.put("name", dimensionName);

        Map<String, Object> stateData = parseJson(stateJson);
        dim.put("state", stateData);

        long relatedCount = allAssets.stream().filter(a -> filterType.equals(a.getAssetType())).count();
        dim.put("relatedAssets", relatedCount);

        int completeness = stateData.isEmpty() ? 10 : Math.min(100, 30 + stateData.size() * 15 + (int) relatedCount * 5);
        dim.put("completeness", completeness);

        return dim;
    }

    private int calculateHealth(List<EnterpriseAsset> allAssets) {
        int base = 20;
        long assets = allAssets.stream().filter(a -> !"execution_record".equals(a.getAssetType()) && !"preference".equals(a.getAssetType())).count();
        long execs = allAssets.stream().filter(a -> "execution_record".equals(a.getAssetType())).count();
        long prefs = allAssets.stream().filter(a -> "preference".equals(a.getAssetType())).count();
        return Math.min(100, base + (int) assets * 5 + (int) execs * 3 + (int) prefs * 8);
    }

    private Map<String, Object> parseJson(String json) {
        if (json == null || json.isBlank() || "{}".equals(json.trim())) return Map.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            return Map.of();
        }
    }
}
