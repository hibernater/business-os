package com.businessos.model.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "enterprise_state")
public class EnterpriseState {

    @Id
    private String id;

    @Column(name = "enterprise_id", nullable = false, unique = true)
    private String enterpriseId;

    @Column(name = "product_state", columnDefinition = "TEXT")
    private String productState;

    @Column(name = "customer_state", columnDefinition = "TEXT")
    private String customerState;

    @Column(name = "operation_state", columnDefinition = "TEXT")
    private String operationState;

    @Column(name = "team_state", columnDefinition = "TEXT")
    private String teamState;

    @Column(name = "financial_state", columnDefinition = "TEXT")
    private String financialState;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID().toString();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
        if (productState == null) productState = "{}";
        if (customerState == null) customerState = "{}";
        if (operationState == null) operationState = "{}";
        if (teamState == null) teamState = "{}";
        if (financialState == null) financialState = "{}";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEnterpriseId() { return enterpriseId; }
    public void setEnterpriseId(String enterpriseId) { this.enterpriseId = enterpriseId; }
    public String getProductState() { return productState; }
    public void setProductState(String productState) { this.productState = productState; }
    public String getCustomerState() { return customerState; }
    public void setCustomerState(String customerState) { this.customerState = customerState; }
    public String getOperationState() { return operationState; }
    public void setOperationState(String operationState) { this.operationState = operationState; }
    public String getTeamState() { return teamState; }
    public void setTeamState(String teamState) { this.teamState = teamState; }
    public String getFinancialState() { return financialState; }
    public void setFinancialState(String financialState) { this.financialState = financialState; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
