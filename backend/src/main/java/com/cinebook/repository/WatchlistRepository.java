package com.cinebook.repository;

import com.cinebook.entity.Watchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WatchlistRepository extends JpaRepository<Watchlist, Long> {
    List<Watchlist> findByUserIdOrderByAddedAtDesc(Long userId);
    Optional<Watchlist> findByUserIdAndMovieId(Long userId, Long movieId);

    @org.springframework.transaction.annotation.Transactional
    void deleteByMovieId(Long movieId);
}
