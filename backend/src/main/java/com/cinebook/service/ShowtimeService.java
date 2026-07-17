package com.cinebook.service;

import com.cinebook.dto.ShowtimeRequest;
import com.cinebook.dto.ShowtimeResponse;
import com.cinebook.entity.Movie;
import com.cinebook.entity.Showtime;
import com.cinebook.entity.Theatre;
import com.cinebook.repository.MovieRepository;
import com.cinebook.repository.ShowtimeRepository;
import com.cinebook.repository.TheatreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;

    public List<ShowtimeResponse> getAll() {
        return showtimeRepository.findAllWithDetails().stream()
                .map(ShowtimeResponse::from).collect(Collectors.toList());
    }

    public ShowtimeResponse getById(Long id) {
        Showtime s = showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Showtime not found"));
        return ShowtimeResponse.from(s);
    }

    public List<ShowtimeResponse> getByMovieId(Long movieId) {
        return showtimeRepository.findByMovieIdFromToday(movieId, LocalDate.now())
                .stream().map(ShowtimeResponse::from).collect(Collectors.toList());
    }

    public ShowtimeResponse create(ShowtimeRequest req) {
        Movie movie = movieRepository.findById(req.getMovieId())
                .orElseThrow(() -> new RuntimeException("Movie not found"));
        Theatre theatre = theatreRepository.findById(req.getTheatreId())
                .orElseThrow(() -> new RuntimeException("Theatre not found"));

        Showtime s = Showtime.builder()
                .movie(movie)
                .theatre(theatre)
                .screenName(req.getScreenName() != null ? req.getScreenName() : "Screen 1")
                .showDate(LocalDate.parse(req.getShowDate()))
                .showTime(LocalTime.parse(req.getShowTime()))
                .pricePlatinum(req.getPricePlatinum() != null ? req.getPricePlatinum() : new java.math.BigDecimal("350.00"))
                .priceGold(req.getPriceGold() != null ? req.getPriceGold() : new java.math.BigDecimal("250.00"))
                .priceSilver(req.getPriceSilver() != null ? req.getPriceSilver() : new java.math.BigDecimal("150.00"))
                .rowsCount(req.getRowsCount() != null ? req.getRowsCount() : 10)
                .colsCount(req.getColsCount() != null ? req.getColsCount() : 12)
                .build();
        return ShowtimeResponse.from(showtimeRepository.save(s));
    }

    public ShowtimeResponse update(Long id, ShowtimeRequest req) {
        Showtime s = showtimeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Showtime not found"));
        if (req.getMovieId() != null) {
            s.setMovie(movieRepository.findById(req.getMovieId())
                    .orElseThrow(() -> new RuntimeException("Movie not found")));
        }
        if (req.getTheatreId() != null) {
            s.setTheatre(theatreRepository.findById(req.getTheatreId())
                    .orElseThrow(() -> new RuntimeException("Theatre not found")));
        }
        if (req.getScreenName() != null) s.setScreenName(req.getScreenName());
        if (req.getShowDate() != null) s.setShowDate(LocalDate.parse(req.getShowDate()));
        if (req.getShowTime() != null) s.setShowTime(LocalTime.parse(req.getShowTime()));
        if (req.getPricePlatinum() != null) s.setPricePlatinum(req.getPricePlatinum());
        if (req.getPriceGold() != null) s.setPriceGold(req.getPriceGold());
        if (req.getPriceSilver() != null) s.setPriceSilver(req.getPriceSilver());
        if (req.getRowsCount() != null) s.setRowsCount(req.getRowsCount());
        if (req.getColsCount() != null) s.setColsCount(req.getColsCount());
        return ShowtimeResponse.from(showtimeRepository.save(s));
    }

    public void delete(Long id) {
        showtimeRepository.deleteById(id);
    }
}
