package com.businessos.controller;

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
}
