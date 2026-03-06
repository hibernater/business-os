package com.businessos.middleware;

public class TenantContext {

    private static final ThreadLocal<String> ENTERPRISE_ID = new ThreadLocal<>();

    public static void set(String enterpriseId) {
        ENTERPRISE_ID.set(enterpriseId);
    }

    public static String get() {
        return ENTERPRISE_ID.get();
    }

    public static void clear() {
        ENTERPRISE_ID.remove();
    }
}
