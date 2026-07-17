package com.cinebook.service;

import com.cinebook.dto.BookingRequest;
import com.cinebook.dto.BookingResponse;
import com.cinebook.entity.*;
import com.cinebook.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final SeatLockRepository seatLockRepository;
    private final RewardService rewardService;

    public List<BookingResponse> getByUser(Long userId) {
        return bookingRepository.findByUserIdWithDetails(userId)
                .stream().map(BookingResponse::from).collect(Collectors.toList());
    }

    public List<BookingResponse> getAll() {
        return bookingRepository.findAllWithDetails()
                .stream().map(BookingResponse::from).collect(Collectors.toList());
    }

    public List<String> getBookedSeats(Long showtimeId) {
        return bookingRepository.findSeatsByShowtimeId(showtimeId);
    }

    @Transactional
    public BookingResponse createBooking(BookingRequest req, Long userId) {
        Showtime showtime = showtimeRepository.findById(req.getShowtimeId())
                .orElseThrow(() -> new RuntimeException("Showtime not found"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Verify all seats are still locked by this user
        List<SeatLock> myLocks = seatLockRepository.findActiveByShowtimeAndUser(
                req.getShowtimeId(), userId, LocalDateTime.now());
        Set<String> myLockedSeats = myLocks.stream()
                .map(lock -> lock.getSeatLabel()).collect(Collectors.toSet());
        boolean allValid = req.getSeats().stream().allMatch(myLockedSeats::contains);
        if (!allValid) {
            throw new RuntimeException("Seat lock expired. Please reselect seats.");
        }

        // Double check: no confirmed bookings for these seats
        List<String> alreadyBooked = getBookedSeats(req.getShowtimeId());
        boolean conflict = req.getSeats().stream().anyMatch(alreadyBooked::contains);
        if (conflict) {
            throw new RuntimeException("Some seats were just booked by another user.");
        }

        Booking booking = Booking.builder()
                .user(user)
                .showtime(showtime)
                .seats(req.getSeats())
                .totalAmount(BigDecimal.valueOf(req.getTotalAmount()))
                .status(Booking.BookingStatus.CONFIRMED)
                .bookingRef(generateBookingRef())
                .build();
        booking = bookingRepository.save(booking);

        // Release locks
        seatLockRepository.deleteByShowtimeAndUser(req.getShowtimeId(), userId);

        // Process rewards
        rewardService.processBookingRewards(user, req.getSeats().size());

        return BookingResponse.from(booking);
    }

    @Transactional
    public BookingResponse cancelBooking(Long bookingId, Long userId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (!booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Not authorized");
        }
        booking.setStatus(Booking.BookingStatus.CANCELLED);
        return BookingResponse.from(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponse adminCancelBooking(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        booking.setStatus(Booking.BookingStatus.CANCELLED);
        return BookingResponse.from(bookingRepository.save(booking));
    }

    private String generateBookingRef() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }

    public Map<String, Object> getAdminStats() {
        List<Booking> all = bookingRepository.findAll();
        List<Booking> confirmed = all.stream()
                .filter(b -> b.getStatus() == Booking.BookingStatus.CONFIRMED)
                .collect(Collectors.toList());

        double revenue = confirmed.stream()
                .mapToDouble(b -> b.getTotalAmount().doubleValue()).sum();
        int totalSeats = confirmed.stream()
                .mapToInt(b -> b.getSeats().size()).sum();

        // Last 7 days bookings
        List<Map<String, Object>> last7Days = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDateTime day = LocalDateTime.now().minusDays(i);
            String dateStr = day.toLocalDate().toString();
            long count = confirmed.stream()
                    .filter(b -> b.getCreatedAt().toLocalDate().equals(day.toLocalDate()))
                    .count();
            last7Days.add(Map.of("date", dateStr, "count", count));
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRevenue", revenue);
        stats.put("totalBookings", confirmed.size());
        stats.put("totalSeats", totalSeats);
        stats.put("last7Days", last7Days);
        return stats;
    }
}
