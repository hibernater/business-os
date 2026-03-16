package com.businessos.repository;

import com.businessos.model.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WorkflowRepository extends JpaRepository<Workflow, String> {
    List<Workflow> findByEnterpriseIdOrderByUpdatedAtDesc(String enterpriseId);
    List<Workflow> findByEnterpriseIdAndStatusOrderByUpdatedAtDesc(String enterpriseId, String status);
    long countByEnterpriseId(String enterpriseId);
    long countByEnterpriseIdAndStatus(String enterpriseId, String status);
}
