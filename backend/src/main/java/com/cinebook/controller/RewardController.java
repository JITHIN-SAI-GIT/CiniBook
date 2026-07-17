package com.cinebook.controller;

import com.cinebook.entity.Reward;
import com.cinebook.entity.User;
import com.cinebook.repository.RewardRepository;
import com.cinebook.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardController {

    private final RewardRepository rewardRepository;
    private final UserRepository userRepository;

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserRewards(@PathVariable Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<Reward> rewards = rewardRepository.findByUserIdOrderByEarnedDateDesc(userId);
        
        return ResponseEntity.ok(Map.of(
            "lifetimeTickets", user.getLifetimeTickets(),
            "ticketsSinceLastReward", user.getTicketsSinceLastReward(),
            "rewards", rewards
        ));
    }
}
