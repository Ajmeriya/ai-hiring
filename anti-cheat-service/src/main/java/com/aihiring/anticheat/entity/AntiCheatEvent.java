package com.aihiring.anticheat.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "anti_cheat_events", indexes = {
        @Index(name = "idx_anti_cheat_events_session_id", columnList = "session_id"),
    @Index(name = "idx_anti_cheat_events_timestamp", columnList = "event_timestamp")
})
public class AntiCheatEvent {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    @Column(name = "event_type", nullable = false, length = 64)
    private String eventType;

    @Column(name = "event_timestamp", nullable = false, updatable = false)
    private Instant timestamp;

    @Column(nullable = false, length = 1000)
    private String metadata;
}