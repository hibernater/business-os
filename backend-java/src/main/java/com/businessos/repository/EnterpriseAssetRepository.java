package com.businessos.repository;

import com.businessos.model.entity.EnterpriseAsset;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EnterpriseAssetRepository extends JpaRepository<EnterpriseAsset, String> {
    List<EnterpriseAsset> findByEnterpriseIdOrderByCreatedAtDesc(String enterpriseId);
    List<EnterpriseAsset> findByEnterpriseIdAndAssetTypeOrderByCreatedAtDesc(String enterpriseId, String assetType);
    List<EnterpriseAsset> findByEnterpriseIdOrderByUpdatedAtDesc(String enterpriseId);
}
