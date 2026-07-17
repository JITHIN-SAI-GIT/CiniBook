package com.cinebook.dto;

import com.cinebook.entity.Movie;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class MovieResponse {
    private Long id;
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
    private LocalDateTime createdAt;
    private String storageProvider;
    private String backdropUrl;
    private String videoUrl;
    private String providerFileId;
    private Long fileSize;
    private String videoResolution;
    private LocalDateTime uploadDate;
    private Boolean downloadEnabled;

    public static MovieResponse from(Movie m) {
        MovieResponse r = new MovieResponse();
        r.id = m.getId();
        r.title = m.getTitle();
        r.genre = m.getGenre();
        r.language = m.getLanguage();
        r.duration = m.getDuration();
        r.rating = m.getRating();
        r.posterUrl = m.getPosterUrl();
        r.bannerUrl = m.getBannerUrl();
        r.trailerUrl = m.getTrailerUrl();
        r.synopsis = m.getSynopsis();
        r.castList = m.getCastList();
        r.isTrending = m.getIsTrending();
        r.isOtt = m.getIsOtt();
        r.ottPlatform = m.getOttPlatform();
        r.streamUrl = m.getStreamUrl();
        r.tmdbId = m.getTmdbId();
        r.createdAt = m.getCreatedAt();
        r.storageProvider = m.getStorageProvider();
        r.backdropUrl = m.getBackdropUrl();
        r.videoUrl = m.getVideoUrl();
        r.providerFileId = m.getProviderFileId();
        r.fileSize = m.getFileSize();
        r.videoResolution = m.getVideoResolution();
        r.uploadDate = m.getUploadDate();
        r.downloadEnabled = m.getDownloadEnabled();
        return r;
    }
}
