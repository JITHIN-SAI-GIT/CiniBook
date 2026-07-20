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
        Thread syncThread = new Thread(() -> {
            long start = System.currentTimeMillis();
            
            // TMDB sync — isolated so failure doesn't block B2 sync
            try {
                log.info("Running initial TMDB movie sync in background...");
                tmdbService.syncNowPlayingMovies();
                log.info("TMDB sync completed in {}ms", System.currentTimeMillis() - start);
            } catch (Exception e) {
                log.error("TMDB sync failed during startup (non-blocking): {}", e.getMessage());
            }
            
            // B2 sync — independent of TMDB
            try {
                long b2Start = System.currentTimeMillis();
                log.info("Running initial B2 cloud sync in background...");
                movieService.syncExistingB2Videos();
                log.info("B2 sync completed in {}ms", System.currentTimeMillis() - b2Start);
            } catch (Exception e) {
                log.error("B2 sync failed during startup (non-blocking): {}", e.getMessage());
            }

            // Google Drive sync
            try {
                long gdStart = System.currentTimeMillis();
                log.info("Running initial Google Drive cloud sync in background...");
                movieService.syncExistingGoogleDriveVideos();
                log.info("Google Drive sync completed in {}ms", System.currentTimeMillis() - gdStart);
            } catch (Exception e) {
                log.error("Google Drive sync failed during startup (non-blocking): {}", e.getMessage());
            }
            
            log.info("Background startup sync finished. Total time: {}ms", System.currentTimeMillis() - start);
        }, "Startup-Sync-Thread");
        syncThread.setDaemon(true);
        syncThread.start();
    }

    // Run every day at 2 AM
    @Scheduled(cron = "0 0 2 * * ?")
    public void scheduledSync() {
        log.info("Running scheduled TMDB movie sync...");
        tmdbService.syncNowPlayingMovies();
        movieService.syncExistingB2Videos();
        movieService.syncExistingGoogleDriveVideos();
    }
}
