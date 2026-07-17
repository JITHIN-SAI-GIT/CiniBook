package com.cinebook.scheduler;

import com.cinebook.repository.SeatLockRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class SeatLockCleanupScheduler {

    private final SeatLockRepository seatLockRepository;

    @Scheduled(fixedDelay = 60000) // every 60 seconds
    @Transactional
    public void cleanupExpiredLocks() {
        int deleted = seatLockRepository.deleteExpired(LocalDateTime.now());
        if (deleted > 0) {
            log.info("Cleaned up {} expired seat locks", deleted);
        }
    }
}
