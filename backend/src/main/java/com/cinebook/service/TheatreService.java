package com.cinebook.service;

import com.cinebook.dto.MovieResponse;
import com.cinebook.dto.TheatreRequest;
import com.cinebook.dto.TheatreResponse;
import com.cinebook.entity.Theatre;
import com.cinebook.repository.ShowtimeRepository;
import com.cinebook.repository.TheatreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Theatre service — handles CRUD, city-based filtering, and Haversine proximity search.
 */
@Service
@RequiredArgsConstructor
public class TheatreService {

    private final TheatreRepository theatreRepository;
    private final ShowtimeRepository showtimeRepository;

    /** Get all theatres */
    public List<TheatreResponse> getAll() {
        return theatreRepository.findAll().stream()
                .map(TheatreResponse::from).collect(Collectors.toList());
    }

    /** Get theatre by ID */
    public TheatreResponse getById(Long id) {
        return TheatreResponse.from(theatreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Theatre not found")));
    }

    /** Get theatres filtered by city */
    public List<TheatreResponse> getByCity(String city) {
        return theatreRepository.findByCityIgnoreCase(city).stream()
                .map(TheatreResponse::from).collect(Collectors.toList());
    }

    /** Text search across name/location/city */
    public List<TheatreResponse> search(String query) {
        return theatreRepository.search(query).stream()
                .map(TheatreResponse::from).collect(Collectors.toList());
    }

    /**
     * Find theatres within radiusKm of given GPS coordinates.
     * Attaches computed distance to each response.
     */
    public List<TheatreResponse> getNearby(double lat, double lng, double radiusKm) {
        List<Theatre> nearby = theatreRepository.findNearby(lat, lng, radiusKm);
        return nearby.stream().map(t -> {
            TheatreResponse resp = TheatreResponse.from(t);
            if (t.getLatitude() != null && t.getLongitude() != null) {
                resp.setDistanceKm(haversine(lat, lng, t.getLatitude(), t.getLongitude()));
            }
            return resp;
        }).collect(Collectors.toList());
    }

    /**
     * Get distinct movies currently playing at a given theatre (from today onwards).
     */
    public List<MovieResponse> getMoviesPlayingAtTheatre(Long theatreId) {
        LocalDate today = LocalDate.now();
        return showtimeRepository.findByTheatreIdFromToday(theatreId, today)
                .stream()
                .filter(st -> st.getMovie() != null)
                .map(st -> st.getMovie())
                .distinct()
                .map(MovieResponse::from)
                .collect(Collectors.toList());
    }

    /** Create a new theatre */
    public TheatreResponse create(TheatreRequest req) {
        Theatre t = Theatre.builder()
                .name(req.getName())
                .location(req.getLocation() != null ? req.getLocation() : "")
                .city(req.getCity())
                .state(req.getState())
                .country(req.getCountry())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .screens(req.getScreens() != null ? req.getScreens() : 1)
                .seatCapacity(req.getSeatCapacity() != null ? req.getSeatCapacity() : 200)
                .phone(req.getPhone())
                .website(req.getWebsite())
                .hasParking(req.getHasParking() != null ? req.getHasParking() : false)
                .hasFoodCourt(req.getHasFoodCourt() != null ? req.getHasFoodCourt() : false)
                .isWheelchairAccessible(req.getIsWheelchairAccessible() != null ? req.getIsWheelchairAccessible() : false)
                .isBookingEnabled(req.getIsBookingEnabled() != null ? req.getIsBookingEnabled() : true)
                .photoUrls(req.getPhotoUrls())
                .build();
        return TheatreResponse.from(theatreRepository.save(t));
    }

    /** Update an existing theatre */
    public TheatreResponse update(Long id, TheatreRequest req) {
        Theatre t = theatreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Theatre not found"));
        if (req.getName() != null) t.setName(req.getName());
        if (req.getLocation() != null) t.setLocation(req.getLocation());
        if (req.getCity() != null) t.setCity(req.getCity());
        if (req.getState() != null) t.setState(req.getState());
        if (req.getCountry() != null) t.setCountry(req.getCountry());
        if (req.getLatitude() != null) t.setLatitude(req.getLatitude());
        if (req.getLongitude() != null) t.setLongitude(req.getLongitude());
        if (req.getScreens() != null) t.setScreens(req.getScreens());
        if (req.getSeatCapacity() != null) t.setSeatCapacity(req.getSeatCapacity());
        if (req.getPhone() != null) t.setPhone(req.getPhone());
        if (req.getWebsite() != null) t.setWebsite(req.getWebsite());
        if (req.getHasParking() != null) t.setHasParking(req.getHasParking());
        if (req.getHasFoodCourt() != null) t.setHasFoodCourt(req.getHasFoodCourt());
        if (req.getIsWheelchairAccessible() != null) t.setIsWheelchairAccessible(req.getIsWheelchairAccessible());
        if (req.getIsBookingEnabled() != null) t.setIsBookingEnabled(req.getIsBookingEnabled());
        if (req.getPhotoUrls() != null) t.setPhotoUrls(req.getPhotoUrls());
        return TheatreResponse.from(theatreRepository.save(t));
    }

    /** Delete a theatre by ID */
    public void delete(Long id) {
        theatreRepository.deleteById(id);
    }

    /**
     * Haversine formula — computes distance in km between two GPS coordinates.
     */
    private double haversine(double lat1, double lng1, double lat2, double lng2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c * 10.0) / 10.0;
    }
}
