package com.cinebook.repository;

import com.cinebook.entity.Reward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RewardRepository extends JpaRepository<Reward, Long> {
    List<Reward> findByUserIdOrderByEarnedDateDesc(Long userId);
}
