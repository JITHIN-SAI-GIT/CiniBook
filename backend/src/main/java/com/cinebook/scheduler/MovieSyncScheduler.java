package com.cinebook.scheduler;

import com.cinebook.service.TMDBService;
import com.cinebook.service.MovieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;

@Component
@RequiredArgsConstructor
@Slf4j
public class MovieSyncScheduler {

    private final TMDBService tmdbService;
    private final MovieService movieService;

    // Run at startup
    @PostConstruct
    public void initSync() {
        log.info("Running initial TMDB movie sync...");
        tmdbService.syncNowPlayingMovies();
        
        log.info("Running post-startup B2 cloud sync...");
        movieService.syncExistingB2Videos();
    }

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void scheduledSync() {
        log.info("Running scheduled TMDB movie sync...");
        tmdbService.syncNowPlayingMovies();
        movieService.syncExistingB2Videos();
    }
}
