package com.cinebook.dto;

import lombok.Data;
import java.util.List;

@Data
public class MovieRequest {
    private String title;
    private String genre;
    private String language;
    private Integer duration;
    private Double rating;
    private String posterUrl;
    private String bannerUrl;
    private String trailerUrl;
    private String synopsis;
    private List<String> castList;
    private Boolean isTrending;
    private Boolean isOtt;
    private String ottPlatform;
    private String streamUrl;
    private Long tmdbId;
    private String storageProvider;
    private String backdropUrl;
    private String videoUrl;
    private String providerFileId;
    private Long fileSize;
    private String videoResolution;
    private Boolean downloadEnabled;
}
