package com.cinebook.controller;

import com.cinebook.entity.User;
import com.cinebook.repository.UserRepository;
import com.cinebook.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final UserRepository userRepository;

    public AnalyticsController(AnalyticsService analyticsService, UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.userRepository = userRepository;
    }

    @GetMapping("/admin/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalMembers", analyticsService.getTotalMembers());
        stats.put("totalDownloads", analyticsService.getTotalDownloads());
        stats.put("liveViewers", analyticsService.getLiveViewersCount());
        return ResponseEntity.ok(stats);
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Void> heartbeat(Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            User user = userRepository.findByEmail(authentication.getName()).orElse(null);
            if (user != null) {
                analyticsService.heartbeat(user.getId());
            }
        }
        return ResponseEntity.ok().build();
    }

    @PostMapping("/track-download/{movieId}")
    public ResponseEntity<Void> trackDownload(@PathVariable Long movieId, Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            analyticsService.incrementMovieDownload(movieId);
        }
        return ResponseEntity.ok().build();
    }
}
