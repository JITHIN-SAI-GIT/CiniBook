package com.cinebook.dto;

import lombok.Data;
import java.util.List;

@Data
public class TheatreRequest {
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
}
