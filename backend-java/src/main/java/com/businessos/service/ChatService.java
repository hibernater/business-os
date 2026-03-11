package com.businessos.service;

import com.businessos.model.entity.Conversation;
import com.businessos.model.entity.EnterpriseAsset;
import com.businessos.model.entity.Message;
import com.businessos.repository.ConversationRepository;
import com.businessos.repository.EnterpriseAssetRepository;
import com.businessos.repository.MessageRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final EnterpriseAssetRepository assetRepository;
    private final AiEngineClient aiEngineClient;
    private final NotificationService notificationService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ChatService(ConversationRepository conversationRepository,
                       MessageRepository messageRepository,
                       EnterpriseAssetRepository assetRepository,
                       AiEngineClient aiEngineClient,
                       NotificationService notificationService) {
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
        this.assetRepository = assetRepository;
        this.aiEngineClient = aiEngineClient;
        this.notificationService = notificationService;
    }

    @Transactional
    public Conversation getOrCreateConversation(String enterpriseId, String userId, String conversationId) {
        if (conversationId != null && !conversationId.isBlank()) {
            Optional<Conversation> existing = conversationRepository.findById(conversationId);
            if (existing.isPresent()) {
                return existing.get();
            }
        }
        Conversation conv = Conversation.builder()
                .id(UUID.randomUUID().toString())
                .enterpriseId(enterpriseId)
                .userId(userId)
                .status("active")
                .build();
        return conversationRepository.save(conv);
    }

    @Transactional
    public Message saveMessage(String conversationId, String enterpriseId, String role, String content, String messageType) {
        Message message = Message.builder()
                .conversationId(conversationId)
                .enterpriseId(enterpriseId)
                .role(role)
                .content(content)
                .messageType(messageType)
                .build();
        return messageRepository.save(message);
    }

    public List<Map<String, String>> getHistory(String conversationId) {
        return messageRepository.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream()
                .map(m -> {
                    Map<String, String> map = new HashMap<>();
                    map.put("role", m.getRole());
                    map.put("content", m.getContent());
                    return map;
                })
                .collect(Collectors.toList());
    }

    public Flux<String> streamResponseRaw(String message, String conversationId, List<Map<String, String>> history, boolean autoExecute, String taskId) {
        return aiEngineClient.streamChatRaw(message, conversationId, history, autoExecute, taskId);
    }

    public String extractTextContent(String ndjsonLine) {
        return aiEngineClient.extractTextContent(ndjsonLine);
    }

    /**
     * 处理特殊事件（memory_save、skill_done 含执行记录）
     */
    public void handleSpecialEvent(String ndjsonLine, String enterpriseId) {
        try {
            JsonNode node = objectMapper.readTree(ndjsonLine);
            String type = node.has("type") ? node.get("type").asText() : "";

            if ("memory_save".equals(type)) {
                handleMemorySave(node, enterpriseId);
            } else if ("skill_done".equals(type) && node.has("execution_record")) {
                handleExecutionRecord(node, enterpriseId);
            }
        } catch (Exception e) {
            log.warn("Failed to handle special event: {}", e.getMessage());
        }
    }

    private void handleMemorySave(JsonNode node, String enterpriseId) {
        try {
            String skillId = node.has("skill_id") ? node.get("skill_id").asText() : "";
            JsonNode data = node.get("data");
            String memoryType = node.has("memory_type") ? node.get("memory_type").asText() : "preference";

            String name = "Skill偏好: " + (data.has("skill_name") ? data.get("skill_name").asText() : skillId);
            String content = objectMapper.writeValueAsString(data.has("preferences") ? data.get("preferences") : data);

            EnterpriseAsset asset = EnterpriseAsset.builder()
                    .enterpriseId(enterpriseId)
                    .assetType(memoryType)
                    .name(name)
                    .content(content)
                    .source("skill_execution")
                    .sourceSkillId(skillId)
                    .build();
            assetRepository.save(asset);
            log.info("Saved memory for skill {} enterprise {}", skillId, enterpriseId);
        } catch (Exception e) {
            log.warn("Failed to save memory: {}", e.getMessage());
        }
    }

    private void handleExecutionRecord(JsonNode node, String enterpriseId) {
        try {
            JsonNode record = node.get("execution_record");
            String executionId = record.has("execution_id") ? record.get("execution_id").asText() : "";
            String skillId = record.has("skill_id") ? record.get("skill_id").asText() : "";
            String skillName = record.has("skill_name") ? record.get("skill_name").asText() : "";
            int completedSteps = record.has("completed_steps") ? record.get("completed_steps").asInt() : 0;
            int stepCount = record.has("step_count") ? record.get("step_count").asInt() : 0;

            String name = "执行记录: " + skillName + " (" + completedSteps + "/" + stepCount + "步完成)";
            String content = objectMapper.writeValueAsString(record);

            EnterpriseAsset asset = EnterpriseAsset.builder()
                    .enterpriseId(enterpriseId)
                    .assetType("execution_record")
                    .name(name)
                    .content(content)
                    .source("skill_execution")
                    .sourceSkillId(skillId)
                    .build();
            assetRepository.save(asset);
            log.info("Saved execution record {} for skill {}", executionId, skillId);

            notificationService.send(enterpriseId, "skill_done",
                    skillName + " 执行完成",
                    completedSteps + "/" + stepCount + " 步完成",
                    Map.of("skillId", skillId, "executionId", executionId));
        } catch (Exception e) {
            log.warn("Failed to save execution record: {}", e.getMessage());
        }
    }

    public List<Conversation> listConversations(String enterpriseId) {
        return conversationRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
    }
}
