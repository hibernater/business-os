package com.businessos.repository;

import com.businessos.model.entity.WorkflowExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, String> {
    List<WorkflowExecution> findByEnterpriseIdOrderByUpdatedAtDesc(String enterpriseId);
    List<WorkflowExecution> findByWorkflowIdOrderByStartedAtDesc(String workflowId);
    List<WorkflowExecution> findByEnterpriseIdAndStatusOrderByUpdatedAtDesc(String enterpriseId, String status);
    List<WorkflowExecution> findByStatusAndNextHeartbeatAtBefore(String status, LocalDateTime before);
    long countByEnterpriseIdAndStatus(String enterpriseId, String status);
}
