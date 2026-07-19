package com.cinebook.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "movies", indexes = {
    @Index(name = "idx_movie_tmdb_id", columnList = "tmdbId"),
    @Index(name = "idx_movie_is_ott", columnList = "isOtt"),
    @Index(name = "idx_movie_is_trending", columnList = "isTrending"),
    @Index(name = "idx_movie_language", columnList = "language"),
    @Index(name = "idx_movie_storage_provider", columnList = "storageProvider")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Movie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String genre;

    @Column(nullable = false)
    private String language;

    @Column(nullable = false)
    @Builder.Default
    private Integer duration = 120;

    @Column(nullable = false, columnDefinition = "DECIMAL(3,1) DEFAULT 0")
    @Builder.Default
    private Double rating = 0.0;

    @Column(name = "poster_url", columnDefinition = "TEXT")
    @Builder.Default
    private String posterUrl = "";

    @Column(name = "banner_url", columnDefinition = "TEXT")
    @Builder.Default
    private String bannerUrl = "";

    @Column(name = "trailer_url", columnDefinition = "TEXT")
    @Builder.Default
    private String trailerUrl = "";

    @Column(columnDefinition = "TEXT")
    @Builder.Default
    private String synopsis = "";

    @ElementCollection
    @CollectionTable(name = "movie_cast", joinColumns = @JoinColumn(name = "movie_id"))
    @Column(name = "actor_name")
    private List<String> castList;

    @Column(name = "is_trending", nullable = false)
    @Builder.Default
    private Boolean isTrending = false;

    @Column(name = "tmdb_id", unique = true)
    private Long tmdbId;

    @Column(name = "release_date")
    private String releaseDate;

    private String director;

    @Column(name = "censor_certificate")
    private String censorCertificate;

    @ElementCollection
    @CollectionTable(name = "movie_crew", joinColumns = @JoinColumn(name = "movie_id"))
    @Column(name = "crew_member_name")
    private List<String> crewList;

    @Column(name = "is_ott", nullable = false)
    @Builder.Default
    private Boolean isOtt = false;

    @Column(name = "ott_platform")
    private String ottPlatform;

    @Column(name = "stream_url", columnDefinition = "TEXT")
    private String streamUrl;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "storage_provider")
    private String storageProvider;

    @Column(name = "backdrop_url", columnDefinition = "TEXT")
    private String backdropUrl;

    @Column(name = "video_url", columnDefinition = "TEXT")
    private String videoUrl;

    @Column(name = "provider_file_id")
    private String providerFileId;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "video_resolution")
    private String videoResolution;

    @Column(name = "upload_date")
    private LocalDateTime uploadDate;

    @Column(name = "download_enabled", nullable = false)
    @Builder.Default
    private Boolean downloadEnabled = false;

    // ── Backblaze B2 Video Storage Fields ────────────────────────────────────

    /** S3 object key in Backblaze B2 (e.g. movies/title/title-uuid.mp4) */
    @Column(name = "video_file_name", columnDefinition = "VARCHAR(512)")
    private String videoFileName;

    /** B2 bucket name the video is stored in */
    @Column(name = "bucket_name")
    private String bucketName;

    /** MIME type of the video file (e.g. video/mp4) */
    @Column(name = "mime_type")
    private String mimeType;

    public String getBackdropUrl() {
        return backdropUrl != null ? backdropUrl : bannerUrl;
    }

    public String getVideoUrl() {
        return videoUrl != null ? videoUrl : streamUrl;
    }

    public void setBackdropUrl(String backdropUrl) {
        this.backdropUrl = backdropUrl;
        this.bannerUrl = backdropUrl;
    }

    public void setVideoUrl(String videoUrl) {
        this.videoUrl = videoUrl;
        this.streamUrl = videoUrl;
    }
}
