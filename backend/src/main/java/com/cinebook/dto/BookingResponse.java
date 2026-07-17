package com.cinebook.dto;

import com.cinebook.entity.Booking;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class BookingResponse {
    private Long id;
    private Long userId;
    private String userFullName;
    private String userEmail;
    private ShowtimeResponse showtime;
    private List<String> seats;
    private BigDecimal totalAmount;
    private String status;
    private String bookingRef;
    private LocalDateTime createdAt;

    public static BookingResponse from(Booking b) {
        BookingResponse r = new BookingResponse();
        r.id = b.getId();
        r.userId = b.getUser().getId();
        r.userFullName = b.getUser().getFullName();
        r.userEmail = b.getUser().getEmail();
        r.showtime = ShowtimeResponse.from(b.getShowtime());
        r.seats = b.getSeats();
        r.totalAmount = b.getTotalAmount();
        r.status = b.getStatus().name().toLowerCase();
        r.bookingRef = b.getBookingRef();
        r.createdAt = b.getCreatedAt();
        return r;
    }
}
