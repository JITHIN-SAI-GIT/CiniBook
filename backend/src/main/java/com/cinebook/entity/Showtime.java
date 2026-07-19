package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Entity
@Table(name = "showtimes", indexes = {
    @Index(name = "idx_showtime_movie_id", columnList = "movie_id"),
    @Index(name = "idx_showtime_show_date", columnList = "show_date")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Showtime {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "theatre_id", nullable = false)
    private Theatre theatre;

    @Column(name = "screen_name", nullable = false)
    @Builder.Default
    private String screenName = "Screen 1";

    @Column(name = "show_date", nullable = false)
    private LocalDate showDate;

    @Column(name = "show_time", nullable = false)
    private LocalTime showTime;

    @Column(name = "price_platinum", nullable = false, columnDefinition = "DECIMAL(10,2) DEFAULT 0")
    @Builder.Default
    private BigDecimal pricePlatinum = new BigDecimal("350.00");

    @Column(name = "price_gold", nullable = false, columnDefinition = "DECIMAL(10,2) DEFAULT 0")
    @Builder.Default
    private BigDecimal priceGold = new BigDecimal("250.00");

    @Column(name = "price_silver", nullable = false, columnDefinition = "DECIMAL(10,2) DEFAULT 0")
    @Builder.Default
    private BigDecimal priceSilver = new BigDecimal("150.00");

    @Column(name = "rows_count", nullable = false)
    @Builder.Default
    private Integer rowsCount = 10;

    @Column(name = "cols_count", nullable = false)
    @Builder.Default
    private Integer colsCount = 12;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
