package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = true)
    private String email;

    @Column(name = "email_verified")
    @Builder.Default
    private Boolean emailVerified = false;

    @com.fasterxml.jackson.annotation.JsonIgnore
    private String otp;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "otp_expiry")
    private LocalDateTime otpExpiry;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @Column(name = "password_hash", nullable = true)
    private String passwordHash;

    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "lifetime_tickets")
    @Builder.Default
    private Integer lifetimeTickets = 0;

    @Column(name = "tickets_since_last_reward")
    @Builder.Default
    private Integer ticketsSinceLastReward = 0;

    public enum Role { USER, ADMIN }
}
