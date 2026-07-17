package com.cinebook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IntentResultDTO {
    private String intent; // MOVIE_INFO, SHOWTIME_QUERY, BOOKING_STATUS, SEAT_AVAILABILITY, GENERAL
    private String movie;
    private String date;
    private String theatre;
}
