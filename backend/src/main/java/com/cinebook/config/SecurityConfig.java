package com.cinebook.config;

import com.cinebook.security.JwtFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(org.springframework.security.config.Customizer.withDefaults())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Public endpoints
                .requestMatchers(HttpMethod.GET, "/api/movies/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/theatres/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/showtimes/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/tmdb/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/auth/me").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/movies/tmdb/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                // WebSocket endpoint
                .requestMatchers("/ws-chat/**").permitAll()
                // Stream endpoint: requires authentication (any logged-in user)
                .requestMatchers(HttpMethod.GET, "/api/movies/*/stream").authenticated()
                // Storage stats: admin only
                .requestMatchers(HttpMethod.GET, "/api/movies/storage/stats").hasRole("ADMIN")
                // Video upload/delete: admin only
                .requestMatchers(HttpMethod.POST, "/api/movies/*/video").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/movies/*/video").hasRole("ADMIN")
                // Admin only
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/movies/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/movies/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/movies/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/theatres/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/theatres/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/theatres/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/showtimes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/showtimes/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.DELETE, "/api/showtimes/**").hasRole("ADMIN")
                // Authenticated
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
