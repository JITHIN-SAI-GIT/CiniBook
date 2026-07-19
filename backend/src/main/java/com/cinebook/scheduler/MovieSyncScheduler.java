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

    // Run at startup, but AFTER Tomcat binds to the port (ApplicationReadyEvent)
    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    public void initSync() {
        new Thread(() -> {
            try {
                log.info("Running initial TMDB movie sync in background...");
                tmdbService.syncNowPlayingMovies();
                
                log.info("Running initial B2 cloud sync in background...");
                movieService.syncExistingB2Videos();
                log.info("Background startup sync completed successfully.");
            } catch (Exception e) {
                log.error("Background sync failed during startup: {}", e.getMessage(), e);
            }
        }, "Startup-Sync-Thread").start();
    }

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void scheduledSync() {
        log.info("Running scheduled TMDB movie sync...");
        tmdbService.syncNowPlayingMovies();
        movieService.syncExistingB2Videos();
    }
}
