package com.cinebook.service;

import com.cinebook.dto.UploadResult;
import com.cinebook.dto.MovieRequest;
import com.cinebook.dto.MovieResponse;
import com.cinebook.entity.Movie;
import com.cinebook.repository.MovieRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MovieService {

    private final MovieRepository movieRepository;
    private final com.cinebook.repository.ShowtimeRepository showtimeRepository;
    private final com.cinebook.repository.TheatreRepository theatreRepository;
    private final TMDBService tmdbService;
    private final com.cinebook.service.storage.StorageManager storageManager;
    private final com.cinebook.repository.WatchHistoryRepository watchHistoryRepository;
    private final com.cinebook.repository.WatchlistRepository watchlistRepository;
    private final com.cinebook.repository.BookingRepository bookingRepository;
    private final com.cinebook.repository.SeatLockRepository seatLockRepository;

    public java.util.Map<String, Object> checkBookingAvailability(Long tmdbId) {
        java.util.Optional<Movie> movieOpt = movieRepository.findByTmdbId(tmdbId);
        java.util.Map<String, Object> response = new java.util.HashMap<>();
        if (movieOpt.isEmpty()) {
            response.put("available", false);
            response.put("localMovieId", null);
            return response;
        }
        Movie movie = movieOpt.get();
        boolean hasShowtimes = !showtimeRepository.findByMovieIdFromToday(movie.getId(), java.time.LocalDate.now()).isEmpty();
        response.put("available", hasShowtimes);
        response.put("localMovieId", movie.getId());
        return response;
    }

    @org.springframework.transaction.annotation.Transactional
    public java.util.Map<String, Object> initializeBooking(Long tmdbId) {
        Movie movie = tmdbService.importMovieFromTmdb(tmdbId);
        List<com.cinebook.entity.Theatre> theatres = theatreRepository.findAll();
        if (theatres.isEmpty()) {
            return java.util.Map.of("success", false, "message", "No theatres available in system to schedule showtimes.");
        }

        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalTime[] timings = {
            java.time.LocalTime.of(10, 30),
            java.time.LocalTime.of(14, 15),
            java.time.LocalTime.of(18, 0),
            java.time.LocalTime.of(21, 45)
        };

        int count = 0;
        for (int day = 0; day < 3; day++) {
            java.time.LocalDate showDate = today.plusDays(day);
            for (com.cinebook.entity.Theatre theatre : theatres) {
                boolean alreadyHas = !showtimeRepository.findByTheatreIdAndMovieIdAndShowDate(theatre.getId(), movie.getId(), showDate).isEmpty();
                if (alreadyHas) continue;

                for (int i = 0; i < timings.length; i++) {
                    com.cinebook.entity.Showtime st = com.cinebook.entity.Showtime.builder()
                        .movie(movie)
                        .theatre(theatre)
                        .screenName("Screen " + ((i % theatre.getScreens()) + 1))
                        .showDate(showDate)
                        .showTime(timings[i])
                        .pricePlatinum(new java.math.BigDecimal("350.00"))
                        .priceGold(new java.math.BigDecimal("250.00"))
                        .priceSilver(new java.math.BigDecimal("150.00"))
                        .rowsCount(10)
                        .colsCount(12)
                        .build();
                    showtimeRepository.save(st);
                    count++;
                }
            }
        }
        return java.util.Map.of("success", true, "localMovieId", movie.getId(), "showtimesCreated", count);
    }


    public List<MovieResponse> getAll() {
        return movieRepository.findByOrderByCreatedAtDesc()
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> getOttMovies() {
        return movieRepository.findByIsOtt(true)
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> getOttTrending() {
        return movieRepository.findByIsOttAndIsTrendingTrue(true)
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> getTrending() {
        return movieRepository.findByIsTrendingTrue()
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> getTopRated() {
        return movieRepository.findByOrderByRatingDesc()
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> search(String query) {
        return movieRepository.search(query)
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public List<MovieResponse> getByLanguage(String language) {
        return movieRepository.findByLanguageIgnoreCaseOrderByRatingDesc(language)
                .stream().map(MovieResponse::from).collect(Collectors.toList());
    }

    public MovieResponse getById(Long id) {
        return MovieResponse.from(movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found")));
    }

    public MovieResponse create(MovieRequest req) {
        Movie m = Movie.builder()
                .title(req.getTitle())
                .genre(req.getGenre())
                .language(req.getLanguage())
                .duration(req.getDuration() != null ? req.getDuration() : 120)
                .rating(req.getRating() != null ? req.getRating() : 0.0)
                .posterUrl(req.getPosterUrl() != null ? req.getPosterUrl() : "")
                .bannerUrl(req.getBannerUrl() != null ? req.getBannerUrl() : "")
                .trailerUrl(req.getTrailerUrl() != null ? req.getTrailerUrl() : "")
                .synopsis(req.getSynopsis() != null ? req.getSynopsis() : "")
                .castList(req.getCastList())
                .isTrending(req.getIsTrending() != null && req.getIsTrending())
                .isOtt(req.getIsOtt() != null && req.getIsOtt())
                .ottPlatform(req.getOttPlatform())
                .streamUrl(req.getStreamUrl())
                .tmdbId(req.getTmdbId())
                .storageProvider(req.getStorageProvider())
                .backdropUrl(req.getBackdropUrl())
                .videoUrl(req.getVideoUrl())
                .providerFileId(req.getProviderFileId())
                .fileSize(req.getFileSize())
                .videoResolution(req.getVideoResolution())
                .uploadDate(java.time.LocalDateTime.now())
                .downloadEnabled(req.getDownloadEnabled() != null && req.getDownloadEnabled())
                .build();
        return MovieResponse.from(movieRepository.save(m));
    }

    public MovieResponse update(Long id, MovieRequest req) {
        Movie m = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found"));
        if (req.getTitle() != null) m.setTitle(req.getTitle());
        if (req.getGenre() != null) m.setGenre(req.getGenre());
        if (req.getLanguage() != null) m.setLanguage(req.getLanguage());
        if (req.getDuration() != null) m.setDuration(req.getDuration());
        if (req.getRating() != null) m.setRating(req.getRating());
        if (req.getPosterUrl() != null) m.setPosterUrl(req.getPosterUrl());
        if (req.getBannerUrl() != null) m.setBannerUrl(req.getBannerUrl());
        if (req.getTrailerUrl() != null) m.setTrailerUrl(req.getTrailerUrl());
        if (req.getSynopsis() != null) m.setSynopsis(req.getSynopsis());
        if (req.getCastList() != null) m.setCastList(req.getCastList());
        if (req.getIsTrending() != null) m.setIsTrending(req.getIsTrending());
        if (req.getIsOtt() != null) m.setIsOtt(req.getIsOtt());
        if (req.getOttPlatform() != null) m.setOttPlatform(req.getOttPlatform());
        if (req.getStreamUrl() != null) m.setStreamUrl(req.getStreamUrl());
        if (req.getTmdbId() != null) m.setTmdbId(req.getTmdbId());
        if (req.getStorageProvider() != null) m.setStorageProvider(req.getStorageProvider());
        if (req.getBackdropUrl() != null) m.setBackdropUrl(req.getBackdropUrl());
        if (req.getVideoUrl() != null) m.setVideoUrl(req.getVideoUrl());
        if (req.getProviderFileId() != null) m.setProviderFileId(req.getProviderFileId());
        if (req.getFileSize() != null) m.setFileSize(req.getFileSize());
        if (req.getVideoResolution() != null) m.setVideoResolution(req.getVideoResolution());
        if (req.getDownloadEnabled() != null) m.setDownloadEnabled(req.getDownloadEnabled());
        return MovieResponse.from(movieRepository.save(m));
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(Long id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + id));

        // 1. Delete video if exists from its provider
        if (movie.getVideoFileName() != null && !movie.getVideoFileName().isBlank()) {
            try {
                storageManager.deleteFile(movie.getStorageProvider(), movie.getVideoFileName());
            } catch (Exception e) {
                log.warn("Failed to delete video on movie deletion for movieId={} using provider {}: {}",
                        id, movie.getStorageProvider(), e.getMessage());
            }
        }

        // 2. Delete watchlist
        watchlistRepository.deleteByMovieId(id);

        // 3. Delete watch history
        watchHistoryRepository.deleteByMovieId(id);

        // 4. Delete showtimes and their children (bookings, seat locks)
        List<com.cinebook.entity.Showtime> showtimes = showtimeRepository.findByMovieId(id);
        for (com.cinebook.entity.Showtime s : showtimes) {
            List<com.cinebook.entity.Booking> bookings = bookingRepository.findByShowtimeId(s.getId());
            bookingRepository.deleteAll(bookings);
            seatLockRepository.deleteByShowtimeId(s.getId());
            showtimeRepository.delete(s);
        }

        // 5. Finally, delete the movie
        movieRepository.delete(movie);
    }

    // ── Multi-Cloud Storage Methods ────────────────────────────────────────────

    /**
     * Uploads a video file to the best available storage provider and stores the metadata in the DB.
     * Replaces any existing video for the same movie.
     *
     * @param movieId The local DB movie ID.
     * @param file    The multipart video file.
     * @return Map with upload result metadata.
     */
    public Map<String, Object> uploadVideo(Long movieId, MultipartFile file) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        // Delete existing video before replacing
        if (movie.getVideoFileName() != null && !movie.getVideoFileName().isBlank()) {
            log.info("Replacing existing video for movieId={}: {}", movieId, movie.getVideoFileName());
            try {
                storageManager.deleteFile(movie.getStorageProvider(), movie.getVideoFileName());
            } catch (Exception e) {
                log.warn("Failed to delete old video for movieId={}: {}", movieId, e.getMessage());
            }
        }

        String cleanTitle = movie.getTitle().toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        String cleanFilename = file.getOriginalFilename().toLowerCase().replaceAll("[^a-z0-9.]", "-").replaceAll("-+", "-");
        String path = "movies/" + cleanTitle + "/" + cleanTitle + "-" + java.util.UUID.randomUUID().toString().substring(0, 8) + getExtension(cleanFilename);

        try {
            UploadResult result = storageManager.uploadFile(file, path);

            // Persist metadata to DB
            movie.setVideoFileName(result.getProviderFileId());
            movie.setBucketName(result.getProviderName().equals("backblaze_b2") ? "Cini-Book" : "Google Drive");
            movie.setMimeType(file.getContentType());
            movie.setFileSize(result.getFileSize());
            movie.setVideoUrl(result.getPublicUrl());
            movie.setStreamUrl(result.getPublicUrl());
            movie.setStorageProvider(result.getProviderName());
            movie.setUploadDate(LocalDateTime.now());
            movie.setIsOtt(true); // Mark as OTT since it has a streamable video
            movieRepository.save(movie);

            log.info("Video upload complete for movieId={}: provider={}, fileName={}, size={} bytes",
                    movieId, result.getProviderName(), result.getProviderFileId(), result.getFileSize());

            return Map.of(
                "success", true,
                "fileName", result.getProviderFileId(),
                "size", result.getFileSize(),
                "mimeType", file.getContentType(),
                "uploadedAt", LocalDateTime.now().toString(),
                "bucketName", result.getProviderName()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to upload video: " + e.getMessage(), e);
        }
    }

    /**
     * Generates a streaming URL for a movie's video.
     * Returns the URL so the frontend can stream directly from the selected provider.
     *
     * @param movieId The local DB movie ID.
     * @return Map containing the streamUrl key.
     */
    public Map<String, Object> getStreamUrl(Long movieId) {
        return getStreamUrl(movieId, null);
    }

    public Map<String, Object> getStreamUrl(Long movieId, String forceProvider) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        // If a file is stored, generate a streaming URL
        if (movie.getVideoFileName() != null && !movie.getVideoFileName().isBlank()) {
            String primaryProvider = (forceProvider != null && !forceProvider.isBlank()) 
                    ? forceProvider 
                    : (movie.getStorageProvider() != null ? movie.getStorageProvider() : "backblaze_b2");
            
            // Try primary first
            try {
                com.cinebook.service.storage.StorageProvider provider = storageManager.getProvider(primaryProvider);
                if (provider.isConfigured()) {
                    String downloadUrl = provider.generateDownloadUrl(movie.getVideoFileName());
                    String finalUrl = downloadUrl.startsWith("/") ? "https://cinebook-backend-6e0a.onrender.com" + downloadUrl : downloadUrl;
                    return Map.of(
                        "streamUrl", finalUrl,
                        "source", primaryProvider,
                        "movieId", movieId,
                        "title", movie.getTitle(),
                        "cloudSwitching", (forceProvider != null && !forceProvider.isBlank() && !forceProvider.equals(movie.getStorageProvider()))
                    );
                }
            } catch (Exception e) {
                log.warn("Primary provider {} failed or unhealthy, attempting fallback for movieId={}...", primaryProvider, movieId);
            }
            
            // Try fallback provider if not forced
            if (forceProvider == null || forceProvider.isBlank()) {
                String fallbackProvider = primaryProvider.equals("backblaze_b2") ? "google_drive" : "backblaze_b2";
                try {
                    com.cinebook.service.storage.StorageProvider provider = storageManager.getProvider(fallbackProvider);
                    if (provider.isConfigured()) {
                        String downloadUrl = provider.generateDownloadUrl(movie.getVideoFileName());
                        String finalUrl = downloadUrl.startsWith("/") ? "https://cinebook-backend-6e0a.onrender.com" + downloadUrl : downloadUrl;
                        log.info("Successfully fell back to provider {} for movieId={}", fallbackProvider, movieId);
                        return Map.of(
                            "streamUrl", finalUrl,
                            "source", fallbackProvider,
                            "movieId", movieId,
                            "title", movie.getTitle(),
                            "cloudSwitching", true
                        );
                    }
                } catch (Exception e) {
                    log.error("Fallback provider {} also failed for movieId={}", fallbackProvider, movieId);
                }
            }
        }

        // Fall back to the stored streamUrl (e.g. YouTube embed or Supabase URL)
        String fallback = movie.getStreamUrl();
        if (fallback == null || fallback.isBlank()) {
            throw new RuntimeException("No video available for movie: " + movie.getTitle());
        }
        return Map.of(
            "streamUrl", fallback,
            "source", movie.getStorageProvider() != null ? movie.getStorageProvider() : "direct",
            "movieId", movieId,
            "title", movie.getTitle()
        );
    }

    /**
     * Deletes a movie's video from its provider and clears the video metadata from the DB.
     *
     * @param movieId The local DB movie ID.
     */
    public void deleteVideo(Long movieId) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        if (movie.getVideoFileName() != null && !movie.getVideoFileName().isBlank()
                && movie.getStorageProvider() != null) {
            try {
                storageManager.deleteFile(movie.getStorageProvider(), movie.getVideoFileName());
            } catch (Exception e) {
                log.warn("Failed to delete video file for movieId={}: {}", movieId, e.getMessage());
            }
        }

        // Clear video metadata from DB
        movie.setVideoFileName(null);
        movie.setBucketName(null);
        movie.setMimeType(null);
        movie.setFileSize(null);
        movie.setVideoUrl(null);
        movie.setStreamUrl(null);
        movie.setStorageProvider(null);
        movie.setUploadDate(null);
        movieRepository.save(movie);

        log.info("Video deleted for movieId={}", movieId);
    }

    public List<software.amazon.awssdk.services.s3.model.S3Object> listB2ObjectsDirectly() {
        try {
            com.cinebook.service.storage.StorageProvider provider = storageManager.getProvider("backblaze_b2");
            if (provider instanceof com.cinebook.service.storage.BackblazeB2StorageProvider) {
                return ((com.cinebook.service.storage.BackblazeB2StorageProvider) provider).listAllObjects();
            }
        } catch (Exception e) {
            log.error("Failed to list B2 objects directly: {}", e.getMessage());
        }
        return new ArrayList<>();
    }

    public void syncExistingB2Videos() {
        try {
            log.info("Starting sync of existing B2 video files with Database movies...");
            com.cinebook.service.storage.StorageProvider provider = storageManager.getProvider("backblaze_b2");
            if (!(provider instanceof com.cinebook.service.storage.BackblazeB2StorageProvider)) {
                return;
            }
            com.cinebook.service.storage.BackblazeB2StorageProvider b2Provider = 
                (com.cinebook.service.storage.BackblazeB2StorageProvider) provider;
                
            List<software.amazon.awssdk.services.s3.model.S3Object> objects = b2Provider.listAllObjects();
            List<Movie> movies = movieRepository.findAll();
            
            log.info("Found {} objects in B2 bucket and {} movies in DB", objects.size(), movies.size());
            
            for (software.amazon.awssdk.services.s3.model.S3Object obj : objects) {
                String key = obj.key();
                // Filter out non-video keys or tiny files (ignore keys less than 10MB to skip posters/etc)
                if (!key.startsWith("movies/") || obj.size() < 10000000L) {
                    continue;
                }
                
                log.info("Scanning B2 video file: {} (Size: {} bytes)", key, obj.size());
                
                // Try to find a matching movie
                Movie matchedMovie = null;
                for (Movie movie : movies) {
                    String titleSlug = movie.getTitle().toLowerCase()
                            .replaceAll("[^a-z0-9\\s-]", "")
                            .replaceAll("\\s+", "-");
                    
                    log.info("Comparing key '{}' with DB movie '{}' (slug: '{}')", key, movie.getTitle(), titleSlug);
                    
                    // Match if the key contains the title slug or slug matches part of the file name
                    if (!titleSlug.isEmpty() && (key.toLowerCase().contains(titleSlug) || titleSlug.contains(key.toLowerCase()))) {
                        matchedMovie = movie;
                        break;
                    }
                }
                
                if (matchedMovie != null) {
                    log.info("Matched B2 file '{}' to movie '{}' (ID: {})", key, matchedMovie.getTitle(), matchedMovie.getId());
                    matchedMovie.setStorageProvider("backblaze_b2");
                    matchedMovie.setVideoFileName(key);
                    matchedMovie.setFileSize(obj.size());
                    
                    String publicUrl = b2Provider.getPublicUrl(key);
                    matchedMovie.setVideoUrl(publicUrl);
                    matchedMovie.setStreamUrl(publicUrl);
                    matchedMovie.setMimeType(key.endsWith(".mkv") ? "video/x-matroska" : "video/mp4");
                    
                    if (matchedMovie.getUploadDate() == null) {
                        matchedMovie.setUploadDate(java.time.LocalDateTime.now());
                    }
                    movieRepository.save(matchedMovie);
                } else {
                    log.info("No matching movie found in DB for B2 file: {}. Auto-creating movie...", key);
                    String cleanTitle = cleanTitleFromKey(key);
                    
                    Movie newMovie = new Movie();
                    newMovie.setTitle(cleanTitle);
                    newMovie.setStorageProvider("backblaze_b2");
                    newMovie.setVideoFileName(key);
                    newMovie.setFileSize(obj.size());
                    
                    String publicUrl = b2Provider.getPublicUrl(key);
                    newMovie.setVideoUrl(publicUrl);
                    newMovie.setStreamUrl(publicUrl);
                    newMovie.setMimeType(key.endsWith(".mkv") ? "video/x-matroska" : "video/mp4");
                    
                    newMovie.setIsOtt(true);
                    newMovie.setGenre("Drama");
                    newMovie.setDuration(120);
                    newMovie.setRating(7.5);
                    newMovie.setLanguage("Telugu");
                    newMovie.setPosterUrl("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&auto=format&fit=crop");
                    newMovie.setBannerUrl("https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1000&auto=format&fit=crop");
                    newMovie.setSynopsis("This movie was automatically synchronized from Backblaze B2 storage files.");
                    newMovie.setIsTrending(true);
                    newMovie.setDownloadEnabled(true);
                    newMovie.setUploadDate(java.time.LocalDateTime.now());
                    
                    movieRepository.save(newMovie);
                    log.info("Successfully auto-created movie '{}' in DB for B2 file '{}'", cleanTitle, key);
                }
            }
            log.info("Finished sync of B2 video files.");
        } catch (Exception e) {
            log.error("Failed to sync B2 videos: {}", e.getMessage(), e);
        }
    }

    private String cleanTitleFromKey(String key) {
        String folderName = "";
        String[] parts = key.split("/");
        if (parts.length >= 2) {
            folderName = parts[1];
        } else {
            folderName = key;
        }
        
        String title = folderName;
        title = title.replaceAll("-\\p{XDigit}{8}$", ""); // Remove hex UUID suffix
        title = title.replace("-", " ");
        
        // Remove year and language suffixes
        title = title.replaceAll("\\b(202\\d|19\\d\\d)\\b", "");
        title = title.replaceAll("\\b(telugu|tamil|hindi|english|malayalam|kannada)\\b", "");
        title = title.replaceAll("\\s+", " ").trim();
        
        // Capitalize words
        StringBuilder capitalized = new StringBuilder();
        for (String word : title.split(" ")) {
            if (!word.isEmpty()) {
                capitalized.append(Character.toUpperCase(word.charAt(0)))
                           .append(word.substring(1))
                           .append(" ");
            }
        }
        return capitalized.toString().trim();
    }

    /**
     * Returns multi-cloud storage statistics.
     */
    public Map<String, Object> getStorageStats() {
        boolean configured = false;
        long totalObjects = 0L;
        List<Map<String, Object>> providersStats = new ArrayList<>();

        for (com.cinebook.service.storage.StorageProvider provider : storageManager.getProviders()) {
            if (provider.isConfigured()) {
                configured = true;
                long used = provider.getUsedStorage();
                long limit = provider.getStorageLimit();
                long remaining = 0;
                try {
                    remaining = provider.checkRemainingStorage();
                } catch (Exception e) {}

                Long filesCount = movieRepository.countByStorageProvider(provider.getProviderId());
                totalObjects += (filesCount != null ? filesCount : 0L);

                LocalDateTime lastUpload = movieRepository.findLatestUploadDateByStorageProvider(provider.getProviderId());

                Map<String, Object> pStat = new HashMap<>();
                pStat.put("providerId", provider.getProviderId());
                pStat.put("name", provider.getProviderName());
                pStat.put("configured", true);
                pStat.put("healthy", provider.healthCheck());
                pStat.put("status", provider.healthCheck() ? "Connected" : "Unhealthy");
                pStat.put("storageUsed", used);
                pStat.put("storageRemaining", remaining);
                pStat.put("storageLimit", limit);
                pStat.put("filesCount", filesCount != null ? filesCount : 0L);
                pStat.put("lastUpload", lastUpload != null ? lastUpload.toString() : "Never");

                providersStats.add(pStat);
            } else {
                Map<String, Object> pStat = new HashMap<>();
                pStat.put("providerId", provider.getProviderId());
                pStat.put("name", provider.getProviderName());
                pStat.put("configured", false);
                pStat.put("healthy", false);
                pStat.put("status", "Not Configured");
                pStat.put("storageUsed", 0L);
                pStat.put("storageRemaining", 0L);
                pStat.put("storageLimit", provider.getStorageLimit());
                pStat.put("filesCount", 0L);
                pStat.put("lastUpload", "Never");
                providersStats.add(pStat);
            }
        }

        Long totalSizeSum = 0L;
        for (com.cinebook.service.storage.StorageProvider provider : storageManager.getProviders()) {
            totalSizeSum += provider.getUsedStorage();
        }
        double totalGb = (double) totalSizeSum / (1024.0 * 1024.0 * 1024.0);

        String activeProvider = "None";
        try {
            activeProvider = storageManager.selectProvider(0L).getProviderId();
        } catch (Exception e) {}

        Map<String, Object> stats = new HashMap<>();
        stats.put("configured", configured);
        stats.put("totalSizeGb", totalGb);
        stats.put("totalObjects", totalObjects);
        stats.put("activeProvider", activeProvider);
        stats.put("providers", providersStats);
        return stats;
    }

    public Map<String, Object> generateUploadPresignedUrl(Long movieId, String originalFilename, String contentType, Long fileSize) {
        return generateUploadPresignedUrl(movieId, originalFilename, contentType, fileSize, null);
    }

    public Map<String, Object> generateUploadPresignedUrl(Long movieId, String originalFilename, String contentType, Long fileSize, String forceProvider) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        try {
            long size = fileSize != null ? fileSize : 0L;
            String resultStr = storageManager.generateUploadUrl(movie.getTitle(), originalFilename, contentType, size, forceProvider);

            String[] parts = resultStr.split("\\|\\|\\|");
            String uploadUrl = parts[0];
            String objectKey = parts[1];
            String providerId = parts[2];

            return Map.of(
                "uploadUrl", uploadUrl,
                "objectKey", objectKey,
                "provider", providerId,
                "bucketName", providerId.equals("backblaze_b2") ? "Cini-Book" : "Google Drive"
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate upload URL: " + e.getMessage(), e);
        }
    }

    public MovieResponse confirmVideoUpload(Long movieId, Map<String, Object> payload) {
        Movie movie = movieRepository.findById(movieId)
                .orElseThrow(() -> new RuntimeException("Movie not found: " + movieId));

        String objectKey = (String) payload.get("objectKey");
        Long fileSize = payload.get("fileSize") != null ? Long.valueOf(payload.get("fileSize").toString()) : 0L;
        String contentType = (String) payload.get("contentType");
        String provider = (String) payload.get("provider");
        if (provider == null || provider.isBlank()) {
            provider = "backblaze_b2";
        }

        if (objectKey == null || objectKey.isBlank()) {
            throw new IllegalArgumentException("objectKey is required");
        }

        // Delete existing video if different key
        if (movie.getVideoFileName() != null && !movie.getVideoFileName().equals(objectKey)) {
            try {
                storageManager.deleteFile(movie.getStorageProvider(), movie.getVideoFileName());
            } catch (Exception e) {
                log.warn("Failed to delete previous video file: {}", e.getMessage());
            }
        }

        String publicUrl = storageManager.getProvider(provider).getPublicUrl(objectKey);

        movie.setVideoFileName(objectKey);
        movie.setBucketName(provider.equals("backblaze_b2") ? "Cini-Book" : "Google Drive");
        movie.setMimeType(contentType != null ? contentType : "video/mp4");
        movie.setFileSize(fileSize);
        movie.setVideoUrl(publicUrl);
        movie.setStreamUrl(publicUrl);
        movie.setStorageProvider(provider);
        movie.setUploadDate(LocalDateTime.now());
        movie.setIsOtt(true);

        return MovieResponse.from(movieRepository.save(movie));
    }

    private String getExtension(String filename) {
        if (filename == null) return "";
        int idx = filename.lastIndexOf('.');
        return idx == -1 ? "" : filename.substring(idx);
    }
}
