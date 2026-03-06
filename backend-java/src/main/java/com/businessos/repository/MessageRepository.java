package com.businessos.repository;

import com.businessos.model.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, String> {

    List<Message> findByConversationIdOrderByCreatedAtAsc(String conversationId);
}
