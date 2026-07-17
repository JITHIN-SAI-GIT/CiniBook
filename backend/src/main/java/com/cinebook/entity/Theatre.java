package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Theatre entity — expanded with location fields for location-based search.
 */
@Entity
@Table(name = "theatres")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Theatre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    /** Full address string (street, area) */
    @Column(nullable = false)
    private String location;

    /** City name — used for city-based filtering */
    @Column
    private String city;

    /** State / Province name */
    @Column
    private String state;

    /** Country name */
    @Column
    private String country;

    /** GPS Latitude — used for proximity search */
    @Column(precision = 10)
    private Double latitude;

    /** GPS Longitude — used for proximity search */
    @Column(precision = 10)
    private Double longitude;

    /** Contact phone number */
    @Column
    private String phone;

    /** Theatre website URL */
    @Column(columnDefinition = "TEXT")
    private String website;

    /** Number of screens */
    @Column(nullable = false)
    @Builder.Default
    private Integer screens = 1;

    /** Total seating capacity */
    @Column(name = "seat_capacity")
    @Builder.Default
    private Integer seatCapacity = 200;

    /** Parking available */
    @Column(name = "has_parking")
    @Builder.Default
    private Boolean hasParking = false;

    /** Food court / canteen available */
    @Column(name = "has_food_court")
    @Builder.Default
    private Boolean hasFoodCourt = false;

    /** Wheelchair accessible */
    @Column(name = "is_wheelchair_accessible")
    @Builder.Default
    private Boolean isWheelchairAccessible = false;

    /** Whether booking is enabled for this theatre */
    @Column(name = "is_booking_enabled")
    @Builder.Default
    private Boolean isBookingEnabled = true;

    /** Comma-separated photo URLs or stored as collection */
    @ElementCollection
    @CollectionTable(name = "theatre_photos", joinColumns = @JoinColumn(name = "theatre_id"))
    @Column(name = "photo_url", columnDefinition = "TEXT")
    private List<String> photoUrls;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
