package com.cinebook.service;

import com.cinebook.entity.Movie;
import com.cinebook.repository.MovieRepository;
import com.cinebook.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AnalyticsService {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;

    // Concurrent map of userId -> lastHeartbeatMillis
    private final Map<Long, Long> liveViewers = new ConcurrentHashMap<>();
    private static final long VIEWER_TIMEOUT_MS = 30000; // 30 seconds

    public AnalyticsService(UserRepository userRepository, MovieRepository movieRepository) {
        this.userRepository = userRepository;
        this.movieRepository = movieRepository;
    }

    public void heartbeat(Long userId) {
        liveViewers.put(userId, System.currentTimeMillis());
    }

    public int getLiveViewersCount() {
        long now = System.currentTimeMillis();
        // Remove expired sessions to prevent memory leaks over time
        liveViewers.entrySet().removeIf(entry -> now - entry.getValue() > VIEWER_TIMEOUT_MS);
        return liveViewers.size();
    }

    public long getTotalMembers() {
        return userRepository.count();
    }

    public long getTotalDownloads() {
        Long sum = movieRepository.sumDownloadCount();
        return sum != null ? sum : 0L;
    }

    @Transactional
    public void incrementMovieDownload(Long movieId) {
        Movie movie = movieRepository.findById(movieId).orElse(null);
        if (movie != null) {
            movie.setDownloadCount((movie.getDownloadCount() == null ? 0 : movie.getDownloadCount()) + 1);
            movieRepository.save(movie);
        }
    }
}
