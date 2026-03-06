package com.businessos.repository;

import com.businessos.model.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, String> {
    List<AuditLog> findByEnterpriseIdOrderByCreatedAtDesc(String enterpriseId);
}
