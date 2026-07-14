package com.aihiring.authservice.config;

import com.aihiring.authservice.model.Role;
import com.aihiring.authservice.model.User;
import com.aihiring.authservice.repository.UserRepository;
import java.util.List;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DemoUserSeeder {

    @Bean
    CommandLineRunner seedDemoUsers(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            seedUserIfMissing(userRepository, passwordEncoder, "recruiter@company.com", "John Manager", Role.RECRUITER, "any password");
            seedUserIfMissing(userRepository, passwordEncoder, "candidate@company.com", "Candidate User", Role.CANDIDATE, "any password");
        };
    }

    
    private void seedUserIfMissing(UserRepository userRepository,
                                   PasswordEncoder passwordEncoder,
                                   String email,
                                   String fullName,
                                   Role role,
                                   String password) {
        if (userRepository.existsByEmail(email)) {
            return;
        }

        User user = User.builder()
                .fullName(fullName)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(role)
                .enabled(true)
                .build();

        userRepository.save(user);
    }
}