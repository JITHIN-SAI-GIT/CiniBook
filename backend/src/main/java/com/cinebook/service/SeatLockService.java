package com.cinebook.service;

import com.cinebook.entity.SeatLock;
import com.cinebook.entity.Showtime;
import com.cinebook.entity.User;
import com.cinebook.repository.SeatLockRepository;
import com.cinebook.repository.ShowtimeRepository;
import com.cinebook.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatLockService {

    private static final int LOCK_MINUTES = 5;

    private final SeatLockRepository seatLockRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;

    public List<String> getLockedSeatsByOthers(Long showtimeId, Long userId) {
        return seatLockRepository.findActiveByShowtimeId(showtimeId, LocalDateTime.now())
                .stream()
                .filter(sl -> !sl.getUser().getId().equals(userId))
                .map(sl -> sl.getSeatLabel())
                .collect(Collectors.toList());
    }

    public List<String> getAllActiveLocks(Long showtimeId) {
        return seatLockRepository.findActiveByShowtimeId(showtimeId, LocalDateTime.now())
                .stream()
                .map(sl -> sl.getSeatLabel())
                .collect(Collectors.toList());
    }

    public List<String> getMyLocks(Long showtimeId, Long userId) {
        return seatLockRepository.findActiveByShowtimeAndUser(showtimeId, userId, LocalDateTime.now())
                .stream()
                .map(sl -> sl.getSeatLabel())
                .collect(Collectors.toList());
    }

    @Transactional
    public void lockSeat(Long showtimeId, String seatLabel, Long userId) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new RuntimeException("Showtime not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        SeatLock lock = SeatLock.builder()
                .showtime(showtime)
                .seatLabel(seatLabel)
                .user(user)
                .lockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES))
                .build();
        try {
            seatLockRepository.save(lock);
        } catch (Exception e) {
            throw new RuntimeException("Seat already locked by another user");
        }
    }

    @Transactional
    public void unlockSeat(Long showtimeId, String seatLabel, Long userId) {
        seatLockRepository.deleteByShowtimeAndSeatAndUser(showtimeId, seatLabel, userId);
    }

    @Transactional
    public void unlockAllUserSeats(Long showtimeId, Long userId) {
        seatLockRepository.deleteByShowtimeAndUser(showtimeId, userId);
    }

    @Transactional
    public void refreshLocks(Long showtimeId, Long userId) {
        List<SeatLock> locks = seatLockRepository.findActiveByShowtimeAndUser(
                showtimeId, userId, LocalDateTime.now());
        LocalDateTime newExpiry = LocalDateTime.now().plusMinutes(LOCK_MINUTES);
        locks.forEach(l -> l.setLockedUntil(newExpiry));
        seatLockRepository.saveAll(locks);
    }
}
