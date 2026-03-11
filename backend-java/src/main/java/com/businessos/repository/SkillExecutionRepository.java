package com.businessos.repository;

import com.businessos.model.entity.SkillExecution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillExecutionRepository extends JpaRepository<SkillExecution, String> {

    List<SkillExecution> findByEnterpriseIdOrderByStartedAtDesc(String enterpriseId);

    List<SkillExecution> findByEnterpriseIdAndStatusOrderByStartedAtDesc(String enterpriseId, String status);

    List<SkillExecution> findByEnterpriseIdAndTriggerTypeOrderByStartedAtDesc(String enterpriseId, String triggerType);

    List<SkillExecution> findByEnterpriseIdAndStatusAndTriggerTypeOrderByStartedAtDesc(
            String enterpriseId, String status, String triggerType);

    long countByEnterpriseIdAndStatus(String enterpriseId, String status);
}
