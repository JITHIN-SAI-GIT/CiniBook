package com.cinebook.repository;

import com.cinebook.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository<Showtime, Long> {

    @Query("SELECT s FROM Showtime s JOIN FETCH s.movie JOIN FETCH s.theatre " +
           "WHERE s.movie.id = :movieId AND s.showDate >= :today " +
           "ORDER BY s.showDate ASC, s.showTime ASC")
    List<Showtime> findByMovieIdFromToday(@Param("movieId") Long movieId,
                                          @Param("today") LocalDate today);

    @Query("SELECT s FROM Showtime s JOIN FETCH s.movie JOIN FETCH s.theatre " +
           "ORDER BY s.showDate ASC, s.showTime ASC")
    List<Showtime> findAllWithDetails();

    @Query("SELECT s FROM Showtime s JOIN FETCH s.movie JOIN FETCH s.theatre " +
           "WHERE s.theatre.id = :theatreId AND s.showDate >= :today " +
           "ORDER BY s.showDate ASC, s.showTime ASC")
    List<Showtime> findByTheatreIdFromToday(@Param("theatreId") Long theatreId,
                                            @Param("today") LocalDate today);

    @Query("SELECT s FROM Showtime s JOIN FETCH s.movie JOIN FETCH s.theatre " +
           "WHERE s.theatre.id = :theatreId ORDER BY s.showDate ASC, s.showTime ASC")
    List<Showtime> findByTheatreId(@Param("theatreId") Long theatreId);

    List<Showtime> findByTheatreIdAndMovieIdAndShowDate(Long theatreId, Long movieId, LocalDate showDate);

    List<Showtime> findByMovieId(Long movieId);
}

