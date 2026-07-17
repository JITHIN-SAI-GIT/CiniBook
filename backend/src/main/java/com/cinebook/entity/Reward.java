package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rewards")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "voucher_id")
    private Voucher voucher;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RewardStatus status = RewardStatus.AVAILABLE;

    @Column(name = "earned_date")
    @Builder.Default
    private LocalDateTime earnedDate = LocalDateTime.now();

    private LocalDateTime redeemedDate;

    public enum RewardStatus { AVAILABLE, REDEEMED, EXPIRED }
}
