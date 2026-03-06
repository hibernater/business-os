package com.businessos.repository;

import com.businessos.model.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConversationRepository extends JpaRepository<Conversation, String> {

    List<Conversation> findByEnterpriseIdOrderByCreatedAtDesc(String enterpriseId);

    List<Conversation> findByUserIdOrderByCreatedAtDesc(String userId);
}
