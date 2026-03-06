package com.businessos.repository;

import com.businessos.model.entity.Skill;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SkillRepository extends JpaRepository<Skill, String> {

    List<Skill> findByEnterpriseId(String enterpriseId);
}
