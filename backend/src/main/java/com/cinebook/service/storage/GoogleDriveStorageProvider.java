package com.cinebook.service.storage;

import com.cinebook.dto.UploadResult;
import com.cinebook.repository.MovieRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@Service
@Slf4j
public class GoogleDriveStorageProvider implements StorageProvider {

    @Value("${google.drive.client-id:${GOOGLE_DRIVE_CLIENT_ID:NOT_SET}}")
    private String clientId;

    @Value("${google.drive.client-secret:${GOOGLE_DRIVE_CLIENT_SECRET:NOT_SET}}")
    private String clientSecret;

    @Value("${google.drive.refresh-token:${GOOGLE_DRIVE_REFRESH_TOKEN:NOT_SET}}")
    private String refreshToken;

    @Value("${google.drive.folder-id:${GOOGLE_DRIVE_FOLDER_ID:}}")
    private String folderId;

    @Value("${google.drive.storage-limit:${GOOGLE_DRIVE_STORAGE_LIMIT:16106127360}}") // Default: 15 GB (free tier)
    private long storageLimit;

    /** Chunk size for resumable uploads — must be a multiple of 256 KB per Google API docs */
    @Value("${upload.chunk-size.google-drive:5242880}") // Default: 5 MB
    private int chunkSize;

    @Autowired
    @Lazy
    private MovieRepository movieRepository;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    private String accessToken;
    private long tokenExpiryTime;

    private synchronized String getAccessToken() throws Exception {
        if (accessToken != null && System.currentTimeMillis() < tokenExpiryTime) {
            return accessToken;
        }

        log.info("Refreshing Google Drive OAuth2 access token...");
        if (!isConfigured()) {
            throw new IllegalStateException("Google Drive credentials not fully configured.");
        }

        String requestBody = "client_id=" + clientId +
                             "&client_secret=" + clientSecret +
                             "&refresh_token=" + refreshToken +
                             "&grant_type=refresh_token";

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://oauth2.googleapis.com/token"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to refresh Google Drive token: Status=" + response.statusCode() + ", Body=" + response.body());
        }

        JsonNode node = objectMapper.readTree(response.body());
        this.accessToken = node.get("access_token").asText();
        long expiresIn = node.get("expires_in").asLong();
        this.tokenExpiryTime = System.currentTimeMillis() + (expiresIn - 60) * 1000;

        return this.accessToken;
    }

    @Override
    public String getProviderId() {
        return "google_drive";
    }

    @Override
    public String getProviderName() {
        return "Google Drive";
    }

    @Override
    public boolean isConfigured() {
        return clientId != null && !clientId.equals("NOT_SET") && !clientId.isBlank() &&
               clientSecret != null && !clientSecret.equals("NOT_SET") && !clientSecret.isBlank() &&
               refreshToken != null && !refreshToken.equals("NOT_SET") && !refreshToken.isBlank();
    }

    // ── Chunked Resumable Upload ────────────────────────────────────────────

    @Override
    public UploadResult uploadFile(MultipartFile file, String path) throws Exception {
        long totalSize = file.getSize();
        log.info("Initiating chunked resumable Google Drive upload: filename={}, size={} bytes, chunkSize={} bytes",
                file.getOriginalFilename(), totalSize, chunkSize);
        log.info("Upload started: filename={}, size={}, folder={}", file.getOriginalFilename(), totalSize, folderId);

        // Step 1: Initiate resumable session
        String sessionUrl = generateUploadUrl(file.getOriginalFilename(), file.getContentType());

        // Step 2: Upload in chunks
        try (InputStream inputStream = file.getInputStream()) {
            byte[] buffer = new byte[chunkSize];
            long bytesSent = 0;

            while (bytesSent < totalSize) {
                // Read one chunk from the stream
                int bytesRead = readFully(inputStream, buffer);
                if (bytesRead <= 0) break;

                long chunkEnd = bytesSent + bytesRead - 1;

                String contentRange = String.format("bytes %d-%d/%d", bytesSent, chunkEnd, totalSize);
                log.debug("Uploading chunk: {}", contentRange);

                // Retry this chunk up to 5 times on failure
                HttpResponse<String> chunkResponse = uploadChunkWithRetry(
                        sessionUrl, buffer, bytesRead, contentRange, 5);

                int status = chunkResponse.statusCode();

                if (status == 200 || status == 201) {
                    // Upload complete — parse file ID from response
                    JsonNode node = objectMapper.readTree(chunkResponse.body());
                    String fileId = node.get("id").asText();
                    log.info("Google Drive chunked upload complete: fileId={}, totalBytes={}", fileId, totalSize);
                    log.info("Upload completed: fileId={}, size={}, folder={}", fileId, totalSize, folderId);

                    return UploadResult.builder()
                            .publicUrl(getPublicUrl(fileId))
                            .providerFileId(fileId)
                            .providerName(getProviderId())
                            .fileSize(totalSize)
                            .build();

                } else if (status == 308) {
                    // Chunk accepted, more to send
                    String rangeHeader = chunkResponse.headers().firstValue("Range").orElse(null);
                    if (rangeHeader != null && rangeHeader.startsWith("bytes=0-")) {
                        long receivedUpTo = Long.parseLong(rangeHeader.substring("bytes=0-".length()));
                        bytesSent = receivedUpTo + 1;
                    } else {
                        bytesSent += bytesRead;
                    }
                } else {
                    throw new RuntimeException("Google Drive chunk upload returned unexpected status: "
                            + status + ", body=" + chunkResponse.body());
                }
            }
        }

        throw new RuntimeException("Google Drive chunked upload ended without completion response.");
    }

    /**
     * Uploads a single chunk with retry and exponential backoff.
     */
    private HttpResponse<String> uploadChunkWithRetry(String sessionUrl, byte[] data, int length,
                                                       String contentRange, int maxRetries) throws Exception {
        int attempt = 0;
        while (true) {
            try {
                HttpRequest putRequest = HttpRequest.newBuilder()
                        .uri(URI.create(sessionUrl))
                        .PUT(HttpRequest.BodyPublishers.ofByteArray(data, 0, length))
                        .header("Content-Range", contentRange)
                        .timeout(Duration.ofMinutes(5))
                        .build();

                HttpResponse<String> response = httpClient.send(putRequest, HttpResponse.BodyHandlers.ofString());
                int status = response.statusCode();

                // Success or "more data expected" — return immediately
                if (status == 200 || status == 201 || status == 308) {
                    return response;
                }

                // Server error — retryable
                if (status >= 500 && attempt < maxRetries) {
                    long backoff = (long) Math.pow(2, attempt) * 1000L;
                    log.warn("Google Drive chunk upload returned {}, retrying in {}ms (attempt {}/{})",
                            status, backoff, attempt + 1, maxRetries);
                    Thread.sleep(backoff);
                    attempt++;
                    continue;
                }

                // Client error or max retries exceeded
                return response;

            } catch (java.io.IOException e) {
                if (attempt < maxRetries) {
                    long backoff = (long) Math.pow(2, attempt) * 1000L;
                    log.warn("Network error during chunk upload, retrying in {}ms (attempt {}/{}): {}",
                            backoff, attempt + 1, maxRetries, e.getMessage());
                    Thread.sleep(backoff);
                    attempt++;
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * Reads exactly buffer.length bytes (or less at end of stream) from an InputStream.
     */
    private int readFully(InputStream in, byte[] buffer) throws java.io.IOException {
        int totalRead = 0;
        while (totalRead < buffer.length) {
            int read = in.read(buffer, totalRead, buffer.length - totalRead);
            if (read < 0) break;
            totalRead += read;
        }
        return totalRead;
    }

    // ── Download ────────────────────────────────────────────────────────────

    @Override
    public InputStream downloadFile(String fileId) throws Exception {
        String token = getAccessToken();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media"))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build();

        HttpResponse<InputStream> response = httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        if (response.statusCode() != 200 && response.statusCode() != 206) {
            throw new RuntimeException("Failed to download file from Google Drive: Status=" + response.statusCode());
        }
        return response.body();
    }

    /**
     * Download wrapper supporting Range headers for streaming
     */
    public HttpResponse<InputStream> downloadFileWithRange(String fileId, String rangeHeader) throws Exception {
        String token = getAccessToken();
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/drive/v3/files/" + fileId + "?alt=media"))
                .header("Authorization", "Bearer " + token)
                .GET();

        if (rangeHeader != null && !rangeHeader.isBlank()) {
            builder.header("Range", rangeHeader);
        }

        return httpClient.send(builder.build(), HttpResponse.BodyHandlers.ofInputStream());
    }

    // ── Delete / Replace ────────────────────────────────────────────────────

    @Override
    public void deleteFile(String fileId) throws Exception {
        String token = getAccessToken();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/drive/v3/files/" + fileId))
                .header("Authorization", "Bearer " + token)
                .DELETE()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 204 && response.statusCode() != 200) {
            throw new RuntimeException("Failed to delete Google Drive file: Status=" + response.statusCode() + ", Body=" + response.body());
        }
        log.info("Successfully deleted Google Drive file with ID: {}", fileId);
    }

    @Override
    public UploadResult replaceFile(String oldFileId, MultipartFile file, String path) throws Exception {
        if (oldFileId != null && !oldFileId.isBlank()) {
            try {
                deleteFile(oldFileId);
            } catch (Exception e) {
                log.warn("Failed to delete old Google Drive file {} during replace: {}", oldFileId, e.getMessage());
            }
        }
        return uploadFile(file, path);
    }

    // ── URL Generation ──────────────────────────────────────────────────────

    @Override
    public String getPublicUrl(String fileId) {
        // Since Google Drive doesn't have a direct streamable public URL format that is cookie-less
        // and doesn't warn on large files, we generate a proxy stream URL relative to our backend.
        return "/api/movies/google-stream/" + fileId;
    }

    @Override
    public String generateUploadUrl(String path, String contentType) throws Exception {
        String token = getAccessToken();

        // Prepare initiation metadata
        String metadata;
        if (folderId != null && !folderId.isBlank()) {
            metadata = String.format("{\"name\":\"%s\",\"parents\":[\"%s\"]}", path, folderId);
        } else {
            metadata = String.format("{\"name\":\"%s\"}", path);
        }

        // Dynamically resolve origin from active HTTP request to support browser direct uploads.
        // Fallback to empty origin or backend root if no origin header is present.
        String origin = "";
        try {
            org.springframework.web.context.request.RequestAttributes requestAttributes = 
                org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (requestAttributes instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                jakarta.servlet.http.HttpServletRequest req = 
                    ((org.springframework.web.context.request.ServletRequestAttributes) requestAttributes).getRequest();
                if (req != null) {
                    String reqOrigin = req.getHeader("Origin");
                    if (reqOrigin != null && !reqOrigin.isBlank()) {
                        origin = reqOrigin;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not determine dynamic Origin for Google Drive upload, using default: {}", e.getMessage());
        }

        String resolvedContentType = contentType != null ? contentType : "video/mp4";

        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable"))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json; charset=UTF-8")
                .header("X-Upload-Content-Type", resolvedContentType)
                .POST(HttpRequest.BodyPublishers.ofString(metadata));

        if (origin != null && !origin.isBlank()) {
            builder.header("Origin", origin);
        }

        HttpRequest request = builder.build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("Failed to initiate Google Drive Resumable Session: Status=" + response.statusCode() + ", Body=" + response.body());
        }

        // The session upload URL is returned in the 'Location' header
        return response.headers().firstValue("Location")
                .orElseThrow(() -> new RuntimeException("Location header not present in Google Drive resumable session response."));
    }

    public java.util.List<java.util.Map<String, Object>> listAllFiles() {
        java.util.List<java.util.Map<String, Object>> files = new java.util.ArrayList<>();
        if (!isConfigured() || folderId == null || folderId.isBlank()) {
            return files;
        }

        try {
            String token = getAccessToken();
            String query = String.format("'%s' in parents and trashed = false", folderId);
            String url = "https://www.googleapis.com/drive/v3/files?q=" + 
                         java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8) + 
                         "&fields=nextPageToken,files(id,name,size,mimeType)";
            
            String pageToken = null;
            do {
                String pageUrl = url + (pageToken != null ? "&pageToken=" + pageToken : "");
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(pageUrl))
                        .header("Authorization", "Bearer " + token)
                        .GET()
                        .build();

                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) {
                    log.warn("Failed to list Google Drive files: {}", response.body());
                    break;
                }

                JsonNode root = objectMapper.readTree(response.body());
                JsonNode filesArray = root.path("files");
                if (filesArray.isArray()) {
                    for (JsonNode fileNode : filesArray) {
                        java.util.Map<String, Object> fileMap = new java.util.HashMap<>();
                        fileMap.put("id", fileNode.path("id").asText());
                        fileMap.put("name", fileNode.path("name").asText());
                        fileMap.put("mimeType", fileNode.path("mimeType").asText());
                        fileMap.put("size", fileNode.has("size") ? fileNode.get("size").asLong() : 0L);
                        files.add(fileMap);
                    }
                }
                pageToken = root.hasNonNull("nextPageToken") ? root.get("nextPageToken").asText() : null;
            } while (pageToken != null && !pageToken.isEmpty());
            
        } catch (Exception e) {
            log.error("Error listing Google Drive files: {}", e.getMessage(), e);
        }
        return files;
    }

    @Override
    public String generateDownloadUrl(String fileId) throws Exception {
        // Return proxy stream URL relative to our backend
        return "/api/movies/google-stream/" + fileId;
    }

    // ── Storage Quota ───────────────────────────────────────────────────────

    @Override
    public long checkRemainingStorage() throws Exception {
        // Try to get real quota from Google Drive API
        try {
            String token = getAccessToken();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://www.googleapis.com/drive/v3/about?fields=storageQuota"))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                JsonNode root = objectMapper.readTree(response.body());
                JsonNode quota = root.path("storageQuota");
                if (!quota.isMissingNode()) {
                    long limit = quota.has("limit") ? quota.get("limit").asLong() : storageLimit;
                    long usage = quota.has("usage") ? quota.get("usage").asLong() : 0L;
                    long remaining = limit - usage;
                    log.debug("Google Drive real quota: limit={}, usage={}, remaining={}", limit, usage, remaining);
                    // Update our cached storageLimit so getStorageLimit() returns accurate data
                    this.storageLimit = limit;
                    return Math.max(remaining, 0L);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to fetch real Google Drive quota, falling back to DB estimate: {}", e.getMessage());
        }

        // Fallback to DB-based estimate
        long remaining = storageLimit - getUsedStorage();
        return Math.max(remaining, 0L);
    }

    @Override
    public long getUsedStorage() {
        if (movieRepository == null) return 0L;
        Long sum = movieRepository.sumFileSizeByStorageProvider(getProviderId());
        return sum != null ? sum : 0L;
    }

    @Override
    public long getStorageLimit() {
        return storageLimit;
    }

    @Override
    public boolean healthCheck() {
        if (!isConfigured()) {
            return false;
        }
        try {
            // Retrieve token as a health check
            getAccessToken();
            return true;
        } catch (Exception e) {
            log.warn("Google Drive Health Check failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public String getBucketName() {
        return "Google Drive";
    }
}
