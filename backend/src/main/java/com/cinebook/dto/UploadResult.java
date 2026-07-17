package com.cinebook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UploadResult {
    private String publicUrl;
    private String providerFileId;
    private String providerName;
    private Long fileSize;
    private String resolution;
}
