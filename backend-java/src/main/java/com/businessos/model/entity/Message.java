package com.businessos.model.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "message")
public class Message {

    @Id
    private String id;

    @Column(name = "conversation_id")
    private String conversationId;

    @Column(name = "enterprise_id")
    private String enterpriseId;

    private String role;
    private String content;

    @Column(name = "message_type")
    private String messageType;

    private String metadata;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Message() {
    }

    public Message(String id, String conversationId, String enterpriseId, String role, String content,
                  String messageType, String metadata, LocalDateTime createdAt) {
        this.id = id;
        this.conversationId = conversationId;
        this.enterpriseId = enterpriseId;
        this.role = role;
        this.content = content;
        this.messageType = messageType;
        this.metadata = metadata;
        this.createdAt = createdAt;
    }

    @PrePersist
    public void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private String id;
        private String conversationId;
        private String enterpriseId;
        private String role;
        private String content;
        private String messageType;
        private String metadata;
        private LocalDateTime createdAt;

        public Builder id(String id) {
            this.id = id;
            return this;
        }

        public Builder conversationId(String conversationId) {
            this.conversationId = conversationId;
            return this;
        }

        public Builder enterpriseId(String enterpriseId) {
            this.enterpriseId = enterpriseId;
            return this;
        }

        public Builder role(String role) {
            this.role = role;
            return this;
        }

        public Builder content(String content) {
            this.content = content;
            return this;
        }

        public Builder messageType(String messageType) {
            this.messageType = messageType;
            return this;
        }

        public Builder metadata(String metadata) {
            this.metadata = metadata;
            return this;
        }

        public Builder createdAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public Message build() {
            return new Message(id, conversationId, enterpriseId, role, content, messageType, metadata, createdAt);
        }
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getConversationId() {
        return conversationId;
    }

    public void setConversationId(String conversationId) {
        this.conversationId = conversationId;
    }

    public String getEnterpriseId() {
        return enterpriseId;
    }

    public void setEnterpriseId(String enterpriseId) {
        this.enterpriseId = enterpriseId;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getMessageType() {
        return messageType;
    }

    public void setMessageType(String messageType) {
        this.messageType = messageType;
    }

    public String getMetadata() {
        return metadata;
    }

    public void setMetadata(String metadata) {
        this.metadata = metadata;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Message message = (Message) o;
        return Objects.equals(id, message.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id);
    }

    @Override
    public String toString() {
        return "Message{" +
                "id='" + id + '\'' +
                ", conversationId='" + conversationId + '\'' +
                ", enterpriseId='" + enterpriseId + '\'' +
                ", role='" + role + '\'' +
                ", content='" + content + '\'' +
                ", messageType='" + messageType + '\'' +
                ", metadata='" + metadata + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
