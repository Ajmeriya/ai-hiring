package com.aihiring.authservice.repository;

import com.aihiring.authservice.model.RevokedToken;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RevokedTokenRepository extends JpaRepository<RevokedToken, Long> {
    Optional<RevokedToken> findByToken(String token);
    boolean existsByToken(String token);
}
