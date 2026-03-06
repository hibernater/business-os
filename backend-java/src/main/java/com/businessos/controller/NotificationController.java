package com.businessos.controller;

import com.businessos.middleware.TenantContext;
import com.businessos.service.NotificationService;
import com.businessos.service.NotificationService.Notification;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Notification>> stream() {
        String enterpriseId = TenantContext.get();
        return notificationService.subscribe(enterpriseId)
                .map(n -> ServerSentEvent.<Notification>builder().data(n).build());
    }

    @GetMapping
    public Map<String, Object> list() {
        String enterpriseId = TenantContext.get();
        List<Notification> notifications = notificationService.getHistory(enterpriseId);
        long unread = notificationService.unreadCount(enterpriseId);
        return Map.of("notifications", notifications, "unread", unread);
    }

    @PostMapping("/{id}/read")
    public Map<String, String> markRead(@PathVariable String id) {
        String enterpriseId = TenantContext.get();
        notificationService.markRead(enterpriseId, id);
        return Map.of("status", "ok");
    }
}
