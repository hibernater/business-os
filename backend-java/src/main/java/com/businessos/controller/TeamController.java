package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.AuditLog;
import com.businessos.model.entity.User;
import com.businessos.repository.UserRepository;
import com.businessos.service.AuditService;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/team")
public class TeamController {

    private final UserRepository userRepo;
    private final AuditService auditService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public TeamController(UserRepository userRepo, AuditService auditService) {
        this.userRepo = userRepo;
        this.auditService = auditService;
    }

    @GetMapping("/members")
    public Map<String, Object> listMembers() {
        String enterpriseId = TenantContext.get();
        List<User> users = userRepo.findByEnterpriseId(enterpriseId);
        List<Map<String, String>> result = users.stream().map(u -> {
            Map<String, String> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("displayName", u.getDisplayName() != null ? u.getDisplayName() : u.getUsername());
            m.put("role", u.getRole());
            m.put("status", u.getStatus() != null ? u.getStatus() : "active");
            return m;
        }).toList();
        return Map.of("members", result);
    }

    @PostMapping("/invite")
    public Map<String, Object> inviteMember(@RequestBody Map<String, String> body) {
        String enterpriseId = TenantContext.get();
        String currentUserId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String username = body.getOrDefault("username", "");
        String displayName = body.getOrDefault("displayName", username);
        String role = body.getOrDefault("role", "member");
        String password = body.getOrDefault("password", "123456");

        if (username.isBlank()) return Map.of("status", "error", "message", "用户名不能为空");

        if (userRepo.findByUsername(username).isPresent()) {
            return Map.of("status", "error", "message", "用户名已存在");
        }

        User user = new User();
        user.setId(UUID.randomUUID().toString());
        user.setEnterpriseId(enterpriseId);
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName);
        user.setRole(role);
        user.setStatus("active");
        userRepo.save(user);

        auditService.log(enterpriseId, currentUserId, null,
                "invite_member", "user", user.getId(), "邀请成员: " + username + " (" + role + ")");

        return Map.of("status", "ok", "userId", user.getId());
    }

    @PutMapping("/members/{userId}/role")
    public Map<String, String> updateRole(@PathVariable String userId, @RequestBody Map<String, String> body) {
        String enterpriseId = TenantContext.get();
        String currentUserId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String newRole = body.getOrDefault("role", "member");

        return userRepo.findById(userId).map(user -> {
            if (!user.getEnterpriseId().equals(enterpriseId)) {
                return Map.of("status", "error", "message", "无权限");
            }
            user.setRole(newRole);
            userRepo.save(user);

            auditService.log(enterpriseId, currentUserId, null,
                    "change_role", "user", userId, "修改角色为: " + newRole);
            return Map.of("status", "ok");
        }).orElse(Map.of("status", "error", "message", "用户不存在"));
    }

    @GetMapping("/audit-log")
    public Map<String, Object> getAuditLog(@RequestParam(defaultValue = "50") int limit) {
        String enterpriseId = TenantContext.get();
        List<AuditLog> logs = auditService.getRecentLogs(enterpriseId, limit);
        List<Map<String, Object>> result = logs.stream().map(l -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", l.getId());
            m.put("userId", l.getUserId());
            m.put("userName", l.getUserName() != null ? l.getUserName() : l.getUserId());
            m.put("action", l.getAction());
            m.put("resourceType", l.getResourceType());
            m.put("resourceId", l.getResourceId());
            m.put("detail", l.getDetail());
            m.put("createdAt", l.getCreatedAt() != null ? l.getCreatedAt().toString() : "");
            return m;
        }).toList();
        return Map.of("logs", result);
    }
}
