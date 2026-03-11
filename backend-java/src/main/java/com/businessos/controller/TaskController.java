package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.SkillExecution;
import com.businessos.repository.SkillExecutionRepository;
import com.businessos.service.NotificationService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final SkillExecutionRepository execRepo;
    private final NotificationService notificationService;

    public TaskController(SkillExecutionRepository execRepo, NotificationService notificationService) {
        this.execRepo = execRepo;
        this.notificationService = notificationService;
    }

    @GetMapping
    public Map<String, Object> listTasks(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String triggerType) {

        String enterpriseId = TenantContext.get();
        List<SkillExecution> tasks;

        if (status != null && !status.isEmpty() && triggerType != null && !triggerType.isEmpty()) {
            tasks = execRepo.findByEnterpriseIdAndStatusAndTriggerTypeOrderByStartedAtDesc(enterpriseId, status, triggerType);
        } else if (status != null && !status.isEmpty()) {
            tasks = execRepo.findByEnterpriseIdAndStatusOrderByStartedAtDesc(enterpriseId, status);
        } else if (triggerType != null && !triggerType.isEmpty()) {
            tasks = execRepo.findByEnterpriseIdAndTriggerTypeOrderByStartedAtDesc(enterpriseId, triggerType);
        } else {
            tasks = execRepo.findByEnterpriseIdOrderByStartedAtDesc(enterpriseId);
        }

        long running = execRepo.countByEnterpriseIdAndStatus(enterpriseId, "running");
        long failed = execRepo.countByEnterpriseIdAndStatus(enterpriseId, "failed");
        long pending = execRepo.countByEnterpriseIdAndStatus(enterpriseId, "pending");

        long todayCompleted = tasks.stream()
                .filter(t -> "completed".equals(t.getStatus()))
                .filter(t -> t.getCompletedAt() != null && t.getCompletedAt().toLocalDate().equals(LocalDate.now()))
                .count();

        List<Map<String, Object>> taskList = tasks.stream().map(SkillExecution::toMap).toList();

        Map<String, Object> result = new HashMap<>();
        result.put("tasks", taskList);
        result.put("total", taskList.size());
        result.put("running", running);
        result.put("failed", failed);
        result.put("pending", pending);
        result.put("todayCompleted", todayCompleted);
        return result;
    }

    @GetMapping("/{id}")
    public Map<String, Object> getTask(@PathVariable String id) {
        return execRepo.findById(id)
                .map(task -> {
                    Map<String, Object> detail = task.toMap();
                    detail.put("outputData", task.getOutputData());
                    detail.put("stepResults", task.getStepResults());
                    detail.put("inputData", task.getInputData());
                    return detail;
                })
                .orElse(Map.of("error", "not_found"));
    }

    @PostMapping
    public Map<String, Object> createTask(@RequestBody Map<String, String> body) {
        String enterpriseId = TenantContext.get();

        SkillExecution task = new SkillExecution();
        task.setEnterpriseId(enterpriseId);
        task.setSkillId(body.getOrDefault("skillId", ""));
        task.setSkillName(body.getOrDefault("skillName", ""));
        task.setTriggerType(body.getOrDefault("triggerType", "manual"));
        task.setStatus("pending");
        task.setTotalSteps(Integer.parseInt(body.getOrDefault("totalSteps", "0")));
        task.setUserId(body.get("userId"));
        task.setScheduleId(body.get("scheduleId"));

        execRepo.save(task);

        notificationService.send(enterpriseId, "task_created",
                "任务已创建",
                task.getSkillName() + " 已加入执行队列",
                Map.of("taskId", task.getId(), "skillId", task.getSkillId()));

        Map<String, Object> result = new HashMap<>();
        result.put("status", "ok");
        result.put("task", task.toMap());
        return result;
    }

    @PutMapping("/{id}/cancel")
    public Map<String, String> cancelTask(@PathVariable String id) {
        return execRepo.findById(id).map(task -> {
            if ("running".equals(task.getStatus()) || "pending".equals(task.getStatus())) {
                task.setStatus("cancelled");
                task.setCompletedAt(LocalDateTime.now());
                execRepo.save(task);

                notificationService.send(task.getEnterpriseId(), "task_updated",
                        "任务已取消", task.getSkillName() + " 已取消",
                        Map.of("taskId", id, "status", "cancelled"));

                return Map.of("status", "ok");
            }
            return Map.of("status", "error", "message", "只能取消待执行或执行中的任务");
        }).orElse(Map.of("status", "error", "message", "task not found"));
    }

    @DeleteMapping("/{id}")
    public Map<String, String> deleteTask(@PathVariable String id) {
        return execRepo.findById(id).map(task -> {
            if ("running".equals(task.getStatus()) || "pending".equals(task.getStatus())) {
                return Map.of("status", "error", "message", "不能删除正在执行的任务");
            }
            execRepo.delete(task);
            return Map.of("status", "ok");
        }).orElse(Map.of("status", "error", "message", "task not found"));
    }
}
