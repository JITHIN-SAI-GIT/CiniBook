package com.cinebook.service.storage;

import com.cinebook.dto.UploadResult;
import com.cinebook.repository.MovieRepository;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.util.ArrayList;

import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.List;

@Service
@Slf4j
public class BackblazeB2StorageProvider implements StorageProvider {

    @Value("${b2.key-id:${BACKBLAZE_KEY:NOT_SET}}")
    private String keyId;

    @Value("${b2.application-key:${BACKBLAZE_SECRET:NOT_SET}}")
    private String applicationKey;

    @Value("${b2.bucket-name:${BACKBLAZE_BUCKET:NOT_SET}}")
    private String bucketName;

    @Value("${b2.endpoint:https://s3.us-east-005.backblazeb2.com}")
    private String endpoint;

    @Value("${b2.storage-limit:${BACKBLAZE_STORAGE_LIMIT:10737418240}}") // Default: 10 GB
    private long storageLimit;

    /** Chunk size for multipart uploads — default 10 MB */
    @Value("${upload.chunk-size.backblaze:10485760}")
    private int multipartChunkSize;

    /** Files larger than this threshold use multipart upload — default 100 MB */
    private static final long MULTIPART_THRESHOLD = 100L * 1024 * 1024;

    @Autowired
    @Lazy
    private MovieRepository movieRepository;

    private S3Client s3Client;
    private S3Presigner s3Presigner;

    private Region getRegionFromEndpoint(String endpoint) {
        try {
            String host = java.net.URI.create(endpoint).getHost();
            if (host != null && host.startsWith("s3.")) {
                String regionPart = host.substring(3); // us-east-005.backblazeb2.com
                int firstDot = regionPart.indexOf('.');
                if (firstDot != -1) {
                    return Region.of(regionPart.substring(0, firstDot));
                }
            }
        } catch (Exception e) {}
        return Region.US_EAST_1;
    }

    @PostConstruct
    public void init() {
        if (isConfigured()) {
            try {
                Region b2Region = getRegionFromEndpoint(endpoint);
                log.info("B2 resolved region: {}", b2Region);

                this.s3Client = S3Client.builder()
                        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(keyId, applicationKey)))
                        .endpointOverride(URI.create(endpoint))
                        .region(b2Region)
                        .build();

                this.s3Presigner = S3Presigner.builder()
                        .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(keyId, applicationKey)))
                        .endpointOverride(URI.create(endpoint))
                        .region(b2Region)
                        .build();
                log.info("Backblaze B2 S3 Client initialized successfully for bucket: {}", bucketName);
                
                configureBucketCors();
            } catch (Exception e) {
                log.error("Failed to initialize Backblaze B2 S3 Client: {}", e.getMessage(), e);
            }
        } else {
            log.warn("Backblaze B2 is not fully configured. Missing BACKBLAZE_KEY/B2_KEY_ID or BACKBLAZE_SECRET/B2_APPLICATION_KEY.");
        }
    }

    private void debugListAllBucketsAndFiles() {
        try {
            log.info("Debugging B2 Native details, listing all accessible buckets...");
            // 1. Authorize
            String authUrl = "https://api.backblazeb2.com/b2api/v3/b2_authorize_account";
            String creds = keyId + ":" + applicationKey;
            String encodedCreds = java.util.Base64.getEncoder().encodeToString(creds.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest authRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(authUrl))
                    .header("Authorization", "Basic " + encodedCreds)
                    .GET()
                    .build();
            java.net.http.HttpResponse<String> authResponse = client.send(authRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (authResponse.statusCode() != 200) {
                log.warn("Debug Auth failed: {}", authResponse.statusCode());
                return;
            }
            
            String responseBody = authResponse.body();
            String apiUrl = getValueFromJson(responseBody, "apiUrl");
            String authToken = getValueFromJson(responseBody, "authorizationToken");
            String accountId = getValueFromJson(responseBody, "accountId");
            
            // 2. List Buckets without filtering by name to see what is visible
            String listBucketsUrl = apiUrl + "/b2api/v3/b2_list_buckets";
            String listBody = String.format("{\"accountId\":\"%s\"}", accountId);
            java.net.http.HttpRequest listRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(listBucketsUrl))
                    .header("Authorization", authToken)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(listBody))
                    .build();
            java.net.http.HttpResponse<String> listResponse = client.send(listRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            log.info("Debug List Buckets response code: {}, body: {}", listResponse.statusCode(), listResponse.body());
            
        } catch (Exception e) {
            log.error("Failed in debug list buckets: {}", e.getMessage(), e);
        }
    }

    private void configureBucketCors() {
        try {
            log.info("Configuring CORS on Backblaze B2 bucket: {} using B2 Native REST API...", bucketName);
            java.util.Map<String, String> details = getNativeB2Details();
            if (details.isEmpty()) {
                log.warn("Cannot configure CORS: failed to get Native B2 details");
                return;
            }

            String apiUrl = details.get("apiUrl");
            String authToken = details.get("authToken");
            String bucketId = details.get("bucketId");
            String accountId = details.get("accountId");
            
            // Update CORS rules
            String updateBucketUrl = apiUrl + "/b2api/v3/b2_update_bucket";
            String corsRulesJson = "[" +
                    "{" +
                    "\"corsRuleName\":\"allow-all-origins\"," +
                    "\"allowedOrigins\":[\"*\"]," +
                    "\"allowedHeaders\":[\"*\"]," +
                    "\"allowedOperations\":[\"b2_upload_file\",\"b2_upload_part\",\"b2_download_file_by_id\",\"b2_download_file_by_name\",\"s3_put\",\"s3_get\",\"s3_delete\",\"s3_head\"]," +
                    "\"exposeHeaders\":[\"ETag\",\"Content-Length\",\"Content-Type\",\"Range\",\"Content-Range\"]," +
                    "\"maxAgeSeconds\":3000" +
                    "}" +
                    "]";
            
            String updateBody = String.format("{\"accountId\":\"%s\",\"bucketId\":\"%s\",\"corsRules\":%s}", accountId, bucketId, corsRulesJson);
            
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest updateRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(updateBucketUrl))
                    .header("Authorization", authToken)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(updateBody))
                    .build();
            
            java.net.http.HttpResponse<String> updateResponse = client.send(updateRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (updateResponse.statusCode() == 200) {
                log.info("CORS successfully configured on B2 bucket using B2 Native API");
            } else {
                log.warn("B2 Native update bucket CORS failed with status: {}, body: {}", updateResponse.statusCode(), updateResponse.body());
            }
            
        } catch (Exception e) {
            log.warn("Error during Native B2 CORS configuration: {}", e.getMessage(), e);
        }
    }
    
    private java.util.Map<String, String> getNativeB2Details() {
        java.util.Map<String, String> details = new java.util.HashMap<>();
        try {
            // 1. Authorize Account
            String authUrl = "https://api.backblazeb2.com/b2api/v3/b2_authorize_account";
            String creds = keyId + ":" + applicationKey;
            String encodedCreds = java.util.Base64.getEncoder().encodeToString(creds.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            
            java.net.http.HttpRequest authRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(authUrl))
                    .header("Authorization", "Basic " + encodedCreds)
                    .GET()
                    .build();
            
            java.net.http.HttpResponse<String> authResponse = client.send(authRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (authResponse.statusCode() != 200) {
                log.warn("B2 Native Auth failed with status: {}", authResponse.statusCode());
                return details;
            }
            
            String responseBody = authResponse.body();
            log.info("b2_authorize_account response body: {}", responseBody);
            String apiUrl = getValueFromJson(responseBody, "apiUrl");
            String authToken = getValueFromJson(responseBody, "authorizationToken");
            String accountId = getValueFromJson(responseBody, "accountId");
            
            if (apiUrl == null || authToken == null || accountId == null) {
                return details;
            }
            
            // 2. Get Bucket ID
            String listBucketsUrl = apiUrl + "/b2api/v3/b2_list_buckets";
            String listBody = String.format("{\"accountId\":\"%s\",\"bucketName\":\"%s\"}", accountId, bucketName);
            
            java.net.http.HttpRequest listRequest = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(listBucketsUrl))
                    .header("Authorization", authToken)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(listBody))
                    .build();
            
            java.net.http.HttpResponse<String> listResponse = client.send(listRequest, java.net.http.HttpResponse.BodyHandlers.ofString());
            log.info("b2_list_buckets response status: {}, body: {}", listResponse.statusCode(), listResponse.body());
            if (listResponse.statusCode() != 200) {
                return details;
            }
            
            String bucketId = getValueFromJson(listResponse.body(), "bucketId");
            if (bucketId != null) {
                details.put("apiUrl", apiUrl);
                details.put("authToken", authToken);
                details.put("bucketId", bucketId);
                details.put("accountId", accountId);
            }
        } catch (Exception e) {
            log.error("Failed to get Native B2 details: {}", e.getMessage());
        }
        return details;
    }
    
    public List<S3Object> listAllObjectsNative() {
        List<S3Object> s3Objects = new java.util.ArrayList<>();
        try {
            java.util.Map<String, String> details = getNativeB2Details();
            if (details.isEmpty()) {
                return s3Objects;
            }
            
            String apiUrl = details.get("apiUrl");
            String authToken = details.get("authToken");
            String bucketId = details.get("bucketId");
            
            String listFilesUrl = apiUrl + "/b2api/v3/b2_list_file_versions";
            
            // We try both prefixes: empty (root) and "movies/"
            String[] prefixes = new String[]{"", "movies/"};
            java.util.Set<String> processedKeys = new java.util.HashSet<>();
            
            for (String prefix : prefixes) {
                String requestBody;
                if (prefix.isEmpty()) {
                    requestBody = String.format("{\"bucketId\":\"%s\",\"maxFileCount\":1000}", bucketId);
                } else {
                    requestBody = String.format("{\"bucketId\":\"%s\",\"maxFileCount\":1000,\"prefix\":\"%s\"}", bucketId, prefix);
                }
                
                log.info("Calling b2_list_file_versions with prefix: '{}'", prefix);
                
                java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
                java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                        .uri(java.net.URI.create(listFilesUrl))
                        .header("Authorization", authToken)
                        .header("Content-Type", "application/json")
                        .POST(java.net.http.HttpRequest.BodyPublishers.ofString(requestBody))
                        .build();
                
                java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    String body = response.body();
                    log.info("B2 Native list file versions response length: {}", body.length());
                    
                    try {
                        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                        com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(body);
                        com.fasterxml.jackson.databind.JsonNode filesNode = rootNode.path("files");
                        if (filesNode.isArray()) {
                            for (com.fasterxml.jackson.databind.JsonNode fileNode : filesNode) {
                                String fileName = fileNode.path("fileName").asText();
                                String action = fileNode.path("action").asText();
                                
                                if (action != null && !action.equals("upload")) {
                                    continue;
                                }
                                
                                long size = fileNode.path("contentLength").asLong(0L);
                                if (size == 0L) {
                                    size = fileNode.path("size").asLong(0L);
                                }
                                
                                if (fileName != null && !processedKeys.contains(fileName)) {
                                    processedKeys.add(fileName);
                                    s3Objects.add(S3Object.builder().key(fileName).size(size).build());
                                    log.info("Found native B2 file version: {} (size: {} bytes)", fileName, size);
                                }
                            }
                        }
                    } catch (Exception parseEx) {
                        log.error("Jackson parsing failed for list versions response: {}", parseEx.getMessage(), parseEx);
                    }
                } else {
                    log.warn("B2 Native list file versions failed for prefix '{}': status={}, body={}", prefix, response.statusCode(), response.body());
                }
            }
        } catch (Exception e) {
            log.error("Failed to list B2 objects natively: {}", e.getMessage(), e);
        }
        return s3Objects;
    }

    private String getValueFromJson(String json, String key) {
        String pattern = "\"" + key + "\"[\\s]*:[\\s]*\"([^\"]+)\"";
        java.util.regex.Matcher matcher = java.util.regex.Pattern.compile(pattern).matcher(json);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    public List<S3Object> listAllObjects() {
        List<S3Object> list = new java.util.ArrayList<>();
        if (s3Client != null) {
            try {
                log.info("ListObjectsV2 calling on bucket: {}", bucketName);
                ListObjectsV2Request listRequest = ListObjectsV2Request.builder()
                        .bucket(bucketName)
                        .build();
                ListObjectsV2Response listResponse = s3Client.listObjectsV2(listRequest);
                log.info("ListObjectsV2 response status: {}, keyCount: {}", 
                         listResponse.sdkHttpResponse().statusCode(), 
                         listResponse.keyCount());
                list.addAll(listResponse.contents());
            } catch (Exception e) {
                log.error("Failed to list objects via S3 compatibility API: {}", e.getMessage());
            }
        }
        
        if (list.isEmpty()) {
            log.info("S3 list is empty, falling back to Native B2 list file names...");
            list = listAllObjectsNative();
        }
        
        return list;
    }

    @Override
    public String getProviderId() {
        return "backblaze_b2";
    }

    @Override
    public String getProviderName() {
        return "Backblaze B2";
    }

    @Override
    public boolean isConfigured() {
        return keyId != null && !keyId.equals("NOT_SET") && !keyId.isBlank() &&
               applicationKey != null && !applicationKey.equals("NOT_SET") && !applicationKey.isBlank() &&
               bucketName != null && !bucketName.equals("NOT_SET") && !bucketName.isBlank();
    }

    @Override
    public UploadResult uploadFile(MultipartFile file, String path) throws Exception {
        if (s3Client == null) {
            throw new IllegalStateException("S3Client is not initialized.");
        }

        long fileSize = file.getSize();
        log.info("Uploading file to Backblaze B2: bucket={}, key={}, size={} bytes, multipart={}",
                bucketName, path, fileSize, fileSize > MULTIPART_THRESHOLD);

        if (fileSize > MULTIPART_THRESHOLD) {
            // ── S3 Multipart Upload for large files ──
            return uploadMultipart(file, path);
        } else {
            // ── Single PUT for small files ──
            PutObjectRequest putRequest = PutObjectRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .contentType(file.getContentType())
                    .build();

            s3Client.putObject(putRequest, RequestBody.fromInputStream(file.getInputStream(), fileSize));
        }

        String publicUrl = getPublicUrl(path);
        return UploadResult.builder()
                .publicUrl(publicUrl)
                .providerFileId(path)
                .providerName(getProviderId())
                .fileSize(fileSize)
                .build();
    }

    /**
     * Uploads a large file using S3 multipart upload.
     * Streams the file in chunks — never loads the entire file into RAM.
     * Retries individual parts on failure.
     * Aborts the multipart upload on unrecoverable errors to prevent orphaned parts.
     */
    private UploadResult uploadMultipart(MultipartFile file, String path) throws Exception {
        long fileSize = file.getSize();
        String contentType = file.getContentType() != null ? file.getContentType() : "video/mp4";

        // Step 1: Initiate multipart upload
        CreateMultipartUploadRequest createRequest = CreateMultipartUploadRequest.builder()
                .bucket(bucketName)
                .key(path)
                .contentType(contentType)
                .build();

        CreateMultipartUploadResponse createResponse = s3Client.createMultipartUpload(createRequest);
        String uploadId = createResponse.uploadId();
        log.info("Initiated B2 multipart upload: uploadId={}, key={}", uploadId, path);

        java.util.List<CompletedPart> completedParts = new ArrayList<>();

        try (java.io.InputStream inputStream = file.getInputStream()) {
            byte[] buffer = new byte[multipartChunkSize];
            int partNumber = 1;
            long bytesSent = 0;

            while (bytesSent < fileSize) {
                int bytesRead = readFully(inputStream, buffer);
                if (bytesRead <= 0) break;

                log.debug("Uploading B2 part {}: {} bytes (total sent: {}/{})",
                        partNumber, bytesRead, bytesSent + bytesRead, fileSize);

                // Retry this part up to 3 times
                String etag = uploadPartWithRetry(path, uploadId, partNumber, buffer, bytesRead, 3);

                completedParts.add(CompletedPart.builder()
                        .partNumber(partNumber)
                        .eTag(etag)
                        .build());

                bytesSent += bytesRead;
                partNumber++;
            }

            // Step 3: Complete multipart upload
            CompleteMultipartUploadRequest completeRequest = CompleteMultipartUploadRequest.builder()
                    .bucket(bucketName)
                    .key(path)
                    .uploadId(uploadId)
                    .multipartUpload(CompletedMultipartUpload.builder().parts(completedParts).build())
                    .build();

            s3Client.completeMultipartUpload(completeRequest);
            log.info("B2 multipart upload completed: key={}, parts={}, totalBytes={}", path, completedParts.size(), fileSize);

            String publicUrl = getPublicUrl(path);
            return UploadResult.builder()
                    .publicUrl(publicUrl)
                    .providerFileId(path)
                    .providerName(getProviderId())
                    .fileSize(fileSize)
                    .build();

        } catch (Exception e) {
            // Abort multipart upload to clean up orphaned parts
            log.error("B2 multipart upload failed, aborting uploadId={}: {}", uploadId, e.getMessage());
            try {
                AbortMultipartUploadRequest abortRequest = AbortMultipartUploadRequest.builder()
                        .bucket(bucketName)
                        .key(path)
                        .uploadId(uploadId)
                        .build();
                s3Client.abortMultipartUpload(abortRequest);
                log.info("Successfully aborted B2 multipart upload: uploadId={}", uploadId);
            } catch (Exception abortEx) {
                log.warn("Failed to abort B2 multipart upload {}: {}", uploadId, abortEx.getMessage());
            }
            throw e;
        }
    }

    /**
     * Uploads a single part with retry and exponential backoff.
     * Returns the ETag of the uploaded part.
     */
    private String uploadPartWithRetry(String key, String uploadId, int partNumber,
                                        byte[] data, int length, int maxRetries) throws Exception {
        int attempt = 0;
        while (true) {
            try {
                UploadPartRequest uploadPartRequest = UploadPartRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .uploadId(uploadId)
                        .partNumber(partNumber)
                        .build();

                UploadPartResponse partResponse = s3Client.uploadPart(
                        uploadPartRequest, RequestBody.fromBytes(java.util.Arrays.copyOf(data, length)));

                return partResponse.eTag();

            } catch (Exception e) {
                if (attempt < maxRetries) {
                    long backoff = (long) Math.pow(2, attempt) * 1000L;
                    log.warn("B2 part {} upload failed, retrying in {}ms (attempt {}/{}): {}",
                            partNumber, backoff, attempt + 1, maxRetries, e.getMessage());
                    Thread.sleep(backoff);
                    attempt++;
                } else {
                    throw new RuntimeException("B2 part " + partNumber + " upload failed after " + maxRetries + " retries: " + e.getMessage(), e);
                }
            }
        }
    }

    /**
     * Reads exactly buffer.length bytes (or fewer at end of stream) from an InputStream.
     */
    private int readFully(java.io.InputStream in, byte[] buffer) throws java.io.IOException {
        int totalRead = 0;
        while (totalRead < buffer.length) {
            int read = in.read(buffer, totalRead, buffer.length - totalRead);
            if (read < 0) break;
            totalRead += read;
        }
        return totalRead;
    }

    @Override
    public InputStream downloadFile(String fileId) throws Exception {
        if (s3Client == null) {
            throw new IllegalStateException("S3Client is not initialized.");
        }
        GetObjectRequest getRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileId)
                .build();
        return s3Client.getObject(getRequest);
    }

    @Override
    public void deleteFile(String fileId) throws Exception {
        if (s3Client == null) {
            throw new IllegalStateException("S3Client is not initialized.");
        }
        log.info("Deleting file from Backblaze B2: bucket={}, key={}", bucketName, fileId);
        DeleteObjectRequest deleteRequest = DeleteObjectRequest.builder()
                .bucket(bucketName)
                .key(fileId)
                .build();
        s3Client.deleteObject(deleteRequest);
    }

    @Override
    public UploadResult replaceFile(String oldFileId, MultipartFile file, String path) throws Exception {
        if (oldFileId != null && !oldFileId.isBlank()) {
            try {
                deleteFile(oldFileId);
            } catch (Exception e) {
                log.warn("Failed to delete old B2 file {} during replace: {}", oldFileId, e.getMessage());
            }
        }
        return uploadFile(file, path);
    }

    @Override
    public String getPublicUrl(String fileId) {
        String base = endpoint;
        if (!base.endsWith("/")) {
            base += "/";
        }
        return base + bucketName + "/" + fileId;
    }

    @Override
    public String generateUploadUrl(String path, String contentType) throws Exception {
        if (s3Presigner == null) {
            throw new IllegalStateException("S3Presigner is not initialized.");
        }
        PutObjectPresignRequest putPresignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(1))
                .putObjectRequest(PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(path)
                        .contentType(contentType)
                        .build())
                .build();
        return s3Presigner.presignPutObject(putPresignRequest).url().toString();
    }

    public String getLatestUploadVersionFileId(String fileName) {
        try {
            java.util.Map<String, String> details = getNativeB2Details();
            if (details.isEmpty()) {
                return null;
            }
            
            String apiUrl = details.get("apiUrl");
            String authToken = details.get("authToken");
            String bucketId = details.get("bucketId");
            
            String listFilesUrl = apiUrl + "/b2api/v3/b2_list_file_versions";
            String requestBody = String.format("{\"bucketId\":\"%s\",\"maxFileCount\":10,\"prefix\":\"%s\"}", bucketId, fileName);
            
            java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
            java.net.http.HttpRequest request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create(listFilesUrl))
                    .header("Authorization", authToken)
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();
            
            java.net.http.HttpResponse<String> response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() == 200) {
                com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                com.fasterxml.jackson.databind.JsonNode rootNode = mapper.readTree(response.body());
                com.fasterxml.jackson.databind.JsonNode filesNode = rootNode.path("files");
                if (filesNode.isArray()) {
                    for (com.fasterxml.jackson.databind.JsonNode fileNode : filesNode) {
                        String name = fileNode.path("fileName").asText();
                        String action = fileNode.path("action").asText();
                        if (name.equals(fileName) && action != null && action.equals("upload")) {
                            return fileNode.path("fileId").asText();
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to get latest upload version for {}: {}", fileName, e.getMessage(), e);
        }
        return null;
    }

    @Override
    public String generateDownloadUrl(String fileId) throws Exception {
        if (s3Presigner == null) {
            throw new IllegalStateException("S3Presigner is not initialized.");
        }
        
        String versionId = getLatestUploadVersionFileId(fileId);
        GetObjectRequest.Builder getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(fileId);
        
        if (versionId != null && !versionId.isBlank()) {
            log.info("Resolved B2 fileId {} as versionId for key {}", versionId, fileId);
            getObjectRequest.versionId(versionId);
        } else {
            log.info("No active upload version found for B2 key {}, presigning without versionId", fileId);
        }
        
        GetObjectPresignRequest getPresignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofHours(24))
                .getObjectRequest(getObjectRequest.build())
                .build();
        return s3Presigner.presignGetObject(getPresignRequest).url().toString();
    }

    @Override
    public long checkRemainingStorage() throws Exception {
        long remaining = storageLimit - getUsedStorage();
        return Math.max(remaining, 0L);
    }

    @Override
    public long getUsedStorage() {
        if (s3Client == null) return 0L;
        try {
            List<S3Object> contents = listAllObjects();
            long totalSize = 0L;
            for (S3Object s3Object : contents) {
                totalSize += s3Object.size();
            }
            return totalSize;
        } catch (Exception e) {
            log.error("Failed to query B2 storage size: {}", e.getMessage());
            if (movieRepository == null) return 0L;
            Long sum = movieRepository.sumFileSizeByStorageProvider(getProviderId());
            return sum != null ? sum : 0L;
        }
    }

    @Override
    public long getStorageLimit() {
        return storageLimit;
    }

    @Override
    public boolean healthCheck() {
        if (!isConfigured() || s3Client == null) {
            return false;
        }
        try {
            // Fast check: list max 1 object instead of HeadBucket (which requires more permissions on B2)
            ListObjectsV2Request checkRequest = ListObjectsV2Request.builder()
                    .bucket(bucketName)
                    .maxKeys(1)
                    .build();
            s3Client.listObjectsV2(checkRequest);
            return true;
        } catch (Exception e) {
            log.warn("Backblaze B2 Health Check failed for bucket {}: {}", bucketName, e.getMessage());
            return false;
        }
    }
}
