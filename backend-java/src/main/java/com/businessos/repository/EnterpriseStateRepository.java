package com.businessos.repository;

import com.businessos.model.entity.EnterpriseState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EnterpriseStateRepository extends JpaRepository<EnterpriseState, String> {
    Optional<EnterpriseState> findByEnterpriseId(String enterpriseId);
}
