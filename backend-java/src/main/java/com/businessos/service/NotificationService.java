package com.businessos.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static final int MAX_HISTORY = 50;

    private final Map<String, Sinks.Many<Notification>> enterpriseSinks = new ConcurrentHashMap<>();
    private final Map<String, List<Notification>> history = new ConcurrentHashMap<>();

    public Flux<Notification> subscribe(String enterpriseId) {
        Sinks.Many<Notification> sink = enterpriseSinks.computeIfAbsent(
                enterpriseId, k -> Sinks.many().multicast().onBackpressureBuffer(64));
        return sink.asFlux();
    }

    public void send(String enterpriseId, String type, String title, String content, Map<String, Object> data) {
        Notification n = new Notification(
                UUID.randomUUID().toString().substring(0, 8),
                type, title, content, data, false, LocalDateTime.now().toString()
        );

        history.computeIfAbsent(enterpriseId, k -> Collections.synchronizedList(new ArrayList<>()));
        List<Notification> list = history.get(enterpriseId);
        list.add(0, n);
        if (list.size() > MAX_HISTORY) list.remove(list.size() - 1);

        Sinks.Many<Notification> sink = enterpriseSinks.get(enterpriseId);
        if (sink != null) {
            sink.tryEmitNext(n);
        }
        log.info("Notification sent to {}: [{}] {}", enterpriseId, type, title);
    }

    public List<Notification> getHistory(String enterpriseId) {
        return history.getOrDefault(enterpriseId, List.of());
    }

    public void markRead(String enterpriseId, String notificationId) {
        List<Notification> list = history.get(enterpriseId);
        if (list == null) return;
        for (Notification n : list) {
            if (n.getId().equals(notificationId)) {
                n.setRead(true);
                break;
            }
        }
    }

    public long unreadCount(String enterpriseId) {
        List<Notification> list = history.get(enterpriseId);
        if (list == null) return 0;
        return list.stream().filter(n -> !n.isRead()).count();
    }

    public static class Notification {
        private String id;
        private String type;
        private String title;
        private String content;
        private Map<String, Object> data;
        private boolean read;
        private String createdAt;

        public Notification() {}

        public Notification(String id, String type, String title, String content,
                            Map<String, Object> data, boolean read, String createdAt) {
            this.id = id;
            this.type = type;
            this.title = title;
            this.content = content;
            this.data = data;
            this.read = read;
            this.createdAt = createdAt;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getContent() { return content; }
        public void setContent(String content) { this.content = content; }
        public Map<String, Object> getData() { return data; }
        public void setData(Map<String, Object> data) { this.data = data; }
        public boolean isRead() { return read; }
        public void setRead(boolean read) { this.read = read; }
        public String getCreatedAt() { return createdAt; }
        public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    }
}
