package com.cinebook.controller;

import com.cinebook.service.SeatLockService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/seat-locks")
@RequiredArgsConstructor
public class SeatLockController {

    private final SeatLockService seatLockService;

    @PostMapping("/lock")
    public ResponseEntity<Map<String, String>> lock(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long showtimeId = Long.valueOf(body.get("showtimeId").toString());
        String seatLabel = body.get("seatLabel").toString();
        Long userId = (Long) auth.getCredentials();
        seatLockService.lockSeat(showtimeId, seatLabel, userId);
        return ResponseEntity.ok(Map.of("status", "locked"));
    }

    @PostMapping("/unlock")
    public ResponseEntity<Map<String, String>> unlock(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long showtimeId = Long.valueOf(body.get("showtimeId").toString());
        String seatLabel = body.get("seatLabel").toString();
        Long userId = (Long) auth.getCredentials();
        seatLockService.unlockSeat(showtimeId, seatLabel, userId);
        return ResponseEntity.ok(Map.of("status", "unlocked"));
    }

    @PostMapping("/unlock-all")
    public ResponseEntity<Map<String, String>> unlockAll(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long showtimeId = Long.valueOf(body.get("showtimeId").toString());
        Long userId = (Long) auth.getCredentials();
        seatLockService.unlockAllUserSeats(showtimeId, userId);
        return ResponseEntity.ok(Map.of("status", "all unlocked"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(
            @RequestBody Map<String, Object> body,
            Authentication auth) {
        Long showtimeId = Long.valueOf(body.get("showtimeId").toString());
        Long userId = (Long) auth.getCredentials();
        seatLockService.refreshLocks(showtimeId, userId);
        return ResponseEntity.ok(Map.of("status", "refreshed"));
    }
}
