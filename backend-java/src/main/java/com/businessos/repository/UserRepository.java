package com.businessos.repository;

import com.businessos.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByUsername(String username);

    List<User> findByEnterpriseId(String enterpriseId);
}
