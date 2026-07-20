package com.cinebook.controller;

import com.cinebook.service.TMDBService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/tmdb")
@RequiredArgsConstructor
public class TMDBController {

    private final TMDBService tmdbService;

    @GetMapping("/now-playing")
    public ResponseEntity<Map<String, Object>> getNowPlaying(@RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.getNowPlaying(page));
    }

    @GetMapping("/upcoming")
    public ResponseEntity<Map<String, Object>> getUpcoming(@RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.getUpcoming(page));
    }

    @GetMapping("/popular")
    public ResponseEntity<Map<String, Object>> getPopular(@RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.getPopular(page));
    }

    @GetMapping("/trending")
    public ResponseEntity<Map<String, Object>> getTrending() {
        return ResponseEntity.ok(tmdbService.getTrending());
    }

    @GetMapping("/top-rated")
    public ResponseEntity<Map<String, Object>> getTopRated(@RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.getTopRated(page));
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchMovies(
            @RequestParam String query,
            @RequestParam(defaultValue = "1") int page) {
        return ResponseEntity.ok(tmdbService.searchMovies(query, page));
    }

    @GetMapping("/movie/{tmdbId}")
    public ResponseEntity<Map<String, Object>> getMovieDetails(@PathVariable long tmdbId) {
        return ResponseEntity.ok(tmdbService.getMovieDetails(tmdbId));
    }

    /**
     * Returns all homepage TMDB data (nowPlaying, trending, popular, upcoming, topRated)
     * in a single response. Eliminates 5 separate API calls from the frontend.
     */
    @GetMapping("/homepage-bundle")
    public ResponseEntity<Map<String, Object>> getHomepageBundle() {
        Map<String, Object> bundle = tmdbService.getHomepageBundle();
        return ResponseEntity.ok()
                .header("Cache-Control", "public, max-age=300, stale-while-revalidate=600")
                .body(bundle);
    }
}
