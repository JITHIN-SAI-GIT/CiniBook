package com.cinebook.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Map;

/**
 * Lightweight health endpoint.
 * Resolves HTTP 403 on the root path by providing a public, unauthenticated
 * status response instead of letting Spring Security block access.
 */
@RestController
public class HealthController {

    private static final Instant START_TIME = Instant.now();

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        return ResponseEntity.ok(buildHealthResponse());
    }

    @GetMapping("/api/health")
    public ResponseEntity<Map<String, Object>> apiHealth() {
        return ResponseEntity.ok(buildHealthResponse());
    }

    private Map<String, Object> buildHealthResponse() {
        long uptimeSeconds = Instant.now().getEpochSecond() - START_TIME.getEpochSecond();
        return Map.of(
            "application", "CineBook",
            "status", "running",
            "version", "production",
            "uptime", uptimeSeconds + "s"
        );
    }
}
