package com.businessos.service;

import com.businessos.model.entity.AuditLog;
import com.businessos.repository.AuditLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AuditService {

    private final AuditLogRepository repo;

    public AuditService(AuditLogRepository repo) {
        this.repo = repo;
    }

    public void log(String enterpriseId, String userId, String userName,
                    String action, String resourceType, String resourceId, String detail) {
        AuditLog log = new AuditLog();
        log.setEnterpriseId(enterpriseId);
        log.setUserId(userId);
        log.setUserName(userName);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setDetail(detail);
        repo.save(log);
    }

    public List<AuditLog> getRecentLogs(String enterpriseId, int limit) {
        List<AuditLog> all = repo.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        return all.subList(0, Math.min(limit, all.size()));
    }
}
