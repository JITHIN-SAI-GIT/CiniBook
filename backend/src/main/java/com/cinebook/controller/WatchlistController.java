package com.cinebook.controller;

import com.cinebook.entity.Movie;
import com.cinebook.entity.User;
import com.cinebook.entity.Watchlist;
import com.cinebook.repository.MovieRepository;
import com.cinebook.repository.UserRepository;
import com.cinebook.repository.WatchlistRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Optional;
import java.util.Map;

@RestController
@RequestMapping("/api/watchlist")
@RequiredArgsConstructor
public class WatchlistController {

    private final WatchlistRepository watchlistRepository;
    private final UserRepository userRepository;
    private final MovieRepository movieRepository;

    @GetMapping("/user/{userId}")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getUserWatchlist(@PathVariable Long userId) {
        List<Map<String, Object>> response = watchlistRepository.findByUserIdOrderByAddedAtDesc(userId).stream()
            .map(w -> {
                Map<String, Object> movieMap = new java.util.HashMap<>();
                movieMap.put("id", w.getMovie().getId());
                movieMap.put("title", w.getMovie().getTitle());
                movieMap.put("posterUrl", w.getMovie().getPosterUrl());
                movieMap.put("rating", w.getMovie().getRating());
                movieMap.put("ottPlatform", w.getMovie().getOttPlatform());
                movieMap.put("isOtt", w.getMovie().getIsOtt());
                
                Map<String, Object> rootMap = new java.util.HashMap<>();
                rootMap.put("id", w.getId());
                rootMap.put("movie", movieMap);
                return rootMap;
            })
            .toList();
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> toggleWatchlist(@RequestBody Map<String, Long> payload) {
        Long userId = payload.get("userId");
        Long movieId = payload.get("movieId");
        
        Optional<Watchlist> existing = watchlistRepository.findByUserIdAndMovieId(userId, movieId);
        if (existing.isPresent()) {
            watchlistRepository.delete(existing.get());
            return ResponseEntity.ok(Map.of("status", "removed"));
        } else {
            User user = userRepository.findById(userId).orElseThrow();
            Movie movie = movieRepository.findById(movieId).orElseThrow();
            Watchlist w = Watchlist.builder().user(user).movie(movie).build();
            watchlistRepository.save(w);
            return ResponseEntity.ok(Map.of("status", "added"));
        }
    }
}
