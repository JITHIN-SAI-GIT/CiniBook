package com.cinebook.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageDTO {
    private String sessionId;
    private String userId;
    private String sender; // "user" or "bot"
    private String message;
    private String type; // MOVIE_INFO, SHOWTIME_QUERY, BOOKING_STATUS, SEAT_AVAILABILITY, GENERAL
    private LocalDateTime timestamp;
}
