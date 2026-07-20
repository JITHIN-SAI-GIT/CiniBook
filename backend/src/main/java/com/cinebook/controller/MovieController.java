package com.cinebook.controller;

import com.cinebook.dto.MovieRequest;
import com.cinebook.dto.MovieResponse;
import com.cinebook.service.MovieService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
@Slf4j
public class MovieController {

    private final MovieService movieService;
    private final com.cinebook.service.storage.GoogleDriveStorageProvider googleDriveStorageProvider;

    // ── Existing endpoints (unchanged) ──────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<MovieResponse>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) Boolean trending,
            @RequestParam(required = false) Boolean topRated,
            @RequestParam(required = false) Boolean isOtt) {

        if (Boolean.TRUE.equals(isOtt)) {
            if (Boolean.TRUE.equals(trending)) {
                return ResponseEntity.ok(movieService.getOttTrending());
            }
            return ResponseEntity.ok(movieService.getOttMovies());
        }

        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(movieService.search(search));
        }
        if (language != null && !language.isBlank() && !language.equalsIgnoreCase("all")) {
            return ResponseEntity.ok(movieService.getByLanguage(language));
        }
        if (Boolean.TRUE.equals(trending)) {
            return ResponseEntity.ok(movieService.getTrending());
        }
        if (Boolean.TRUE.equals(topRated)) {
            return ResponseEntity.ok(movieService.getTopRated());
        }
        return ResponseEntity.ok(movieService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(movieService.getById(id));
    }

    @GetMapping("/tmdb/{tmdbId}/availability")
    public ResponseEntity<Map<String, Object>> checkBookingAvailability(@PathVariable Long tmdbId) {
        return ResponseEntity.ok(movieService.checkBookingAvailability(tmdbId));
    }

    @PostMapping("/tmdb/{tmdbId}/initialize-booking")
    public ResponseEntity<Map<String, Object>> initializeBooking(@PathVariable Long tmdbId) {
        return ResponseEntity.ok(movieService.initializeBooking(tmdbId));
    }

    @PostMapping
    public ResponseEntity<MovieResponse> create(@RequestBody MovieRequest req) {
        return ResponseEntity.ok(movieService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MovieResponse> update(@PathVariable Long id,
                                                 @RequestBody MovieRequest req) {
        return ResponseEntity.ok(movieService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        movieService.delete(id);
        return ResponseEntity.noContent().build();
    }

    // ── New Backblaze B2 Video Endpoints ─────────────────────────────────────

    /**
     * GET /api/movies/{id}/stream
     * Returns a pre-signed streaming URL for the movie video.
     * Requires authentication (any logged-in user).
     */
    @GetMapping("/{id}/stream")
    public ResponseEntity<Map<String, Object>> getStreamUrl(
            @PathVariable Long id,
            @RequestParam(required = false) String provider,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401)
                    .body(Map.of("error", "Authentication required to stream movies."));
        }

        log.info("Stream URL requested for movieId={} (forced provider={}) by user={}", id, provider, authentication.getName());
        Map<String, Object> result = movieService.getStreamUrl(id, provider);
        return ResponseEntity.ok(result);
    }

    /**
     * POST /api/movies/{id}/video
     * Upload a video file to Backblaze B2 and associate it with the movie.
     * Admin only.
     */
    @PostMapping(value = "/{id}/video", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> uploadVideo(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "provider", required = false) String provider) {

        log.info("Admin video upload request for movieId={}, fileName={}, size={} bytes, provider={}",
                id, file.getOriginalFilename(), file.getSize(), provider);

        Map<String, Object> result = movieService.uploadVideo(id, file, provider);
        return ResponseEntity.ok(result);
    }

    /**
     * DELETE /api/movies/{id}/video
     * Remove the video from Backblaze B2 and clear video metadata from DB.
     * Admin only.
     */
    @DeleteMapping("/{id}/video")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> deleteVideo(@PathVariable Long id) {
        log.info("Admin video delete request for movieId={}", id);
        movieService.deleteVideo(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Video deleted successfully."));
    }

    /**
     * GET /api/movies/storage/stats
     * Returns aggregate B2 storage statistics.
     * Admin only.
     */
    @GetMapping("/storage/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getStorageStats() {
        return ResponseEntity.ok(movieService.getStorageStats());
    }

    @GetMapping("/storage/b2-test-list")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> testListB2() {
        log.info("Debugging B2 list files endpoint...");
        List<Map<String, Object>> list = new ArrayList<>();

        
        // Let's call a method in movieService or directly in backblazeB2StorageProvider!
        try {
            List<software.amazon.awssdk.services.s3.model.S3Object> objs = movieService.listB2ObjectsDirectly();
            for (software.amazon.awssdk.services.s3.model.S3Object obj : objs) {
                Map<String, Object> map = new HashMap<>();
                map.put("key", obj.key());
                map.put("size", obj.size());
                map.put("lastModified", obj.lastModified() != null ? obj.lastModified().toString() : "");
                list.add(map);
            }
        } catch (Exception e) {
            log.error("B2 direct listing error: {}", e.getMessage(), e);
        }
        return ResponseEntity.ok(list);
    }

    @GetMapping("/{id}/presigned-upload-url")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPresignedUploadUrl(
            @PathVariable Long id,
            @RequestParam("fileName") String fileName,
            @RequestParam("contentType") String contentType,
            @RequestParam(value = "fileSize", required = false) Long fileSize,
            @RequestParam(value = "provider", required = false) String provider) {
        log.info("Request pre-signed upload URL for movieId={}, fileName={}, contentType={}, fileSize={}, provider={}", id, fileName, contentType, fileSize, provider);
        Map<String, Object> result = movieService.generateUploadPresignedUrl(id, fileName, contentType, fileSize, provider);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/confirm-upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.cinebook.dto.MovieResponse> confirmUpload(
            @PathVariable Long id,
            @RequestBody Map<String, Object> payload) {
        log.info("Confirm direct video upload complete for movieId={}", id);
        com.cinebook.dto.MovieResponse result = movieService.confirmVideoUpload(id, payload);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/google-stream/**")
    public void streamGoogleDriveFile(
            jakarta.servlet.http.HttpServletRequest request,
            @RequestHeader(value = "Range", required = false) String rangeHeader,
            jakarta.servlet.http.HttpServletResponse response) {
        try {
            String requestURI = request.getRequestURI();
            String prefix = "/google-stream/";
            int prefixIdx = requestURI.indexOf(prefix);
            String fileId = prefixIdx != -1 ? requestURI.substring(prefixIdx + prefix.length()) : "";

            if (fileId == null || fileId.isBlank()) {
                log.error("File ID is missing in the request.");
                response.setStatus(400);
                response.getWriter().write("File ID is missing.");
                return;
            }

            log.info("Streaming Google Drive file: fileId={}, Range={}", fileId, rangeHeader);
            java.net.http.HttpResponse<java.io.InputStream> googleResponse = 
                    googleDriveStorageProvider.downloadFileWithRange(fileId, rangeHeader);
            
            int statusCode = googleResponse.statusCode();
            
            if (statusCode == 404) {
                String errorBody = "";
                try {
                    errorBody = new String(googleResponse.body().readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                } catch (Exception e) {
                    log.warn("Could not read error body from Google Drive response: {}", e.getMessage());
                }
                log.error("Google Drive API returned 404 for File ID: {}. Response: {}", fileId, errorBody);
                response.setStatus(404);
                response.getWriter().write("Download failed: 404 Not Found from Google Drive.");
                return;
            }
            
            response.setStatus(statusCode);
            
            googleResponse.headers().map().forEach((key, values) -> {
                if (key.equalsIgnoreCase("Content-Type") || 
                    key.equalsIgnoreCase("Content-Range") || 
                    key.equalsIgnoreCase("Accept-Ranges") ||
                    key.equalsIgnoreCase("Content-Disposition")) {
                    values.forEach(val -> response.setHeader(key, val));
                }
            });
            
            try (java.io.InputStream in = googleResponse.body();
                 java.io.OutputStream out = response.getOutputStream()) {
                if (in != null) {
                    byte[] buffer = new byte[16 * 1024];
                    int bytesRead;
                    while ((bytesRead = in.read(buffer)) != -1) {
                        out.write(buffer, 0, bytesRead);
                    }
                    out.flush();
                }
            }
        } catch (Exception e) {
            log.error("Failed to stream file from Google Drive: {}", e.getMessage(), e);
            response.setStatus(500);
        }
    }
}
