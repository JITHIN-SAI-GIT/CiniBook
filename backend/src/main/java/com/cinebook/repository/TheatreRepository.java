package com.cinebook.repository;

import com.cinebook.entity.Theatre;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface TheatreRepository extends JpaRepository<Theatre, Long> {

    /** Find all theatres in a given city (case-insensitive) */
    List<Theatre> findByCityIgnoreCase(String city);

    /** Find all theatres in a given state (case-insensitive) */
    List<Theatre> findByStateIgnoreCase(String state);

    /** Search theatres by name or location (case-insensitive) */
    @Query("SELECT t FROM Theatre t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(t.location) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(t.city) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Theatre> search(@Param("query") String query);

    /**
     * Proximity search using Haversine formula.
     * Returns theatres within radiusKm kilometers of the given lat/lng.
     */
    @Query(value = "SELECT *, " +
           "(6371 * ACOS(COS(RADIANS(:lat)) * COS(RADIANS(latitude)) * " +
           "COS(RADIANS(longitude) - RADIANS(:lng)) + SIN(RADIANS(:lat)) * SIN(RADIANS(latitude)))) AS dist " +
           "FROM theatres " +
           "WHERE latitude IS NOT NULL AND longitude IS NOT NULL " +
           "HAVING dist < :radiusKm " +
           "ORDER BY dist ASC", nativeQuery = true)
    List<Theatre> findNearby(@Param("lat") double lat, @Param("lng") double lng, @Param("radiusKm") double radiusKm);
}
