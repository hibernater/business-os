package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.service.AiEngineClient;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/schedules")
public class ScheduleController {

    private final AiEngineClient aiEngineClient;

    public ScheduleController(AiEngineClient aiEngineClient) {
        this.aiEngineClient = aiEngineClient;
    }

    @GetMapping
    public Map<String, Object> listSchedules() {
        String enterpriseId = TenantContext.get();
        return aiEngineClient.getSchedules(enterpriseId);
    }

    @PostMapping
    public Map<String, Object> createSchedule(@RequestBody Map<String, Object> body) {
        String enterpriseId = TenantContext.get();
        body.put("enterprise_id", enterpriseId);
        return aiEngineClient.createSchedule(body);
    }

    @DeleteMapping("/{scheduleId}")
    public Map<String, Object> deleteSchedule(@PathVariable String scheduleId) {
        return aiEngineClient.deleteSchedule(scheduleId);
    }

    @PutMapping("/{scheduleId}/toggle")
    public Map<String, Object> toggleSchedule(@PathVariable String scheduleId, @RequestParam boolean enabled) {
        return aiEngineClient.toggleSchedule(scheduleId, enabled);
    }
}
