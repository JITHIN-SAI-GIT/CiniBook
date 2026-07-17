package com.cinebook.repository;

import com.cinebook.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("SELECT b FROM Booking b JOIN FETCH b.showtime s JOIN FETCH s.movie JOIN FETCH s.theatre " +
           "WHERE b.user.id = :userId ORDER BY b.createdAt DESC")
    List<Booking> findByUserIdWithDetails(@Param("userId") Long userId);

    @Query("SELECT b FROM Booking b JOIN FETCH b.user JOIN FETCH b.showtime s " +
           "JOIN FETCH s.movie JOIN FETCH s.theatre ORDER BY b.createdAt DESC")
    List<Booking> findAllWithDetails();

    @Query("SELECT elements(b.seats) FROM Booking b WHERE b.showtime.id = :showtimeId AND b.status = com.cinebook.entity.Booking$BookingStatus.CONFIRMED")
    List<String> findSeatsByShowtimeId(@Param("showtimeId") Long showtimeId);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = 'CONFIRMED' AND FUNCTION('DATE', b.createdAt) = :date")
    long countConfirmedByDate(@Param("date") LocalDate date);

    @org.springframework.transaction.annotation.Transactional
    void deleteByShowtimeId(Long showtimeId);

    List<Booking> findByShowtimeId(Long showtimeId);
}
