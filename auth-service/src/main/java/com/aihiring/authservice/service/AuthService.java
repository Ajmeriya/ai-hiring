package com.aihiring.authservice.service;

import com.aihiring.authservice.dto.AuthResponse;
import com.aihiring.authservice.dto.LoginRequest;
import com.aihiring.authservice.dto.LogoutRequest;
import com.aihiring.authservice.dto.RegisterRequest;
import com.aihiring.authservice.dto.UserResponse;

public interface AuthService {
    AuthResponse register(RegisterRequest request);
    AuthResponse login(LoginRequest request);
    void logout(String authorizationHeader, LogoutRequest request);
    UserResponse me(String email);
}
