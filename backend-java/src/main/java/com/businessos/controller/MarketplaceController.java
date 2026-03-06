package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.SkillMarketplace;
import com.businessos.repository.SkillMarketplaceRepository;
import com.businessos.service.AuditService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/marketplace")
public class MarketplaceController {

    private final SkillMarketplaceRepository repo;
    private final AuditService auditService;

    public MarketplaceController(SkillMarketplaceRepository repo, AuditService auditService) {
        this.repo = repo;
        this.auditService = auditService;
    }

    @GetMapping
    public Map<String, Object> listSkills(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String keyword) {
        List<SkillMarketplace> skills;
        if (keyword != null && !keyword.isBlank()) {
            skills = repo.search(keyword);
        } else if (category != null && !category.isBlank()) {
            skills = repo.findByCategoryAndStatusOrderByInstallCountDesc(category, "published");
        } else {
            skills = repo.findByStatusOrderByInstallCountDesc("published");
        }
        List<Map<String, Object>> result = skills.stream().map(this::toMap).toList();
        return Map.of("skills", result, "total", result.size());
    }

    @GetMapping("/{id}")
    public Map<String, Object> getSkill(@PathVariable String id) {
        return repo.findById(id).map(s -> {
            Map<String, Object> map = toMap(s);
            map.put("yamlContent", s.getYamlContent());
            return map;
        }).orElse(Map.of("error", "not found"));
    }

    @PostMapping("/publish")
    public Map<String, Object> publish(@RequestBody Map<String, String> body) {
        String enterpriseId = TenantContext.get();
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        SkillMarketplace skill = new SkillMarketplace();
        skill.setSkillId(body.getOrDefault("skillId", ""));
        skill.setName(body.getOrDefault("name", ""));
        skill.setDescription(body.getOrDefault("description", ""));
        skill.setAuthorEnterpriseId(enterpriseId);
        skill.setAuthorName(body.getOrDefault("authorName", ""));
        skill.setCategory(body.getOrDefault("category", "通用"));
        skill.setYamlContent(body.getOrDefault("yamlContent", ""));
        skill.setVersion(1);
        repo.save(skill);

        auditService.log(enterpriseId, userId, null,
                "publish_skill", "marketplace", skill.getId(), "发布Skill: " + skill.getName());

        return Map.of("status", "ok", "id", skill.getId());
    }

    @PostMapping("/{id}/install")
    public Map<String, Object> install(@PathVariable String id) {
        String enterpriseId = TenantContext.get();
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        return repo.findById(id).map(skill -> {
            skill.setInstallCount(skill.getInstallCount() + 1);
            repo.save(skill);

            auditService.log(enterpriseId, userId, null,
                    "install_skill", "marketplace", id, "安装Skill: " + skill.getName());

            Map<String, Object> result = new HashMap<>();
            result.put("status", "ok");
            result.put("skillId", skill.getSkillId());
            result.put("name", skill.getName());
            result.put("yamlContent", skill.getYamlContent());
            return result;
        }).orElse(Map.of("status", "error", "message", "Skill not found"));
    }

    @GetMapping("/my")
    public Map<String, Object> myPublished() {
        String enterpriseId = TenantContext.get();
        List<SkillMarketplace> skills = repo.findByAuthorEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        return Map.of("skills", skills.stream().map(this::toMap).toList());
    }

    private Map<String, Object> toMap(SkillMarketplace s) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", s.getId());
        m.put("skillId", s.getSkillId());
        m.put("name", s.getName());
        m.put("description", s.getDescription() != null ? s.getDescription() : "");
        m.put("authorName", s.getAuthorName() != null ? s.getAuthorName() : "");
        m.put("category", s.getCategory() != null ? s.getCategory() : "");
        m.put("version", s.getVersion());
        m.put("installCount", s.getInstallCount());
        m.put("rating", s.getRating());
        m.put("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : "");
        return m;
    }
}
