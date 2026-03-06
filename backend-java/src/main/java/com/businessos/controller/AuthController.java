package com.businessos.controller;

import com.businessos.middleware.JwtUtil;
import com.businessos.model.entity.User;
import com.businessos.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    public AuthController(UserRepository userRepository, JwtUtil jwtUtil) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = userRepository.findByUsername(request.getUsername());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).build();
        }
        User user = userOpt.get();
        if (!"admin123".equals(request.getPassword())) {
            return ResponseEntity.status(401).build();
        }
        String token = jwtUtil.generateToken(user.getId(), user.getEnterpriseId(), user.getRole());
        return ResponseEntity.ok(new LoginResponse(
                token,
                user.getId(),
                user.getEnterpriseId(),
                user.getRole()
        ));
    }

    public static class LoginRequest {
        private String username;
        private String password;

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }
    }

    public static class LoginResponse {
        private final String token;
        private final String userId;
        private final String enterpriseId;
        private final String role;

        public LoginResponse(String token, String userId, String enterpriseId, String role) {
            this.token = token;
            this.userId = userId;
            this.enterpriseId = enterpriseId;
            this.role = role;
        }

        public String getToken() {
            return token;
        }

        public String getUserId() {
            return userId;
        }

        public String getEnterpriseId() {
            return enterpriseId;
        }

        public String getRole() {
            return role;
        }
    }
}
