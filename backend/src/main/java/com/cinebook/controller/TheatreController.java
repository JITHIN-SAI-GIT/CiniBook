package com.cinebook.controller;

import com.cinebook.dto.MovieResponse;
import com.cinebook.dto.TheatreRequest;
import com.cinebook.dto.TheatreResponse;
import com.cinebook.service.TheatreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/**
 * Theatre REST controller.
 * Provides CRUD + location-based search endpoints.
 */
@RestController
@RequestMapping("/api/theatres")
@RequiredArgsConstructor
public class TheatreController {

    private final TheatreService theatreService;

    /** Get all theatres */
    @GetMapping
    public ResponseEntity<List<TheatreResponse>> getAll(
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String search
    ) {
        if (city != null && !city.isBlank()) {
            return ResponseEntity.ok(theatreService.getByCity(city));
        }
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(theatreService.search(search));
        }
        return ResponseEntity.ok(theatreService.getAll());
    }

    /** Get theatre by ID */
    @GetMapping("/{id}")
    public ResponseEntity<TheatreResponse> getById(@PathVariable Long id) {
        return ResponseEntity.ok(theatreService.getById(id));
    }

    /** Get nearby theatres by GPS coordinates */
    @GetMapping("/nearby")
    public ResponseEntity<List<TheatreResponse>> getNearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "50") double radius
    ) {
        return ResponseEntity.ok(theatreService.getNearby(lat, lng, radius));
    }

    /** Get movies currently playing at a specific theatre */
    @GetMapping("/{id}/movies")
    public ResponseEntity<List<MovieResponse>> getMovies(@PathVariable Long id) {
        return ResponseEntity.ok(theatreService.getMoviesPlayingAtTheatre(id));
    }

    /** Create a new theatre (admin only) */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<TheatreResponse> create(@RequestBody TheatreRequest req) {
        return ResponseEntity.ok(theatreService.create(req));
    }

    /** Update a theatre (admin only) */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<TheatreResponse> update(@PathVariable Long id,
                                                   @RequestBody TheatreRequest req) {
        return ResponseEntity.ok(theatreService.update(id, req));
    }

    /** Delete a theatre (admin only) */
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        theatreService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
