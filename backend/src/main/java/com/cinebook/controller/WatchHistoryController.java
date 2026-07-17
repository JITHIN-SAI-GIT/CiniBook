package com.cinebook.controller;

import com.cinebook.entity.Movie;
import com.cinebook.entity.User;
import com.cinebook.entity.WatchHistory;
import com.cinebook.repository.MovieRepository;
import com.cinebook.repository.UserRepository;
import com.cinebook.repository.WatchHistoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/watch-history")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:5173")
public class WatchHistoryController {

    private final WatchHistoryRepository watchHistoryRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WatchHistory>> getUserWatchHistory(@PathVariable Long userId) {
        return ResponseEntity.ok(watchHistoryRepository.findByUserIdOrderByWatchedAtDesc(userId));
    }

    @PostMapping
    public ResponseEntity<?> saveWatchProgress(@RequestBody Map<String, Object> payload) {
        Long userId = ((Number) payload.get("userId")).longValue();
        Long movieId = ((Number) payload.get("movieId")).longValue();
        Integer progressSeconds = ((Number) payload.get("progressSeconds")).intValue();

        Optional<WatchHistory> existing = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId);
        WatchHistory history;
        if (existing.isPresent()) {
            history = existing.get();
            history.setProgressSeconds(progressSeconds);
            history.setWatchedAt(LocalDateTime.now());
        } else {
            User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
            Movie movie = movieRepository.findById(movieId).orElseThrow(() -> new RuntimeException("Movie not found"));
            history = WatchHistory.builder()
                    .user(user)
                    .movie(movie)
                    .progressSeconds(progressSeconds)
                    .watchedAt(LocalDateTime.now())
                    .build();
        }
        watchHistoryRepository.save(history);
        return ResponseEntity.ok(Map.of("status", "saved", "progressSeconds", progressSeconds));
    }

    @DeleteMapping("/user/{userId}/movie/{movieId}")
    public ResponseEntity<?> removeWatchHistory(@PathVariable Long userId, @PathVariable Long movieId) {
        Optional<WatchHistory> existing = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId);
        if (existing.isPresent()) {
            watchHistoryRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("status", "deleted"));
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/user/{userId}/movie/{movieId}/restart")
    public ResponseEntity<?> restartMovie(@PathVariable Long userId, @PathVariable Long movieId) {
        Optional<WatchHistory> existing = watchHistoryRepository.findByUserIdAndMovieId(userId, movieId);
        if (existing.isPresent()) {
            WatchHistory history = existing.get();
            history.setProgressSeconds(0);
            history.setWatchedAt(LocalDateTime.now());
            watchHistoryRepository.save(history);
            return ResponseEntity.ok(Map.of("status", "restarted"));
        }
        return ResponseEntity.notFound().build();
    }
}
