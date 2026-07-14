package com.aihiring.applicationservice.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/applications/job/*/count").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/applications/job/*").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/applications").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/applications/*/resume").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/applications/*/check-resume").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/applications/*/round/*").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/applications/*/round/*/start").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/applications/*/round/*/submit-score").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/applications/candidate/*").authenticated()
                .requestMatchers(HttpMethod.GET, "/api/applications/*").authenticated()
                .anyRequest().authenticated())
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

}
