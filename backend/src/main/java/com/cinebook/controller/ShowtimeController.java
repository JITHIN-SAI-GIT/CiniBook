package com.cinebook.controller;

import com.cinebook.dto.ShowtimeRequest;
import com.cinebook.dto.ShowtimeResponse;
import com.cinebook.service.BookingService;
import com.cinebook.service.SeatLockService;
import com.cinebook.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/showtimes")
@RequiredArgsConstructor
public class ShowtimeController {

    private final ShowtimeService showtimeService;
    private final BookingService bookingService;
    private final SeatLockService seatLockService;

    @GetMapping
    public ResponseEntity<List<ShowtimeResponse>> getAll() {
        return ResponseEntity.ok(showtimeService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ShowtimeResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(showtimeService.getById(id));
    }

    @GetMapping("/movie/{movieId}")
    public ResponseEntity<List<ShowtimeResponse>> getByMovie(@PathVariable Long movieId) {
        return ResponseEntity.ok(showtimeService.getByMovieId(movieId));
    }

    @GetMapping("/{id}/booked-seats")
    public ResponseEntity<List<String>> getBookedSeats(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.getBookedSeats(id));
    }

    @GetMapping("/{id}/locked-seats")
    public ResponseEntity<Map<String, Object>> getLockedSeats(
            @PathVariable Long id,
            Authentication auth) {
        Long userId = auth != null ? (Long) auth.getCredentials() : null;
        List<String> lockedByOthers = userId != null
                ? seatLockService.getLockedSeatsByOthers(id, userId)
                : seatLockService.getAllActiveLocks(id);
        List<String> myLocks = userId != null
                ? seatLockService.getMyLocks(id, userId)
                : List.of();
        return ResponseEntity.ok(Map.of("lockedByOthers", lockedByOthers, "myLocks", myLocks));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ShowtimeResponse> create(@RequestBody ShowtimeRequest req) {
        return ResponseEntity.ok(showtimeService.create(req));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ShowtimeResponse> update(@PathVariable Long id,
                                                    @RequestBody ShowtimeRequest req) {
        return ResponseEntity.ok(showtimeService.update(id, req));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        showtimeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
