package com.cinebook.service.storage;

import com.cinebook.dto.UploadResult;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

public interface StorageProvider {
    String getProviderId();
    String getProviderName();
    boolean isConfigured();
    
    UploadResult uploadFile(MultipartFile file, String path) throws Exception;
    InputStream downloadFile(String fileId) throws Exception;
    void deleteFile(String fileId) throws Exception;
    UploadResult replaceFile(String oldFileId, MultipartFile file, String path) throws Exception;
    String getPublicUrl(String fileId);
    String generateDownloadUrl(String fileId) throws Exception;
    
    long checkRemainingStorage() throws Exception;
    long getUsedStorage();
    long getStorageLimit();
    boolean healthCheck();
    
    // For direct upload URL generation (presigned or resumable session URL)
    String generateUploadUrl(String path, String contentType) throws Exception;
}
