package com.cinebook.service.storage;

import com.cinebook.dto.UploadResult;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Slf4j
public class StorageManager {

    private final List<StorageProvider> providers;

    public StorageManager(List<StorageProvider> providers) {
        // Sort providers by priority: Backblaze B2 first, then Google Drive
        this.providers = providers.stream()
                .sorted((p1, p2) -> {
                    if ("backblaze_b2".equals(p1.getProviderId())) return -1;
                    if ("backblaze_b2".equals(p2.getProviderId())) return 1;
                    return 0;
                })
                .collect(Collectors.toList());
        log.info("StorageManager initialized with providers in priority order: {}",
                this.providers.stream().map(p -> p.getProviderId()).collect(Collectors.toList()));
    }

    public List<StorageProvider> getProviders() {
        return providers;
    }

    public StorageProvider getProvider(String providerId) {
        if (providerId == null || providerId.isBlank()) {
            throw new IllegalArgumentException("providerId cannot be null or blank");
        }
        return providers.stream()
                .filter(p -> p.getProviderId().equalsIgnoreCase(providerId))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown storage provider: " + providerId));
    }

    public StorageProvider selectProvider(long fileSize) {
        for (StorageProvider provider : providers) {
            if (provider.isConfigured() && provider.healthCheck()) {
                try {
                    long remaining = provider.checkRemainingStorage();
                    if (remaining >= fileSize) {
                        log.info("Auto-selected provider: {} (Available space: {} bytes, required: {} bytes)",
                                provider.getProviderId(), remaining, fileSize);
                        return provider;
                    } else {
                        log.warn("Provider {} has insufficient remaining storage (Available: {} bytes, required: {} bytes)",
                                provider.getProviderId(), remaining, fileSize);
                    }
                } catch (Exception e) {
                    log.error("Failed to check remaining storage for provider {}: {}", provider.getProviderId(), e.getMessage());
                }
            } else {
                log.warn("Provider {} is not configured or is unhealthy.", provider.getProviderId());
            }
        }
        throw new RuntimeException("All configured storage providers are full, unhealthy, or unavailable.");
    }

    public UploadResult uploadFile(MultipartFile file, String folderAndName) throws Exception {
        long fileSize = file.getSize();
        List<String> failedProviders = new ArrayList<>();

        for (StorageProvider provider : providers) {
            if (provider.isConfigured() && provider.healthCheck()) {
                try {
                    long remaining = provider.checkRemainingStorage();
                    if (remaining >= fileSize) {
                        try {
                            log.info("Attempting server-side upload to: {}", provider.getProviderId());
                            UploadResult result = provider.uploadFile(file, folderAndName);
                            log.info("Successfully uploaded file using provider: {}", provider.getProviderId());
                            return result;
                        } catch (Exception e) {
                            log.warn("Server-side upload failed using provider {}, trying next. Error: {}", provider.getProviderId(), e.getMessage());
                            failedProviders.add(provider.getProviderId() + " (Upload error: " + e.getMessage() + ")");
                        }
                    } else {
                        failedProviders.add(provider.getProviderId() + " (Insufficient storage: remaining=" + remaining + ")");
                    }
                } catch (Exception e) {
                    log.error("Storage check error for provider {}: {}", provider.getProviderId(), e.getMessage());
                    failedProviders.add(provider.getProviderId() + " (Storage check error)");
                }
            } else {
                failedProviders.add(provider.getProviderId() + " (Unconfigured or Unhealthy)");
            }
        }

        throw new RuntimeException("All configured storage providers failed or are full. Details: " + String.join(", ", failedProviders));
    }

    public UploadResult uploadFile(MultipartFile file, String folderAndName, String forceProviderId) throws Exception {
        if (forceProviderId != null && !forceProviderId.isBlank()) {
            StorageProvider provider = getProvider(forceProviderId);
            if (provider.isConfigured() && provider.healthCheck()) {
                long remaining = provider.checkRemainingStorage();
                if (remaining >= file.getSize()) {
                    log.info("Attempting server-side upload to forced provider: {}", provider.getProviderId());
                    return provider.uploadFile(file, folderAndName);
                } else {
                    throw new RuntimeException("Forced provider " + forceProviderId + " has insufficient storage. Remaining: " + remaining);
                }
            } else {
                throw new RuntimeException("Forced provider " + forceProviderId + " is not configured or unhealthy.");
            }
        }
        return uploadFile(file, folderAndName);
    }

    public InputStream downloadFile(String providerId, String fileId) throws Exception {
        return getProvider(providerId).downloadFile(fileId);
    }

    public void deleteFile(String providerId, String fileId) throws Exception {
        if (fileId == null || fileId.isBlank()) return;
        getProvider(providerId).deleteFile(fileId);
    }

    public UploadResult replaceFile(String providerId, String oldFileId, MultipartFile file, String folderAndName) throws Exception {
        if (oldFileId != null && !oldFileId.isBlank()) {
            try {
                deleteFile(providerId, oldFileId);
            } catch (Exception e) {
                log.warn("Failed to delete old file {} from provider {} during replace: {}", oldFileId, providerId, e.getMessage());
            }
        }
        return uploadFile(file, folderAndName);
    }

    public String generateUploadUrl(String title, String originalFilename, String contentType, long fileSize) throws Exception {
        return generateUploadUrl(title, originalFilename, contentType, fileSize, null);
    }

    public String generateUploadUrl(String title, String originalFilename, String contentType, long fileSize, String forceProviderId) throws Exception {
        StorageProvider provider;
        if (forceProviderId != null && !forceProviderId.isBlank()) {
            provider = getProvider(forceProviderId);
        } else {
            provider = selectProvider(fileSize);
        }

        // Generate standard clean folder structure and file key
        String cleanTitle = title.toLowerCase().replaceAll("[^a-z0-9]", "-").replaceAll("-+", "-");
        String cleanFilename = originalFilename.toLowerCase().replaceAll("[^a-z0-9.]", "-").replaceAll("-+", "-");
        String objectKey = "movies/" + cleanTitle + "/" + cleanTitle + "-" + UUID.randomUUID().toString().substring(0, 8) + getExtension(cleanFilename);

        String uploadUrl = provider.generateUploadUrl(objectKey, contentType);

        log.info("Generated direct upload URL using provider {}: key={}", provider.getProviderId(), objectKey);
        return uploadUrl + "|||" + objectKey + "|||" + provider.getProviderId();
    }

    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx == -1 ? "" : filename.substring(idx);
    }
}
