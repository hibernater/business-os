package com.businessos.repository;

import com.businessos.model.entity.Enterprise;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EnterpriseRepository extends JpaRepository<Enterprise, String> {
}
