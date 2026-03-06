package com.businessos.repository;

import com.businessos.model.entity.SkillMarketplace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SkillMarketplaceRepository extends JpaRepository<SkillMarketplace, String> {

    List<SkillMarketplace> findByStatusOrderByInstallCountDesc(String status);

    List<SkillMarketplace> findByCategoryAndStatusOrderByInstallCountDesc(String category, String status);

    @Query("SELECT s FROM SkillMarketplace s WHERE s.status = 'published' AND (LOWER(s.name) LIKE LOWER(CONCAT('%', :keyword, '%')) OR LOWER(s.description) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<SkillMarketplace> search(String keyword);

    List<SkillMarketplace> findByAuthorEnterpriseIdOrderByCreatedAtDesc(String authorEnterpriseId);
}
