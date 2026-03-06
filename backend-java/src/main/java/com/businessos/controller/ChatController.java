package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.model.entity.Conversation;
import com.businessos.service.ChatService;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.scheduler.Schedulers;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    /**
     * SSE 流式聊天：透传 AI Engine 的所有事件类型给前端。
     * 每个 SSE data 就是一条完整的 JSON（intent / skill_start / step_start / text_delta / step_done / skill_done / done）
     */
    @PostMapping(value = "/send", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<String>> send(@RequestBody ChatRequest request) {
        String enterpriseId = TenantContext.get();
        String userId = (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        Conversation conv = chatService.getOrCreateConversation(enterpriseId, userId, request.getConversationId());
        chatService.saveMessage(conv.getId(), enterpriseId, "user", request.getMessage(), "text");
        List<Map<String, String>> history = chatService.getHistory(conv.getId());

        String convId = conv.getId();
        StringBuilder fullResponse = new StringBuilder();

        return chatService.streamResponseRaw(request.getMessage(), convId, history)
                .doOnNext(line -> {
                    String content = chatService.extractTextContent(line);
                    if (content != null) {
                        fullResponse.append(content);
                    }
                    // 处理 memory_save 和 execution_record 事件
                    chatService.handleSpecialEvent(line, enterpriseId);
                })
                .map(line -> ServerSentEvent.<String>builder().data(line).build())
                .concatWith(Flux.just(
                        ServerSentEvent.<String>builder().data("{\"type\":\"done\"}").build()
                ))
                .doOnComplete(() -> {
                    if (!fullResponse.isEmpty()) {
                        Schedulers.boundedElastic().schedule(() ->
                                chatService.saveMessage(convId, enterpriseId, "assistant", fullResponse.toString(), "text")
                        );
                    }
                });
    }

    @GetMapping("/conversations")
    public List<Conversation> listConversations() {
        String enterpriseId = TenantContext.get();
        return chatService.listConversations(enterpriseId);
    }

    public static class ChatRequest {
        private String message;
        private String conversationId;

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }
        public String getConversationId() { return conversationId; }
        public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    }
}
