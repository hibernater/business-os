package com.businessos.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Flux;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AiEngineClient {

    @Value("${app.ai-engine.url}")
    private String aiEngineUrl;

    private WebClient webClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @PostConstruct
    public void init() {
        this.webClient = WebClient.builder()
                .baseUrl(aiEngineUrl)
                .codecs(config -> config.defaultCodecs().maxInMemorySize(2 * 1024 * 1024))
                .build();
    }

    /**
     * 透传 AI Engine 返回的所有 NDJSON 事件（intent / skill_start / step_start / text_delta / step_done / skill_done / done）
     */
    public Flux<String> streamChatRaw(String message, String conversationId, List<Map<String, String>> history) {
        Map<String, Object> body = new HashMap<>();
        body.put("message", message);
        body.put("conversation_id", conversationId);
        body.put("history", history != null ? history : List.of());

        return webClient.post()
                .uri("/api/chat/stream")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(String.class)
                .filter(line -> line != null && !line.isBlank());
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSkills() {
        return webClient.get()
                .uri("/api/skills")
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getSchedules(String enterpriseId) {
        return webClient.get()
                .uri(uri -> uri.path("/api/schedules").queryParam("enterprise_id", enterpriseId).build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> createSchedule(Map<String, Object> body) {
        return webClient.post()
                .uri("/api/schedules")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> deleteSchedule(String scheduleId) {
        return webClient.delete()
                .uri("/api/schedules/" + scheduleId)
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> toggleSchedule(String scheduleId, boolean enabled) {
        return webClient.put()
                .uri(uri -> uri.path("/api/schedules/" + scheduleId + "/toggle")
                        .queryParam("enabled", enabled).build())
                .retrieve()
                .bodyToMono(Map.class)
                .block();
    }

    public String extractTextContent(String ndjsonLine) {
        try {
            JsonNode node = objectMapper.readTree(ndjsonLine);
            String type = node.has("type") ? node.get("type").asText() : "";
            if ("text_delta".equals(type) && node.has("content")) {
                return node.get("content").asText();
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
