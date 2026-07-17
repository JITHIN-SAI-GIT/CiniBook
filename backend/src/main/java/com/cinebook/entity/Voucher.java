package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false)
    private String partner; // Netflix, Prime, etc.

    @Column(nullable = false)
    private Integer validityDays;

    private LocalDateTime expiryDate;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private RedemptionStatus status = RedemptionStatus.AVAILABLE;

    private LocalDateTime redeemedDate;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    public enum RedemptionStatus { AVAILABLE, ASSIGNED, REDEEMED, EXPIRED }
}
