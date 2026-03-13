package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.service.AiEngineClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/skills")
public class SkillController {

    private final AiEngineClient aiEngineClient;

    public SkillController(AiEngineClient aiEngineClient) {
        this.aiEngineClient = aiEngineClient;
    }

    @GetMapping
    public Map<String, Object> listSkills() {
        return aiEngineClient.getSkills();
    }

    @GetMapping("/recommendations")
    public Map<String, Object> recommendations(@RequestParam(required = false) String enterprise_id) {
        String eid = enterprise_id != null ? enterprise_id : TenantContext.get();
        return aiEngineClient.getSkillRecommendations(eid != null ? eid : "");
    }

    @PostMapping("/analyze-document")
    public Map<String, Object> analyzeDocument(@RequestBody Map<String, Object> body) {
        return aiEngineClient.analyzeDocument(body);
    }

    @PostMapping("/generate-from-wizard")
    public Map<String, Object> generateFromWizard(@RequestBody Map<String, Object> body) {
        return aiEngineClient.generateFromWizard(body);
    }
}
