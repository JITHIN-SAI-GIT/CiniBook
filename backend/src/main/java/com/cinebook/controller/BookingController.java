package com.cinebook.controller;

import com.cinebook.dto.BookingRequest;
import com.cinebook.dto.BookingResponse;
import com.cinebook.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @GetMapping("/my")
    public ResponseEntity<List<BookingResponse>> getMyBookings(Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(bookingService.getByUser(userId));
    }

    @PostMapping
    public ResponseEntity<BookingResponse> create(@RequestBody BookingRequest req,
                                                   Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(bookingService.createBooking(req, userId));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancel(@PathVariable Long id,
                                                   Authentication auth) {
        Long userId = (Long) auth.getCredentials();
        return ResponseEntity.ok(bookingService.cancelBooking(id, userId));
    }

    // Admin endpoint
    @GetMapping("/all")
    public ResponseEntity<List<BookingResponse>> getAll() {
        return ResponseEntity.ok(bookingService.getAll());
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(bookingService.getAdminStats());
    }

    @PutMapping("/{id}/admin-cancel")
    public ResponseEntity<BookingResponse> adminCancel(@PathVariable Long id) {
        return ResponseEntity.ok(bookingService.adminCancelBooking(id));
    }
}
