package com.cinebook.repository;

import com.cinebook.entity.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface SeatLockRepository extends JpaRepository<SeatLock, Long> {

    @Query("SELECT sl FROM SeatLock sl WHERE sl.showtime.id = :showtimeId AND sl.lockedUntil > :now")
    List<SeatLock> findActiveByShowtimeId(@Param("showtimeId") Long showtimeId,
                                           @Param("now") LocalDateTime now);

    @Query("SELECT sl FROM SeatLock sl WHERE sl.showtime.id = :showtimeId " +
           "AND sl.user.id = :userId AND sl.lockedUntil > :now")
    List<SeatLock> findActiveByShowtimeAndUser(@Param("showtimeId") Long showtimeId,
                                               @Param("userId") Long userId,
                                               @Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.showtime.id = :showtimeId " +
           "AND sl.seatLabel = :seatLabel AND sl.user.id = :userId")
    void deleteByShowtimeAndSeatAndUser(@Param("showtimeId") Long showtimeId,
                                         @Param("seatLabel") String seatLabel,
                                         @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.showtime.id = :showtimeId AND sl.user.id = :userId")
    void deleteByShowtimeAndUser(@Param("showtimeId") Long showtimeId,
                                  @Param("userId") Long userId);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.lockedUntil <= :now")
    int deleteExpired(@Param("now") LocalDateTime now);

    @org.springframework.transaction.annotation.Transactional
    void deleteByShowtimeId(Long showtimeId);
}
