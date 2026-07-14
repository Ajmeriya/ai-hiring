package com.aihiring.anticheat.repository;

import com.aihiring.anticheat.entity.AntiCheatEvent;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AntiCheatEventRepository extends JpaRepository<AntiCheatEvent, UUID> {

    List<AntiCheatEvent> findBySessionIdOrderByTimestampAsc(UUID sessionId);
}