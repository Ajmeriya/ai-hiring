package com.aihiring.authservice.dto;

import com.aihiring.authservice.model.Role;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class UserResponse {
    private final Long userId;
    private final String fullName;
    private final String email;
    private final Role role;
}
