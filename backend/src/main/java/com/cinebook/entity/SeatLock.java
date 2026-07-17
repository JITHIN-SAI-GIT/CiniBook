package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "seat_locks",
       uniqueConstraints = @UniqueConstraint(columnNames = {"showtime_id", "seat_label"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SeatLock {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @Column(name = "seat_label", nullable = false, length = 10)
    private String seatLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "locked_until", nullable = false)
    private LocalDateTime lockedUntil;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
