package com.cinebook.dto;

import com.cinebook.entity.Theatre;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class TheatreResponse {
    private Long id;
    private String name;
    private String location;
    private String city;
    private String state;
    private String country;
    private Double latitude;
    private Double longitude;
    private Integer screens;
    private Integer seatCapacity;
    private String phone;
    private String website;
    private Boolean hasParking;
    private Boolean hasFoodCourt;
    private Boolean isWheelchairAccessible;
    private Boolean isBookingEnabled;
    private List<String> photoUrls;
    private LocalDateTime createdAt;

    /** Distance in km — populated only in nearby searches */
    private Double distanceKm;

    public static TheatreResponse from(Theatre t) {
        TheatreResponse r = new TheatreResponse();
        r.id = t.getId();
        r.name = t.getName();
        r.location = t.getLocation();
        r.city = t.getCity();
        r.state = t.getState();
        r.country = t.getCountry();
        r.latitude = t.getLatitude();
        r.longitude = t.getLongitude();
        r.screens = t.getScreens();
        r.seatCapacity = t.getSeatCapacity();
        r.phone = t.getPhone();
        r.website = t.getWebsite();
        r.hasParking = t.getHasParking();
        r.hasFoodCourt = t.getHasFoodCourt();
        r.isWheelchairAccessible = t.getIsWheelchairAccessible();
        r.isBookingEnabled = t.getIsBookingEnabled();
        r.photoUrls = t.getPhotoUrls();
        r.createdAt = t.getCreatedAt();
        return r;
    }
}
