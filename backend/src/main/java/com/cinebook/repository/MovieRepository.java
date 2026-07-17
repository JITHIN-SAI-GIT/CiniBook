package com.cinebook.repository;

import com.cinebook.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    List<Movie> findByIsTrendingTrue();
    List<Movie> findByOrderByRatingDesc();
    List<Movie> findByOrderByCreatedAtDesc();

    @Query("SELECT m FROM Movie m WHERE " +
           "LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.genre) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(m.language) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Movie> search(@Param("q") String query);

    List<Movie> findByLanguageIgnoreCaseOrderByRatingDesc(String language);
    List<Movie> findByGenreIgnoreCaseOrderByRatingDesc(String genre);

    Optional<Movie> findByTmdbId(Long tmdbId);

    List<Movie> findByIsOtt(Boolean isOtt);
    List<Movie> findByIsOttAndIsTrendingTrue(Boolean isOtt);

    @Query("SELECT SUM(m.fileSize) FROM Movie m WHERE m.storageProvider = :provider")
    Long sumFileSizeByStorageProvider(@Param("provider") String provider);

    @Query("SELECT COUNT(m) FROM Movie m WHERE m.storageProvider = :provider")
    Long countByStorageProvider(@Param("provider") String provider);

    @Query("SELECT MAX(m.uploadDate) FROM Movie m WHERE m.storageProvider = :provider")
    java.time.LocalDateTime findLatestUploadDateByStorageProvider(@Param("provider") String provider);
}
